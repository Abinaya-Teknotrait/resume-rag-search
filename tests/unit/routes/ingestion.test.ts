import request from 'supertest';
import { createExpressApp } from '../../../src/app';
import { BatchUploadService } from '../../../src/services/BatchUploadService';

describe('Ingestion routes', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should expose POST /v1/resume/batch-upload and forward retryAttempts', async () => {
    const uploadFolderSpy = jest
      .spyOn(BatchUploadService.prototype, 'uploadFolder')
      .mockResolvedValueOnce({
        totalFiles: 3,
        totalBatches: 1,
        processedFiles: 3,
        totalInserted: 3,
        totalFailed: 0,
        batchSize: 3,
        workers: 1,
        durationMs: 100,
        failedFiles: [],
        batchSummaries: [
          {
            batchNumber: 1,
            totalFiles: 3,
            successfulBuilds: 3,
            failedBuilds: 0,
            insertedCount: 3,
            failedInsertCount: 0,
            durationMs: 100,
            errors: [],
            failedFiles: [],
          },
        ],
      } as any);

    const app = createExpressApp();

    const response = await request(app)
      .post('/v1/resume/batch-upload')
      .send({
        sourceFolder: './Resumes',
        batchSize: 3,
        workers: 1,
        retryAttempts: 2,
      });

    expect(response.status).toBe(200);
    expect(uploadFolderSpy).toHaveBeenCalledWith(
      {
        sourceFolder: './Resumes',
        batchSize: 3,
        workers: 1,
        retryAttempts: 2,
      },
      expect.any(String)
    );
    expect(response.body.data.totalFiles).toBe(3);
    expect(response.body.data.failedFiles).toEqual([]);
    expect(response.body.data.batchSummaries).toHaveLength(1);
  });
});
