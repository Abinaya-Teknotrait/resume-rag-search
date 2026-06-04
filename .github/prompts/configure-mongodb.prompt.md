---
name: configure-mongodb
description: Set up MongoDB indexes (BM25 and vector) and configure connection pooling for the Resume search system
---

# Configure MongoDB for Resume Search

## Task

Set up MongoDB Atlas Search indexes and connection pooling for the Resume RAG Search API to support:
- BM25 full-text search across multiple fields
- Vector/ANN search for semantic similarity
- Proper connection pooling for production workloads
- Index health monitoring

## MongoDB Atlas Search Index Setup

### 1. BM25 Search Index

Create a search index named `bm25_search` on the `resumes` collection:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "text": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "skills": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "jobTitles": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "experienceSummary": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "name": {
        "type": "string"
      },
      "location": {
        "type": "string"
      }
    }
  }
}
```

**Steps in MongoDB Atlas UI**:
1. Navigate to Cluster → Collections → resumes
2. Click "Search" tab
3. Click "Create Search Index"
4. Use custom JSON editor
5. Paste the above JSON configuration
6. Name it: `bm25_search`
7. Click "Create"

**MongoDB Query (BM25)**:
```typescript
// In ResumeRepository.bm25Search()
const results = await collection.aggregate([
  {
    $search: {
      "text": {
        "query": query,
        "path": ["text", "skills", "jobTitles", "experienceSummary"],
        "fuzzy": {
          "maxEdits": 1
        }
      }
    }
  },
  { $limit: topK },
  {
    $addFields: {
      score: { $meta: "searchScore" }
    }
  }
]).toArray();
```

---

### 2. Vector Search Index (ANN)

Create a search index named `vector_search` for semantic similarity:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

**Steps in MongoDB Atlas UI**:
1. Navigate to Cluster → Collections → resumes
2. Click "Search" tab
3. Click "Create Search Index"
4. Use custom JSON editor
5. Paste the above JSON configuration
6. Name it: `vector_search`
7. Click "Create"

**MongoDB Query (Vector Search)**:
```typescript
// In ResumeRepository.vectorSearch()
const results = await collection.aggregate([
  {
    $search: {
      "cosmosSearch": {
        "vector": embedding,
        "k": topK
      },
      "returnStoredSource": true
    }
  },
  {
    $addFields: {
      similarityScore: { $meta: "searchScore" }
    }
  }
]).toArray();
```

---

## Connection Pool Configuration

### 1. MongoDB Client Setup

Configure connection pooling in `src/config/index.ts`:

```typescript
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'resume_search';

// Create client with connection pooling
export const mongoClient = new MongoClient(mongoUri, {
  maxPoolSize: 10,           // Max simultaneous connections
  minPoolSize: 5,            // Min idle connections
  socketTimeoutMS: 30000,    // 30s socket timeout
  serverSelectionTimeoutMS: 5000, // 5s server selection timeout
  retryWrites: true,         // Automatic retry on network error
  retryReads: true,          // Automatic retry on read errors
  maxIdleTimeMS: 60000,      // Close connections idle >1min
  waitQueueTimeoutMS: 10000  // Queue timeout for requests
});

// Connect and return database instance
export async function getDatabase() {
  if (!mongoClient.topology || !mongoClient.topology.isConnected()) {
    await mongoClient.connect();
  }
  return mongoClient.db(mongoDbName);
}

// Health check
export async function checkDatabaseHealth() {
  try {
    const db = await getDatabase();
    const startTime = Date.now();
    
    // Ping the server
    await db.admin().ping();
    
    const latency = Date.now() - startTime;
    return { status: 'healthy', latencyMs: latency };
  } catch (error) {
    return { status: 'unhealthy', error: (error as Error).message };
  }
}

// Graceful shutdown
export async function closeDatabase() {
  if (mongoClient) {
    await mongoClient.close();
  }
}
```

### 2. Server Lifecycle

Integrate connection management in `src/server.ts`:

```typescript
import { getDatabase, closeDatabase } from './config';
import { LoggingService } from './services/LoggingService';

const logger = new LoggingService();

async function startServer() {
  try {
    // Connect to MongoDB
    const db = await getDatabase();
    logger.info('Connected to MongoDB', { uri: process.env.MONGO_URI });

    // Create Express app
    const app = createExpressApp(db);

    // Start HTTP server
    const port = parseInt(process.env.PORT || '3000');
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`, { 
        environment: process.env.NODE_ENV,
        mongoDbName: process.env.MONGO_DB_NAME
      });
    });

    // Graceful shutdown on SIGTERM/SIGINT
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      await closeDatabase();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
```

---

## Index Health & Monitoring

### 1. Check Index Status

```typescript
// Check if indexes exist and are active
export async function verifyIndexes() {
  const db = await getDatabase();
  const searchIndexes = await db.collection('resumes').searchIndexes().list();
  
  const indexes = await searchIndexes.toArray();
  
  const hasBm25 = indexes.some(idx => idx.name === 'bm25_search' && idx.status === 'READY');
  const hasVector = indexes.some(idx => idx.name === 'vector_search' && idx.status === 'READY');
  
  return {
    bm25IndexReady: hasBm25,
    vectorIndexReady: hasVector,
    allIndexes: indexes
  };
}
```

### 2. Startup Validation

Add to `src/app.ts`:

```typescript
// On startup, verify indexes exist
async function validateIndexes() {
  const indexStatus = await verifyIndexes();
  
  if (!indexStatus.bm25IndexReady) {
    throw new Error('BM25 search index is not ready. Please create it in MongoDB Atlas.');
  }
  
  if (!indexStatus.vectorIndexReady) {
    throw new Error('Vector search index is not ready. Please create it in MongoDB Atlas.');
  }
  
  logger.info('Search indexes validated', indexStatus);
}

// Call during app initialization
await validateIndexes();
```

---

## Query Optimization

### 1. BM25 Query Optimization

```typescript
// Combine multiple text fields with weighting
const results = await collection.aggregate([
  {
    $search: {
      "text": {
        "query": query,
        "path": [
          { "value": "text", "multi": "textIndexed" },
          { "value": "skills" },
          { "value": "jobTitles" },
          { "value": "experienceSummary" }
        ],
        "fuzzy": { "maxEdits": 1 },
        "score": { "boost": { "value": 2 } }
      }
    }
  },
  {
    $match: {
      // Apply filters
      ...(filters?.location && { location: filters.location }),
      ...(filters?.minYearsExperience && { 
        totalExperience: { $gte: filters.minYearsExperience }
      })
    }
  },
  { $limit: topK },
  { $addFields: { score: { $meta: "searchScore" } } }
]).toArray();
```

### 2. Vector Search with Re-scoring

```typescript
// Use ANN for fast retrieval, then exact score on top-K
const results = await collection.aggregate([
  {
    $search: {
      "cosmosSearch": {
        "vector": embedding,
        "k": topK * 2  // Get more than needed
      }
    }
  },
  {
    $addFields: {
      score: { $meta: "searchScore" }
    }
  },
  { $limit: topK }  // Trim to final topK
]).toArray();
```

---

## Performance Tuning

### Connection Pool Recommendations

| Parameter | Development | Production |
|-----------|-------------|-----------|
| maxPoolSize | 10 | 50-100 |
| minPoolSize | 5 | 20-30 |
| socketTimeoutMS | 30000 | 30000 |
| maxIdleTimeMS | 60000 | 60000 |

### Index Health Checks

Monitor these metrics in MongoDB Atlas:

- **Index Size**: Should be reasonable compared to collection size
- **Query Performance**: Use Atlas Performance Advisor
- **Slow Queries**: Monitor queries taking >100ms
- **Index Efficiency**: Check % of docs scanned vs returned

---

## Troubleshooting

### Issue: Index Not Ready

**Symptom**: `INVALID_ARGUMENT` error on search

**Fix**:
1. Check MongoDB Atlas UI → Search Indexes tab
2. Ensure index shows status "READY" (green)
3. Wait 5-10 minutes for large collections
4. Verify index JSON syntax is correct

### Issue: Vector Search Returns No Results

**Symptom**: Vector search returns 0 results

**Fix**:
1. Verify `embedding` field exists in documents: `db.resumes.findOne()`
2. Check embedding dimensions: should be 1024 for mistral-embed
3. Verify vector index path is `"embedding"` (exact match)
4. Check for null/missing embeddings: `db.resumes.find({ embedding: null })`

### Issue: Slow BM25 Queries

**Symptom**: BM25 search takes >1s

**Fix**:
1. Check index status: `db.collection('resumes').searchIndexes().list()`
2. Verify topK is reasonable (50-100, not 1000+)
3. Check collection size: `db.resumes.countDocuments()`
4. Review slow query logs in Atlas

---

## Acceptance Criteria

✅ BM25 index named `bm25_search` created and READY status  
✅ Vector index named `vector_search` created with numDimensions: 1024  
✅ Connection pooling configured with minPoolSize: 5, maxPoolSize: 10  
✅ Database health check endpoint returns latency  
✅ Startup validation ensures both indexes exist  
✅ BM25 queries search across text, skills, jobTitles, experienceSummary  
✅ Vector queries use cosine similarity for ANN search  
✅ All queries include filters support (location, minYearsExperience, etc.)  
✅ Graceful shutdown closes all database connections  
✅ Query performance acceptable (<1s for typical workloads)
