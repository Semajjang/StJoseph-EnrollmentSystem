export type PerformanceMetricCategory =
  | 'page-load'
  | 'data-read'
  | 'data-write'
  | 'form-submit'
  | 'health-check';

export interface PerformanceMetric {
  id: string;
  operation: string;
  category: PerformanceMetricCategory;
  durationMs: number;
  status: 'success' | 'error';
  details?: string;
  recordedAt: string;
}

const performanceMetricsStorageKey = 'app-performance-metrics';
const maxStoredPerformanceMetrics = 200;
const listeners = new Set<() => void>();

const canUseStorage = () => typeof window !== 'undefined';

const readStoredMetrics = (): PerformanceMetric[] => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(performanceMetricsStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((metric): metric is PerformanceMetric => {
      return (
        !!metric &&
        typeof metric === 'object' &&
        typeof (metric as PerformanceMetric).id === 'string' &&
        typeof (metric as PerformanceMetric).operation === 'string' &&
        typeof (metric as PerformanceMetric).category === 'string' &&
        typeof (metric as PerformanceMetric).durationMs === 'number' &&
        typeof (metric as PerformanceMetric).status === 'string' &&
        typeof (metric as PerformanceMetric).recordedAt === 'string'
      );
    });
  } catch {
    return [];
  }
};

const writeStoredMetrics = (metrics: PerformanceMetric[]) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(performanceMetricsStorageKey, JSON.stringify(metrics));
};

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

export const getPerformanceMetrics = () => readStoredMetrics();

export const subscribePerformanceMetrics = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const recordPerformanceMetric = (
  metric: Omit<PerformanceMetric, 'id' | 'recordedAt'>
) => {
  const nextMetric: PerformanceMetric = {
    ...metric,
    id: `${metric.operation}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    recordedAt: new Date().toISOString(),
    durationMs: Number(metric.durationMs.toFixed(2))
  };

  const existingMetrics = readStoredMetrics();
  const nextMetrics = [nextMetric, ...existingMetrics].slice(0, maxStoredPerformanceMetrics);

  writeStoredMetrics(nextMetrics);
  notifyListeners();
};

export const createPerformanceTimer = (
  operation: string,
  category: PerformanceMetricCategory
) => {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return (status: 'success' | 'error', details?: string) => {
    const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    recordPerformanceMetric({
      operation,
      category,
      status,
      details,
      durationMs: endedAt - startedAt
    });
  };
};