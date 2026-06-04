# Implement API Endpoint

## Purpose
Scaffold a new Express route handler for the Resume RAG Search API following enterprise patterns.

## Context Requirements

Before starting, provide:
1. **Endpoint Path** (e.g., `/v1/search`, `/v1/embeddings`)
2. **HTTP Method** (GET, POST, etc.)
3. **Request Body Schema** (TypeScript interface name from `types/API.ts`)
4. **Response Schema** (TypeScript interface name from `types/API.ts`)
5. **Dependencies** (which services it calls: SearchService, EmbeddingService, etc.)
6. **Validation Rules** (required fields, size limits, format)

## Implementation Template

Your endpoint should follow this structure:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { getLogger } from '../services/LoggingService';
import { IYourRequest, IYourResponse, IApiResponse } from '../types/API';
import { validateYourInput } from '../utils/validators';

const router = Router();
const logger = getLogger();

/**
 * POST /v1/your-endpoint
 * Description: What this endpoint does
 * 
 * Request body:
 * {
 *   "field": "value"
 * }
 * 
 * Response:
 * {
 *   "statusCode": 200,
 *   "requestId": "uuid",
 *   "timestamp": "ISO-8601",
 *   "data": { /* response data */ }
 * }
 */
router.post('/v1/your-endpoint', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req as any).id || 'unknown';
  const startTime = Date.now();

  try {
    // 1. Extract and validate request body
    const { field } = req.body;
    validateYourInput(field);

    // 2. Log request entry
    logger.debug('POST /v1/your-endpoint called', {
      requestId,
      field,
    });

    // 3. Call service(s)
    const result = await yourService.doSomething(field);

    // 4. Build response
    const data: IYourResponse = {
      /* response fields */
    };

    const response: IApiResponse<IYourResponse> = {
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      data,
    };

    // 5. Log success
    logger.info('POST /v1/your-endpoint succeeded', {
      requestId,
      durationMs: Date.now() - startTime,
    });

    res.status(200).json(response);
  } catch (error) {
    // Error handling delegated to middleware
    next(error);
  }
});

export default router;
```

## Key Patterns

### 1. Request Validation
- Validate all input immediately after extraction
- Throw `ValidationError` for invalid input
- Use validators from `src/utils/validators.ts`

### 2. Error Handling
- Catch errors and pass to `next(error)`
- Never return raw error messages
- Logging middleware handles error responses

### 3. Logging
- Log entry with parameters
- Log exit with duration
- Use correlation ID from `req.id`

### 4. Response Format
Always return `IApiResponse<T>`:
```typescript
{
  statusCode: 200,
  requestId: "correlation-id",
  timestamp: "2026-05-24T...",
  data: { /* typed response */ }
}
```

### 5. Timing
- Track start time before service calls
- Include `durationMs` in logs
- Report total request duration

## Common Endpoints

### Search Endpoint
- Path: `POST /v1/search`
- Calls: `SearchService.endToEndSearch()`
- Returns: Search results with scores and timings
- Timeouts: ~3-5 seconds acceptable

### Embeddings Endpoint
- Path: `POST /v1/embeddings`
- Calls: `EmbeddingService.generateEmbedding()`
- Request: `{input: string, model?: string}`
- Response: `{embedding: number[], dimensions: number, model: string}`

### Health Check (Reference)
- Path: `GET /v1/health`
- No dependencies
- Returns: `{status, version, uptime, environment}`

## Testing

After implementation, test with:

```bash
# Using PowerShell
Invoke-WebRequest http://localhost:3000/v1/your-endpoint `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"field":"value"}' `
  -UseBasicParsing | Select-Object -ExpandProperty Content
```

## Architecture Guidelines

Follow the **Resume RAG Search Development Guidelines** in `.github/copilot-instructions.md`:

- **Layering**: Routes → Services → Repositories
- **Dependency Injection**: Pass dependencies via constructor
- **Type Safety**: Full TypeScript with strict mode
- **Error Handling**: Custom error types with proper HTTP codes
- **Logging**: Structured JSON with requestId and timings
- **Configuration**: All secrets from `.env`
- **Fallbacks**: Graceful degradation when services fail

## Common Mistakes to Avoid

❌ Logging raw errors or sensitive data  
❌ Missing request validation  
❌ Not including timing metrics  
❌ Hardcoding configuration values  
❌ Returning errors without error codes  
❌ Forgetting to use correlation ID  

## Next Steps

1. Define your request/response types in `src/types/API.ts`
2. Implement the route handler
3. Add input validators if needed in `src/utils/validators.ts`
4. Create unit tests in `tests/unit/routes/`
5. Test endpoint manually

---

For more details, see:
- `.github/copilot-instructions.md` — Architecture and patterns
- `src/routes/health.ts` — Health check reference implementation
- `src/types/API.ts` — All endpoint interfaces
