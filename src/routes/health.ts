import { Router, Request, Response, NextFunction } from 'express';
import { IHealthCheckResponse, IHealthDatabaseResponse, IApiResponse } from '../types/API';
import { checkDatabaseHealth } from '../config/database';

const router = Router();

// Track server start time for uptime calculation
const startTime = Date.now();

/**
 * GET /v1/health
 * Health check endpoint: returns app status, version, and uptime
 */
router.get('/v1/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = (req as any).id || 'unknown';
    const uptime = Date.now() - startTime;

    const data: IHealthCheckResponse = {
      status: 'healthy',
      service: 'resume-rag-search',
      version: '1.0.0',
      uptime,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    const response: IApiResponse<IHealthCheckResponse> = {
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      data,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/health/db
 * Database health check: pings MongoDB and returns latency
 */
router.get('/v1/health/db', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = (req as any).id || 'unknown';
    const startTime = Date.now();

    // Check database connectivity
    const healthStatus = await checkDatabaseHealth();
    const durationMs = Date.now() - startTime;

    const data: IHealthDatabaseResponse = {
      status: healthStatus.status,
      database: process.env.MONGO_DB_NAME || 'resume_search',
      latencyMs: healthStatus.latencyMs || durationMs,
      timestamp: new Date().toISOString(),
      mode: 'mongodb',
      ...(healthStatus.error && { error: healthStatus.error }),
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    const response: IApiResponse<IHealthDatabaseResponse> = {
      statusCode,
      requestId,
      timestamp: new Date().toISOString(),
      data,
    };

    res.status(statusCode).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
