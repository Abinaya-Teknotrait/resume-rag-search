# 🚀 Getting Started in 5 Minutes

Resume RAG Search project scaffold is ready. Follow these steps to get started immediately.

## Prerequisites
- Node.js 18+ and npm 9+
- MongoDB Atlas account
- Mistral API key
- Groq API key

## Quick Start

### 1️⃣ Install Dependencies (1 minute)
```bash
npm install
```

### 2️⃣ Configure Environment (2 minutes)
```bash
# Copy template
cp .env.example .env

# Edit with your credentials
# MONGO_URI=mongodb+srv://...
# MISTRAL_API_KEY=...
# GROQ_API_KEY=...
```

### 3️⃣ Start Development Server (30 seconds)
```bash
npm run dev
```

You should see:
```
info: Server started successfully {
  "port": 3000,
  "url": "http://localhost:3000",
  "environment": "development"
}
```

### 4️⃣ Test Health Endpoints (1 minute)
Open a new terminal:
```bash
# Application health
curl http://localhost:3000/v1/health | jq .

# Database connectivity
curl http://localhost:3000/v1/health/db | jq .
```

## ✅ You're Done!

The project scaffold is running. Now you can:

### Option A: Follow the Implementation Roadmap
1. **Configure MongoDB indexes** → Use `/configure-mongodb` prompt
2. **Build EmbeddingService** → Use `/implement-service` prompt
3. **Create search endpoints** → Use `/implement-endpoint` prompt
4. **Add tests** → Use `/test-endpoint` prompt

See `.github/prompts/README.md` for complete guide.

### Option B: Explore the Code
```bash
# View project structure
tree -L 2 src/

# View health endpoints implementation
cat src/routes/health.ts

# View configuration
cat src/config/index.ts
```

### Option C: Run Tests
```bash
npm test
npm test -- --coverage
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| [README.md](README.md) | Project overview & API reference |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Detailed setup with troubleshooting |
| [SCAFFOLD_SUMMARY.md](SCAFFOLD_SUMMARY.md) | What was generated |
| [.github/copilot-instructions.md](.github/copilot-instructions.md) | Architecture & best practices |
| [.github/prompts/README.md](.github/prompts/README.md) | Copilot prompt guide |

---

## 🔥 Useful Commands

```bash
# Development (with auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run production server
npm start

# Run all tests
npm test

# Test with coverage
npm test -- --coverage

# Check types
npm run type-check

# View logs
tail -f logs/combined.log | jq .

# View errors only
tail -f logs/error.log | jq .
```

---

## 📍 Key Files

```
src/
├── app.ts              # Express configuration
├── server.ts           # Server startup & shutdown
├── config/
│   ├── index.ts       # Environment variables
│   └── database.ts    # MongoDB connection
├── routes/
│   └── health.ts      # Health check endpoints
└── middleware/
    ├── requestId.ts   # Request ID assignment
    ├── logging.ts     # Logging
    ├── sizeLimit.ts   # Size limits
    └── errorHandler.ts # Error handling
```

---

## 🎯 What's Ready

✅ TypeScript strict mode  
✅ Express app with middleware  
✅ MongoDB connection pooling  
✅ Structured JSON logging  
✅ Error handling  
✅ Health check endpoints  
✅ Request ID correlation  
✅ Input validation  
✅ Jest testing  
✅ Comprehensive documentation  

---

## ⚠️ Troubleshooting

**Problem**: "MONGO_URI not set"  
**Solution**: Ensure `.env` file exists with `MONGO_URI=...`

**Problem**: "MongoDB connection failed"  
**Solution**: 
1. Check MongoDB Atlas cluster is running
2. Verify IP is whitelisted (use 0.0.0.0/0 for testing)
3. Test connection string separately

**Problem**: "Port 3000 already in use"  
**Solution**: Change `PORT=3001` in `.env`

**Problem**: "npm install fails"  
**Solution**: 
1. Delete `node_modules` and `package-lock.json`
2. Run `npm cache clean --force`
3. Run `npm install` again

---

## 🚦 Next Steps

1. **Test the setup** → Run `npm run dev` and verify endpoints work
2. **Read the architecture** → See `.github/copilot-instructions.md`
3. **Configure MongoDB** → Follow `/configure-mongodb` prompt
4. **Implement services** → Follow `/implement-service` prompt
5. **Create endpoints** → Follow `/implement-endpoint` prompt

---

## 📞 Support

- **Setup issues**: See [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **Architecture**: See [.github/copilot-instructions.md](.github/copilot-instructions.md)
- **Implementation**: See [.github/prompts/README.md](.github/prompts/README.md)
- **Code**: See inline comments and JSDoc

---

## ✨ Features

- **Structured Logging**: JSON logs with requestId for tracing
- **Type Safety**: TypeScript strict mode, no implicit any
- **Error Handling**: Centralized with custom error types
- **Database**: MongoDB with connection pooling
- **Testing**: Jest + TypeScript ready
- **Documentation**: Comprehensive guides and examples

---

**Version**: 1.0.0  
**Status**: ✅ Ready for development  
**Last Updated**: May 24, 2026

👉 **Next**: Run `npm run dev` to start coding!
