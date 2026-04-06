import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useEnrollment } from '../context/EnrollmentContext';
import {
  createPerformanceTimer,
  getPerformanceMetrics,
  PerformanceMetric,
  subscribePerformanceMetrics
} from '../lib/performanceMonitor';
import { AgeRule, fetchAgeRules, loadAgeRules, saveAgeRules } from '../lib/ageRules';
import { supabase } from '../lib/supabase';

type BackupTable = 'profiles' | 'enrollments' | 'site_content' | 'contact_messages' | 'activity_logs';
type BackupBucket = 'requirements' | 'enrollment-files';

interface BackupStorageFile {
  path: string;
  fileName: string;
  size: number;
  contentType: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastAccessedAt: string | null;
  dataBase64?: string;
}

interface RestorePackage {
  tables: Record<BackupTable, Record<string, unknown>[]>;
  storage: Record<BackupBucket, BackupStorageFile[]>;
}

interface StorageListEntry {
  name?: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_accessed_at?: string | null;
  metadata?: {
    size?: number;
    mimetype?: string;
    contentType?: string;
  } | null;
}

interface BackupBuildOptions {
  includeStorageContents: boolean;
}

interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface ActivityLogRow {
  id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface BackupBundle {
  generatedAt: string;
  generatedBy: {
    id: string;
    name: string;
    email: string;
  };
  backupTime: string;
  tables: Record<BackupTable, Record<string, unknown>[]>;
  storage: Record<BackupBucket, BackupStorageFile[]>;
}

interface RestoreExecutionResult {
  profiles: number;
  enrollments: number;
  site_content: number;
  contact_messages: number;
  activity_logs: number;
  total: number;
}

const backupTables: BackupTable[] = [
  'profiles',
  'enrollments',
  'site_content',
  'contact_messages',
  'activity_logs'
];

const backupStorageBuckets: BackupBucket[] = ['requirements', 'enrollment-files'];

const backupScheduleStorageKey = 'admin-dashboard-backup-time';
const lastBackupStorageKey = 'admin-dashboard-last-backup';
const storageListPageSize = 100;

const mapActivityLog = (row: ActivityLogRow): ActivityLog => ({
  id: row.id,
  actorName: row.actor_name || 'Unknown User',
  actorRole: row.actor_role || 'unknown',
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  details: row.details || {},
  createdAt: row.created_at
});

const formatLabel = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

const downloadTextFile = (fileName: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const readStoredBackupTime = () => {
  if (typeof window === 'undefined') {
    return '02:00';
  }

  return window.localStorage.getItem(backupScheduleStorageKey) || '02:00';
};

const readStoredLastBackup = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(lastBackupStorageKey) || '';
};

const formatDateTime = (value: string) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(value).toLocaleString();
};

const getNextBackupTime = (timeValue: string) => {
  if (!timeValue) {
    return 'Backup schedule is not set.';
  }

  const [hoursText, minutesText] = timeValue.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 'Backup schedule is not set.';
  }

  const now = new Date();
  const nextRun = new Date(now);

  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.toLocaleString();
};

const buildBackupCsv = (bundle: BackupBundle) => {
  const headers = ['table_name', 'record_key', 'payload_json'];
  const rows = backupTables.flatMap((table) => {
    return bundle.tables[table].map((row) => {
      const recordKey = typeof row.id === 'string' ? row.id : typeof row.key === 'string' ? row.key : '';
      return [table, recordKey, JSON.stringify(row)];
    });
  });

  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(','))
  ].join('\n');
};

const getLogDetailSummary = (log: ActivityLog) => {
  const details = log.details || {};
  const readString = (key: string) => {
    const value = details[key];
    return typeof value === 'string' ? value : '';
  };

  if (log.entityType === 'staff_access') {
    return `Opened by ${readString('opened_by') || log.actorName} using teacher ID ${readString('teacher_id') || 'Unknown'}.`;
  }

  if (log.entityType === 'enrollment') {
    const childName = `${readString('child_first_name')} ${readString('child_last_name')}`.trim();
    const oldStatus = readString('old_status');
    const newStatus = readString('new_status');

    if (oldStatus && newStatus && oldStatus !== newStatus) {
      return `${childName || 'Student'} status changed from ${oldStatus} to ${newStatus}.`;
    }

    return `${childName || 'Student'} enrollment record updated.`;
  }

  if (log.entityType === 'contact_message') {
    return readString('subject') ? `Thread: ${readString('subject')}` : 'Contact thread updated.';
  }

  if (log.entityType === 'site_content') {
    return readString('key') ? `Content key: ${readString('key')}` : 'Site content updated.';
  }

  return JSON.stringify(details, null, 2);
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let currentValue = '';
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (isInsideQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        isInsideQuotes = !isInsideQuotes;
      }
      continue;
    }

    if (char === ',' && !isInsideQuotes) {
      values.push(currentValue);
      currentValue = '';
      continue;
    }

    currentValue += char;
  }

  values.push(currentValue);
  return values;
};

const emptyRestoreTables = (): Record<BackupTable, Record<string, unknown>[]> => ({
  profiles: [],
  enrollments: [],
  site_content: [],
  contact_messages: [],
  activity_logs: []
});

const emptyRestoreStorage = (): Record<BackupBucket, BackupStorageFile[]> => ({
  requirements: [],
  'enrollment-files': []
});

const fileBlobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to serialize backup file content.'));
        return;
      }

      const separatorIndex = reader.result.indexOf(',');
      resolve(separatorIndex >= 0 ? reader.result.slice(separatorIndex + 1) : reader.result);
    };

    reader.onerror = () => {
      reject(reader.error || new Error('Unable to read backup file content.'));
    };

    reader.readAsDataURL(blob);
  });

const base64ToBlob = (value: string, contentType: string) => {
  const binaryValue = window.atob(value);
  const bytes = Uint8Array.from(binaryValue, (character) => character.charCodeAt(0));

  return new Blob([bytes], {
    type: contentType || 'application/octet-stream'
  });
};

const listStorageFiles = async (bucketName: BackupBucket, prefix = ''): Promise<BackupStorageFile[]> => {
  let offset = 0;
  const files: BackupStorageFile[] = [];

  while (true) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: storageListPageSize,
      offset,
      sortBy: {
        column: 'name',
        order: 'asc'
      }
    });

    if (error) {
      throw new Error(`${bucketName}: ${error.message}`);
    }

    const entries = (data || []) as StorageListEntry[];

    for (const entry of entries) {
      const entryName = typeof entry.name === 'string' ? entry.name : '';

      if (!entryName) {
        continue;
      }

      const objectPath = prefix ? `${prefix}/${entryName}` : entryName;

      if (entry.id) {
        files.push({
          path: objectPath,
          fileName: entryName,
          size: typeof entry.metadata?.size === 'number' ? entry.metadata.size : 0,
          contentType:
            entry.metadata?.mimetype ||
            entry.metadata?.contentType ||
            'application/octet-stream',
          createdAt: entry.created_at || null,
          updatedAt: entry.updated_at || null,
          lastAccessedAt: entry.last_accessed_at || null
        });
        continue;
      }

      files.push(...(await listStorageFiles(bucketName, objectPath)));
    }

    if (entries.length < storageListPageSize) {
      break;
    }

    offset += storageListPageSize;
  }

  return files;
};

const captureStorageBackup = async (
  bucketName: BackupBucket,
  includeStorageContents: boolean
) => {
  const storageFiles = await listStorageFiles(bucketName);

  if (!includeStorageContents) {
    return [] as BackupStorageFile[];
  }

  return Promise.all(
    storageFiles.map(async (file) => {
      const { data, error } = await supabase.storage.from(bucketName).download(file.path);

      if (error || !data) {
        throw new Error(`${bucketName}/${file.path}: ${error?.message || 'Unable to download file.'}`);
      }

      return {
        ...file,
        contentType: file.contentType || data.type || 'application/octet-stream',
        dataBase64: await fileBlobToBase64(data)
      };
    })
  );
};

const normalizeBackupStorageFile = (value: unknown): BackupStorageFile | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const path = typeof row.path === 'string' ? row.path : '';

  if (!path) {
    return null;
  }

  return {
    path,
    fileName: typeof row.fileName === 'string' && row.fileName ? row.fileName : path.split('/').pop() || path,
    size: typeof row.size === 'number' ? row.size : 0,
    contentType: typeof row.contentType === 'string' && row.contentType ? row.contentType : 'application/octet-stream',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
    lastAccessedAt: typeof row.lastAccessedAt === 'string' ? row.lastAccessedAt : null,
    dataBase64: typeof row.dataBase64 === 'string' ? row.dataBase64 : undefined
  };
};

const normalizeRestorePackage = (value: unknown): RestorePackage => {
  const tables = normalizeRestoreTables(value);
  const storage = emptyRestoreStorage();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { tables, storage };
  }

  const objectValue = value as Record<string, unknown>;
  const candidateStorage =
    'storage' in objectValue && objectValue.storage && typeof objectValue.storage === 'object' ?
      objectValue.storage as Record<string, unknown> :
      null;

  if (!candidateStorage) {
    return { tables, storage };
  }

  backupStorageBuckets.forEach((bucket) => {
    const rows = candidateStorage[bucket];

    if (!Array.isArray(rows)) {
      return;
    }

    storage[bucket] = rows
      .map((row) => normalizeBackupStorageFile(row))
      .filter((row): row is BackupStorageFile => !!row);
  });

  return {
    tables,
    storage
  };
};

const normalizeRestoreTables = (value: unknown) => {
  const nextTables = emptyRestoreTables();

  if (!value || typeof value !== 'object') {
    return nextTables;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const row = entry as Record<string, unknown>;
      const tableName = row.table_name;
      const payload = row.payload;

      if (typeof tableName === 'string' && backupTables.includes(tableName as BackupTable) && payload && typeof payload === 'object') {
        nextTables[tableName as BackupTable].push(payload as Record<string, unknown>);
      }
    });

    return nextTables;
  }

  const objectValue = value as Record<string, unknown>;
  const candidateTables = 'tables' in objectValue && objectValue.tables && typeof objectValue.tables === 'object'
    ? objectValue.tables as Record<string, unknown>
    : objectValue;

  backupTables.forEach((table) => {
    const rows = candidateTables[table];

    if (Array.isArray(rows)) {
      nextTables[table] = rows.filter(
        (row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row)
      );
    }
  });

  return nextTables;
};

const buildRestoreDownloadBundle = (restorePackage: RestorePackage) => ({
  exportedAt: new Date().toISOString(),
  tables: restorePackage.tables,
  storage: restorePackage.storage
});

const ChartPanel = ({
  title,
  subtitle,
  items,
  tone
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; helper?: string }>;
  tone: 'blue' | 'emerald';
}) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const barClassName = tone === 'blue' ? 'bg-[#2563EB]' : 'bg-emerald-500';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-5 space-y-4">
        {items.length === 0 ?
          <p className="text-sm font-medium text-slate-500">No data available yet.</p> :
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                  {item.helper ? <p className="text-xs text-slate-400">{item.helper}</p> : null}
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div
                  className={`h-3 rounded-full ${barClassName}`}
                  style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export function AdminDashboard() {
  const { user } = useAuth();
  const { enrollments } = useEnrollment();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>(() =>
    getPerformanceMetrics()
  );
  const [activityError, setActivityError] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [auditFilter, setAuditFilter] = useState<'all' | 'enrollment' | 'site_content' | 'contact_message' | 'staff_access'>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [backupTime, setBackupTime] = useState(() => readStoredBackupTime());
  const [lastBackupAt, setLastBackupAt] = useState(() => readStoredLastBackup());
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [ageRules, setAgeRules] = useState<AgeRule[]>(() => loadAgeRules());
  const [ageRuleStatus, setAgeRuleStatus] = useState<string | null>(null);
  const [ageRuleError, setAgeRuleError] = useState<string | null>(null);
  const [isLoadingAgeRules, setIsLoadingAgeRules] = useState(false);
  const [isSavingAgeRules, setIsSavingAgeRules] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isApplyingRestore, setIsApplyingRestore] = useState(false);
  const [restorePackage, setRestorePackage] = useState<RestorePackage | null>(null);

  const loadActivityLogs = useCallback(async () => {
    const finishMeasurement = createPerformanceTimer('fetch_activity_logs', 'data-read');
    setIsLoadingLogs(true);
    setActivityError('');

    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, actor_name, actor_role, action, entity_type, entity_id, details, created_at')
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
    void loadActivityLogs();
  }, [loadActivityLogs]);

  useEffect(() => {
    const unsubscribe = subscribePerformanceMetrics(() => {
      setPerformanceMetrics(getPerformanceMetrics());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const loadProgramAgeRules = async () => {
      setIsLoadingAgeRules(true);
      setAgeRuleError(null);

      try {
        const nextRules = await fetchAgeRules();
        setAgeRules(nextRules);
      } catch (error) {
        setAgeRuleError(error instanceof Error ? error.message : 'Unable to load age rules.');
      } finally {
        setIsLoadingAgeRules(false);
      }
    };

    void loadProgramAgeRules();
  }, []);

  useEffect(() => {
    const runHealthCheck = async () => {
      const finishMeasurement = createPerformanceTimer('system_health_check', 'health-check');
      const { error } = await supabase
        .from('site_content')
        .select('key')
        .limit(1);

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(backupScheduleStorageKey, backupTime);
    }
  }, [backupTime]);

  const auditLogs = useMemo(() => {
    const normalizedQuery = auditSearch.trim().toLowerCase();

    return activityLogs.filter((log) => {
      const matchesFilter = auditFilter === 'all' || log.entityType === auditFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableContent = [
        log.actorName,
        log.actorRole,
        log.action,
        log.entityType,
        log.entityId,
        JSON.stringify(log.details)
      ]
        .join(' ')
        .toLowerCase();

      return searchableContent.includes(normalizedQuery);
    });
  }, [activityLogs, auditFilter, auditSearch]);

  useEffect(() => {
    if (!selectedLog) {
      return;
    }

    const stillExists = auditLogs.some((log) => log.id === selectedLog.id);

    if (!stillExists) {
      setSelectedLog(auditLogs[0] || null);
    }
  }, [auditLogs, selectedLog]);

  const statusSummary = useMemo(() => {
    const approved = enrollments.filter((enrollment) => enrollment.status === 'Approved').length;
    const pending = enrollments.filter((enrollment) => enrollment.status === 'Pending').length;
    const waitlisted = enrollments.filter((enrollment) => enrollment.status === 'Waitlisted').length;
    const rejected = enrollments.filter((enrollment) => enrollment.status === 'Rejected').length;
    const assignedSections = enrollments.filter((enrollment) => !!enrollment.section).length;

    return {
      total: enrollments.length,
      approved,
      pending,
      waitlisted,
      rejected,
      assignedSections
    };
  }, [enrollments]);

  const sectionChartItems = useMemo(() => {
    const sectionCounts = new Map<string, { value: number; programLabel: string }>();

    enrollments.forEach((enrollment) => {
      const sectionName = enrollment.section?.trim() || 'Unassigned';
      const currentEntry = sectionCounts.get(sectionName);
      const programLabel = enrollment.program || 'No Program Assigned';

      if (!currentEntry) {
        sectionCounts.set(sectionName, {
          value: 1,
          programLabel: sectionName === 'Unassigned' ? 'No section assigned yet' : programLabel
        });
        return;
      }

      sectionCounts.set(sectionName, {
        value: currentEntry.value + 1,
        programLabel:
          currentEntry.programLabel === programLabel || sectionName === 'Unassigned' ?
            currentEntry.programLabel :
            'Multiple Programs'
      });
    });

    return Array.from(sectionCounts.entries())
      .map(([label, entry]) => ({
        label,
        value: entry.value,
        helper: entry.programLabel
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 8);
  }, [enrollments]);

  const logVolumeItems = useMemo(() => {
    const dayCounts = new Map<string, number>();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dayCounts.set(label, 0);
    }

    activityLogs.forEach((log) => {
      const label = new Date(log.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });

      if (dayCounts.has(label)) {
        dayCounts.set(label, (dayCounts.get(label) || 0) + 1);
      }
    });

    return Array.from(dayCounts.entries()).map(([label, value]) => ({
      label,
      value,
      helper: value > 0 ? 'Recent audit activity' : 'No entries'
    }));
  }, [activityLogs]);

  const operationalSummary = useMemo(() => {
    const recentLogs = activityLogs.filter((log) => {
      const createdAt = new Date(log.createdAt).getTime();
      return Date.now() - createdAt <= 24 * 60 * 60 * 1000;
    }).length;

    const averageStudentsPerSection = sectionChartItems.length > 0 ?
      Math.round(sectionChartItems.reduce((sum, item) => sum + item.value, 0) / sectionChartItems.length) :
      0;

    return {
      recentLogs,
      indexedRecords: enrollments.length + activityLogs.length,
      averageStudentsPerSection,
      readiness:
        statusSummary.pending > 25 ?
          'High review load. Consider scheduling extra reviewers during peak enrollment hours.' :
          'Enrollment load is within the current review capacity.'
    };
  }, [activityLogs, enrollments.length, sectionChartItems, statusSummary.pending]);

  const recentPerformanceMetrics = useMemo(() => {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;

    return performanceMetrics.filter((metric) => new Date(metric.recordedAt).getTime() >= cutoffTime);
  }, [performanceMetrics]);

  const performanceSummary = useMemo(() => {
    const readMetrics = recentPerformanceMetrics.filter(
      (metric) => metric.category === 'data-read' || metric.category === 'page-load'
    );
    const writeMetrics = recentPerformanceMetrics.filter(
      (metric) => metric.category === 'data-write' || metric.category === 'form-submit'
    );
    const healthMetrics = recentPerformanceMetrics.filter((metric) => metric.category === 'health-check');

    const average = (metrics: PerformanceMetric[]) => {
      if (metrics.length === 0) {
        return 0;
      }

      return Math.round(
        metrics.reduce((sum, metric) => sum + metric.durationMs, 0) / metrics.length
      );
    };

    const successfulHealthChecks = healthMetrics.filter((metric) => metric.status === 'success').length;
    const healthSuccessRate = healthMetrics.length > 0 ?
      Math.round((successfulHealthChecks / healthMetrics.length) * 100) :
      100;
    const lastHealthCheck = healthMetrics[0] || null;

    return {
      readAverageMs: average(readMetrics),
      writeAverageMs: average(writeMetrics),
      healthSuccessRate,
      lastHealthCheck,
      readTargetStatus:
        average(readMetrics) === 0 || average(readMetrics) <= 2000 ?
          'Within target' :
        average(readMetrics) <= 3000 ?
          'Watch closely' :
          'Above target',
      writeTargetStatus:
        average(writeMetrics) === 0 || average(writeMetrics) <= 2000 ?
          'Within target' :
        average(writeMetrics) <= 3000 ?
          'Watch closely' :
          'Above target',
      uptimeStatus:
        healthSuccessRate >= 99 ?
          'Healthy' :
        healthSuccessRate >= 95 ?
          'Degraded' :
          'Unstable'
    };
  }, [recentPerformanceMetrics]);

  const buildBackupBundle = useCallback(async ({ includeStorageContents }: BackupBuildOptions): Promise<BackupBundle> => {
    const queries = await Promise.all(
      backupTables.map(async (table) => {
        const { data, error } = await supabase.from(table).select('*');

        if (error) {
          throw new Error(`${table}: ${error.message}`);
        }

        return [table, (data as Record<string, unknown>[] | null) || []] as const;
      })
    );

    const storageQueries = await Promise.all(
      backupStorageBuckets.map(async (bucket) => {
        const files = await captureStorageBackup(bucket, includeStorageContents);
        return [bucket, files] as const;
      })
    );

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: user?.id || 'unknown',
        name: user?.name || 'Unknown Admin',
        email: user?.email || ''
      },
      backupTime,
      tables: Object.fromEntries(queries) as Record<BackupTable, Record<string, unknown>[]>,
      storage: Object.fromEntries(storageQueries) as Record<BackupBucket, BackupStorageFile[]>
    };
  }, [backupTime, user?.email, user?.id, user?.name]);

  const generateBackup = async (format: 'json' | 'csv') => {
    setIsGeneratingBackup(true);
    setBackupError(null);
    setBackupStatus(null);

    try {
      const bundle = await buildBackupBundle({
        includeStorageContents: format === 'json'
      });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const storageFileCount = backupStorageBuckets.reduce((sum, bucket) => sum + bundle.storage[bucket].length, 0);

      if (format === 'json') {
        downloadTextFile(
          `admin-backup-${timestamp}.json`,
          JSON.stringify(bundle, null, 2),
          'application/json;charset=utf-8;'
        );
      } else {
        downloadTextFile(
          `admin-backup-${timestamp}.csv`,
          buildBackupCsv(bundle),
          'text/csv;charset=utf-8;'
        );
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(lastBackupStorageKey, bundle.generatedAt);
      }

      setLastBackupAt(bundle.generatedAt);
      setBackupStatus(
        format === 'json' ?
          `Full recovery backup generated successfully. ${storageFileCount} private upload files were included.` :
          'Table backup CSV generated successfully.'
      );
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : 'Unable to generate backup package.');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const updateAgeRule = (
    ruleId: AgeRule['id'],
    field: 'name' | 'ageLabel' | 'scheduleLabel' | 'timeLabel' | 'minMonths' | 'maxMonths',
    value: string
  ) => {
    setAgeRuleError(null);
    setAgeRuleStatus(null);
    setAgeRules((prev) =>
      prev.map((rule) => {
        if (rule.id !== ruleId) {
          return rule;
        }

        if (field === 'minMonths' || field === 'maxMonths') {
          const nextValue = Number(value);

          return {
            ...rule,
            [field]: Number.isNaN(nextValue) ? 0 : Math.max(0, Math.round(nextValue))
          };
        }

        return {
          ...rule,
          [field]: value
        };
      })
    );
  };

  const handleSaveAgeRules = async () => {
    setIsSavingAgeRules(true);
    setAgeRuleError(null);
    setAgeRuleStatus(null);

    try {
      const result = await saveAgeRules(ageRules);

      if (result.error) {
        throw result.error;
      }

      setAgeRules(result.rules);
      setAgeRuleStatus('Program age rules saved. Guardian enrollment auto-assignment now uses the updated bands.');
    } catch (error) {
      setAgeRuleError(error instanceof Error ? error.message : 'Unable to save age rules.');
    } finally {
      setIsSavingAgeRules(false);
    }
  };

  const handleRestoreFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setRestoreError(null);
    setRestoreStatus(null);

    try {
      const fileContents = await file.text();

      if (file.name.toLowerCase().endsWith('.json')) {
        const parsedValue = JSON.parse(fileContents) as unknown;
        const normalizedRestorePackage = normalizeRestorePackage(parsedValue);

        setRestorePackage(normalizedRestorePackage);
        setRestoreStatus('Restore package loaded. Review the managed table counts and private upload totals, then apply the admin restore workflow or export a normalized restore file.');
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const [headerLine, ...dataLines] = fileContents.split(/\r?\n/).filter(Boolean);
        const headers = parseCsvLine(headerLine || '');

        if (headers.join('|') !== ['table_name', 'record_key', 'payload_json'].join('|')) {
          throw new Error('Unsupported CSV format. Use a CSV exported from the Admin Dashboard backup section.');
        }

        const normalizedRows = dataLines.map((line) => {
          const [tableName, , payloadText] = parseCsvLine(line);
          return {
            table_name: tableName,
            payload: JSON.parse(payloadText)
          };
        });

        const normalizedRestorePackage = normalizeRestorePackage(normalizedRows);
        setRestorePackage(normalizedRestorePackage);
        setRestoreStatus('Restore CSV loaded. Review the package summary and apply the managed-table restore workflow when ready.');
      } else {
        throw new Error('Upload a .json or .csv backup file.');
      }
    } catch (error) {
      setRestorePackage(null);
      setRestoreError(error instanceof Error ? error.message : 'Unable to read restore package.');
    } finally {
      event.target.value = '';
    }
  };

  const downloadRestoreBundle = (format: 'json' | 'csv') => {
    if (!restorePackage) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bundle = buildRestoreDownloadBundle(restorePackage);

    if (format === 'json') {
      downloadTextFile(
        `restore-package-${timestamp}.json`,
        JSON.stringify(bundle, null, 2),
        'application/json;charset=utf-8;'
      );
      return;
    }

    const csvBundle: BackupBundle = {
      generatedAt: bundle.exportedAt,
      generatedBy: {
        id: user?.id || 'unknown',
        name: user?.name || 'Unknown Admin',
        email: user?.email || ''
      },
      backupTime,
      tables: restorePackage.tables,
      storage: emptyRestoreStorage()
    };

    downloadTextFile(
      `restore-package-${timestamp}.csv`,
      buildBackupCsv(csvBundle),
      'text/csv;charset=utf-8;'
    );
  };

  const restoreStorageFiles = useCallback(async (storageFiles: Record<BackupBucket, BackupStorageFile[]>) => {
    let restoredFileCount = 0;

    for (const bucket of backupStorageBuckets) {
      for (const file of storageFiles[bucket]) {
        if (!file.dataBase64) {
          continue;
        }

        const fileBlob = base64ToBlob(file.dataBase64, file.contentType);
        const { error } = await supabase.storage.from(bucket).upload(file.path, fileBlob, {
          upsert: true,
          contentType: file.contentType
        });

        if (error) {
          throw new Error(`${bucket}/${file.path}: ${error.message}`);
        }

        restoredFileCount += 1;
      }
    }

    return restoredFileCount;
  }, []);

  const applyRestoreBundle = async () => {
    if (!restorePackage) {
      return;
    }

    setIsApplyingRestore(true);
    setRestoreError(null);
    setRestoreStatus(null);
    let restoreStage: 'tables' | 'storage' = 'tables';

    try {
      const restoreBundle = buildRestoreDownloadBundle(restorePackage);
      const { data, error } = await supabase.rpc('restore_backup_bundle', {
        restore_bundle: restoreBundle
      });

      if (error) {
        throw error;
      }

      restoreStage = 'storage';
      const restoredFileCount = await restoreStorageFiles(restorePackage.storage);
      const result = (data || {}) as Partial<RestoreExecutionResult>;
      const totalRows = typeof result.total === 'number' ? result.total : 0;
      setRestoreStatus(
        `Restore applied successfully. ${totalRows} records were merged into the managed tables and ${restoredFileCount} private upload files were restored.`
      );
      void loadActivityLogs();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to apply restore package.';
      setRestoreError(
        restoreStage === 'storage' ?
          `Managed tables were restored, but private file restore failed: ${message}` :
          message
      );
    } finally {
      setIsApplyingRestore(false);
    }
  };

  const restoreTableCounts = useMemo(() => {
    if (!restorePackage) {
      return [] as Array<{ label: string; value: number }>;
    }

    return [
      ...backupTables.map((table) => ({ label: formatLabel(table), value: restorePackage.tables[table].length })),
      ...backupStorageBuckets.map((bucket) => ({
        label: `${formatLabel(bucket)} Files`,
        value: restorePackage.storage[bucket].length
      }))
    ];
  }, [restorePackage]);

  return (
    <div className="p-6 pb-24 md:p-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <section className="rounded-[32px] bg-[linear-gradient(135deg,#0F3BA8_0%,#2563EB_56%,#93C5FD_100%)] p-8 text-white shadow-[0_18px_45px_rgba(29,78,216,0.22)]">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-100">Admin Dashboard</p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight">System maintenance, audit review, and recovery readiness</h1>
            <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-blue-50/95 md:text-base">
              Provide a maintenance interface for backup and restore operations, admin age-rule updates, requirement oversight through the sidebar manager, and audit review during peak enrollment periods.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Total Enrollments</p>
              <p className="mt-2 text-3xl font-extrabold">{statusSummary.total}</p>
              <p className="mt-1 text-sm text-blue-50">All child records currently indexed.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Pending Review</p>
              <p className="mt-2 text-3xl font-extrabold">{statusSummary.pending}</p>
              <p className="mt-1 text-sm text-blue-50">Applications waiting for staff action.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Recent Logs</p>
              <p className="mt-2 text-3xl font-extrabold">{operationalSummary.recentLogs}</p>
              <p className="mt-1 text-sm text-blue-50">Activity entries in the last 24 hours.</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-100">Next Backup Window</p>
              <p className="mt-2 text-lg font-extrabold leading-snug">{getNextBackupTime(backupTime)}</p>
              <p className="mt-1 text-sm text-blue-50">Developer backup preparation schedule.</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
            <h2 className="text-xl font-bold text-slate-900">Operational Readiness</h2>
            <p className="mt-1 text-sm text-slate-500">
              Maintain uninterrupted uptime during peak enrollment periods without compromising data processing or record retrieval speeds.
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Readiness Note</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{operationalSummary.readiness}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Approved</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{statusSummary.approved}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Waitlisted</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{statusSummary.waitlisted}</p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Indexed Records</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{operationalSummary.indexedRecords}</p>
                </div>
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Avg/Section</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{operationalSummary.averageStudentsPerSection}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:col-span-2 xl:grid-cols-2">
            <ChartPanel
              title="Audit Log Volume"
              subtitle="Recent daily audit activity across enrollment, site content, contact, and staff access."
              items={logVolumeItems}
              tone="blue"
            />
            <ChartPanel
              title="Students Per Section"
              subtitle="Current student distribution by section, including unassigned records."
              items={sectionChartItems}
              tone="emerald"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Avg Read Time</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {performanceSummary.readAverageMs > 0 ? `${performanceSummary.readAverageMs} ms` : 'No data'}
            </p>
            <p className="mt-2 text-sm font-semibold text-blue-700">{performanceSummary.readTargetStatus}</p>
            <p className="mt-1 text-xs text-slate-500">Targets standard page and record retrieval under 2-3 seconds.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Avg Submit Time</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {performanceSummary.writeAverageMs > 0 ? `${performanceSummary.writeAverageMs} ms` : 'No data'}
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">{performanceSummary.writeTargetStatus}</p>
            <p className="mt-1 text-xs text-slate-500">Tracks enrollment submissions and record updates during peak usage.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recent Health Checks</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{performanceSummary.healthSuccessRate}%</p>
            <p className="mt-2 text-sm font-semibold text-violet-700">{performanceSummary.uptimeStatus}</p>
            <p className="mt-1 text-xs text-slate-500">Availability trend from recurring Supabase health probes.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last Health Probe</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {performanceSummary.lastHealthCheck ? `${Math.round(performanceSummary.lastHealthCheck.durationMs)} ms` : 'Not available'}
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-700">
              {performanceSummary.lastHealthCheck?.status === 'error' ? 'Last check failed' : 'Last check passed'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {performanceSummary.lastHealthCheck ? formatDateTime(performanceSummary.lastHealthCheck.recordedAt) : 'No recent health check recorded.'}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Audit Log Viewer</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Filter administrator audit logs, search entries, and inspect detailed event payloads.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  placeholder="Search actor, action, entity, or details"
                  className="w-[280px] rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                />
                <select
                  value={auditFilter}
                  onChange={(event) => setAuditFilter(event.target.value as 'all' | 'enrollment' | 'site_content' | 'contact_message' | 'staff_access')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                >
                  <option value="all">All Logs</option>
                  <option value="enrollment">Enrollment</option>
                  <option value="site_content">Site Content</option>
                  <option value="contact_message">Contact Messages</option>
                  <option value="staff_access">Staff Access</option>
                </select>
              </div>
            </div>

            {activityError ?
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {activityError}
              </div> :
              null}

            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Time</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Actor</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Action</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Entity</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingLogs ?
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                          Loading audit logs...
                        </td>
                      </tr> :
                      auditLogs.length === 0 ?
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-sm font-medium text-slate-500">
                            No audit log entries matched the current filters.
                          </td>
                        </tr> :
                        auditLogs.map((log, index) => (
                          <tr
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className={`cursor-pointer transition-colors ${selectedLog?.id === log.id ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50/70`}
                          >
                            <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                            <td className="px-5 py-3 text-sm text-slate-700 whitespace-nowrap">
                              <span className="font-bold text-slate-900">{log.actorName}</span>
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                {log.actorRole}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-sm font-semibold text-slate-700">{formatLabel(log.action)}</td>
                            <td className="px-5 py-3 text-sm text-slate-700">{formatLabel(log.entityType)}</td>
                            <td className="px-5 py-3 text-xs text-slate-600">{getLogDetailSummary(log)}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Detailed Log View</h2>
            <p className="mt-1 text-sm text-slate-500">Select a log entry to inspect the actor, event payload, and restore context.</p>

            {selectedLog ?
              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected Event</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{formatLabel(selectedLog.action)}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Actor</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{selectedLog.actorName}</p>
                    <p className="text-xs text-slate-500">{selectedLog.actorRole}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Entity</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatLabel(selectedLog.entityType)}</p>
                    <p className="text-xs text-slate-500">{selectedLog.entityId}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Human Summary</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{getLogDetailSummary(selectedLog)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Raw Details</p>
                  <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs leading-6">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div> :
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-medium text-slate-500">
                Select an audit entry from the table to open its detailed view.
              </div>}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Program Age Rules</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500">
                  Update the enrollment age bands used to auto-assign learners into programs. These rules are stored in site content so the guardian enrollment form and admin maintenance view stay aligned.
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
                Requirement document review is available from the sidebar under Requirements Manager.
              </div>
            </div>

            {ageRuleError ? <p className="mt-4 text-sm font-medium text-red-600">{ageRuleError}</p> : null}
            {ageRuleStatus ? <p className="mt-4 text-sm font-medium text-emerald-700">{ageRuleStatus}</p> : null}

            <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {ageRules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{rule.id}</p>
                  <div className="mt-3 space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Program Name</span>
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(event) => updateAgeRule(rule.id, 'name', event.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Display Age Label</span>
                      <input
                        type="text"
                        value={rule.ageLabel}
                        onChange={(event) => updateAgeRule(rule.id, 'ageLabel', event.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Min Months</span>
                        <input
                          type="number"
                          min={0}
                          value={rule.minMonths}
                          onChange={(event) => updateAgeRule(rule.id, 'minMonths', event.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Max Months</span>
                        <input
                          type="number"
                          min={0}
                          value={rule.maxMonths}
                          onChange={(event) => updateAgeRule(rule.id, 'maxMonths', event.target.value)}
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Schedule Label</span>
                      <input
                        type="text"
                        value={rule.scheduleLabel}
                        onChange={(event) => updateAgeRule(rule.id, 'scheduleLabel', event.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Time Label</span>
                      <input
                        type="text"
                        value={rule.timeLabel}
                        onChange={(event) => updateAgeRule(rule.id, 'timeLabel', event.target.value)}
                        className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#60A5FA]"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleSaveAgeRules()}
                disabled={isLoadingAgeRules || isSavingAgeRules}
                className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSavingAgeRules ? 'Saving Rules...' : isLoadingAgeRules ? 'Loading Rules...' : 'Save Age Rules'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Admin Maintenance Access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Admin accounts can now use this dashboard for backup and restore work, update program age rules here, and open the sidebar Requirements Manager to review enrollment documents.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Requirements</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Use Requirements Manager in the sidebar to open the same requirement-review surface used by staff.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Age Rules</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Changes saved here immediately affect guardian eligibility messaging and auto-assigned programs.</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Restore</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Uploaded restore bundles can now be merged directly into the managed tables through an admin-only database function.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">System Maintenance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Prepare recovery packages, set the preferred backup time, and keep a record of the most recent export prepared for the web developer.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Backup Time</label>
                <input
                  type="time"
                  value={backupTime}
                  onChange={(event) => setBackupTime(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#60A5FA]"
                />
                <p className="mt-3 text-xs text-slate-500">Next scheduled backup window: {getNextBackupTime(backupTime)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last Backup Export</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{lastBackupAt ? formatDateTime(lastBackupAt) : 'No backup exported yet.'}</p>
                <p className="mt-3 text-xs text-slate-500">Use JSON for the full recovery backup with private uploads. CSV remains a lighter managed-table export.</p>
              </div>
            </div>

            {backupError ? <p className="mt-4 text-sm font-medium text-red-600">{backupError}</p> : null}
            {backupStatus ? <p className="mt-4 text-sm font-medium text-emerald-700">{backupStatus}</p> : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void generateBackup('json')}
                disabled={isGeneratingBackup}
                className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isGeneratingBackup ? 'Preparing Backup...' : 'Download Full Backup JSON'}
              </button>
              <button
                type="button"
                onClick={() => void generateBackup('csv')}
                disabled={isGeneratingBackup}
                className="rounded-xl border border-[#1D4ED8] bg-white px-5 py-3 text-sm font-bold text-[#1D4ED8] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-blue-200 disabled:text-blue-300"
              >
                Download Table Backup CSV
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900">Restore Package Builder</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload a backup JSON or CSV package, review the table counts, then either execute the admin restore workflow or download a normalized restore file.
            </p>

            <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
              <label className="text-sm font-bold text-slate-700">Upload restore source</label>
              <input
                type="file"
                accept=".json,.csv"
                onChange={(event) => void handleRestoreFileChange(event)}
                className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-blue-700"
              />
              <p className="mt-3 text-xs text-slate-500">
                JSON restore packages can also re-upload private files from the requirements and enrollment-files buckets. CSV restore packages only contain managed tables.
              </p>
            </div>

            {restoreError ? <p className="mt-4 text-sm font-medium text-red-600">{restoreError}</p> : null}
            {restoreStatus ? <p className="mt-4 text-sm font-medium text-emerald-700">{restoreStatus}</p> : null}

            {restorePackage ?
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {restoreTableCounts.map((item) => (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void applyRestoreBundle()}
                    disabled={isApplyingRestore}
                    className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
                  >
                    {isApplyingRestore ? 'Applying Restore...' : 'Apply Restore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadRestoreBundle('json')}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                  >
                    Download Restore JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadRestoreBundle('csv')}
                    className="rounded-xl border border-emerald-600 bg-white px-5 py-3 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    Download Restore CSV
                  </button>
                </div>
              </div> :
              null}
          </div>
        </section>
      </motion.div>
    </div>
  );
}