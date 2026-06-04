import * as winston from 'winston';
import { config } from '../config';

/**
 * Structured logging service using Winston
 * Logs all events as JSON with request ID and timing information
 */
export class LoggingService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: config.logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'resume-rag-search',
        version: '1.0.0',
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              // For console output, show simpler format
              const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}] ${message} ${metaStr}`;
            })
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
        }),
      ],
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message with optional stack trace
   */
  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, meta);
  }

  /**
   * Log API request entry
   */
  logRequestEntry(
    requestId: string,
    method: string,
    endpoint: string,
    params?: Record<string, unknown>
  ): void {
    this.debug(`${method} ${endpoint} called`, {
      requestId,
      method,
      endpoint,
      params,
    });
  }

  /**
   * Log API request success with timing
   */
  logRequestSuccess(
    requestId: string,
    method: string,
    endpoint: string,
    durationMs: number,
    meta?: Record<string, unknown>
  ): void {
    this.info(`${method} ${endpoint} succeeded`, {
      requestId,
      method,
      endpoint,
      durationMs,
      statusCode: 200,
      ...meta,
    });
  }

  /**
   * Log API request error with timing
   */
  logRequestError(
    requestId: string,
    method: string,
    endpoint: string,
    durationMs: number,
    statusCode: number,
    errorCode: string,
    errorMessage: string,
    meta?: Record<string, unknown>
  ): void {
    this.error(`${method} ${endpoint} failed`, {
      requestId,
      method,
      endpoint,
      durationMs,
      statusCode,
      errorCode,
      errorMessage,
      ...meta,
    });
  }

  /**
   * Log service method execution
   */
  logServiceMethodEntry(
    requestId: string,
    serviceName: string,
    methodName: string,
    params?: Record<string, unknown>
  ): void {
    this.debug(`${serviceName}.${methodName} called`, {
      requestId,
      service: serviceName,
      method: methodName,
      params,
    });
  }

  /**
   * Log service method success
   */
  logServiceMethodSuccess(
    requestId: string,
    serviceName: string,
    methodName: string,
    durationMs: number,
    meta?: Record<string, unknown>
  ): void {
    this.debug(`${serviceName}.${methodName} succeeded`, {
      requestId,
      service: serviceName,
      method: methodName,
      durationMs,
      ...meta,
    });
  }

  /**
   * Log service method error
   */
  logServiceMethodError(
    requestId: string,
    serviceName: string,
    methodName: string,
    durationMs: number,
    error: Error | string,
    meta?: Record<string, unknown>
  ): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.error(`${serviceName}.${methodName} failed`, {
      requestId,
      service: serviceName,
      method: methodName,
      durationMs,
      error: errorMessage,
      ...meta,
    });
  }

  /**
   * Log external API call
   */
  logExternalAPICall(
    requestId: string,
    apiName: string,
    durationMs: number,
    status: 'success' | 'error',
    meta?: Record<string, unknown>
  ): void {
    const level = status === 'success' ? 'debug' : 'warn';
    const method = level === 'debug' ? this.debug : this.warn;

    method.call(this, `External API: ${apiName}`, {
      requestId,
      api: apiName,
      durationMs,
      status,
      ...meta,
    });
  }
}

/**
 * Create a singleton logger instance
 */
let loggerInstance: LoggingService;

export function getLogger(): LoggingService {
  if (!loggerInstance) {
    loggerInstance = new LoggingService();
  }
  return loggerInstance;
}
