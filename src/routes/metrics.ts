import { Router, Request, Response, NextFunction } from 'express';
import { getMetricsService } from '../services/MetricsService';
import { IApiResponse } from '../types/API';

const router = Router();
const metricsService = getMetricsService();

router.get('/v1/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = (req as any).id || 'unknown';
    const metricsSnapshot = metricsService.getMetrics();

    const response: IApiResponse<typeof metricsSnapshot> = {
      statusCode: 200,
      requestId,
      timestamp: new Date().toISOString(),
      data: metricsSnapshot,
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
