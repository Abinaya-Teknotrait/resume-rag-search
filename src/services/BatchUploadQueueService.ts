import { v4 as uuidv4 } from 'uuid';
import { BatchUploadService, IBatchUploadOptions } from './BatchUploadService';
import { getLogger } from './LoggingService';
import { config } from '../config';

export type BatchUploadJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface IBatchUploadQueueJob {
  id: string;
  requestId: string;
  options: IBatchUploadOptions;
  status: BatchUploadJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export class BatchUploadQueueService {
  private readonly queue: IBatchUploadQueueJob[] = [];
  private readonly jobs = new Map<string, IBatchUploadQueueJob>();
  private activeWorkers = 0;
  private scheduleHandle: NodeJS.Timeout | null = null;
  private readonly logger = getLogger();
  private readonly workerCount = config.batchUploadQueueWorkers;
  private readonly batchUploadService = new BatchUploadService();

  enqueueBatchUpload(options: IBatchUploadOptions, requestId: string): IBatchUploadQueueJob {
    const job: IBatchUploadQueueJob = {
      id: uuidv4(),
      requestId,
      options,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.queue.push(job);
    this.jobs.set(job.id, job);
    this.logger.info('Batch upload job enqueued', { jobId: job.id, requestId, options });
    this.processQueue();
    return job;
  }

  getJob(jobId: string): IBatchUploadQueueJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobs(): IBatchUploadQueueJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  startScheduledIngestion(): void {
    if (!config.batchUploadScheduleEnabled) {
      return;
    }

    if (this.scheduleHandle) {
      return;
    }

    this.logger.info('Starting scheduled batch ingestion', {
      intervalMs: config.batchUploadScheduleIntervalMs,
      sourceFolder: config.batchUploadSourceFolder,
      batchSize: config.batchSize,
      workers: config.batchWorkers,
      retryAttempts: config.batchRetryAttempts,
    });

    this.scheduleHandle = setInterval(() => {
      const requestId = `scheduled-${Date.now()}`;
      this.enqueueBatchUpload(
        {
          sourceFolder: config.batchUploadSourceFolder,
          batchSize: config.batchSize,
          workers: config.batchWorkers,
          retryAttempts: config.batchRetryAttempts,
        },
        requestId
      );
    }, config.batchUploadScheduleIntervalMs);
  }

  stopScheduledIngestion(): void {
    if (!this.scheduleHandle) {
      return;
    }

    clearInterval(this.scheduleHandle);
    this.scheduleHandle = null;
    this.logger.info('Stopped scheduled batch ingestion');
  }

  reset(): void {
    this.queue.length = 0;
    this.jobs.clear();
    this.activeWorkers = 0;
    if (this.scheduleHandle) {
      clearInterval(this.scheduleHandle);
      this.scheduleHandle = null;
    }
  }

  private async processQueue(): Promise<void> {
    while (this.activeWorkers < this.workerCount && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) {
        break;
      }

      this.activeWorkers += 1;
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      this.logger.info('Batch upload job started', { jobId: job.id, requestId: job.requestId, options: job.options });

      this.executeJob(job)
        .catch((error) => {
          this.logger.error('Batch upload job execution failed', { jobId: job.id, error: error instanceof Error ? error.message : String(error) });
        })
        .finally(() => {
          this.activeWorkers -= 1;
          this.processQueue();
        });
    }
  }

  private async executeJob(job: IBatchUploadQueueJob): Promise<void> {
    try {
      const result = await this.batchUploadService.uploadFolder(job.options, job.requestId);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.result = result;
      this.logger.info('Batch upload job completed', {
        jobId: job.id,
        requestId: job.requestId,
        inserted: result.totalInserted,
        failed: result.totalFailed,
        durationMs: result.durationMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = message;
      this.logger.error('Batch upload job failed', {
        jobId: job.id,
        requestId: job.requestId,
        error: message,
      });
    }
  }
}

let batchUploadQueueServiceInstance: BatchUploadQueueService;

export function getBatchUploadQueueService(): BatchUploadQueueService {
  if (!batchUploadQueueServiceInstance) {
    batchUploadQueueServiceInstance = new BatchUploadQueueService();
  }
  return batchUploadQueueServiceInstance;
}
