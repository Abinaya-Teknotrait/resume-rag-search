import request from 'supertest';
import { createExpressApp } from '../../../src/app';
import { getMetricsService } from '../../../src/services/MetricsService';

describe('Metrics route', () => {
  afterEach(() => {
    getMetricsService().reset();
  });

  it('should expose GET /v1/metrics and return a metrics snapshot', async () => {
    const metricsService = getMetricsService();
    metricsService.incrementCounter('batch_upload_runs');
    metricsService.incrementCounter('batch_upload_files_processed', 5);

    const app = createExpressApp();
    const response = await request(app).get('/v1/metrics');

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.metrics.batch_upload_runs).toBe(1);
    expect(response.body.data.metrics.batch_upload_files_processed).toBe(5);
    expect(typeof response.body.data.timestamp).toBe('string');
  });
});
