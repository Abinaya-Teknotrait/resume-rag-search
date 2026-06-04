import axios, { isAxiosError } from 'axios';
import { config } from '../config';
import { getLogger } from './LoggingService';
import { EmbeddingError } from '../utils/errors';

const logger = getLogger();

/**
 * Mistral Embedding API response
 */
interface IMistralEmbeddingResponse {
  id: string;
  object: string;
  data: Array<{
    index: number;
    object: string;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Embedding result returned by the service
 */
export interface IEmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
  tokensUsed: number;
}

/**
 * EmbeddingService handles vector embedding generation via Mistral API
 * Provides retry logic and error handling for production reliability
 */
export class EmbeddingService {
  private apiKey: string;
  private model: string;
  private dimensions: number;
  private timeout: number;
  private maxRetries: number = 3;
  private maxConcurrentRequests: number = 4;
  private activeRequests: number = 0;
  private requestQueue: Array<() => void> = [];
  private baseUrl: string = 'https://api.mistral.ai/v1';

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY || config.mistralApiKey || '';
    this.model = process.env.MISTRAL_EMBED_MODEL || config.mistralEmbedModel;
    this.dimensions = parseInt(
      process.env.MISTRAL_EMBED_DIMENSIONS || String(config.mistralEmbedDimensions),
      10
    );
    this.timeout = parseInt(process.env.EMBEDDING_API_TIMEOUT || String(config.embeddingApiTimeout), 10);
    this.maxRetries = parseInt(process.env.EMBEDDING_RETRY_ATTEMPTS || String(config.embeddingRetryAttempts), 10);
    this.maxConcurrentRequests = parseInt(
      process.env.EMBEDDING_MAX_CONCURRENT_REQUESTS || String(config.embeddingMaxConcurrentRequests),
      10
    );

    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY is not configured');
    }

    logger.debug('EmbeddingService initialized', {
      model: this.model,
      dimensions: this.dimensions,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      maxConcurrentRequests: this.maxConcurrentRequests,
    });
  }

  /**
   * Generate embedding for a single input text
   * Implements exponential backoff retry logic on transient failures
   *
   * @param input - Text to embed (max 2000 chars)
   * @param model - Optional model override
   * @returns Embedding result with dimensions and token usage
   * @throws EmbeddingError on persistent failure
   */
  async generateEmbedding(input: string, model?: string): Promise<IEmbeddingResult> {
    const requestModel = model || this.model;
    const startTime = Date.now();

    logger.debug('EmbeddingService.generateEmbedding called', {
      inputLength: input.length,
      model: requestModel,
      maxConcurrentRequests: this.maxConcurrentRequests,
    });

    let lastError: Error | undefined;
    await this.acquireRequestSlot();

    try {
      // Retry logic with exponential backoff
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          const response = await this.callMistralAPI(input, requestModel);

          const durationMs = Date.now() - startTime;
          logger.debug('EmbeddingService.generateEmbedding succeeded', {
            durationMs,
            dimensions: this.dimensions,
            tokensUsed: response.usage.total_tokens,
            model: requestModel,
            attempt,
          });

          return {
            embedding: response.data[0].embedding,
            dimensions: this.dimensions,
            model: requestModel,
            tokensUsed: response.usage.total_tokens,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Check if error is retryable
          const isRetryable = this.isRetryableError(error);
          const durationMs = Date.now() - startTime;

          logger.warn(`EmbeddingService.generateEmbedding attempt ${attempt} failed`, {
            attempt,
            maxRetries: this.maxRetries,
            isRetryable,
            error: lastError.message,
            durationMs,
          });

          if (!isRetryable || attempt === this.maxRetries) {
            break;
          }

          // Configurable retry delay for rate limit backoff
          const delayMs = config.embeddingRetryDelayMs;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } finally {
      this.releaseRequestSlot();
    }

    // All retries exhausted
    const durationMs = Date.now() - startTime;
    logger.error('EmbeddingService.generateEmbedding failed after retries', {
      error: lastError?.message,
      durationMs,
      attempts: this.maxRetries,
      model: requestModel,
    });

    throw new EmbeddingError(lastError?.message || 'Failed to generate embedding after retries');
  }

  /**
   * Call Mistral embedding API with configured timeout
   */
  private async callMistralAPI(
    input: string,
    model: string
  ): Promise<IMistralEmbeddingResponse> {
    const url = `${this.baseUrl}/embeddings`;

    const response = await axios.post<IMistralEmbeddingResponse>(
      url,
      {
        model,
        input,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        timeout: this.timeout,
      }
    );

    return response.data;
  }

  /**
   * Determine if error is retryable
   * Retries on transient API pressure, server-side failures, and network issues.
   */
  private isRetryableError(error: unknown): boolean {
    if (isAxiosError(error)) {
      const status = error.response?.status;

      // Retry on rate limiting and other transient server conditions.
      if (status === 408 || status === 429) {
        return true;
      }

      // Retry on server errors (5xx) and transient network issues.
      if (status && status >= 500) {
        return true;
      }

      // Don't retry on other client errors (4xx).
      if (status && status >= 400 && status < 500) {
        return false;
      }

      return true;
    }

    // Retry on network/timeout errors
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('ECONNREFUSED') || message.includes('timeout') || message.includes('ETIMEDOUT');
  }

  /**
   * Acquire a concurrency slot before calling the embedding API.
   */
  private async acquireRequestSlot(): Promise<void> {
    if (this.activeRequests < this.maxConcurrentRequests) {
      this.activeRequests += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.requestQueue.push(() => {
        this.activeRequests += 1;
        resolve();
      });
    });
  }

  private releaseRequestSlot(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    const next = this.requestQueue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Get embedding service metadata
   */
  getMetadata() {
    return {
      model: this.model,
      dimensions: this.dimensions,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
      maxConcurrentRequests: this.maxConcurrentRequests,
      apiProvider: 'mistral',
    };
  }
}

/**
 * Singleton instance
 */
let embeddingService: EmbeddingService | null = null;

/**
 * Get or create EmbeddingService singleton
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}
