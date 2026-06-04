# Copilot Customization Files for Resume RAG Search

This directory contains enterprise-grade Copilot customization files to guide development of the Resume RAG Search API using AI assistance. These files provide consistent coding standards, architecture patterns, and step-by-step implementation prompts.

## 📋 Files Overview

### Main Instructions
- **`.github/copilot-instructions.md`** — General development guidelines for the entire project
  - Architecture overview and layering patterns
  - Code style conventions and TypeScript requirements
  - Service layer design patterns
  - API design rules and fallback strategies
  - Testing requirements and code review checklist
  - Enterprise best practices

### Prompt Templates (Use These to Ask Copilot for Help)

Each prompt file is self-contained with clear acceptance criteria and implementation details. Use them by referencing the prompt name in your question to Copilot.

#### 1. **`scaffold-project.prompt.md`** — Initialize the Project
Use this when: Starting the project from scratch
```bash
Copilot: /scaffold-project
# or in Copilot Chat: "Help me scaffold the Resume RAG Search project"
```

**Includes**:
- package.json setup with all dependencies
- TypeScript strict configuration
- Project folder structure
- .env.example with all required variables
- Express server scaffolding
- Health check endpoints (GET /v1/health, GET /v1/health/db)
- MongoDB connection setup

**Output**: Complete project skeleton ready to build on

---

#### 2. **`implement-endpoint.prompt.md`** — Create API Routes
Use this when: Adding a new REST endpoint
```bash
Copilot: /implement-endpoint
# or in Copilot Chat: "Implement the POST /v1/search/bm25 endpoint"
```

**Covers**:
- 9 endpoints: health, embeddings, BM25, vector, hybrid, rerank, summarize, end-to-end search
- Request/response validation
- Error handling with specific HTTP status codes
- Structured JSON response with requestId and timestamp
- Component timing metrics
- Fallback information flags

**Output**: Complete route handler with validation and logging

---

#### 3. **`implement-service.prompt.md`** — Build Service Layer
Use this when: Creating a service class (SearchService, EmbeddingService, LLMService, etc.)
```bash
Copilot: /implement-service
# or in Copilot Chat: "Implement the EmbeddingService class"
```

**Includes**:
- EmbeddingService: Mistral API wrapper with retry logic
- LLMService: Groq LLM for re-ranking, summarization, metadata extraction
- SearchService: Full pipeline orchestration (BM25 → vector → merge → rerank → summarize)
- ResumeRepository: MongoDB CRUD and search queries
- Dependency injection pattern
- Error handling and fallback strategies
- Logging with component timings

**Output**: Complete service class with type safety and error handling

---

#### 4. **`configure-mongodb.prompt.md`** — Set Up Database
Use this when: Configuring MongoDB Atlas indexes and connection pooling
```bash
Copilot: /configure-mongodb
# or in Copilot Chat: "Help me set up MongoDB indexes for search"
```

**Includes**:
- BM25 search index JSON configuration
- Vector search (ANN) index configuration
- Connection pool setup with recommended parameters
- Health check implementation
- Index validation on startup
- Query optimization examples
- Performance tuning guidelines
- Troubleshooting common issues

**Output**: Ready-to-deploy MongoDB configuration

---

#### 5. **`debug-search-pipeline.prompt.md`** — Troubleshoot Issues
Use this when: Diagnosing search quality, latency, or fallback problems
```bash
Copilot: /debug-search-pipeline
# or in Copilot Chat: "Why are my search results low quality?"
```

**Covers**:
- Low result quality → check re-ranking, BM25 index, prompt clarity
- High latency (>5s) → identify slow component, optimize bottleneck
- Unexpected fallback activation → diagnose API failures, connectivity
- LLM output parsing issues → validate response structure
- Incorrect result ordering → verify merge/dedup logic
- Testing strategies for each component

**Output**: Diagnostic steps and code examples to fix issues

---

#### 6. **`test-endpoint.prompt.md`** — Create Comprehensive Tests
Use this when: Writing unit and integration tests
```bash
Copilot: /test-endpoint
# or in Copilot Chat: "Generate tests for the /v1/search endpoint"
```

**Includes**:
- Unit test template with mocked dependencies
- Integration test template with real database
- Test coverage requirements:
  - Happy path: valid request → 200 OK
  - Validation errors: missing/invalid fields → 400
  - Size limit errors → 413
  - Service errors → 500/503
  - Logging verification
  - Integration scenarios
  - Performance requirements (<5s)
- Test fixtures for reusable data
- Jest configuration examples
- Running tests with coverage

**Output**: Complete test suite with >80% coverage

---

## 🚀 Quick Start Guide

### Step 1: Use the Main Instructions
Read `.github/copilot-instructions.md` to understand:
- Project structure and layering
- Code style and conventions
- Service design patterns
- Fallback strategies

### Step 2: Follow the Implementation Order
The architecture document recommends implementing in this order:

1. **Project Scaffold** → `/scaffold-project`
   ```bash
   npm install
   npm run build
   npm run dev
   # Test: curl http://localhost:3000/v1/health
   ```

2. **Health Endpoints** → Included in `/scaffold-project`

3. **MongoDB Setup** → `/configure-mongodb`
   ```bash
   # Create BM25 and vector indexes in MongoDB Atlas
   # Verify with health/db endpoint
   ```

4. **Embeddings Service & Endpoint** → `/implement-service`, then `/implement-endpoint`
   ```bash
   # Test: POST /v1/embeddings
   ```

5. **BM25 Search** → `/implement-service`, then `/implement-endpoint`
   ```bash
   # Test: POST /v1/search/bm25
   ```

6. **Vector Search** → `/implement-service`, then `/implement-endpoint`
   ```bash
   # Test: POST /v1/search/vector
   ```

7. **Hybrid Search** → `/implement-service`, then `/implement-endpoint`
   ```bash
   # Test: POST /v1/search/hybrid
   ```

8. **LLM Re-ranking & Summarization** → `/implement-service`, then `/implement-endpoint`
   ```bash
   # Test: POST /v1/search/rerank and /v1/search/summarize
   ```

9. **End-to-End Pipeline** → `/implement-service`, then `/implement-endpoint`
   ```bash
   # Test: POST /v1/search with full pipeline
   ```

10. **Testing** → `/test-endpoint`
    ```bash
    npm test
    # Verify >80% coverage
    ```

### Step 3: Ask Copilot for Specific Tasks

In VS Code Copilot Chat, use these patterns:

**For code generation**:
- "Use `/scaffold-project` to set up the project structure"
- "Use `/implement-endpoint` to create the POST /v1/search/bm25 route"
- "Use `/implement-service` to implement the SearchService class"
- "Use `/configure-mongodb` to set up the search indexes"

**For debugging**:
- "Use `/debug-search-pipeline` — search results are low quality"
- "Use `/debug-search-pipeline` — latency is >5 seconds"
- "Use `/debug-search-pipeline` — re-ranking fallback is being triggered"

**For testing**:
- "Use `/test-endpoint` to create tests for the POST /v1/search endpoint"

---

## 📊 Architecture Quick Reference

```
Request Flow:
  PUT /v1/search
    ↓
  validation → requestId → logging middleware
    ↓
  SearchService.endToEndSearch()
    ├─ EmbeddingService.generateEmbedding()
    ├─ bm25Search() → ResumeRepository.bm25Search() → MongoDB
    ├─ vectorSearch() → ResumeRepository.vectorSearch() → MongoDB
    ├─ merge & deduplicate results
    ├─ LLMService.rerankCandidates() → Groq API
    ├─ LLMService.summarizeCandidateFit() (if requested)
    └─ return with timing metrics
    ↓
  response with requestId, timestamp, componentTimings, fallbacks
```

**Key Services**:
- **EmbeddingService**: Mistral API → vector embeddings
- **LLMService**: Groq API → re-ranking + summarization
- **SearchService**: Orchestrates BM25 + vector + rerank pipeline
- **ResumeRepository**: MongoDB queries
- **LoggingService**: Structured JSON logs with requestId

---

## ✅ Development Checklist

Use this to track your implementation progress:

- [ ] Project scaffold complete (`/scaffold-project`)
  - [ ] Dependencies installed
  - [ ] TypeScript strict mode compiles
  - [ ] Environment variables validated
  - [ ] GET /v1/health returns app status

- [ ] MongoDB configured (`/configure-mongodb`)
  - [ ] BM25 index created and READY
  - [ ] Vector index created and READY
  - [ ] Connection pooling configured
  - [ ] GET /v1/health/db returns latency

- [ ] EmbeddingService implemented (`/implement-service`)
  - [ ] Mistral API integration
  - [ ] Retry logic with exponential backoff
  - [ ] Proper logging and error handling
  - [ ] Unit tests pass

- [ ] BM25 Service & Endpoint (`/implement-service` + `/implement-endpoint`)
  - [ ] POST /v1/search/bm25 working
  - [ ] Searches across text, skills, jobTitles, experienceSummary
  - [ ] Filters applied correctly
  - [ ] Integration tests pass

- [ ] Vector Service & Endpoint (`/implement-service` + `/implement-endpoint`)
  - [ ] POST /v1/search/vector working
  - [ ] Uses EmbeddingService
  - [ ] Returns cosine similarity scores
  - [ ] Integration tests pass

- [ ] Hybrid Search (`/implement-service` + `/implement-endpoint`)
  - [ ] POST /v1/search/hybrid returns both result lists
  - [ ] Runs BM25 and vector in parallel
  - [ ] No score merging (kept separate)

- [ ] LLMService implemented (`/implement-service`)
  - [ ] rerankCandidates() re-ranks with Groq LLM
  - [ ] summarizeCandidateFit() generates fit summaries
  - [ ] extractMetadata() extracts skills/titles/experience
  - [ ] Proper error handling and timeouts

- [ ] Re-rank & Summarize Endpoints (`/implement-endpoint`)
  - [ ] POST /v1/search/rerank working
  - [ ] POST /v1/search/summarize working
  - [ ] Integration tests pass

- [ ] End-to-End Search (`/implement-service` + `/implement-endpoint`)
  - [ ] POST /v1/search orchestrates full pipeline
  - [ ] Component timings logged correctly
  - [ ] Fallback logic prevents cascading failures
  - [ ] Latency <5 seconds for typical queries
  - [ ] Integration tests pass

- [ ] Testing Complete (`/test-endpoint`)
  - [ ] >80% code coverage
  - [ ] All endpoints tested (happy path + errors)
  - [ ] Unit tests mock external APIs
  - [ ] Integration tests use test database
  - [ ] `npm test` passes

---

## 🔧 Customization Tips

### For Your Team
If multiple developers are using these prompts, add team-specific guidance to `copilot-instructions.md`:
- Your team's preferred API design patterns
- Environment setup instructions
- Deployment procedures
- Code review standards
- On-call runbooks

### For Your Project
If you add new features, create corresponding prompts in `.github/prompts/`:
- `implement-feature-xyz.prompt.md` for new features
- `deploy-to-production.prompt.md` for deployment workflows
- `optimize-performance.prompt.md` for specific optimizations

---

## 📞 Support

If Copilot doesn't understand a prompt:
1. Check that the prompt file exists in `.github/prompts/`
2. Verify the file has proper YAML frontmatter (name and description)
3. Be specific: "Use /scaffold-project to..." or "Help me with /test-endpoint"
4. Include context: error messages, current behavior, expected behavior

---

## 🏆 Enterprise Standards

These customization files enforce:
- ✅ **Consistency**: All code follows the same patterns
- ✅ **Quality**: >80% test coverage required
- ✅ **Observability**: Structured logging with correlation IDs
- ✅ **Resilience**: Fallback strategies for all failure modes
- ✅ **Performance**: Component timing metrics tracked
- ✅ **Security**: No secrets in code, environment variables only
- ✅ **Documentation**: JSDoc on all functions, clear error codes

---

## 📚 Learn More

- **Architecture Document**: See `Architecture.md` for detailed design
- **General Instructions**: Read `.github/copilot-instructions.md` for comprehensive guidance
- **Code Examples**: Each prompt includes full TypeScript examples
- **Best Practices**: See "Enterprise Best Practices" section in instructions

---

Created: May 24, 2026  
Project: Resume RAG Search API  
Framework: Node.js + Express + TypeScript  
Database: MongoDB Atlas  
Search: BM25 + Vector (ANN) + LLM Re-ranking
