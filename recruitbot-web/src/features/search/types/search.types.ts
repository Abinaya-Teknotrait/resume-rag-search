export interface IResumeSearchResult {
  _id: string;
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
  snippet: string;
  score?: number | string;
}

export interface ISearchResponse {
  results: IResumeSearchResult[];
  count: number;
  scores?: number[];
  componentTimings?: Record<string, unknown>;
  fallbacks?: Record<string, unknown>;
  warning?: string;
  durationMs?: number;
}

export interface IHybridSearchResponse {
  bm25Results: IResumeSearchResult[];
  vectorResults: IResumeSearchResult[];
  bm25Count: number;
  vectorCount: number;
  componentTimings?: Record<string, unknown>;
  fallbacks?: Record<string, unknown>;
  warning?: string;
  durationMs?: number;
}

export interface IHybridSearchWeights {
  bm25: number;
  vector: number;
}

export interface IApiResponse<T> {
  statusCode: number;
  requestId: string;
  timestamp: string;
  durationMs: number;
  data: T;
}

export type SearchMode = 'endToEnd' | 'bm25' | 'vector' | 'hybrid';

export interface ISearchRequest {
  query: string;
  topK?: number;
  filters?: Record<string, unknown>;
}
