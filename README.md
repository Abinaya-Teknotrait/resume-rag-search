# Resume RAG Search API

Enterprise-grade Resume Search API using a RAG (Retrieval-Augmented Generation) approach with Node.js + Express, MongoDB, Mistral embeddings, and Groq LLM.

## Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- MongoDB Atlas cluster with credentials
- Mistral API key
- Groq API key

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
# Edit .env with your actual API keys and MongoDB URI
```

### 3. Build TypeScript
```bash
npm run build
```

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

### Search Index Configs
Search index definitions are stored in `search-index-configs/`.

- `search-index-configs/resume_vector_index.json` — current vector search index definition used by the app
- Keep any future BM25 or vector index JSON files in this folder so the configuration is centralized

## API Endpoints

### Health Checks
- `GET /v1/health` — Application health status
- `GET /v1/health/db` — MongoDB connectivity check

### Response Structure
All successful responses return:
```json
{
  "statusCode": 200,
  "requestId": "req-abc123",
  "timestamp": "2024-05-24T10:30:00Z",
  "durationMs": 1234,
  "data": { /* endpoint-specific data */ }
}
```

Error responses:
```json
{
  "statusCode": 400,
  "requestId": "req-abc123",
  "timestamp": "2024-05-24T10:30:00Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'query' is required"
  }
}
```

## Project Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts             # Server startup & lifecycle
├── config/
│   ├── index.ts         # Configuration & validation
│   └── database.ts      # MongoDB connection
├── types/
│   └── API.ts           # TypeScript interfaces
├── middleware/
│   ├── requestId.ts     # Request ID assignment
│   ├── logging.ts       # Request logging
│   ├── sizeLimit.ts     # Size limit enforcement
│   └── errorHandler.ts  # Error handling
├── routes/
│   └── health.ts        # Health check routes
├── services/
│   └── LoggingService.ts # Structured logging
├── repositories/        # MongoDB CRUD (upcoming)
└── utils/
    ├── errors.ts        # Custom error types
    └── validators.ts    # Input validation
```

## Development Guidelines

### TypeScript Strict Mode
All code is written with `strict: true` TypeScript settings. No implicit `any` types.

### Code Style
- **Classes**: PascalCase (e.g., `SearchService`)
- **Functions**: camelCase (e.g., `validateQuery`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_QUERY_LENGTH`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `ISearchRequest`)

### Error Handling
All errors are caught and returned as structured JSON responses with:
- HTTP status code (400, 500, 503, etc.)
- Error code (VALIDATION_ERROR, DATABASE_ERROR, etc.)
- User-friendly message
- Request ID for tracing

### Logging
Every request logs:
- Entry with parameters
- Exit with duration and status
- All errors with stack traces
- Component timings for performance analysis

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Next Steps

1. **Configure MongoDB indexes** → Use `/configure-mongodb` prompt
2. **Implement EmbeddingService** → Use `/implement-service` prompt
3. **Create search endpoints** → Use `/implement-endpoint` prompt
4. **Add comprehensive tests** → Use `/test-endpoint` prompt

See `.github/prompts/README.md` for detailed development guide and Copilot prompts.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| MONGO_URI | MongoDB connection string | Yes |
| MONGO_DB_NAME | MongoDB database name | No (default: resume_search) |
| MISTRAL_API_KEY | Mistral API key for embeddings | Yes |
| GROQ_API_KEY | Groq API key for LLM | Yes |
| NODE_ENV | Environment (development/production) | No (default: development) |
| PORT | HTTP server port | No (default: 3000) |
| LOG_LEVEL | Logging level (debug/info/warn/error) | No (default: info) |

## Monitoring

All requests generate structured JSON logs with:
- `requestId` — Unique identifier for request tracing
- `timestamp` — ISO 8601 timestamp
- `durationMs` — Total request duration
- `statusCode` — HTTP status code
- `componentTimings` — Performance metrics for each component
- `fallbacks` — Fallback activation flags

View logs:
```bash
# Real-time logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Parse JSON logs
cat logs/combined.log | jq .
```

## Architecture

```
Request Flow:
  POST /v1/search
    ↓
  Middleware: requestId → logging → sizeLimit
    ↓
  Route handler: validation
    ↓
  Service layer: search pipeline
    ├─ EmbeddingService → Mistral API
    ├─ BM25 search → MongoDB
    ├─ Vector search → MongoDB
    ├─ LLM rerank → Groq API
    └─ Summarization → Groq API
    ↓
  Structured JSON response with timings
```

## Support

See `.github/copilot-instructions.md` for comprehensive development guidelines and best practices.

---

**Version**: 1.0.0  
**Framework**: Node.js + Express + TypeScript  
**Database**: MongoDB Atlas  
**LLM**: Groq (Llama)  
**Embeddings**: Mistral  
