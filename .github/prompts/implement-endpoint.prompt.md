---
name: implement-endpoint
description: Implement an API endpoint (route handler) with full validation, error handling, and logging following the Resume RAG Search architecture
---

# Implement API Endpoint

## Task

Create a new Express route handler for one of the Resume RAG Search API endpoints. Include:
- Full TypeScript typing for request/response payloads
- Input validation with detailed error messages
- Size limit enforcement
- Request/response logging with timings
- Error handling with proper HTTP status codes
- Correlation ID (requestId) propagation
- Structured JSON response with `timestamp` and `requestId`

## Endpoint Template

All endpoints must follow this pattern:

```typescript
// src/routes/exampleEndpoint.ts
import { Router, Request, Response, NextFunction } from 'express';
import { IExampleRequest, IExampleResponse } from '../types/API';
import { validate } from '../utils/validators';
import { sendResponse, sendError } from '../utils/response';

const router = Router();

router.post('/v1/example', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.id; // Set by requestId middleware
  
  try {
    // Validate request body
    const validationError = validate(req.body, schema);
    if (validationError) {
      return sendError(res, 400, 'VALIDATION_ERROR', validationError.message, requestId);
    }

    // Log entry
    req.logger?.debug(`POST /v1/example called`, { params: req.body });

    // Process request (call service)
    const result = await exampleService.process(req.body);

    // Log success with timing
    const durationMs = Date.now() - startTime;
    req.logger?.info(`POST /v1/example succeeded`, { 
      durationMs, 
      resultCount: result.length 
    });

    return sendResponse(res, 200, result, requestId, durationMs);
  } catch (error) {
    next(error); // Pass to error handler middleware
  }
});

export default router;
```

## When to Implement This Prompt

Use this prompt to implement any of these endpoints:

1. **POST /v1/embeddings**
   - Generates vector embeddings for text using Mistral API
   - Body: `{ model?: string, input: string }`
   - Returns: `{ embedding: number[], model: string, dimensions: number }`

2. **POST /v1/search/bm25**
   - Full-text search using MongoDB BM25
   - Body: `{ query: string, topK?: number, filters?: object }`
   - Returns: `{ results: Resume[], count: number, timing: number }`

3. **POST /v1/search/vector**
   - Vector semantic search using embeddings
   - Body: `{ query: string, topK?: number, filters?: object }`
   - Returns: `{ results: Resume[], scores: number[], count: number }`

4. **POST /v1/search/hybrid**
   - Combined BM25 + vector search
   - Body: `{ query: string, topK?: number, filters?: object }`
   - Returns: `{ bm25Results: Resume[], vectorResults: Resume[], count: number }`

5. **POST /v1/search/rerank**
   - LLM-based re-ranking of candidates
   - Body: `{ query: string, candidates: Candidate[], topK?: number }`
   - Returns: `{ rankedIds: string[], scores: number[] }`

6. **POST /v1/search/summarize**
   - Generate fit summary for a candidate
   - Body: `{ query: string, candidate: Candidate, style?: "short"|"detailed", maxTokens?: number }`
   - Returns: `{ summary: string, tokensUsed: number }`

7. **POST /v1/search** (End-to-End)
   - Full pipeline: embedding → BM25 → vector → merge → rerank → summarize
   - Body: `{ query: string, filters?: object, topK?: number, summarize?: boolean }`
   - Returns: `{ results: Resume[], summaries?: string[], timing: object, fallbacks: object }`

## Implementation Checklist

- [ ] Create `src/routes/[endpoint].ts` with proper typed request/response interfaces
- [ ] Add validation schema in `src/utils/validators.ts` if new input shape
- [ ] Add request/response types to `src/types/API.ts`
- [ ] Validate all inputs; return 400 with errorCode if invalid
- [ ] Check payload size; return 413 if oversized
- [ ] Log entry with parameters (debug level)
- [ ] Call appropriate service layer method
- [ ] Catch errors and pass to next() for centralized error handler
- [ ] Log success with component timings (info level)
- [ ] Return structured JSON response with requestId, timestamp, durationMs
- [ ] Include fallback information in response (bm25Fallback, vectorFallback, etc.)
- [ ] Add unit test that mocks service and validates response structure
- [ ] Add integration test with real MongoDB/API calls

## Response Structure (All Endpoints)

```json
{
  "statusCode": 200,
  "requestId": "req-abc123",
  "timestamp": "2024-05-24T10:30:00Z",
  "durationMs": 1234,
  "data": {
    // endpoint-specific response
  },
  "error": null
}
```

Error response:
```json
{
  "statusCode": 400,
  "requestId": "req-abc123",
  "timestamp": "2024-05-24T10:30:00Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'query' is required and must be a non-empty string"
  }
}
```

## Key Rules

1. **All inputs are untrusted**: Validate and sanitize everything
2. **Size limits**: Enforce 2KB max for query strings, 100 items max for candidate batches
3. **Error codes**: Use consistent codes like `VALIDATION_ERROR`, `DATABASE_ERROR`, `LLM_FAILURE`, `EMBEDDING_ERROR`
4. **Logging**: Every endpoint logs entry/exit with timing; errors log at error level
5. **Fallback info**: Include fallback flags in response so clients understand what degradation occurred
6. **Performance**: Log component timings (embeddingMs, bm25Ms, vectorMs, rerankMs, summarizeMs)
7. **Correlation**: Pass requestId through to all services for distributed tracing

## Acceptance Criteria

✅ Endpoint is properly typed with interfaces in `src/types/API.ts`  
✅ All inputs validated; returns 400 with errorCode for invalid requests  
✅ Size limit enforced; returns 413 for oversized payloads  
✅ Structured JSON logs with requestId and durationMs  
✅ Error handling: all errors caught and passed to error handler middleware  
✅ Response includes requestId, timestamp, durationMs  
✅ Component timings logged (e.g., embeddingMs, bm25Ms, etc.)  
✅ Fallback flags included in response when applicable  
✅ Unit tests mock services and verify response structure  
✅ Integration tests verify with real database/API calls
