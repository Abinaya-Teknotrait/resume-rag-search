---
name: scaffold-project
description: Initialize the Resume RAG Search project structure with dependencies, TypeScript config, and Express server scaffold
---

# Scaffold Resume RAG Search Project

## Task

Set up the complete Node.js + Express project structure for the Resume RAG Search API with:
- TypeScript configuration (strict mode)
- npm dependencies (express, mongodb, dotenv, etc.)
- Project folder structure (`src/`, `tests/`, `.github/`)
- Basic Express server with health check endpoints
- MongoDB connection setup
- Environment variable configuration
- Error handling middleware
- Request logging middleware

## What to Generate

1. **package.json** with all required dependencies:
   - `express`, `typescript`, `ts-node`, `dotenv`, `winston` (logging)
   - `mongodb` (database client)
   - `axios` or `node-fetch` for HTTP calls to Mistral/Groq APIs
   - Dev dependencies: `jest`, `ts-jest`, `@types/node`, `@types/express`
   - Scripts: `start`, `dev`, `build`, `test`, `lint`

2. **tsconfig.json** with strict settings:
   - `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
   - `outDir: dist`, `rootDir: src`
   - `esModuleInterop: true`, `skipLibCheck: true`

3. **Project directory structure**:
   ```
   src/
   ├── app.ts
   ├── server.ts
   ├── config/
   │   └── index.ts
   ├── types/
   │   ├── Resume.ts
   │   ├── Search.ts
   │   └── API.ts
   ├── middleware/
   │   ├── requestId.ts
   │   ├── logging.ts
   │   ├── sizeLimit.ts
   │   └── errorHandler.ts
   ├── routes/
   │   ├── health.ts
   │   └── index.ts
   ├── services/
   │   └── LoggingService.ts
   ├── repositories/
   └── utils/
       ├── validators.ts
       └── errors.ts
   tests/
   ├── unit/
   └── integration/
   .env.example
   .github/
   ├── copilot-instructions.md
   └── prompts/
   ```

4. **.env.example** with all required environment variables:
   ```
   MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority
   MONGO_DB_NAME=resume_search
   MISTRAL_API_KEY=your_key_here
   MISTRAL_EMBED_MODEL=mistral-embed
   GROQ_API_KEY=your_key_here
   GROQ_LLM_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
   NODE_ENV=development
   PORT=3000
   LOG_LEVEL=debug
   ENABLE_SUMMARIZATION=true
   RERANK_TOP_K=8
   MAX_QUERY_LENGTH=2000
   MAX_BATCH_SIZE=100
   ```

5. **Core files**:
   - `src/app.ts`: Express app with middleware setup
   - `src/server.ts`: Server startup with MongoDB connection lifecycle
   - `src/config/index.ts`: Environment validation and constants
   - `src/middleware/`: Request ID, logging, error handling, size limits
   - `src/routes/health.ts`: GET /v1/health and GET /v1/health/db endpoints
   - `src/types/`: Core TypeScript interfaces
   - `src/services/LoggingService.ts`: Structured JSON logging with request context
   - `src/utils/errors.ts`: Custom error types (DatabaseError, ValidationError, etc.)
   - `src/utils/validators.ts`: Input validation helpers

## Key Implementation Details

- **Logging**: Structured JSON logs with Winston, including `requestId`, `timestamp`, `endpoint`, `durationMs`
- **Error Handling**: Custom error classes with error codes; centralized error handler middleware
- **Configuration**: Load and validate all `.env` variables at startup; fail fast on missing required vars
- **MongoDB**: Use connection pooling; test connectivity in `/v1/health/db`
- **Request ID**: Assign UUID to every request; pass through to services for tracing
- **TypeScript Strict Mode**: Zero errors, all functions typed, no implicit any

## Acceptance Criteria

✅ `npm install` succeeds with no warnings  
✅ `npm run build` compiles TypeScript with zero errors  
✅ `npm run dev` starts server on configured port  
✅ `GET /v1/health` returns app name, version, uptime  
✅ `GET /v1/health/db` pings MongoDB and returns latency  
✅ All logs are structured JSON with requestId and timestamp  
✅ Missing `.env` variables cause startup error with clear message  
✅ Oversized requests (>2KB) return 413 Payload Too Large  
✅ Unhandled errors are caught and logged with proper error codes  
✅ TypeScript strict mode enabled, no compilation errors
