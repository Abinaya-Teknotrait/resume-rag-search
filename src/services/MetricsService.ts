export interface IMetricsSnapshot {
  timestamp: string;
  metrics: Record<string, number>;
}

interface IMetricEntry {
  type: 'counter' | 'gauge';
  value: number;
}

export class MetricsService {
  private readonly metrics = new Map<string, IMetricEntry>();

  incrementCounter(metricName: string, amount = 1): void {
    if (amount < 0) {
      throw new Error('Metric counter increment value must be non-negative');
    }

    const existing = this.metrics.get(metricName);
    if (existing && existing.type !== 'counter') {
      throw new Error(`Metric ${metricName} is already registered as a gauge`);
    }

    const newValue = existing ? existing.value + amount : amount;
    this.metrics.set(metricName, { type: 'counter', value: newValue });
  }

  setGauge(metricName: string, value: number): void {
    if (value < 0) {
      throw new Error('Metric gauge value must be non-negative');
    }

    this.metrics.set(metricName, { type: 'gauge', value });
  }

  recordDuration(metricName: string, durationMs: number): void {
    if (durationMs < 0) {
      throw new Error('Metric duration must be non-negative');
    }

    this.incrementCounter(`${metricName}_count`, 1);
    this.incrementCounter(`${metricName}_sum_ms`, durationMs);
    this.setGauge(`${metricName}_last_ms`, durationMs);
  }

  getMetrics(): IMetricsSnapshot {
    const metrics: Record<string, number> = {};
    for (const [name, entry] of this.metrics.entries()) {
      metrics[name] = entry.value;
    }

    return {
      timestamp: new Date().toISOString(),
      metrics,
    };
  }

  reset(): void {
    this.metrics.clear();
  }
}

let metricsInstance: MetricsService | null = null;

export function getMetricsService(): MetricsService {
  if (!metricsInstance) {
    metricsInstance = new MetricsService();
  }
  return metricsInstance;
}
