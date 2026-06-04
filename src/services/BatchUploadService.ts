import path from 'path';
import { BatchFileDiscoveryService } from './BatchFileDiscoveryService';
import { ResumeingestionService } from './ResumeingestionService';
import { resumeIngestionRepository } from '../repositories/ResumeingestionRepository';
import { getLogger } from './LoggingService';
import { getMetricsService } from './MetricsService';
import { config } from '../config';
import { EmptyResumeError, ValidationError } from '../utils/errors';

export interface IBatchUploadOptions {
  sourceFolder?: string;
  batchSize?: number | string;
  workers?: number | string;
  retryAttempts?: number | string;
}

export interface IBatchUploadFailedFile {
  filePath: string;
  fileName: string;
  reason: string;
}

export interface IBatchUploadBatchSummary {
  batchNumber: number;
  totalFiles: number;
  successfulBuilds: number;
  failedBuilds: number;
  insertedCount: number;
  failedInsertCount: number;
  durationMs: number;
  errors: string[];
  failedFiles: IBatchUploadFailedFile[];
}

export interface IBatchUploadSummary {
  totalFiles: number;
  totalBatches: number;
  processedFiles: number;
  totalInserted: number;
  totalFailed: number;
  batchSize: number;
  workers: number;
  durationMs: number;
  failedFiles: IBatchUploadFailedFile[];
  batchSummaries: IBatchUploadBatchSummary[];
}

interface IBatchFileProcessingResult {
  filePath: string;
  fileName: string;
  doc?: Record<string, unknown>;
  error?: string;
}

interface IBulkInsertResult {
  insertedCount: number;
  insertedIds: string[];
  error?: string;
}

export class BatchUploadService {
  private discoveryService: BatchFileDiscoveryService;
  private ingestionService: ResumeingestionService;
  private logger = getLogger();
  private metricsService = getMetricsService();

  constructor(
    discoveryService: BatchFileDiscoveryService = new BatchFileDiscoveryService(),
    ingestionService: ResumeingestionService = new ResumeingestionService(),
    private readonly repository = resumeIngestionRepository
  ) {
    this.discoveryService = discoveryService;
    this.ingestionService = ingestionService;
  }

  async uploadFolder(options: IBatchUploadOptions = {}, requestId = 'unknown'): Promise<IBatchUploadSummary> {
    this.logger.logServiceMethodEntry(requestId, 'BatchUploadService', 'uploadFolder', {
      options,
    });

    const sourceFolder = String(options.sourceFolder || config.batchUploadSourceFolder).trim();
    const batchSize = options.batchSize !== undefined ? parseInt(String(options.batchSize), 10) : config.batchSize;
    const workers = options.workers !== undefined ? parseInt(String(options.workers), 10) : config.batchWorkers;
    const retryAttempts = options.retryAttempts !== undefined ? parseInt(String(options.retryAttempts), 10) : config.batchRetryAttempts;

    this.validateOptions(sourceFolder, batchSize, workers, retryAttempts);

    const allFiles = await this.discoveryService.discoverPdfFiles(sourceFolder);
    const allBatches = this.chunkArray(allFiles, batchSize);

    const batchSummaries: IBatchUploadBatchSummary[] = [];
    const failedFiles: IBatchUploadFailedFile[] = [];
    let totalInserted = 0;
    let totalFailed = 0;
    let processedFiles = 0;

    this.metricsService.incrementCounter('batch_upload_runs');
    this.metricsService.incrementCounter('batch_upload_batches', allBatches.length);

    const overallStart = Date.now();
    for (let index = 0; index < allBatches.length; index += 1) {
      const batchNumber = index + 1;
      const batchFiles = allBatches[index];
      const batchStart = Date.now();

      const fileResults = await this.mapWithConcurrency(batchFiles, workers, async (filePath) => {
        return this.processFileWithRetry(filePath, requestId, retryAttempts);
      });

      const builtDocs = fileResults.filter((entry) => entry.doc).map((entry) => entry.doc!) as Record<string, unknown>[];
      const failedBuilds = fileResults.filter((entry) => entry.error).length;
      const insertResult = await this.saveBatchDocuments(builtDocs, requestId);
      const insertedCount = insertResult.insertedCount;
      const failedInsertCount = builtDocs.length - insertedCount;

      const batchDuration = Date.now() - batchStart;
      const failedFilesForBatch = fileResults
        .filter((entry) => entry.error)
        .map((entry) => ({ filePath: entry.filePath, fileName: entry.fileName, reason: entry.error! }));

      const errors = failedFilesForBatch.map((entry) => `${entry.fileName}: ${entry.reason}`);
      if (insertResult.error) {
        errors.push(`MongoDB batch insert error: ${insertResult.error}`);
      }

      batchSummaries.push({
        batchNumber,
        totalFiles: batchFiles.length,
        successfulBuilds: builtDocs.length,
        failedBuilds: failedBuilds + failedInsertCount,
        insertedCount,
        failedInsertCount,
        durationMs: batchDuration,
        errors,
        failedFiles: failedFilesForBatch,
      });

      if (failedFilesForBatch.length > 0) {
        failedFiles.push(...failedFilesForBatch);
      }

      totalInserted += insertedCount;
      totalFailed += failedBuilds + failedInsertCount;
      processedFiles += batchFiles.length;
    }

    const durationMs = Date.now() - overallStart;
    const summary: IBatchUploadSummary = {
      totalFiles: allFiles.length,
      totalBatches: allBatches.length,
      processedFiles,
      totalInserted,
      totalFailed,
      batchSize,
      workers,
      durationMs,
      failedFiles,
      batchSummaries,
    };

    this.metricsService.incrementCounter('batch_upload_files_processed', processedFiles);
    this.metricsService.incrementCounter('batch_upload_files_succeeded', totalInserted);
    this.metricsService.incrementCounter('batch_upload_files_failed', totalFailed);
    this.metricsService.recordDuration('batch_upload_duration', durationMs);

    this.logger.logServiceMethodSuccess(requestId, 'BatchUploadService', 'uploadFolder', durationMs, {
      summary,
    });

    return summary;
  }

  private validateOptions(sourceFolder: string, batchSize: number, workers: number, retryAttempts: number): void {
    if (!sourceFolder) {
      throw new ValidationError('sourceFolder is required for batch upload');
    }

    if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
      throw new ValidationError('batchSize must be an integer between 1 and 1000');
    }

    if (!Number.isInteger(workers) || workers < 1 || workers > 50) {
      throw new ValidationError('workers must be an integer between 1 and 50');
    }

    if (!Number.isInteger(retryAttempts) || retryAttempts < 0 || retryAttempts > 10) {
      throw new ValidationError('retryAttempts must be an integer between 0 and 10');
    }
  }

  private async processFileWithRetry(
    filePath: string,
    requestId: string,
    retryAttempts: number
  ): Promise<IBatchFileProcessingResult> {
    const fileName = path.basename(filePath);

    for (let attempt = 1; attempt <= retryAttempts + 1; attempt += 1) {
      try {
        const result = await this.ingestionService.buildDocumentFromFilePath(filePath, requestId);
        return {
          filePath,
          fileName,
          doc: result.doc,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isLastAttempt = attempt === retryAttempts + 1;

        if (isLastAttempt || !this.shouldRetryBuildError(error)) {
          this.logger.error('BatchUploadService failed to build resume document', {
            requestId,
            filePath,
            attempt,
            retryAttempts,
            error: message,
          });
          return {
            filePath,
            fileName,
            error: message,
          };
        }

        this.logger.warn('BatchUploadService transient build failure, retrying', {
          requestId,
          filePath,
          attempt,
          retryAttempts,
          error: message,
        });

        this.metricsService.incrementCounter('batch_upload_retry_attempts');
        const delayMs = config.batchRetryDelayMs;
        await this.delay(delayMs);
      }
    }

    return {
      filePath,
      fileName,
      error: 'Failed to build resume document after retry attempts',
    };
  }

  private shouldRetryBuildError(error: unknown): boolean {
    if (error instanceof ValidationError || error instanceof EmptyResumeError) {
      return false;
    }

    return true;
  }

  private async delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  private async mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let currentIndex = 0;

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (currentIndex < items.length) {
        const index = currentIndex;
        currentIndex += 1;
        results[index] = await task(items[index]);
      }
    });

    await Promise.all(workers);
    return results;
  }

  private async saveBatchDocuments(documents: Record<string, unknown>[], requestId: string): Promise<IBulkInsertResult> {
    if (documents.length === 0) {
      return { insertedCount: 0, insertedIds: [] };
    }

    const result = await this.repository.saveDocuments(documents, requestId);
    return {
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds || [],
      error: result.error,
    };
  }
}
