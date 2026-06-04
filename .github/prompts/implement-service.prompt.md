---
name: implement-service
description: Implement a service layer class (SearchService, EmbeddingService, LLMService) with proper dependency injection, error handling, and logging
---

# Implement Service Layer Class

## Task

Create a service class that implements business logic for the Resume RAG Search API. Services orchestrate between routes and repositories, handle external API calls, implement fallback logic, and maintain detailed timing metrics.

## Service Architecture

All services follow this pattern:

```typescript
// src/services/ExampleService.ts
import { LoggingService } from './LoggingService';
import { IServiceDependency } from '../types/API';

export class ExampleService {
  constructor(
    private dependency: IServiceDependency,
    private logger: LoggingService
  ) {}

  /**
   * Describes what this method does
   * @param params - Typed input parameters
   * @returns Promise with typed result
   * @throws ExampleError on failure
   */
  async methodName(params: ITypedParams): Promise<ITypedResult> {
    const startTime = Date.now();
    const methodName = `${this.constructor.name}.methodName`;
    
    this.logger.debug(`${methodName} called`, { params });

    try {
      // Implementation
      const result = await this.doWork();
      
      const durationMs = Date.now() - startTime;
      this.logger.debug(`${methodName} succeeded`, { durationMs });
      
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(`${methodName} failed`, { error, durationMs });
      throw new ExampleError(error);
    }
  }
}
```

## Services to Implement

### 1. EmbeddingService

Wraps the Mistral embedding API for generating vector embeddings.

**Constructor dependencies**:
- `LoggingService`

**Methods**:
- `async generateEmbedding(text: string, model?: string): Promise<IEmbeddingResult>`
  - Calls Mistral API with retry logic (exponential backoff)
  - Returns: `{ embedding: number[], dimensions: number, model: string, tokensUsed: number }`
  - Throws: `EmbeddingError` on persistent failure
  - Logs: embedding dimensions, model, latency

**Key Implementation Details**:
- Retry on transient failures (network, rate limit) with exponential backoff (3 max retries)
- Cache embedding dimensions per model in config
- Log API latency separately from total method duration
- Handle timeout (e.g., 30s max)
- Validate embedding array is not empty; throw error if so

### 2. LLMService

Wraps the Groq LLM API for re-ranking, summarization, and metadata extraction.

**Constructor dependencies**:
- `LoggingService`

**Methods**:
1. `async rerankCandidates(query: string, candidates: ICandidate[], topK: number): Promise<IRerankResult>`
   - Input: search query + candidate snippets (max 8-10)
   - Constructs prompt: "Here is a search query: {query}. Here are candidate resumes: {snippets}. Rank them by relevance."
   - Returns: `{ rankedIds: string[], scores: number[] }`
   - Logs: prompt tokens, completion tokens, latency
   - Throws: `LLMError` on failure

2. `async summarizeCandidateFit(query: string, candidate: ICandidate, options: ISummarizeOptions): Promise<ISummaryResult>`
   - Input: query + single candidate + `{ style: "short"|"detailed", maxTokens: number }`
   - Constructs prompt: "Given search query '{query}', explain why this candidate is a good fit in {style} style, max {maxTokens} tokens. Resume: {text}"
   - Returns: `{ summary: string, tokensUsed: number }`
   - Logs: token usage, latency
   - Throws: `LLMError` on failure

3. `async extractMetadata(resumeText: string): Promise<IExtractedMetadata>`
   - Input: raw resume text
   - Constructs prompt: "Extract from this resume: 1) key skills (comma-separated), 2) job titles (comma-separated), 3) one-line experience summary. Resume: {text}"
   - Returns: `{ skills: string[], jobTitles: string[], experienceSummary: string }`
   - Logs: extraction latency
   - Throws: `LLMError` on failure

**Key Implementation Details**:
- Use Groq API with model from config
- Implement timeout (e.g., 60s for LLM calls)
- Parse LLM response carefully; handle malformed JSON
- Log both prompt and completion token usage
- Do NOT log the actual prompts (security: no PII in logs)
- Return error flag if parsing fails, but don't throw (allow graceful degradation)

### 3. SearchService

Orchestrates the full hybrid search + re-ranking pipeline.

**Constructor dependencies**:
- `EmbeddingService`
- `LLMService`
- `ResumeRepository`
- `LoggingService`

**Methods**:
1. `async bm25Search(query: string, filters?: ISearchFilters, topK: number = 20): Promise<ISearchResult>`
   - Delegates to `ResumeRepository.bm25Search()`
   - Logs query, topK, filter count, result count, latency
   - Returns: `{ results: IResume[], count: number, scores: number[] }`

2. `async vectorSearch(query: string, filters?: ISearchFilters, topK: number = 20): Promise<ISearchResult>`
   - Calls `EmbeddingService.generateEmbedding(query)` 
   - Delegates to `ResumeRepository.vectorSearch(embedding)`
   - Logs embedding dimension, topK, result count, latency
   - Returns: `{ results: IResume[], scores: number[] }`
   - On embedding failure: throw `EmbeddingError`

3. `async hybridSearch(query: string, filters?: ISearchFilters, options?: IHybridOptions): Promise<IHybridResult>`
   - Runs `bm25Search` and `vectorSearch` in parallel (Promise.all with catch for each)
   - Returns both result lists WITHOUT merging scores
   - If one search fails, return other only with `bm25Fallback: true` or `vectorFallback: true`
   - Returns: `{ bm25Results: IResume[], vectorResults: IResume[], bm25Count: number, vectorCount: number, fallbacks: object }`

4. `async endToEndSearch(query: string, filters?: ISearchFilters, options?: IEndToEndOptions): Promise<IEndToEndResult>`
   - **Step 1**: Call `EmbeddingService.generateEmbedding(query)` → measure as `embeddingMs`
   - **Step 2**: Call `bm25Search()` → measure as `bm25Ms`
   - **Step 3**: Call `vectorSearch()` → measure as `vectorMs`
   - **Step 4**: Merge results: deduplicate by resumeId, keep best score from each method → measure as `mergeMs`
   - **Step 5**: Slice top N (default 8-10, from config) 
   - **Step 6**: Call `LLMService.rerankCandidates()` if no prior failures → measure as `rerankMs`
     - **Fallback**: If rerank fails, use merged ordering (BM25 priority > vector)
   - **Step 7**: If `options.summarize === true`, call `LLMService.summarizeCandidateFit()` for each result → measure as `summarizeMs`
     - **Fallback**: If summarization fails, return results without summaries + warning
   - **Returns**: `{ results: IResume[], summaries?: string[], componentTimings: object, fallbacks: object, warning?: string }`

**Key Implementation Details**:
- Wrap external API calls in try-catch; never let one failure crash the whole pipeline
- Implement fallback priority: if both BM25 and vector fail, still have no results (acceptable, log warning)
- Log component timings as separate fields: `embeddingMs`, `bm25Ms`, `vectorMs`, etc.
- Pass `requestId` through all service calls via logger context
- Validate inputs: query not empty/too long (max 2KB from config)
- For merge step: if resumeId appears in both lists, pick the one with better (higher) score
- For deduplication: use Map for O(1) lookup

### 4. ResumeRepository

Database access layer for MongoDB operations.

**Constructor dependencies**:
- `MongoClient` (or connection object)
- `LoggingService`

**Methods**:
1. `async bm25Search(query: string, filters?: ISearchFilters, topK: number): Promise<ISearchResult>`
   - Executes MongoDB BM25 search pipeline on `resumes` collection
   - Searches across: `text`, `skills`, `jobTitles`, `experienceSummary` (fields configured in Atlas)
   - Applies filters (e.g., minYearsExperience, location)
   - Logs MongoDB query, result count, latency
   - Throws: `DatabaseError` on query failure

2. `async vectorSearch(embedding: number[], filters?: ISearchFilters, topK: number): Promise<ISearchResult>`
   - Executes MongoDB vector search on `cachedEmbedding` field
   - Uses ANN (approximate nearest neighbors) + optional exact re-score on top-K
   - Returns: results with scores (cosine similarity)
   - Throws: `DatabaseError` on query failure

3. `async getResume(resumeId: string): Promise<IResume>`
   - Fetch single resume by ObjectId
   - Throws: `DatabaseError` on failure

## Error Handling Pattern

Define custom error types in `src/utils/errors.ts`:

```typescript
export class EmbeddingError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export class LLMError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

// ... similar for DatabaseError, ValidationError, etc.
```

Catch and re-throw in services:
```typescript
try {
  const result = await externalAPI.call();
} catch (error) {
  throw new EmbeddingError(`Failed to embed text: ${(error as Error).message}`, error);
}
```

## Logging Pattern

Every service method logs:
- **Entry** (debug): method name, input params (sanitized, no PII)
- **Success** (debug): method name, duration
- **Error** (error): method name, error message, duration
- **External calls** (debug): API name, latency, token usage

Example:
```typescript
this.logger.debug('EmbeddingService.generateEmbedding called', { 
  textLength: text.length,
  model 
});
// ... do work
this.logger.debug('EmbeddingService.generateEmbedding succeeded', {
  dimensions,
  durationMs,
  apiLatencyMs
});
```

## Acceptance Criteria

✅ Service class properly typed with input/output interfaces  
✅ All dependencies injected via constructor, not globals  
✅ Every method has JSDoc with @param, @returns, @throws  
✅ All async operations wrapped in try-catch  
✅ Custom error types thrown on failure  
✅ External API calls include retry logic with exponential backoff  
✅ Component timings logged separately (embeddingMs, bm25Ms, etc.)  
✅ No hardcoded API endpoints; all from config  
✅ Request IDs propagated through logger context  
✅ Fallback logic prevents cascading failures  
✅ Unit tests mock all dependencies and verify error handling  
✅ Integration tests verify with real external APIs or test mocks
