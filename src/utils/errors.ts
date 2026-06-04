/**
 * Custom error types for the Resume RAG Search API
 * Each error type maps to a specific HTTP status code and error code
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string, public originalError?: unknown) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error: 400 Bad Request
 * Thrown when input validation fails
 */
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode: string = 'VALIDATION_ERROR';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class PayloadTooLargeError extends AppError {
  readonly statusCode = 413;
  readonly errorCode = 'PAYLOAD_TOO_LARGE';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, PayloadTooLargeError.prototype);
  }
}

/**
 * Not found: 404 Not Found
 * Thrown when a requested resource cannot be located
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';

  constructor(message = 'Resource not found', originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Database error: 500 Internal Server Error
 * Thrown on MongoDB connection or query failures
 */
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'DATABASE_ERROR';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Embedding error: 500 Internal Server Error
 * Thrown when Mistral API calls fail
 */
export class EmbeddingError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'EMBEDDING_ERROR';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

/**
 * LLM error: 500 Internal Server Error
 * Thrown when Groq API calls fail
 */
export class LLMError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'LLM_ERROR';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

/**
  * Invalid PDF error: 400 Bad Request
  * Thrown when the uploaded file is not a valid PDF
  */
 export class FileTypeError extends ValidationError {
   readonly errorCode = 'INVALID_PDF';
 
   constructor(message = 'Only PDF files are allowed', originalError?: unknown) {
     super(message, originalError);
     Object.setPrototypeOf(this, FileTypeError.prototype);
   }
 }
 
 /**
  * Empty resume error: 400 Bad Request
  * Thrown when resume extraction fails or returns no text
  */
 export class EmptyResumeError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'EMPTY_RESUME';

  constructor(message = 'Resume extraction failed or returned empty text', originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, EmptyResumeError.prototype);
  }
}

/**
 * Service unavailable: 503 Service Unavailable
 * Thrown when external APIs are temporarily unavailable
 */
export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly errorCode = 'SERVICE_UNAVAILABLE';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Internal server error: 500 Internal Server Error
 * Thrown for unexpected/unhandled errors
 */
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get HTTP status code for any error
 */
export function getStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

/**
 * Get error code for any error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.errorCode;
  }
  return 'INTERNAL_SERVER_ERROR';
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
