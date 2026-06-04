
# Resume Ingestion Pipeline - Complete Phase-wise Implementation Guide

# Overview

This document contains the complete implementation plan for adding a new Resume ingestion module inside an already existing backend retrieval pipeline.

Existing backend retrieval APIs are already running successfully.

ingestion should be added as a separate module folder but should run inside the same backend server using:

```bash
npm run dev
```

No separate server should be created.

Technology Stack:

- Node.js
- TypeScript
- Express
- MongoDB
- Mistral Embeddings

---

# EXISTING ARCHITECTURE

Already Available:

```text
Retrieval Pipeline
     ↓
Root Backend Server
     ↓
npm run dev
     ↓
PORT 3000
```

---

# TARGET ARCHITECTURE

```text
Retrieval Module
        +
ingestion Module
        ↓
Single Backend Server
        ↓
npm run dev
        ↓
PORT 3000
```

---

# PHASE 1 — Project Setup

## Goal

Prepare ingestion module structure inside existing codebase.

---

## Create Files

```text
src/
├── routes/
│   └── ingestionRoutes.ts
│
├── controllers/
│   └── ingestionController.ts
│
├── services/
│   ├── ResumeParserService.ts
│   ├── ResumeingestionService.ts
│   ├── AlgorithmResumeParser.ts
│   └── LLMResumeParser.ts
│
├── repositories/
│   └── ResumeingestionRepository.ts
│
├── config/
│   ├── multerConfig.ts
│   └── skills.ts
│
├── utils/
│   ├── regex.ts
│   └── textCleaner.ts
```

---

# Install Dependencies

```bash
npm install multer pdf-parse
```

---

# Environment Variables

```env
USE_LLM_PARSER=false

MISTRAL_API_KEY=YOUR_KEY

MISTRAL_EMBED_MODEL=mistral-embed

EMBEDDING_DIMENSION=1024
```

---

# PHASE 2 — PDF Upload API

# Goal

Upload PDF resumes securely.

---

# Create

```text
src/config/multerConfig.ts
```

---

# Requirements

- Accept only PDF
- Max file size 5MB
- Store temporarily in uploads/

---

# Upload Folder

```text
uploads/
```

---

# Endpoint

```http
POST /v1/resume/upload
```

Full URL:

```http
http://localhost:3000/v1/resume/upload
```
---

# Request Type

```text
multipart/form-data
```

---

# Route Registration

## File

```text
src/routes/ingestionRoutes.ts
```

---

# Register Route

```ts
router.post(
  "/resume/inject",
  upload.single("file"),
  ingestionController.injectResume
);
```

---

# Register In app.ts

```ts
app.use("/v1", ingestionRoutes);
```

---

# PHASE 3 — PDF Text Extraction

# Goal

Extract raw text from uploaded PDF.

---

# File

```text
src/services/ResumeParserService.ts
```

---

# Method

```ts
extractTextFromPdf(filePath)
```

---

# Flow

```text
PDF
 ↓
pdf-parse
 ↓
rawText
```

---

```http
POST /v1/resume/extract
```

Full URL:

```http
http://localhost:3000/v1/resume/extract
```

------
# Example Output

```text
ASHWIN P
QA Engineer
Email: ashwin@gmail.com
Skills: Java Selenium Playwright
```

---

# PHASE 4 — Text Cleaning

# Goal

Normalize extracted resume text.

---

# File

```text
src/utils/textCleaner.ts
```

---

# Responsibilities

- Remove extra spaces
- Remove duplicate lines
- Normalize line breaks
- Remove special symbols

---

# Before

```text
ASHWIN P


QA Engineer
```

---

# After

```text
ASHWIN P
QA Engineer
```
-----
```http
POST /v1/resume/clean
```

Full URL:

```http
http://localhost:3000/v1/resume/clean
---

# PHASE 5 — Algorithm Resume Parser

# Goal

Convert resume text → structured JSON without LLM.

---

# File

```text
src/services/AlgorithmResumeParser.ts
```

---

# Main Method

```ts
parseResume(rawText)
```

---

# Output

```json
{
  "name": "ASHWIN P",
  "email": "ashwin@gmail.com",
  "phone": "9876543210",
  "location": "Chennai",
  "skills": [
    "Java",
    "Selenium"
  ],
  "company": "TCS",
  "role": "QA Engineer",
  "education": "B.E Computer Science",
  "totalExperience": 3.3
}
```


```http
POST /v1/resume/parse
```

Full URL:

```http
http://localhost:3000/v1/resume/parse
```

---

# PHASE 6 — Regex Utilities

No API endpoint required.

Internal utility layer only.

# File

```text
src/utils/regex.ts
```

---

# Email Regex

```ts
export const EMAIL_REGEX =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
```

---

# Phone Regex

```ts
export const PHONE_REGEX =
  /(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;
```

---

# Experience Regex

```ts
export const EXPERIENCE_REGEX =
  /(\d+(\.\d+)?)\s*(years|yrs)/i;
```

---

# PHASE 7 — Skills Detection

# Goal

Detect skills using static skill dictionary.

---

# File

```text
src/config/skills.ts
```

---

# Example Skills

```ts
export const SKILLS = [
  "Java",
  "Selenium",
  "Playwright",
  "API Testing",
  "Postman",
  "SQL",
  "MongoDB",
  "Jenkins"
];
```

---

# Detection Logic

```ts
const matchedSkills =
  SKILLS.filter(skill =>
    rawText
      .toLowerCase()
      .includes(skill.toLowerCase())
  );
```

```http
POST /v1/resume/skills
```

Full URL:

```http
http://localhost:3000/v1/resume/skills
```

---

# PHASE 8 — Optional LLM Parser

# Goal

Allow optional LLM parsing via `.env`.

---

# File

```text
src/services/LLMResumeParser.ts
```

---

Placeholder to be added in .env
# Enable

```env
USE_LLM_PARSER=true
```

```http
POST /v1/resume/llm-parse
```

Full URL:

```http
http://localhost:3000/v1/resume/llm-parse
```
---

# Disable

```env
USE_LLM_PARSER=false
```

---

# Dynamic Selection

```ts
if (process.env.USE_LLM_PARSER === "true") {
   parser = new LLMResumeParser();
} else {
   parser = new AlgorithmResumeParser();
}
```

---

# PHASE 9 — Mistral Embedding Generation

# Goal

Generate embedding automatically during ingestion.

---

# Model

```text
mistral-embed
```

---

# Dimension

```text
1024
```

---

# File

```text
src/services/EmbeddingService.ts
```

---

# Embedding Input

```ts
const embeddingText = `
${name}
${role}
${skills.join(",")}
${company}
${rawText}
`;
```

---

# Generate Embedding

```ts
const embedding =
  await embeddingService.generateEmbedding(
    embeddingText
  );
```
```http
POST /v1/resume/embed
```

Full URL:

```http
http://localhost:3000/v1/resume/embed
```
---

# PHASE 10 — MongoDB ingestion

# Goal

Store structured resume + embedding.

---

# File

```text
src/repositories/ResumeingestionRepository.ts
```

---

# Collection

```text
resumes
```

---

# Final Document

```json
{
  "fileName": "resume.pdf",

  "rawText": "Resume content",

  "name": "ASHWIN P",

  "email": "ashwin@gmail.com",

  "phone": "9876543210",

  "location": "Chennai",

  "company": "TCS",

  "role": "QA Engineer",

  "education": "B.E Computer Science",

  "totalExperience": 3.3,

  "skills": [
    "Java",
    "Selenium"
  ],

  "embedding": [],

  "embeddingModel": "mistral-embed",

  "embeddingDimension": 1024
}
```

```http
POST /v1/resume/store
```

Full URL:
npm 
```http
http://localhost:3000/v1/resume/store
---

# PHASE 11 — Resume ingestion Service

# Goal

Orchestrate complete ingestion flow.

---

# File

```text
src/services/ResumeingestionService.ts
```

---

# Full Flow

```text
PDF Upload
    ↓
Extract Text
    ↓
Clean Text
    ↓
Algorithm JSON Parsing
    ↓
Generate Embedding
    ↓
MongoDB ingestion
```

---

# Main Method

```ts
injectResume(file)
```


```http
POST /v1/resume/inject
```

Full URL:

```http
http://localhost:3000/v1/resume/inject

---



# PHASE 12 — Error Handling

# Cases

| Error | Message |
|---|---|
| Invalid PDF | Only PDF allowed |
| Empty Resume | Resume extraction failed |
| Embedding Failure | Mistral embedding failed |
| MongoDB Failure | ingestion failed |


Applies to all endpoints.
---

# PHASE 13 — Logging

Applies to all endpoints.

# Required Logs

```json
{
  "requestId": "abc123",
  "fileName": "resume.pdf",
  "extractMs": 100,
  "parseMs": 200,
  "embeddingMs": 300,
  "mongoInsertMs": 150
}
```

---

# FINAL PIPELINE

```text
PDF Resume
    ↓
Extract Text
    ↓
Regex + Algorithm Parsing
    ↓
Structured JSON
    ↓
Mistral Embedding
    ↓
MongoDB ingestion
```
