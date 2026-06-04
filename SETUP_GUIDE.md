# Project Setup Guide

This guide walks through getting the Resume RAG Search project up and running.

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages:
- **express**: Web framework
- **mongodb**: Database client with connection pooling
- **winston**: Structured logging
- **typescript**: Type safety
- **ts-node-dev**: Auto-reloading development server
- **jest + ts-jest**: Testing framework

## Step 2: Configure Environment Variables

### Copy the template
```bash
cp .env.example .env
```

### Edit `.env` with your actual values

**MongoDB Setup:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster or use existing one
3. Click "Connect" → "Drivers"
4. Copy the connection string
5. Paste into `MONGO_URI` in `.env`
6. Replace `<password>` with your database password

**Mistral API:**
1. Go to [Mistral Console](https://console.mistral.ai/)
2. Create API key in "API Keys" section
3. Paste into `MISTRAL_API_KEY` in `.env`

**Groq API:**
1. Go to [Groq Console](https://console.groq.com/)
2. Create API key in "API Keys" section
3. Paste into `GROQ_API_KEY` in `.env`

### Example .env file
```env
# MongoDB
MONGO_URI=mongodb+srv://user:password@cluster0.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=resume_search

# APIs
MISTRAL_API_KEY=abc123...
GROQ_API_KEY=xyz789...

# App
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

## Step 3: Verify TypeScript Configuration

Check that strict TypeScript mode is working:
```bash
npm run type-check
```

Should show: `No errors!`

## Step 4: Build the Project

Compile TypeScript to JavaScript:
```bash
npm run build
```

This creates the `dist/` directory with compiled code.

## Step 5: Start the Server

### Development Mode (Recommended)
Watches for file changes and auto-reloads:
```bash
npm run dev
```

### Production Mode
Runs compiled code:
```bash
npm run build
npm start
```

### Expected Output
```
info: Server started successfully {
  "port": 3000,
  "url": "http://localhost:3000",
  "environment": "development",
  "version": "1.0.0"
}
```

## Step 6: Test the Health Endpoints

### In a new terminal, test health check:

```bash
# Application health
curl http://localhost:3000/v1/health | jq .

# Database connectivity
curl http://localhost:3000/v1/health/db | jq .
```

Expected response:
```json
{
  "statusCode": 200,
  "requestId": "req-abc123",
  "timestamp": "2024-05-24T10:30:00Z",
  "data": {
    "status": "healthy",
    "service": "resume-rag-search",
    "version": "1.0.0",
    "uptime": 5000,
    "environment": "development"
  }
}
```

## Step 7: Run Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Troubleshooting

### Issue: "MONGO_URI environment variable is not set"
**Fix**: Ensure `.env` file exists and has `MONGO_URI` set.

### Issue: "Failed to connect to MongoDB"
**Check**:
1. MongoDB Atlas cluster is running
2. Connection string is correct
3. IP address is whitelisted in MongoDB Atlas (use 0.0.0.0/0 for testing)
4. Network connectivity from your machine to MongoDB

### Issue: "TypeScript compilation errors"
**Fix**: Run `npm run type-check` and fix any errors. Ensure TypeScript strict mode is satisfied.

### Issue: "Port 3000 already in use"
**Fix**: Change PORT in `.env` or kill the existing process.

## Project Structure

```
.
├── src/                          # Source code
│   ├── app.ts                   # Express app setup
│   ├── server.ts                # Server startup
│   ├── config/
│   │   ├── index.ts            # Config & validation
│   │   └── database.ts         # MongoDB setup
│   ├── types/
│   │   └── API.ts              # TypeScript interfaces
│   ├── middleware/
│   │   ├── requestId.ts        # Request ID assignment
│   │   ├── logging.ts          # Request logging
│   │   ├── sizeLimit.ts        # Size limit enforcement
│   │   └── errorHandler.ts     # Error handling
│   ├── routes/
│   │   └── health.ts           # Health check endpoints
│   ├── services/
│   │   └── LoggingService.ts   # Logging service
│   ├── repositories/           # MongoDB CRUD (coming)
│   └── utils/
│       ├── errors.ts           # Error types
│       └── validators.ts       # Validation helpers
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── setup.ts               # Test setup
├── dist/                       # Compiled JavaScript (generated)
├── logs/                       # Log files (generated)
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
├── .gitignore
└── README.md
```

## Next Steps

Once the project is running:

1. **Create MongoDB Indexes** → Follow `/configure-mongodb` prompt
2. **Implement EmbeddingService** → Follow `/implement-service` prompt
3. **Create Search Endpoints** → Follow `/implement-endpoint` prompt
4. **Add Tests** → Follow `/test-endpoint` prompt

See `.github/prompts/README.md` for detailed implementation guide.

## Development Workflow

```bash
# 1. Start development server
npm run dev

# 2. In another terminal, make changes to src/
# Changes auto-reload

# 3. Test endpoints
curl http://localhost:3000/v1/health

# 4. Check logs
tail -f logs/combined.log | jq .

# 5. Run tests
npm test

# 6. Before committing, verify everything
npm run type-check
npm test
npm run build
```

## Logs

Logs are written to two files:
- **`logs/combined.log`** — All logs (debug, info, warn, error)
- **`logs/error.log`** — Error logs only

Each log entry is JSON formatted for easy parsing:
```bash
# View last 10 log entries
tail -10 logs/combined.log | jq .

# Search logs for errors
grep "ERROR" logs/combined.log | jq .

# Pretty print logs
cat logs/combined.log | jq -r '.timestamp, .level, .message'
```

## Configuration Validation

The server validates all required environment variables on startup:
- `MONGO_URI` — MongoDB connection string
- `MISTRAL_API_KEY` — Mistral API key
- `GROQ_API_KEY` — Groq API key

If any required variable is missing, the server fails fast with a clear error message.

## Graceful Shutdown

The server handles graceful shutdown:
- Closes HTTP server
- Closes database connections
- Allows 30 seconds for cleanup
- Exits with code 0 on success

Trigger shutdown with `Ctrl+C` or by sending SIGTERM signal.

## Performance Notes

- **Database connection pooling**: min 5, max 10 concurrent connections
- **Request timeout**: 30 seconds default
- **Payload limit**: 100 KB max
- **Log format**: Structured JSON for easy parsing

## Next: MongoDB Configuration

Once the server is running, follow the `/configure-mongodb` prompt to:
1. Create BM25 search index in MongoDB Atlas
2. Create vector search index for embeddings
3. Verify indexes are ready

---

**Need help?** See `.github/copilot-instructions.md` for comprehensive guidelines.
