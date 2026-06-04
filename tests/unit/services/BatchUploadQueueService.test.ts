import request from 'supertest';
import { createExpressApp } from '../../../src/app';
import { getBatchUploadQueueService } from '../../../src/services/BatchUploadQueueService';
import { BatchUploadService } from '../../../src/services/BatchUploadService';

describe('BatchUploadQueueService', () => {
  const queueService = getBatchUploadQueueService();

  beforeEach(() => {
    queueService.reset();
    jest.restoreAllMocks();
  });

  it('should enqueue a job and expose it via queue status endpoints', async () => {
    jest.spyOn(BatchUploadService.prototype, 'uploadFolder').mockResolvedValueOnce({
      totalFiles: 1,
      totalBatches: 1,
      processedFiles: 1,
      totalInserted: 1,
      totalFailed: 0,
      batchSize: 1,
      workers: 1,
      durationMs: 1,
      failedFiles: [],
      batchSummaries: [],
    } as any);

    const app = createExpressApp();
    const response = await request(app)
      .post('/v1/resume/batch-upload/queue')
      .send({
        sourceFolder: './Resumes',
        batchSize: 1,
        workers: 1,
        retryAttempts: 0,
      });

    expect(response.status).toBe(202);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data).toHaveProperty('status');
    expect(response.body.data.status).toMatch(/pending|running/);

    const jobId = response.body.data.id;
    const statusResponse = await request(app).get(`/v1/resume/batch-upload/queue/${jobId}`);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.id).toBe(jobId);

    const listResponse = await request(app).get('/v1/resume/batch-upload/queue');
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.data)).toBe(true);
    expect(listResponse.body.data[0].id).toBe(jobId);
  });
});
