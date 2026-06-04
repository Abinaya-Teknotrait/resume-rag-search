# Resume RAG Search - Development Guidelines

## Project Overview

This is an enterprise-grade Resume Search API using a **RAG (Retrieval-Augmented Generation)** approach with Node.js + Express, MongoDB, Mistral embeddings, and Groq LLM. The system implements a hybrid search pipeline combining BM25 full-text search, vector semantic search, and LLM re-ranking to deliver high-quality resume matching results.

**Key Constraints:**
- Quality-focused over speed (P95: 3–5 seconds acceptable)
- Monolithic Express app with clean layered architecture
- Fully synchronous pipeline with graceful fallbacks
- Structured JSON logging with request IDs and component timings

---

## Architecture & Layers

### Directory Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts             # Server startup & connection lifecycle
├── config/               # Environment & constants
│   └── index.ts
├── types/                # Shared TypeScript interfaces
│   ├── Resume.ts
│   ├── Search.ts
│   └── API.ts
├── middleware/           # Logging, request ID, size limits, error handling
│   ├── requestId.ts
│   ├── logging.ts
│   ├── sizeLimit.ts
│   └── errorHandler.ts
├── routes/               # Express route handlers
│   ├── health.ts
│   ├── search.ts
│   └── embeddings.ts
├── services/             # Business logic orchestration
│   ├── SearchService.ts
│   ├── EmbeddingService.ts
│   ├── LLMService.ts
│   └── LoggingService.ts
├── repositories/         # MongoDB CRUD & queries
│   └── ResumeRepository.ts
└── utils/                # Helpers & utilities
    ├── validators.ts
    └── errors.ts
```

### Core Principles

1. **Layering**: Routes → Services → Repositories → MongoDB
2. **Dependency Injection**: Pass dependencies through constructors, not global state
3. **Error Handling**: Centralized middleware with fallback strategies
4. **Logging**: Structured JSON logs with `requestId`, `componentTimings`, and error codes
5. **Configuration**: All secrets and toggles in `.env`, validated at startup
6. **Type Safety**: Full TypeScript with strict mode enabled

---

## Development Guidelines

### Code Style & Conventions

- **Language**: TypeScript (strict mode)
- **Module System**: CommonJS with `src/` source directory
- **Naming**:
  - Classes: PascalCase (e.g., `SearchService`, `ResumeRepository`)
  - Functions/methods: camelCase (e.g., `generateEmbedding`, `rerankCandidates`)
  - Constants: UPPER_SNAKE_CASE (e.g., `MAX_QUERY_LENGTH`, `DEFAULT_TOP_K`)
  - Interfaces: PascalCase with `I` prefix where applicable (e.g., `IResumeDocument`)

- **Error Handling**: Use custom error types (e.g., `DatabaseError`, `EmbeddingError`, `ValidationError`)
- **Logging**: All service methods should log entry/exit (debug level) and errors (error level)
- **Async/Await**: Prefer async/await over `.then()` chains
- **Comments**: Document complex logic, API integration quirks, and fallback strategies

### TypeScript & Type Safety

- Enable `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- Create interfaces for all data structures (requests, responses, internal models)
- Use discriminated unions for error types
- Avoid `any` type; use `unknown` if truly dynamic, then validate

### Service Implementation Pattern

```typescript
export class ServiceName {
  constructor(
    private dependency1: Dependency1,
    private dependency2: Dependency2,
    private logger: LoggingService
  ) {}

  async methodName(params: TypedParams): Promise<TypedResult> {
    const startTime = Date.now();
    this.logger.debug(`${this.constructor.name}.methodName called`, { params });
    
    try {
      // business logic
      const result = await this.doWork();
      this.logger.debug(`${this.constructor.name}.methodName succeeded`, { 
        durationMs: Date.now() - startTime 
      });
      return result;
    } catch (error) {
      this.logger.error(`${this.constructor.name}.methodName failed`, { 
        error, 
        durationMs: Date.now() - startTime 
      });
      throw new ServiceError(error);
    }
  }
}
```

---

## API Design Rules

### Versioning & Endpoints

- All endpoints prefixed with `/v1/` for API versioning
- RESTful conventions: `GET` for reads, `POST` for actions
- Request/response payloads must include `timestamp` and `requestId` for traceability
- Error responses always include `errorCode` (e.g., `VALIDATION_ERROR`, `LLM_FAILURE`)

### Request Validation

- Validate all incoming JSON payloads before routing to services
- Set strict size limits: queries ≤ 2KB, candidates batch ≤ 100 items
- Return `400 Bad Request` with detailed validation error messages
- Return `413 Payload Too Large` for oversized requests

### Fallback Strategy (Critical)

The system implements graceful degradation:

1. **LLM Re-ranking fails** → Fall back to BM25-prioritized hybrid ranking
2. **Vector search fails** → Use BM25 only, set `vectorFallback: true` in response
3. **BM25 fails** → Use vector only, set `bm25Fallback: true` in response
4. **Summarization fails** → Return results without summaries, include warning

**Never return empty results if any search method succeeds.**

---

## Service Layer Details

### EmbeddingService

- **Purpose**: Wrap Mistral embedding API; generate on-demand query embeddings
- **Config**: Model name and dimensions from environment variables
- **Pattern**: Async call with retry logic on transient failures
- **Logging**: Log embedding dimensions, model used, and latency
- **Error Handling**: Throw `EmbeddingError` on persistent failures

### LLMService

Three core methods:

1. **rerankCandidates(query, candidates, topK)**
   - Input: search query + candidate snippets (max 8-10 for cost/latency)
   - Process: Construct prompt, call Groq Llama API, parse ranked list
   - Output: Sorted candidate IDs by relevance score
   - Logging: Log prompt tokens, completion tokens, and re-rank latency

2. **summarizeCandidateFit(query, candidate, options)**
   - Input: query + single candidate + style (short/detailed) + maxTokens
   - Process: Craft fit-summary prompt, call Groq, return narrative summary
   - Output: String summary, bounded by maxTokens
   - Logging: Log token usage and summarization latency

3. **extractMetadata(rawText)**
   - Input: raw resume text
   - Process: Call LLM to extract skills, job titles, experience summary
   - Output: Structured metadata object
   - Logging: Log extraction latency

### SearchService

Orchestrates the full pipeline. Four key methods:

1. **bm25Search(query, filters, topK)**: MongoDB Atlas BM25 search
2. **vectorSearch(query, filters, topK)**: Embedding + ANN vector search
3. **hybridSearch(query, filters, options)**: Run both in parallel, return both lists
4. **endToEndSearch(query, filters, options)**: Full synchronous pipeline (embedding → BM25 → vector → merge → re-rank → summarize)

### ResumeRepository

- **Methods**: CRUD operations, BM25 queries, vector queries
- **MongoDB Patterns**: Use connection pooling, handle connection retries
- **Indexing**: Ensure BM25 index and vector index are configured on collection

---

## Testing Requirements

### Unit Tests

- Mock external APIs (Mistral, Groq, MongoDB)
- Test each service method independently
- Test error handling and fallback logic
- Aim for >80% code coverage on services

### Integration Tests

- Test end-to-end `/v1/search` pipeline with real MongoDB (test database)
- Test fallback scenarios (mock API failures)
- Verify logging output structure and timing metrics
- Test request validation and size limit enforcement

### Test Structure

```
tests/
├── unit/
│   ├── services/
│   │   ├── SearchService.test.ts
│   │   ├── EmbeddingService.test.ts
│   │   ├── LLMService.test.ts
│   │   └── ...
│   └── middleware/
└── integration/
    ├── endpoints/
    ├── pipeline/
    └── fallbacks/
```

---

## Configuration & Secrets

### Environment Variables

```env
# MongoDB
MONGO_URI=mongodb+srv://...
MONGO_DB_NAME=resume_search

# Mistral (Embeddings)
MISTRAL_API_KEY=...
MISTRAL_EMBED_MODEL=mistral-embed
MISTRAL_EMBED_DIMENSIONS=1024

# Groq (LLM)
GROQ_API_KEY=...
GROQ_LLM_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# App
NODE_ENV=development|production|test
PORT=3000
LOG_LEVEL=debug|info|warn|error

# Feature Toggles
ENABLE_SUMMARIZATION=true
RERANK_TOP_K=8
MAX_QUERY_LENGTH=2000
MAX_BATCH_SIZE=100
```

---

## Logging & Monitoring

### Log Structure

Every request produces a structured JSON log upon completion:

```json
{
  "requestId": "req-1234567890",
  "timestamp": "2024-05-24T10:30:00Z",
  "endpoint": "/v1/search",
  "method": "POST",
  "statusCode": 200,
  "durationMs": 2450,
  "componentTimings": {
    "embeddingMs": 200,
    "bm25Ms": 300,
    "vectorMs": 250,
    "mergeMs": 50,
    "rerankMs": 1200,
    "summarizeMs": 450
  },
  "fallbacks": {
    "bm25Fallback": false,
    "vectorFallback": false,
    "rerankFallback": false
  },
  "resultCount": 5,
  "error": null
}
```

### Key Metrics to Track

- Component latencies (embedding, BM25, vector, re-rank, summarize)
- Fallback invocations (log every fallback as `warn` level)
- Error rates by type (validation, database, LLM, embedding)
- Throughput and P95/P99 latencies

---

## Common Tasks & Prompts

When working on specific features, use these focused prompts:

- **`scaffold-project`**: Initialize project structure, dependencies, TypeScript config
- **`implement-endpoint`**: Create a new API endpoint with validation and error handling
- **`implement-service`**: Implement a service class with proper dependency injection
- **`debug-search-pipeline`**: Diagnose search results, latency issues, or fallback scenarios
- **`test-endpoint`**: Generate comprehensive tests for an endpoint
- **`configure-mongodb`**: Set up MongoDB indexes and connection pooling
- **`optimize-latency`**: Profile and improve component latencies

---

## Code Review Checklist

Before committing code:

- [ ] All functions have JSDoc comments with parameter and return types
- [ ] Error handling includes fallback logic where applicable
- [ ] Logging includes entry/exit traces and timing metrics
- [ ] TypeScript strict mode passes with zero errors
- [ ] Unit and integration tests cover the happy path and error cases
- [ ] No hardcoded secrets; all config comes from `.env`
- [ ] External API calls include retry logic with exponential backoff
- [ ] Responses include `requestId` and `timestamp`
- [ ] Database queries use connection pooling and proper error handling
- [ ] Component is compatible with the synchronous pipeline architecture

---

## Debugging & Troubleshooting

### Common Issues

**Search results are low quality:**
- Check LLM re-ranking is running (not skipped due to fallback)
- Verify candidate count passed to re-ranker (should be 8-10, not fewer)
- Review re-ranking prompt for clarity and specificity
- Validate BM25 index includes all searchable fields

**High latency (>5s):**
- Profile each component using componentTimings logs
- Check MongoDB query performance (ensure indexes exist)
- Verify Mistral embedding API latency (not under client control)
- Consider caching frequently-requested embeddings
- Check network connectivity to external APIs

**Fallback activated unexpectedly:**
- Review error logs for service-specific failures
- Verify API keys and rate limits not exceeded
- Check database connectivity and query syntax
- Validate fallback logic is correctly detecting failure conditions

---

## Enterprise Best Practices

1. **Versioning**: Never break `/v1/` contracts; use `/v2/` for breaking changes
2. **Security**: Validate all inputs; never log sensitive data (API keys, PII)
3. **Observability**: Every action must be loggable; use correlation IDs
4. **Graceful Degradation**: Always have a fallback; never return empty results if any method succeeds
5. **Documentation**: Keep README updated; document API changes in CHANGELOG
6. **Performance**: Monitor component timings; set SLAs for each service
7. **Testing**: Unit tests for logic, integration tests for pipelines
8. **Configuration**: Externalize all environment-dependent settings
