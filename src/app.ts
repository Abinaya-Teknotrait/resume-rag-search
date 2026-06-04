import express, { Express, Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from './middleware/requestId';
import { loggingMiddleware } from './middleware/logging';
import { sizeLimitMiddleware } from './middleware/sizeLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import healthRoutes from './routes/health';
import embeddingsRoutes from './routes/embeddings';
import searchRoutes from './routes/search';
import candidateRoutes from './routes/candidate';
import ingestionRoutes from './routes/ingestionRoutes';
import metricsRoutes from './routes/metrics';
import { getLogger } from './services/LoggingService';

const logger = getLogger();

/**
 * Create and configure Express application
 * Sets up middleware, routes, and error handling
 */
export function createExpressApp(): Express {
  const app = express();

  // ============================================================================
  // Built-in Middleware
  // ============================================================================

  // Parse JSON requests
  app.use(express.json({ limit: '100kb' }));

  // Parse URL-encoded requests
  app.use(express.urlencoded({ limit: '100kb', extended: true }));

  // ============================================================================
  // Custom Middleware (in order)
  // ============================================================================

  // 1. Request ID assignment for tracing
  app.use(requestIdMiddleware);

  // 2. Request logging
  app.use(loggingMiddleware);

  // 3. Payload size limit enforcement
  app.use(sizeLimitMiddleware);

  // 4. CORS support for local frontend development
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    const allowedOrigins = [
      'http://localhost:4173',
      'http://localhost:4174',
      'http://localhost:4175',
      'http://localhost:4176',
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }

    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Source'
    );
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // ============================================================================
  // Routes
  // ============================================================================

  // Health check endpoints
  app.use(healthRoutes);

  // Embeddings endpoint
  app.use(embeddingsRoutes);

  // Search endpoint
  app.use(searchRoutes);

  // Candidate profile endpoint
  app.use(candidateRoutes);

  // Ingestion endpoints (resume upload/extract/clean/parse)
  app.use(ingestionRoutes);

  // Observability endpoints
  app.use(metricsRoutes);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    const requestId = (req as any).id || 'unknown';
    res.json({
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      message: 'Resume RAG Search API v1.0.0',
      endpoints: [
        { method: 'GET', path: '/v1/health', description: 'Health check' },
        { method: 'GET', path: '/v1/health/db', description: 'Database health check' },
        { method: 'GET', path: '/v1/metrics', description: 'Service metrics snapshot' },
        { method: 'POST', path: '/v1/embeddings', description: 'Generate vector embedding' },
        { method: 'POST', path: '/v1/search/bm25', description: 'BM25 search over resumes' },
        { method: 'POST', path: '/v1/search/vector', description: 'Vector search over resumes' },
        { method: 'GET', path: '/v1/candidate/:id', description: 'Get details for an individual candidate' },
        { method: 'POST', path: '/v1/resume/batch-upload', description: 'Batch upload resumes from folder' },
        { method: 'POST', path: '/v1/resume/batch-upload/queue', description: 'Enqueue a batch upload job' },
        { method: 'GET', path: '/v1/resume/batch-upload/queue', description: 'List batch upload queue jobs' },
        { method: 'GET', path: '/v1/resume/batch-upload/queue/:jobId', description: 'Get batch upload job status' },
      ],
    });
  });

  // ============================================================================
  // Error Handling (must be last)
  // ============================================================================

  // 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express app configured successfully', {
    middleware: ['requestId', 'logging', 'sizeLimit'],
    routes: ['health', 'embeddings', 'search', 'candidate', 'ingestion'],
  });

  return app;
}
