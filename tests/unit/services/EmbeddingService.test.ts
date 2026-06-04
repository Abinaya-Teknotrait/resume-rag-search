jest.mock('axios');

import axios, { isAxiosError } from 'axios';
import { EmbeddingService } from '../../../src/services/EmbeddingService';

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedIsAxiosError = isAxiosError as jest.MockedFunction<typeof isAxiosError>;

/**
 * Unit tests for EmbeddingService
 */

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeAll(() => {
    process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || 'test-key';
    process.env.MISTRAL_EMBED_MODEL = process.env.MISTRAL_EMBED_MODEL || 'mistral-embed';
    process.env.MISTRAL_EMBED_DIMENSIONS = process.env.MISTRAL_EMBED_DIMENSIONS || '1024';
    process.env.EMBEDDING_API_TIMEOUT = process.env.EMBEDDING_API_TIMEOUT || '30000';
  });

  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedIsAxiosError.mockReset();
    mockedIsAxiosError.mockImplementation((error) => {
      return !!(error && typeof error === 'object' && 'response' in error);
    });
    service = new EmbeddingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetadata', () => {
    it('should return embedding service metadata', () => {
      const metadata = service.getMetadata();

      expect(metadata).toHaveProperty('model');
      expect(metadata).toHaveProperty('dimensions');
      expect(metadata).toHaveProperty('timeout');
      expect(metadata).toHaveProperty('maxRetries');
      expect(metadata).toHaveProperty('maxConcurrentRequests');
      expect(metadata).toHaveProperty('apiProvider');
      expect(metadata.apiProvider).toBe('mistral');
    });

    it('should use configured embedding concurrency', () => {
      process.env.EMBEDDING_MAX_CONCURRENT_REQUESTS = '2';
      const customService = new EmbeddingService();
      expect(customService.getMetadata().maxConcurrentRequests).toBe(2);
    });

    it('should have correct embedding dimensions', () => {
      const metadata = service.getMetadata();
      expect(metadata.dimensions).toBe(1024);
    });

    it('should have model set to mistral-embed', () => {
      const metadata = service.getMetadata();
      expect(metadata.model).toBe('mistral-embed');
    });
  });

  describe('generateEmbedding', () => {
    it('should retry after a 429 rate limit and succeed', async () => {
      const axiosError = {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
        },
        message: 'Request failed',
      };

      mockedAxios.post
        .mockRejectedValueOnce(axiosError as never)
        .mockResolvedValueOnce({
          data: {
            id: 'emb-1',
            object: 'list',
            model: 'mistral-embed',
            data: [{ index: 0, object: 'embedding', embedding: [0.1, 0.2] }],
            usage: { prompt_tokens: 2, total_tokens: 2 },
          },
        } as never);

      const result = await service.generateEmbedding('software engineer');

      expect(result.embedding).toEqual([0.1, 0.2]);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(EmbeddingService);
    });

    it('should throw if MISTRAL_API_KEY is not set', () => {
      const originalKey = process.env.MISTRAL_API_KEY;
      const configModule = require('../../../src/config');
      const originalConfigKey = configModule.config.mistralApiKey;

      delete process.env.MISTRAL_API_KEY;
      configModule.config.mistralApiKey = '';

      expect(() => {
        new EmbeddingService();
      }).toThrow('MISTRAL_API_KEY is not configured');

      process.env.MISTRAL_API_KEY = originalKey;
      configModule.config.mistralApiKey = originalConfigKey;
    });
  });
});
