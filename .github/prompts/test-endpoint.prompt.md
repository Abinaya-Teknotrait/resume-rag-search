---
name: test-endpoint
description: Generate comprehensive unit and integration tests for API endpoints including mocks, error cases, and validation
---

# Test API Endpoint

## Task

Create thorough unit and integration tests for a Resume RAG Search API endpoint. Tests should cover happy paths, error cases, edge cases, and validate both request/response structure and business logic.

## Test Structure

Every endpoint gets two test suites:

### 1. Unit Tests (`tests/unit/routes/[endpoint].test.ts`)

Mock all dependencies (services, logger, database). Test route handler logic only.

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import express, { Express } from 'express';
import { IExampleService } from '../../../src/services/ExampleService';
import { ILogger } from '../../../src/services/LoggingService';
import exampleRouter from '../../../src/routes/example';

describe('POST /v1/example', () => {
  let app: Express;
  let mockService: jest.Mocked<IExampleService>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create Express app with middleware
    app = express();
    app.use(express.json());

    // Add request ID middleware
    app.use((req, res, next) => {
      req.id = 'test-req-123';
      next();
    });

    // Add mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    // Add mock service
    mockService = {
      process: jest.fn()
    };

    // Attach logger to request
    app.use((req, res, next) => {
      req.logger = mockLogger;
      req.exampleService = mockService;
      next();
    });

    // Mount router
    app.use(exampleRouter);
  });

  describe('Success Cases', () => {
    it('should return 200 with valid request', async () => {
      mockService.process.mockResolvedValue({ id: '1', name: 'Test' });

      const response = await request(app)
        .post('/v1/example')
        .send({ query: 'test query' });

      expect(response.status).toBe(200);
      expect(response.body.requestId).toBe('test-req-123');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.durationMs).toBeGreaterThanOrEqual(0);
      expect(response.body.data).toEqual({ id: '1', name: 'Test' });
      expect(response.body.error).toBeNull();
    });

    it('should log request entry and exit on success', async () => {
      mockService.process.mockResolvedValue({ id: '1' });

      await request(app)
        .post('/v1/example')
        .send({ query: 'test' });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('called'),
        expect.any(Object)
      );
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 if query is missing', async () => {
      const response = await request(app)
        .post('/v1/example')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('query');
    });

    it('should return 400 if query is empty string', async () => {
      const response = await request(app)
        .post('/v1/example')
        .send({ query: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if query exceeds max length', async () => {
      const longQuery = 'a'.repeat(2001); // MAX_QUERY_LENGTH = 2000

      const response = await request(app)
        .post('/v1/example')
        .send({ query: longQuery });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('exceeds');
    });
  });

  describe('Size Limit Errors', () => {
    it('should return 413 if payload exceeds size limit', async () => {
      const largeCandidates = Array(101).fill({ id: '1', text: 'test' }); // MAX_BATCH = 100

      const response = await request(app)
        .post('/v1/example')
        .send({ query: 'test', candidates: largeCandidates });

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('Service Errors', () => {
    it('should return 500 if service throws unexpected error', async () => {
      mockService.process.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/v1/example')
        .send({ query: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return 503 if service throws ServiceUnavailable', async () => {
      const error = new Error('LLM API timeout');
      error.code = 'SERVICE_UNAVAILABLE';
      mockService.process.mockRejectedValue(error);

      const response = await request(app)
        .post('/v1/example')
        .send({ query: 'test' });

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('Request Logging', () => {
    it('should include durationMs in response', async () => {
      mockService.process.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => resolve({ id: '1' }), 10);
        })
      );

      const response = await request(app)
        .post('/v1/example')
        .send({ query: 'test' });

      expect(response.body.durationMs).toBeGreaterThanOrEqual(10);
    });

    it('should include requestId in response', async () => {
      mockService.process.mockResolvedValue({ id: '1' });

      const response = await request(app)
        .post('/v1/example')
        .send({ query: 'test' });

      expect(response.body.requestId).toBe('test-req-123');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: { query: 'test' } })
      );
    });
  });
});
```

### 2. Integration Tests (`tests/integration/endpoints/[endpoint].test.ts`)

Test with real MongoDB (test database) and real or mocked external APIs.

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/app';
import { MongoClient } from 'mongodb';

describe('POST /v1/example - Integration', () => {
  let mongoClient: MongoClient;

  beforeAll(async () => {
    // Connect to test database
    mongoClient = new MongoClient(process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/resume_search_test');
    await mongoClient.connect();

    // Clear test data
    const db = mongoClient.db();
    await db.collection('resumes').deleteMany({});
  });

  afterAll(async () => {
    await mongoClient.close();
  });

  describe('Full Pipeline', () => {
    it('should find candidates and re-rank them', async () => {
      // Insert test resumes
      const { insertedIds } = await mongoClient
        .db()
        .collection('resumes')
        .insertMany([
          {
            text: 'Senior Node.js Backend Engineer with 5 years MongoDB experience',
            skills: ['Node.js', 'MongoDB', 'Express'],
            name: 'John Doe'
          },
          {
            text: 'Frontend React Developer with 3 years experience',
            skills: ['React', 'JavaScript', 'CSS'],
            name: 'Jane Smith'
          }
        ]);

      // Call endpoint
      const response = await request(app)
        .post('/v1/search')
        .send({
          query: 'Node.js backend engineer',
          topK: 10,
          summarize: false
        });

      expect(response.status).toBe(200);
      expect(response.body.data.results).toHaveLength(2);

      // First result should be the backend engineer
      expect(response.body.data.results[0].name).toBe('John Doe');
      expect(response.body.data.results[1].name).toBe('Jane Smith');
    });

    it('should apply filters correctly', async () => {
      // Test with minYearsExperience filter
      const response = await request(app)
        .post('/v1/search')
        .send({
          query: 'engineer',
          topK: 10,
          filters: { minYearsExperience: 5 }
        });

      expect(response.status).toBe(200);
      expect(response.body.data.results).toBeDefined();
      // All results should have >= 5 years experience (if returned)
    });

    it('should include component timings', async () => {
      const response = await request(app)
        .post('/v1/search')
        .send({
          query: 'engineer',
          topK: 5
        });

      expect(response.status).toBe(200);
      expect(response.body.data.componentTimings).toBeDefined();
      expect(response.body.data.componentTimings).toHaveProperty('embeddingMs');
      expect(response.body.data.componentTimings).toHaveProperty('bm25Ms');
      expect(response.body.data.componentTimings).toHaveProperty('vectorMs');
    });

    it('should include fallback flags when applicable', async () => {
      const response = await request(app)
        .post('/v1/search')
        .send({
          query: 'engineer',
          topK: 5
        });

      expect(response.body.data.fallbacks).toBeDefined();
      expect(response.body.data.fallbacks).toHaveProperty('bm25Fallback');
      expect(response.body.data.fallbacks).toHaveProperty('vectorFallback');
      expect(response.body.data.fallbacks).toHaveProperty('rerankFallback');
    });
  });

  describe('Summarization', () => {
    it('should include summaries if requested', async () => {
      const response = await request(app)
        .post('/v1/search')
        .send({
          query: 'Node.js engineer',
          topK: 5,
          summarize: true,
          summarizeTopK: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.data.summaries).toBeDefined();
      expect(response.body.data.summaries).toHaveLength(2);
      expect(response.body.data.summaries[0]).toMatch(/good fit|relevant|experience/i);
    });

    it('should handle summarization failure gracefully', async () => {
      // Test with invalid query that might cause summarization to fail
      const response = await request(app)
        .post('/v1/search')
        .send({
          query: 'xyz123abc',
          topK: 5,
          summarize: true
        });

      // Should still return results even if summarization fails
      expect(response.status).toBe(200);
      expect(response.body.data.results).toBeDefined();
      if (response.body.data.warning) {
        expect(response.body.data.warning).toContain('summary');
      }
    });
  });

  describe('Error Scenarios', () => {
    it('should handle empty query gracefully', async () => {
      const response = await request(app)
        .post('/v1/search')
        .send({ query: '', topK: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return results even if one search method fails', async () => {
      // This test relies on actual fallback logic
      // If vector search fails, should still get BM25 results
      const response = await request(app)
        .post('/v1/search')
        .send({ query: 'engineer', topK: 10 });

      // Might have fallback flag set, but should have results
      expect(response.status).toBe(200);
      expect(response.body.data.results || response.body.data.fallbacks).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete search in under 5 seconds', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/v1/search')
        .send({ query: 'engineer', topK: 10 });

      const durationMs = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(durationMs).toBeLessThan(5000);
    });
  });
});
```

## Test Coverage Requirements

For each endpoint, create tests covering:

### Happy Path (1 test)
- Valid request → 200 OK with expected response structure

### Validation (3-5 tests)
- Missing required field → 400
- Invalid field type → 400
- Field exceeds constraints (length, count) → 400
- Field below minimum (e.g., topK < 1) → 400

### Size Limits (2 tests)
- Payload too large → 413
- Query too long → 400

### Service Errors (3-5 tests)
- Database error → 500 or fallback
- API error (Mistral/Groq) → 500 or fallback
- Timeout → 503
- Unexpected error → 500

### Logging (2-3 tests)
- Entry/exit logs created with requestId
- Error logged on failure
- Component timings included in response

### Integration (3-5 tests)
- Full pipeline with real MongoDB
- Results are semantically correct
- Filters applied correctly
- Component timings reasonable (<5s total)
- Fallback flags set when applicable

## Test Data Fixtures

Create reusable test fixtures in `tests/fixtures/`:

```typescript
// tests/fixtures/resumes.ts
export const testResumes = [
  {
    name: 'John Backend',
    text: 'Senior Node.js engineer with 5 years MongoDB experience',
    skills: ['Node.js', 'MongoDB', 'Express', 'JavaScript'],
    jobTitles: ['Senior Backend Engineer'],
    experienceSummary: '5 years building scalable APIs',
    totalExperience: 5
  },
  {
    name: 'Jane Frontend',
    text: 'React specialist with 3 years frontend experience',
    skills: ['React', 'JavaScript', 'CSS', 'TypeScript'],
    jobTitles: ['Frontend Developer'],
    experienceSummary: '3 years building web UIs',
    totalExperience: 3
  },
  // ... more test data
];

// tests/fixtures/requests.ts
export const validSearchRequest = {
  query: 'Node.js backend engineer',
  topK: 10,
  filters: {}
};

export const validEmbeddingRequest = {
  input: 'senior engineer',
  model: 'mistral-embed'
};
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run only unit tests
npm test -- tests/unit

# Run only integration tests
npm test -- tests/integration

# Run with coverage
npm test -- --coverage

# Run specific endpoint tests
npm test -- tests/unit/routes/search.test.ts
```

## Acceptance Criteria

✅ Unit tests mock all dependencies (services, logger, database)  
✅ Integration tests use test database and real/mocked APIs  
✅ Happy path test verifies correct response structure  
✅ Validation tests cover all constraints and error codes  
✅ Error tests verify proper HTTP status and error codes  
✅ Logging tests verify requestId, timestamp, and timings in response  
✅ Tests use fixtures for reusable test data  
✅ Tests document expected behavior with clear test names  
✅ Coverage >80% for routes and services  
✅ All tests pass with `npm test`
