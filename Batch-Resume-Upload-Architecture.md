# Batch Resume Upload Architecture

## 1. Feature Overview

### Purpose

The Batch Resume Upload feature enables large-scale ingestion of resume PDFs into MongoDB by leveraging the existing Resume Ingestion Pipeline.

This feature is responsible for:

* Discovering resume files from a configured location
* Creating configurable batches
* Processing resumes in parallel
* Performing MongoDB bulk insert operations
* Tracking failures and retries
* Generating execution statistics
* Supporting configurable runtime parameters

### Existing Components (Already Available)

The following components are assumed to be implemented:

* Resume PDF Reader
* Resume Text Extraction
* Resume Parser
* Resume JSON Generator
* Embedding Generator
* MongoDB Repository
* Resume Search APIs
* Vector Search
* BM25 Search
* Hybrid Search

The Batch Upload feature will orchestrate these components without modifying their internal implementation.

---

## 2. Batch Processing Objectives

| Objective       | Description                                     |
| --------------- | ----------------------------------------------- |
| High Throughput | Process thousands of resumes efficiently        |
| Configurable    | User controls batch size, workers, and retries  |
| Fault Tolerant  | Individual failures do not stop execution       |
| Scalable        | Supports future horizontal scaling              |
| Observable      | Logs and metrics available throughout execution |
| Reusable        | Works with existing ingestion pipeline          |

---

## 3. User Configurable Parameters

### Configuration File

```yaml
resumeUpload:
  sourceFolder: "./Resume"

batch:
  size: 100

parallel:
  workers: 10

retry:
  attempts: 3

logging:
  level: info
```

### Parameter Description

| Parameter        | Description                              |
| ---------------- | ---------------------------------------- |
| sourceFolder     | Resume directory                         |
| batch.size       | Number of resumes per batch              |
| parallel.workers | Number of parallel workers               |
| retry.attempts   | Retry count for failed resume processing |
| logging.level    | Logging verbosity                        |

---

## 4. Recommended Architecture

```text
                     +----------------+
                     | Resume Folder  |
                     +-------+--------+
                             |
                             v
                   +------------------+
                   | File Discovery   |
                   +--------+---------+
                            |
                            v
                   +------------------+
                   | Batch Creator    |
                   +--------+---------+
                            |
          +----------------+----------------+
          |                |                |
          v                v                v

      Batch 1          Batch 2         Batch N

          |                |                |
          +----------------+----------------+
                           |
                           v

               +------------------------+
               | Batch Orchestrator     |
               +-----------+------------+
                           |
                           v

               +------------------------+
               | Parallel Processors    |
               +-----------+------------+
                           |
                           v

               +------------------------+
               | Existing Resume Flow   |
               +-----------+------------+
                           |
                           v

               +------------------------+
               | MongoDB Bulk Insert    |
               +-----------+------------+
                           |
                           v

               +------------------------+
               | Metrics & Logs         |
               +------------------------+
```

---

## 5. Component Responsibilities

### File Discovery Service

Responsibilities:

* Scan configured folder
* Find PDF files
* Validate file existence
* Build processing list

Output:

```text
[
  resume1.pdf,
  resume2.pdf,
  resume3.pdf
]
```

### Batch Creator

Responsibilities:

* Split files into configurable batches
* Create execution units

Example:

```text
Batch Size = 100

Batch 1 → 100 files
Batch 2 → 100 files
Batch 3 → 100 files
Batch 4 → 50 files
```

### Batch Orchestrator

Responsibilities:

* Execute batches sequentially
* Trigger parallel processing
* Aggregate results
* Track execution metrics

### Resume Processing Worker

Responsibilities:

* Receive resume path
* Call existing ingestion pipeline
* Return MongoDB document
* Retry on failure

### MongoDB Bulk Repository

Responsibilities:

* Receive processed documents
* Perform insertMany operation
* Capture insertion failures
* Return insertion metrics

### Metrics Service

Tracks:

* Total files
* Successful files
* Failed files
* Batch duration
* Total duration
* Average processing time

---

## 6. File Discovery Strategy

### Flow

```text
Configured Folder
       |
       v
Scan Files
       |
       v
Filter PDFs
       |
       v
Create Processing List
```

### Validation Rules

| Validation        | Action         |
| ----------------- | -------------- |
| Folder Missing    | Stop Execution |
| No Files Found    | Stop Execution |
| Invalid Extension | Skip File      |
| Duplicate File    | Skip File      |

---

## 7. Batch Creation Strategy

Given:

```yaml
batch:
  size: 100
```

If:

```text
Total Resumes = 2500
```

Then:

```text
Batch 1 = 100
Batch 2 = 100
Batch 3 = 100
...
Batch 25 = 100
```

---

## 8. Parallel Processing Strategy

### Configurable Workers

```yaml
parallel:
  workers: 10
```

### Execution Flow

```text
Batch
  |
  +---- Worker 1
  |
  +---- Worker 2
  |
  +---- Worker 3
  |
  +---- Worker N
```

Each worker executes:

```text
Resume
   |
   v
Existing Resume Pipeline
   |
   v
Mongo Document
```

---

## 9. MongoDB Bulk Insert Strategy

### Recommended Approach

Perform insertion once per batch.

```text
Batch
  |
  v
100 Mongo Documents
  |
  v
Single insertMany()
```

### Benefits

* Fewer database calls
* Better throughput
* Reduced network overhead
* Improved ingestion speed

---

## 10. Processing Flow

```text
Start Execution
      |
      v
Load Configuration
      |
      v
Discover Files
      |
      v
Create Batches
      |
      v
Process Batch
      |
      v
Process Resumes In Parallel
      |
      v
Collect Documents
      |
      v
Bulk Insert
      |
      v
Generate Metrics
      |
      v
Next Batch
      |
      v
Final Summary
```

---

## 11. Retry Strategy

### Configurable Retry Count

```yaml
retry:
  attempts: 3
```

### Retry Flow

```text
Resume Processing
      |
      v
Failure
      |
      v
Retry 1
      |
      v
Retry 2
      |
      v
Retry 3
      |
      v
Mark Failed
```

### Retry Scenarios

| Scenario                  | Retry |
| ------------------------- | ----- |
| Temporary File Read Issue | Yes   |
| Embedding Timeout         | Yes   |
| Mongo Timeout             | Yes   |
| Corrupt PDF               | No    |
| Unsupported File          | No    |

---

## 12. Error Handling Strategy

### Resume-Level Failures

```text
Resume A → Success
Resume B → Failure
Resume C → Success
```

Batch execution continues.

### Batch-Level Failures

```text
Log Error
Retry Batch Insert
```

After retry limit:

```text
Mark Batch Failed
Continue Next Batch
```

---

## 13. Logging Strategy

### Startup Log

```text
Batch Upload Started

Folder: ./Resume
Batch Size: 100
Workers: 10
Retries: 3
```

### Batch Processing Log

```text
Processing Batch 1

Total Files: 100
Successful: 98
Failed: 2
Duration: 30s
```

### Resume Failure Log

```text
Resume Failed

File: resume102.pdf
Reason: PDF Parse Error
Attempt: 3
```

### Completion Log

```text
Upload Completed

Total Files: 2500
Successful: 2492
Failed: 8
Duration: 12m 32s
```

---

## 14. Monitoring & Metrics

| Metric              | Description            |
| ------------------- | ---------------------- |
| Total Files         | All discovered resumes |
| Processed Files     | Successfully processed |
| Failed Files        | Failed after retries   |
| Total Batches       | Number of batches      |
| Batch Duration      | Time per batch         |
| Total Duration      | End-to-end runtime     |
| Average Resume Time | Processing speed       |
| Insert Count        | MongoDB insert count   |
| Embedding Concurrency | Maximum simultaneous provider embedding requests |

---

## 15. Execution Summary Design

```json
{
  "totalFiles": 2500,
  "processed": 2492,
  "failed": 8,
  "batchSize": 100,
  "workers": 10,
  "retryAttempts": 3,
  "executionTimeSeconds": 752,
  "failedFiles": [
    "resume45.pdf",
    "resume320.pdf"
  ]
}
```

---

## 16. Scalability Considerations

### Phase 1 - Single Instance

```text
Application
      |
      v
MongoDB Atlas
```

### Phase 2 - Multiple Worker Nodes

```text
Resume Queue
      |
      +---- Worker Node 1
      |
      +---- Worker Node 2
      |
      +---- Worker Node 3
```

### Phase 3 - Event Driven Processing

```text
Resume Upload
      |
      v
Kafka Topic
      |
      v
Distributed Consumers
```

---

## 17. Phase-wise Implementation Plan

### Phase 1 - Core Batch Upload

Deliverables:

* Folder scanning
* Batch creation
* Parallel workers
* Bulk insert

### Phase 2 - Reliability

Deliverables:

* Retry mechanism
* Failure tracking
* Execution summary

### Phase 3 - Observability

Deliverables:

* Metrics collection
* Dashboard integration
* Performance reporting

### Phase 4 - Scalability

Deliverables:

* Queue integration
* Distributed processing
* Scheduled ingestion

---

## 18. End-to-End Processing Flow

```text
User Configuration
        |
        v
Load Batch Settings
        |
        v
Discover Resume Files
        |
        v
Create Batches
        |
        v
Process Batch
        |
        v
Execute Parallel Workers
        |
        v
Invoke Existing Resume Pipeline
        |
        v
Generate Mongo Documents
        |
        v
MongoDB Bulk Insert
        |
        v
Collect Metrics
        |
        v
Generate Batch Summary
        |
        v
Process Next Batch
        |
        v
Final Execution Report
        |
        v
Upload Completed
```

### Implementation Coverage

This end-to-end flow is covered by the current codebase, including:

* `src/services/BatchUploadService.ts`
* `src/services/BatchUploadQueueService.ts`
* `src/controllers/ingestionController.ts`
* `src/routes/ingestionRoutes.ts`
* `src/app.ts`
* `src/server.ts`

## Key User-Controlled Parameters

| Parameter        | Required | Example  |
| ---------------- | -------- | -------- |
| sourceFolder     | Yes      | ./Resume |
| batch.size       | Yes      | 100      |
| parallel.workers | Yes      | 10       |
| retry.attempts   | Yes      | 3        |
| logging.level    | No       | info     |

## Success Criteria

* User can change batch size without code changes.
* User can change worker count without code changes.
* User can change retry attempts without code changes.
* Thousands of resumes can be processed efficiently.
* Failures do not stop the overall upload process.
* MongoDB writes are optimized using bulk inserts.
* Execution metrics and logs are available for troubleshooting.
