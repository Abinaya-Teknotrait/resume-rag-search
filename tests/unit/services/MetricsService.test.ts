import { getMetricsService } from '../../../src/services/MetricsService';

describe('MetricsService', () => {
  const metricsService = getMetricsService();

  beforeEach(() => {
    metricsService.reset();
  });

  it('increments counters and exposes snapshots', () => {
    metricsService.incrementCounter('batch_upload_runs');
    metricsService.incrementCounter('batch_upload_runs', 2);
    metricsService.setGauge('batch_upload_duration_last_ms', 1200);
    metricsService.recordDuration('batch_upload_duration', 1200);

    const snapshot = metricsService.getMetrics();

    expect(snapshot.metrics.batch_upload_runs).toBe(3);
    expect(snapshot.metrics.batch_upload_duration_last_ms).toBe(1200);
    expect(snapshot.metrics.batch_upload_duration_count).toBe(1);
    expect(snapshot.metrics.batch_upload_duration_sum_ms).toBe(1200);
    expect(typeof snapshot.timestamp).toBe('string');
  });

  it('throws when a negative counter increment is attempted', () => {
    expect(() => metricsService.incrementCounter('invalid_metric', -1)).toThrow(
      'Metric counter increment value must be non-negative'
    );
  });
});
