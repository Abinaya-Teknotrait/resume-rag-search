/**
 * TypeScript interfaces for API request/response payloads
 */

// ============================================================================
// Health Check Endpoints
// ============================================================================

export interface IHealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  environment: string;
}

export interface IHealthDatabaseResponse {
  status: 'healthy' | 'unhealthy';
  database: string;
  latencyMs: number;
  timestamp: string;
  mode?: 'mongodb';
  error?: string;
}

// ============================================================================
// Embeddings
// ============================================================================

export interface IEmbeddingRequest {
  input: string;
  model?: string;  // optional model override (e.g., 'mistral-embed')
}

export interface IEmbeddingResponse {
  embedding: number[];  // vector of floats (1024 dimensions for mistral-embed)
  dimensions: number;   // embedding vector dimensions (e.g., 1024)
  model: string;        // model used (e.g., 'mistral-embed')
  tokensUsed?: number;  // tokens consumed for this embedding
}

// ============================================================================
// Search Endpoints
// ============================================================================

export interface ISearchFilters {
  minYearsExperience?: number;
  maxYearsExperience?: number;
  location?: string;
  skills?: string[];
  [key: string]: unknown;
}

export interface ISearchRequest {
  query: string;
  topK?: number;
  filters?: ISearchFilters;
}

export type IResumeSearchResult = Omit<IResume, 'text'> & {
  snippet: string;
};

export interface ISearchResponse {
  results: IResumeSearchResult[];
  count: number;
  scores?: number[];
  componentTimings?: IComponentTimings;
  fallbacks?: IFallbacks;
  warning?: string;
}

export interface IHybridSearchResponse {
  bm25Results: IResumeSearchResult[];
  vectorResults: IResumeSearchResult[];
  bm25Count: number;
  vectorCount: number;
  componentTimings?: IComponentTimings;
  fallbacks?: IFallbacks;
}

// ============================================================================
// Reranking
// ============================================================================

export interface ICandidate {
  _id: string;
  resumeId?: string;
  snippet?: string;
  text?: string;
  score?: number;
  _score?: number;
  _explanation?: string;
  [key: string]: unknown;
}

export interface IRerankRequest {
  query: string;
  candidates: ICandidate[];
  topK?: number;
}

export interface IRerankResponse {
  results: ICandidate[];
  scores: number[];
}

// ============================================================================
// Summarization
// ============================================================================

export interface ISummarizeRequest {
  query: string;
  candidate: ICandidate;
  style?: 'short' | 'detailed';
  maxTokens?: number;
}

export interface ISummarizeResponse {
  summary: string;
  tokensUsed: number;
}

// ============================================================================
// End-to-End Search
// ============================================================================

export interface IEndToEndSearchRequest {
  query: string;
  topK?: number;
  filters?: ISearchFilters;
  summarize?: boolean;
  summarizeTopK?: number;
  summarizeStyle?: 'short' | 'detailed';
}

export interface IEndToEndSearchResponse {
  results: IResumeSearchResult[];
  summaries?: string[];
  count: number;
  componentTimings: IComponentTimings;
  fallbacks: IFallbacks;
  warning?: string;
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
  batchSummaries: IBatchUploadBatchSummary[];
}

export interface IBatchUploadQueueJob {
  id: string;
  requestId: string;
  options: {
    sourceFolder?: string;
    batchSize?: number;
    workers?: number;
    retryAttempts?: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Data Models
// ============================================================================

export interface IResume {
  _id: string;
  text: string;
  embedding?: number[];
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  role?: string;
  jobTitles?: string[];
  education?: string;
  skills?: string[];
  totalExperience?: number;
  relevantExperience?: number;
  experienceSummary?: string;
  score?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// Monitoring
// ============================================================================

export interface IComponentTimings {
  embeddingMs?: number;
  bm25Ms?: number;
  vectorMs?: number;
  mergeMs?: number;
  rerankMs?: number;
  summarizeMs?: number;
}

export interface IFallbacks {
  bm25Fallback?: boolean;
  vectorFallback?: boolean;
  rerankFallback?: boolean;
  summarizeFallback?: boolean;
}

// ============================================================================
// Error Response
// ============================================================================

export interface IErrorResponse {
  statusCode: number;
  requestId: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Standard API Response Wrapper
// ============================================================================

export interface IApiResponse<T> {
  statusCode: number;
  requestId: string;
  timestamp: string;
  durationMs?: number;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
