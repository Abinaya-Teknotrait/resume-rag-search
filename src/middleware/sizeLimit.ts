import { Request, Response, NextFunction } from 'express';
import { PayloadTooLargeError } from '../utils/errors';

/**
 * Middleware: Enforce request payload size limits
 * Returns 413 if request exceeds maximum size.
 * For multipart/form-data uploads, skip this check and defer to multer.
 */
export function sizeLimitMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const maxSize = 1024 * 100; // 100 KB limit for non-upload payloads
  const contentType = (req.get('content-type') || '').toLowerCase();

  if (contentType.startsWith('multipart/')) {
    return next();
  }

  const contentLength = parseInt(req.get('content-length') || '0', 10);

  if (contentLength > maxSize) {
    return next(
      new PayloadTooLargeError(
        `Request payload size (${contentLength} bytes) exceeds maximum of ${maxSize} bytes`
      )
    );
  }

  next();
}
