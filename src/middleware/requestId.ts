import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware: Assign unique request ID for correlation and tracing
 * Adds requestId to request object and response headers
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract request ID
  const requestId = (req.get('x-request-id') || uuidv4()) as string;

  // Attach to request for use in handlers
  (req as any).id = requestId;

  // Add to response header for client tracing
  res.setHeader('x-request-id', requestId);

  next();
}
