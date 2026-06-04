import path from 'path';
import { ValidationError } from '../../../src/utils/errors';
import { BatchUploadService } from '../../../src/services/BatchUploadService';

describe('BatchUploadService', () => {
  const discoveryMock = {
    discoverPdfFiles: jest.fn(),
  };

  const ingestionMock = {
    buildDocumentFromFilePath: jest.fn(),
  };

  const repositoryMock = {
    saveDocuments: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes a batch folder and returns summary when all files succeed', async () => {
    discoveryMock.discoverPdfFiles.mockResolvedValue([path.resolve('./Resumes/resume1.pdf'), path.resolve('./Resumes/resume2.pdf')]);
    ingestionMock.buildDocumentFromFilePath
      .mockResolvedValueOnce({ doc: { fileName: 'resume1.pdf' } })
      .mockResolvedValueOnce({ doc: { fileName: 'resume2.pdf' } });
    repositoryMock.saveDocuments.mockResolvedValue({ insertedCount: 2, insertedIds: ['id1', 'id2'] });

    const service = new BatchUploadService(discoveryMock as any, ingestionMock as any, repositoryMock as any);

    const summary = await service.uploadFolder({ sourceFolder: './Resumes', batchSize: 100, workers: 2 }, 'req-123');

    expect(discoveryMock.discoverPdfFiles).toHaveBeenCalledWith('./Resumes');
    expect(ingestionMock.buildDocumentFromFilePath).toHaveBeenCalledTimes(2);
    expect(repositoryMock.saveDocuments).toHaveBeenCalledWith([{ fileName: 'resume1.pdf' }, { fileName: 'resume2.pdf' }], 'req-123');
    expect(summary.totalFiles).toBe(2);
    expect(summary.totalBatches).toBe(1);
    expect(summary.processedFiles).toBe(2);
    expect(summary.totalInserted).toBe(2);
    expect(summary.totalFailed).toBe(0);
    expect(summary.batchSummaries[0].successfulBuilds).toBe(2);
    expect(summary.failedFiles).toEqual([]);
    expect(summary.batchSummaries[0].failedFiles).toEqual([]);
  });

  it('retries transient build failures and succeeds within retry attempts', async () => {
    discoveryMock.discoverPdfFiles.mockResolvedValue([path.resolve('./Resumes/resume1.pdf')]);
    ingestionMock.buildDocumentFromFilePath
      .mockRejectedValueOnce(new Error('Transient 429 error'))
      .mockResolvedValueOnce({ doc: { fileName: 'resume1.pdf' } });
    repositoryMock.saveDocuments.mockResolvedValue({ insertedCount: 1, insertedIds: ['id1'] });

    const service = new BatchUploadService(discoveryMock as any, ingestionMock as any, repositoryMock as any);

    const summary = await service.uploadFolder({ sourceFolder: './Resumes', batchSize: 100, workers: 1, retryAttempts: 1 }, 'req-321');

    expect(ingestionMock.buildDocumentFromFilePath).toHaveBeenCalledTimes(2);
    expect(summary.totalFiles).toBe(1);
    expect(summary.totalInserted).toBe(1);
    expect(summary.totalFailed).toBe(0);
    expect(summary.batchSummaries[0].failedFiles).toEqual([]);
    expect(summary.failedFiles).toEqual([]);
  });

  it('continues processing when a file build fails and reports failed builds', async () => {
    discoveryMock.discoverPdfFiles.mockResolvedValue([path.resolve('./Resumes/resume1.pdf'), path.resolve('./Resumes/resume2.pdf')]);
    ingestionMock.buildDocumentFromFilePath
      .mockResolvedValueOnce({ doc: { fileName: 'resume1.pdf' } })
      .mockRejectedValue(new Error('Parse failed'));
    repositoryMock.saveDocuments.mockResolvedValue({ insertedCount: 1, insertedIds: ['id1'] });

    const service = new BatchUploadService(discoveryMock as any, ingestionMock as any, repositoryMock as any);

    const summary = await service.uploadFolder({ sourceFolder: './Resumes', batchSize: 100, workers: 2 }, 'req-456');

    expect(summary.totalFiles).toBe(2);
    expect(summary.totalInserted).toBe(1);
    expect(summary.totalFailed).toBe(1);
    expect(summary.batchSummaries[0].failedBuilds).toBe(1);
    expect(summary.batchSummaries[0].successfulBuilds).toBe(1);
    expect(summary.failedFiles).toHaveLength(1);
    expect(summary.failedFiles[0]).toMatchObject({ fileName: 'resume2.pdf', reason: 'Parse failed' });
    expect(summary.batchSummaries[0].failedFiles).toHaveLength(1);
  });

  it('reports permanent validation failures without retrying', async () => {
    discoveryMock.discoverPdfFiles.mockResolvedValue([path.resolve('./Resumes/resume1.pdf')]);
    ingestionMock.buildDocumentFromFilePath.mockRejectedValue(new ValidationError('Permanent parse failure'));
    repositoryMock.saveDocuments.mockResolvedValue({ insertedCount: 0, insertedIds: [] });

    const service = new BatchUploadService(discoveryMock as any, ingestionMock as any, repositoryMock as any);

    const summary = await service.uploadFolder({ sourceFolder: './Resumes', batchSize: 100, workers: 1, retryAttempts: 2 }, 'req-654');

    expect(ingestionMock.buildDocumentFromFilePath).toHaveBeenCalledTimes(1);
    expect(summary.totalFiles).toBe(1);
    expect(summary.totalInserted).toBe(0);
    expect(summary.totalFailed).toBe(1);
    expect(summary.failedFiles).toHaveLength(1);
    expect(summary.failedFiles[0]).toMatchObject({ fileName: 'resume1.pdf', reason: 'Permanent parse failure' });
  });

  it('throws validation error for invalid worker count', async () => {
    const service = new BatchUploadService(discoveryMock as any, ingestionMock as any, repositoryMock as any);

    await expect(service.uploadFolder({ sourceFolder: './Resumes', batchSize: 100, workers: 0 }, 'req-789')).rejects.toThrow('workers must be an integer between 1 and 50');
  });
});
