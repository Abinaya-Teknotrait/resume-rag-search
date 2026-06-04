import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Application configuration loaded from environment variables
 * Validates all required variables on startup (fail-fast)
 */
export const config = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  // MongoDB
  mongoUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB_NAME || 'resume_search',
  mongoCollectionName: process.env.MONGODB_COLLECTION_NAME || 'resumes',
  mongoBm25Index: process.env.MONGODB_BM25_INDEX || 'BM25_Index',
  mongoVectorIndexName: process.env.MONGODB_VECTOR_INDEX || 'resume_vector_index',
  databaseTimeout: parseInt(process.env.DATABASE_TIMEOUT || '15000', 10),

  // Mistral (Embeddings)
  mistralApiKey: process.env.MISTRAL_API_KEY,
  mistralEmbedModel: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed',
  mistralEmbedDimensions: parseInt(process.env.MISTRAL_EMBED_DIMENSIONS || '1024', 10),
  embeddingApiTimeout: parseInt(process.env.EMBEDDING_API_TIMEOUT || '30000', 10),
  embeddingRetryAttempts: parseInt(process.env.EMBEDDING_RETRY_ATTEMPTS || '3', 10),
  embeddingRetryDelayMs: parseInt(process.env.EMBEDDING_RETRY_DELAY_MS || '1000', 10),
  embeddingMaxConcurrentRequests: parseInt(process.env.EMBEDDING_MAX_CONCURRENT_REQUESTS || '4', 10),

  // Groq (LLM)
  groqApiKey: process.env.GROQ_API_KEY,
  groqLlmModel: process.env.GROQ_LLM_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  llmApiTimeout: parseInt(process.env.LLM_API_TIMEOUT || '60000', 10),

  // Feature Toggles
  enableSummarization: process.env.ENABLE_SUMMARIZATION === 'true',
  rerankTopK: parseInt(process.env.RERANK_TOP_K || '8', 10),
  maxQueryLength: parseInt(process.env.MAX_QUERY_LENGTH || '2000', 10),
  maxBatchSize: parseInt(process.env.MAX_BATCH_SIZE || '100', 10),
  maxCandidatesToRerank: parseInt(process.env.MAX_CANDIDATES_TO_RERANK || '10', 10),

  // Batch upload defaults
  batchUploadSourceFolder: process.env.BATCH_UPLOAD_FOLDER || './Resumes',
  batchSize: parseInt(process.env.BATCH_SIZE || '100', 10),
  batchWorkers: parseInt(process.env.BATCH_WORKERS || '10', 10),
  batchRetryAttempts: parseInt(process.env.BATCH_RETRY_ATTEMPTS || '3', 10),
  batchRetryDelayMs: parseInt(process.env.BATCH_RETRY_DELAY_MS || '1000', 10),
  batchUploadQueueEnabled: process.env.BATCH_UPLOAD_QUEUE_ENABLED === 'true',
  batchUploadQueueWorkers: parseInt(process.env.BATCH_UPLOAD_QUEUE_WORKERS || '2', 10),
  batchUploadScheduleEnabled: process.env.BATCH_UPLOAD_SCHEDULE_ENABLED === 'true',
  batchUploadScheduleIntervalMs: parseInt(process.env.BATCH_UPLOAD_SCHEDULE_INTERVAL_MS || '3600000', 10),

  // Summarization
  defaultSummarizationStyle: (process.env.SUMMARIZATION_STYLE || 'short') as 'short' | 'detailed',
  summarizationDefaultMaxTokens: parseInt(process.env.SUMMARIZATION_MAX_TOKENS || '300', 10),
};

/**
 * Validate required configuration on startup
 * Throws error if critical variables are missing
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.mongoUri) {
    errors.push('MONGODB_URI environment variable is required');
  }

  if (!config.mistralApiKey) {
    errors.push('MISTRAL_API_KEY environment variable is required');
  }

  if (!config.groqApiKey) {
    errors.push('GROQ_API_KEY environment variable is required');
  }

  if (!Number.isInteger(config.rerankTopK) || config.rerankTopK < 1 || config.rerankTopK > 20) {
    errors.push('RERANK_TOP_K must be between 1 and 20');
  }

  if (
    !Number.isInteger(config.maxCandidatesToRerank) ||
    config.maxCandidatesToRerank < 1 ||
    config.maxCandidatesToRerank > 100
  ) {
    errors.push('MAX_CANDIDATES_TO_RERANK must be between 1 and 100');
  }

  if (config.rerankTopK > config.maxCandidatesToRerank) {
    errors.push('RERANK_TOP_K must be less than or equal to MAX_CANDIDATES_TO_RERANK');
  }

  if (config.maxQueryLength < 10 || config.maxQueryLength > 10000) {
    errors.push('MAX_QUERY_LENGTH must be between 10 and 10000');
  }

  if (!Number.isInteger(config.batchSize) || config.batchSize < 1 || config.batchSize > 1000) {
    errors.push('BATCH_SIZE must be an integer between 1 and 1000');
  }

  if (!Number.isInteger(config.batchWorkers) || config.batchWorkers < 1 || config.batchWorkers > 50) {
    errors.push('BATCH_WORKERS must be an integer between 1 and 50');
  }

  if (!Number.isInteger(config.batchRetryAttempts) || config.batchRetryAttempts < 0 || config.batchRetryAttempts > 10) {
    errors.push('BATCH_RETRY_ATTEMPTS must be an integer between 0 and 10');
  }

  if (!Number.isInteger(config.batchRetryDelayMs) || config.batchRetryDelayMs < 0 || config.batchRetryDelayMs > 60000) {
    errors.push('BATCH_RETRY_DELAY_MS must be an integer between 0 and 60000');
  }

  if (!Number.isInteger(config.batchUploadQueueWorkers) || config.batchUploadQueueWorkers < 1 || config.batchUploadQueueWorkers > 10) {
    errors.push('BATCH_UPLOAD_QUEUE_WORKERS must be an integer between 1 and 10');
  }

  if (!Number.isInteger(config.batchUploadScheduleIntervalMs) || config.batchUploadScheduleIntervalMs < 60000 || config.batchUploadScheduleIntervalMs > 86400000) {
    errors.push('BATCH_UPLOAD_SCHEDULE_INTERVAL_MS must be an integer between 60000 and 86400000');
  }

  if (!Number.isInteger(config.embeddingRetryAttempts) || config.embeddingRetryAttempts < 0 || config.embeddingRetryAttempts > 10) {
    errors.push('EMBEDDING_RETRY_ATTEMPTS must be an integer between 0 and 10');
  }

  if (!Number.isInteger(config.embeddingRetryDelayMs) || config.embeddingRetryDelayMs < 0 || config.embeddingRetryDelayMs > 60000) {
    errors.push('EMBEDDING_RETRY_DELAY_MS must be an integer between 0 and 60000');
  }

  if (!Number.isInteger(config.embeddingMaxConcurrentRequests) || config.embeddingMaxConcurrentRequests < 1 || config.embeddingMaxConcurrentRequests > 50) {
    errors.push('EMBEDDING_MAX_CONCURRENT_REQUESTS must be an integer between 1 and 50');
  }

  if (config.defaultSummarizationStyle !== 'short' && config.defaultSummarizationStyle !== 'detailed') {
    errors.push('SUMMARIZATION_STYLE must be either short or detailed');
  }

  if (
    !Number.isInteger(config.summarizationDefaultMaxTokens) ||
    config.summarizationDefaultMaxTokens < 10 ||
    config.summarizationDefaultMaxTokens > 2000
  ) {
    errors.push('SUMMARIZATION_MAX_TOKENS must be between 10 and 2000');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Application constants
 */
export const constants = {
  // API
  API_VERSION: 'v1',
  API_PREFIX: '/v1',

  // Request/Response
  MAX_REQUEST_SIZE: 2048, // bytes for query
  MAX_CANDIDATES_BATCH: 100,
  REQUEST_TIMEOUT: 30000, // milliseconds

  // Search defaults
  DEFAULT_TOP_K: 20,
  MIN_TOP_K: 1,
  MAX_TOP_K: 100,

  // LLM
  MIN_CANDIDATES_FOR_RERANK: 2,
  MAX_CANDIDATES_FOR_RERANK: 20,

  // HTTP Status Codes
  STATUS_OK: 200,
  STATUS_BAD_REQUEST: 400,
  STATUS_INTERNAL_ERROR: 500,
  STATUS_SERVICE_UNAVAILABLE: 503,
  STATUS_PAYLOAD_TOO_LARGE: 413,

  // Error Codes
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EMBEDDING_ERROR: 'EMBEDDING_ERROR',
    LLM_ERROR: 'LLM_ERROR',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  },

  // Logging
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
  },
};
