import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  createPerformanceTimer,
  getPerformanceMetrics,
  PerformanceMetric,
  subscribePerformanceMetrics,
} from '../../lib/performanceMonitor';
import {
  ACTIVITY_LOG_COLUMNS,
  ActivityLog,
  ActivityLogRow,
  mapActivityLog,
} from './activityLog';

/**
 * Loads the admin audit trail, tracks client performance metrics, and runs the
 * recurring Supabase health probe. Ported from AdminDashboard so the same
 * reads, limits, and 60s interval remain in place.
 */
export function useOperationalData() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>(() =>
    getPerformanceMetrics(),
  );

  const reloadLogs = useCallback(async () => {
    const finishMeasurement = createPerformanceTimer('fetch_activity_logs', 'data-read');
    setIsLoadingLogs(true);
    setActivityError('');

    const { data, error } = await supabase
      .from('activity_logs')
      .select(ACTIVITY_LOG_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(250);

    setIsLoadingLogs(false);

    if (error || !data) {
      setActivityError(error?.message || 'Unable to load admin activity logs.');
      setActivityLogs([]);
      finishMeasurement('error', error?.message || 'Unable to load admin activity logs.');
      return;
    }

    setActivityLogs((data as ActivityLogRow[]).map(mapActivityLog));
    finishMeasurement('success', `Loaded ${(data as ActivityLogRow[]).length} activity log entries.`);
  }, []);

  useEffect(() => {
    void reloadLogs();
  }, [reloadLogs]);

  useEffect(() => {
    const unsubscribe = subscribePerformanceMetrics(() => {
      setPerformanceMetrics(getPerformanceMetrics());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const runHealthCheck = async () => {
      const finishMeasurement = createPerformanceTimer('system_health_check', 'health-check');
      const { error } = await supabase.from('site_content').select('key').limit(1);

      if (error) {
        finishMeasurement('error', error.message);
        return;
      }

      finishMeasurement('success', 'Supabase health check succeeded.');
    };

    void runHealthCheck();
    const intervalId = window.setInterval(() => {
      void runHealthCheck();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return { activityLogs, isLoadingLogs, activityError, reloadLogs, performanceMetrics };
}
