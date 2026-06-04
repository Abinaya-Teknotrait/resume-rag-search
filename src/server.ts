import { Server } from 'http';
import { createServer } from 'net';
import { createExpressApp } from './app';
import { config, validateConfig } from './config';
import { initializeDatabase, closeDatabase } from './config/database';
import { getLogger } from './services/LoggingService';
import { getBatchUploadQueueService } from './services/BatchUploadQueueService';

const logger = getLogger();

function isAddressInUseError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && (error as NodeJS.ErrnoException).code === 'EADDRINUSE';
}

async function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer();

    tester.once('error', (error) => {
      if (isAddressInUseError(error)) {
        resolve(false);
        return;
      }

      resolve(false);
    });

    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port);
  });
}

async function findAvailablePort(): Promise<number> {
  const candidatePorts = [3000, 3001];

  for (const port of candidatePorts) {
    if (await isPortFree(port)) {
      logger.info('Detected available port', { port });
      return port;
    }
  }

  throw new Error('Neither port 3000 nor 3001 is available');
}

async function startServerOnPort(app: ReturnType<typeof createExpressApp>, port: number): Promise<Server> {
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));

    server.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Start the Resume RAG Search API server
 * Initializes configuration, database, and Express app
 * Implements graceful shutdown on termination signals
 */
async function startServer(): Promise<void> {
  try {
    // ========================================================================
    // 1. Validate Configuration
    // ========================================================================

    logger.info('Validating configuration...');
    validateConfig();
    logger.info('Configuration validated successfully', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      logLevel: config.logLevel,
      mongoDb: config.mongoDbName,
    });

    // ========================================================================
    // 2. Initialize Database Connection
    // ========================================================================

    logger.info('Connecting to MongoDB...');
    await initializeDatabase();

    // ========================================================================
    // 3. Create Express App
    // ========================================================================

    logger.info('Initializing Express app...');
    const app = createExpressApp();

    // ========================================================================
    // 4. Start HTTP Server
    // ========================================================================

    const port = await findAvailablePort();
    const server = await startServerOnPort(app, port);

    logger.info('Server started successfully', {
      port,
      url: `http://localhost:${port}`,
      environment: config.nodeEnv,
      version: '1.0.0',
    });

    if (config.batchUploadScheduleEnabled) {
      const queueService = getBatchUploadQueueService();
      queueService.startScheduledIngestion();
      logger.info('Scheduled batch ingestion enabled', {
        intervalMs: config.batchUploadScheduleIntervalMs,
      });
    }

    // ========================================================================
    // 5. Graceful Shutdown Handlers
    // ========================================================================

    /**
     * Graceful shutdown on SIGTERM (container termination)
     */
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: shutting down gracefully');

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await closeDatabase();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force exit after 30s if graceful shutdown fails
      setTimeout(() => {
        logger.error('Graceful shutdown timeout exceeded, forcing exit');
        process.exit(1);
      }, 30000);
    });

    /**
     * Graceful shutdown on SIGINT (Ctrl+C)
     */
    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: shutting down gracefully');

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await closeDatabase();

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force exit after 30s if graceful shutdown fails
      setTimeout(() => {
        logger.error('Graceful shutdown timeout exceeded, forcing exit');
        process.exit(1);
      }, 30000);
    });

    /**
     * Unhandled exception handler
     */
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        message: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    /**
     * Unhandled promise rejection handler
     */
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      process.exit(1);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start server', {
      error: message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// ============================================================================
// Start the server
// ============================================================================

startServer().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
