import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { getLogger } from '../services/LoggingService';
import {
  getStatusCode,
  getErrorCode,
  getErrorMessage,
  PayloadTooLargeError,
  ValidationError,
  FileTypeError,
} from '../utils/errors';

/**
 * Middleware: Centralized error handler
 * Catches all errors and returns structured JSON response
 * Must be registered after all other middleware and routes
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const logger = getLogger();
  const requestId = (req as any).id || 'unknown';

  let normalizedError: unknown = error;

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      normalizedError = new PayloadTooLargeError(error.message, error);
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      normalizedError = new ValidationError(error.message, error);
    } else {
      normalizedError = new ValidationError(`Multer error: ${error.message}`, error);
    }
  } else if (error instanceof Error && error.message === 'Only PDF files are allowed') {
    normalizedError = new FileTypeError(error.message, error);
  }

  const statusCode = getStatusCode(normalizedError);
  const errorCode = getErrorCode(normalizedError);
  const message = getErrorMessage(normalizedError);

  // Log the error
  logger.error(`${req.method} ${req.path} error`, {
    requestId,
    statusCode,
    errorCode,
    message,
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Return structured error response
  const response = {
    statusCode,
    requestId,
    timestamp: new Date().toISOString(),
    error: {
      code: errorCode,
      message,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * Middleware: Handle 404 Not Found
 * Should be registered after all routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as any).id || 'unknown';

  const response = {
    statusCode: 404,
    requestId,
    timestamp: new Date().toISOString(),
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  };

  res.status(404).json(response);
}
