---
name: debug-search-pipeline
description: Diagnose and fix issues in the search pipeline including result quality, latency, fallback activation, and API failures
---

# Debug Resume Search Pipeline

## Task

Diagnose and resolve issues in the `/v1/search` end-to-end pipeline. This prompt helps identify bottlenecks, incorrect fallbacks, API failures, and result quality problems.

## Common Issues & Diagnostics

### Issue 1: Search Results Are Low Quality

**Symptoms**:
- LLM re-ranking seems to be skipped
- Candidates don't match query intent
- Top result is obviously irrelevant

**Diagnostics**:

1. **Check if re-ranking is running**:
   - Look at logs for `LLMService.rerankCandidates` entry/exit
   - If missing, check: was the endpoint called with right query?
   - Verify fallback flags: is `rerankFallback: true` in response?

2. **Verify candidate count to re-ranker**:
   - Before merge/dedup, how many candidates from BM25 + vector combined?
   - Should be 8-10 max passed to LLM (config: `RERANK_TOP_K`)
   - If fewer than 3 candidates, LLM ranking is unreliable

3. **Check BM25 index configuration**:
   - Does index include: `text`, `skills`, `jobTitles`, `experienceSummary`?
   - If missing fields, BM25 won't find relevant resumes
   - Query: Inspect MongoDB Atlas Search index JSON

4. **Validate LLM re-ranking prompt**:
   - Is the prompt clear about the search intent?
   - Check LLM response: are all returned candidate IDs actually in the input list?
   - If LLM returns invalid IDs, parsing is broken

**Fix Steps**:
```typescript
// In SearchService.endToEndSearch():

// Log what goes INTO the reranker
this.logger.debug('Before rerank', {
  candidateCount: mergedResults.length,
  topKForRerank: topK,
  candidates: mergedResults.map(c => ({ 
    id: c._id, 
    score: c.score,
    snippet: c.text.substring(0, 100) 
  }))
});

// Call rerank with detailed error handling
const rerankResult = await this.llmService.rerankCandidates(
  query,
  mergedResults.slice(0, topK),
  topK
);

// Validate LLM response
if (!rerankResult.rankedIds || rerankResult.rankedIds.length === 0) {
  this.logger.warn('Rerank returned empty result, using hybrid ordering', {
    fallback: 'rerankFallback'
  });
  // Fallback to BM25-prioritized ordering
}
```

---

### Issue 2: High Latency (>5 seconds)

**Symptoms**:
- Total duration is consistently >5s
- Unclear which component is slow

**Diagnostics**:

1. **Check component timings in response**:
   ```json
   {
     "componentTimings": {
       "embeddingMs": 200,
       "bm25Ms": 1500,
       "vectorMs": 1200,
       "mergeMs": 50,
       "rerankMs": 800,
       "summarizeMs": 400
     }
   }
   ```
   - Which component dominates? (Likely BM25 or Mistral/Groq APIs)

2. **For embedding latency** (embeddingMs > 500ms):
   - Check Mistral API status and network latency
   - Verify API key isn't rate-limited (check Mistral console)
   - Consider caching frequently-requested embeddings (future optimization)

3. **For BM25 latency** (bm25Ms > 1000ms):
   - Check MongoDB CPU/memory usage
   - Verify BM25 index exists and is healthy: `db.resumes.getIndexes()`
   - If topK is large (>100), reduce to 20-30
   - Check if filters are slowing query (e.g., complex $match stage)

4. **For vector search latency** (vectorMs > 1000ms):
   - Verify vector index exists on `cachedEmbedding` field
   - Check if exact re-score on top-K is expensive; may skip for 1000+ collections
   - Verify embedding dimensions match config

5. **For LLM latency** (rerankMs > 1000ms):
   - Check Groq API status
   - Verify API key quota not exceeded
   - Reduce candidate count passed to reranker (currently 8-10, try 5)
   - Consider async summarization instead of sync

**Fix Steps**:
```typescript
// Profile each component
const timings = {
  embeddingMs: 0,
  bm25Ms: 0,
  vectorMs: 0,
  rerankMs: 0
};

let startTime = Date.now();
const embedding = await this.embeddingService.generateEmbedding(query);
timings.embeddingMs = Date.now() - startTime;

startTime = Date.now();
const bm25Results = await this.bm25Search(query, filters, topK);
timings.bm25Ms = Date.now() - startTime;

// Log if any component exceeds threshold
const SLOW_THRESHOLD = 1000;
Object.entries(timings).forEach(([key, ms]) => {
  if (ms > SLOW_THRESHOLD) {
    this.logger.warn(`Slow component detected`, { component: key, durationMs: ms });
  }
});
```

---

### Issue 3: Fallback Activated Unexpectedly

**Symptoms**:
- Response includes `bm25Fallback: true`, `vectorFallback: true`, or `rerankFallback: true`
- Expected to use all methods but one was skipped

**Diagnostics**:

1. **For bm25Fallback: true**:
   - Check logs for `SearchService.bm25Search` error
   - Verify MongoDB connection is active
   - Check collection exists: `db.resumes.count()`
   - Verify BM25 index exists: `db.resumes.getIndexes()`

2. **For vectorFallback: true**:
   - Check logs for `EmbeddingService.generateEmbedding` error
   - Verify Mistral API key is valid and not expired
   - Check network connectivity to Mistral API
   - Review Mistral error message in logs

3. **For rerankFallback: true**:
   - Check logs for `LLMService.rerankCandidates` error
   - Verify Groq API key is valid
   - Check if rate limit exceeded (Groq dashboard)
   - Validate LLM response parsing (is JSON malformed?)

**Fix Steps**:
```typescript
// In endToEndSearch(), wrap each step:

let bm25Results;
let bm25Fallback = false;
try {
  bm25Results = await this.bm25Search(query, filters, topK);
} catch (error) {
  this.logger.warn('BM25 search failed, will use vector only', { error });
  bm25Fallback = true;
  bm25Results = [];
}

let vectorResults;
let vectorFallback = false;
try {
  vectorResults = await this.vectorSearch(query, filters, topK);
} catch (error) {
  this.logger.warn('Vector search failed, will use BM25 only', { error });
  vectorFallback = true;
  vectorResults = [];
}

// If both failed, log error and return empty results
if (bm25Results.length === 0 && vectorResults.length === 0) {
  this.logger.error('Both BM25 and vector search failed', {});
  throw new Error('No search method available');
}

// Include fallback flags in response
return {
  results,
  fallbacks: { bm25Fallback, vectorFallback }
};
```

---

### Issue 4: LLM Re-ranking Produces Invalid Output

**Symptoms**:
- LLM returns candidate IDs that aren't in the input list
- Response contains unparseable JSON
- Ranking doesn't match human expectations

**Diagnostics**:

1. **Validate LLM response structure**:
   - LLM should return a list of original resumeIds in order
   - Don't accept any candidates not in the input list
   - If parsing fails, fallback to input ordering

2. **Check the re-ranking prompt**:
   - Is it clear what constitutes a "good match"?
   - Does the prompt include enough candidate context (skills, experience)?
   - Consider making the prompt more prescriptive

**Fix Steps**:
```typescript
// In LLMService.rerankCandidates():

const prompt = `
You are a resume ranking expert. Given a search query, rank these candidates by relevance.

Search Query: "${query}"

Candidates:
${candidates.map((c, idx) => `${idx + 1}. ID: ${c._id}, Skills: ${c.skills}, Title: ${c.jobTitles}`).join('\n')}

Return ONLY a JSON array of candidate IDs in ranked order, like:
["id1", "id2", "id3"]

Rank by relevance to the query. DO NOT include IDs not in the input list.
`;

const response = await this.groqAPI.chat({ prompt });
const parsed = JSON.parse(response.choices[0].message.content);

// Validate all returned IDs are in input list
const inputIds = new Set(candidates.map(c => c._id));
const validRanked = parsed.filter(id => inputIds.has(id));

if (validRanked.length === 0) {
  this.logger.error('LLM returned no valid candidate IDs, using input order', {});
  return { rankedIds: candidates.map(c => c._id), scores: [] };
}

return { rankedIds: validRanked, scores: [] };
```

---

### Issue 5: Wrong Candidates in Top Results

**Symptoms**:
- Top result doesn't match query
- Relevant resumes buried in results
- Merge/dedup logic seems incorrect

**Diagnostics**:

1. **Check merge logic**:
   - If a resume is in both BM25 and vector results, which score is used?
   - Should pick the max score (better of the two methods)
   - Verify deduplication by resumeId is working

2. **Verify scoring**:
   - BM25 score and vector score are on different scales
   - Don't try to mathematically combine them (no "30% BM25 + 70% vector")
   - Keep separate lists until LLM re-ranks

3. **Check filters**:
   - Are filters being applied correctly?
   - If filtering out candidates, does the log show filtered count?

**Fix Steps**:
```typescript
// In endToEndSearch() merge step:

const mergedMap = new Map<string, IResume>();

// Add BM25 results
bm25Results.forEach((resume, idx) => {
  mergedMap.set(resume._id.toString(), {
    ...resume,
    bm25Score: bm25Results.length - idx, // Higher rank = higher score
    vectorScore: undefined
  });
});

// Add/update with vector results
vectorResults.forEach((resume, idx) => {
  const existing = mergedMap.get(resume._id.toString());
  if (existing) {
    existing.vectorScore = vectorResults.length - idx;
  } else {
    mergedMap.set(resume._id.toString(), {
      ...resume,
      vectorScore: vectorResults.length - idx,
      bm25Score: undefined
    });
  }
});

const merged = Array.from(mergedMap.values())
  .sort((a, b) => {
    // Prioritize BM25 if both present, otherwise pick whichever exists
    const scoreA = a.bm25Score ?? a.vectorScore ?? 0;
    const scoreB = b.bm25Score ?? b.vectorScore ?? 0;
    return scoreB - scoreA;
  })
  .slice(0, topK);

this.logger.debug('Merge step complete', {
  bm25Count: bm25Results.length,
  vectorCount: vectorResults.length,
  mergedCount: merged.length,
  topK
});
```

---

## Debugging Checklist

When debugging the pipeline:

1. ✅ **Check response logs** for component timings and fallback flags
2. ✅ **Enable debug logging** (set `LOG_LEVEL=debug`)
3. ✅ **Verify external API connectivity** (test embeddings/LLM endpoints directly)
4. ✅ **Check MongoDB indexes** are created and healthy
5. ✅ **Validate request** isn't too large (>2KB) or malformed
6. ✅ **Review LLM response** in logs; look for parsing errors
7. ✅ **Check for rate limits** on external APIs (Mistral, Groq)
8. ✅ **Monitor database latency** during peak queries
9. ✅ **Test with sample queries** that have known good candidates
10. ✅ **Profile each component** independently to find bottleneck

## Testing the Pipeline

Create test cases to isolate issues:

```bash
# Test embedding endpoint
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": "senior backend engineer"}'

# Test BM25 search
curl -X POST http://localhost:3000/v1/search/bm25 \
  -H "Content-Type: application/json" \
  -d '{"query": "senior backend engineer", "topK": 10}'

# Test vector search
curl -X POST http://localhost:3000/v1/search/vector \
  -H "Content-Type: application/json" \
  -d '{"query": "senior backend engineer", "topK": 10}'

# Test hybrid search (both methods)
curl -X POST http://localhost:3000/v1/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{"query": "senior backend engineer", "topK": 10}'

# Test full pipeline
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "senior backend engineer", "topK": 5, "summarize": false}'
```

## Acceptance Criteria

✅ Can identify which component is causing latency using componentTimings logs  
✅ Can diagnose fallback activation by checking error logs  
✅ Can validate merge/dedup logic produces expected result ordering  
✅ Can test each search method independently  
✅ Can verify LLM re-ranking output is valid  
✅ Can detect and fix API key/connectivity issues  
✅ Can optimize queries based on MongoDB index configuration
