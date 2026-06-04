import { Request, Response, NextFunction } from 'express';
import { getLogger } from '../services/LoggingService';

/**
 * Middleware: Attach logger instance to request
 * Makes logging service available to all route handlers
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = getLogger();
  (req as any).logger = logger;

  // Log request entry
  const requestId = (req as any).id || 'unknown';
  logger.logRequestEntry(
    requestId,
    req.method,
    req.path,
    req.method === 'POST' ? req.body : undefined
  );

  // Track response timing
  const startTime = Date.now();

  // Intercept response to log completion
  const originalSend = res.send;
  res.send = function (data: any) {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    if (statusCode >= 400) {
      const errorMessage = typeof data === 'string' ? data : JSON.stringify(data);
      logger.logRequestError(
        requestId,
        req.method,
        req.path,
        durationMs,
        statusCode,
        'HTTP_ERROR',
        errorMessage
      );
    } else {
      logger.logRequestSuccess(
        requestId,
        req.method,
        req.path,
        durationMs,
        { statusCode }
      );
    }

    return originalSend.call(this, data);
  };

  next();
}
