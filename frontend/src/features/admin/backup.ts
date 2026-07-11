import { supabase } from '../../lib/supabase';

/**
 * Backup + restore data layer for the admin dashboard. Every Supabase call
 * (table selects, storage list/download/upload, the `restore_backup_bundle`
 * RPC) and the CSV/JSON serialization are ported verbatim from the original
 * AdminDashboard so recovery packages stay byte-compatible.
 */

export type BackupTable =
  | 'profiles'
  | 'enrollments'
  | 'site_content'
  | 'contact_messages'
  | 'activity_logs';
export type BackupBucket = 'requirements' | 'enrollment-files';

export interface BackupStorageFile {
  path: string;
  fileName: string;
  size: number;
  contentType: string;
  createdAt: string | null;
  updatedAt: string | null;
  lastAccessedAt: string | null;
  dataBase64?: string;
}

export interface RestorePackage {
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

export interface BackupBundle {
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

export interface RestoreExecutionResult {
  profiles: number;
  enrollments: number;
  site_content: number;
  contact_messages: number;
  activity_logs: number;
  total: number;
}

export interface BackupActor {
  id: string;
  name: string;
  email: string;
}

export const backupTables: BackupTable[] = [
  'profiles',
  'enrollments',
  'site_content',
  'contact_messages',
  'activity_logs',
];

export const backupStorageBuckets: BackupBucket[] = ['requirements', 'enrollment-files'];

const backupScheduleStorageKey = 'admin-dashboard-backup-time';
const lastBackupStorageKey = 'admin-dashboard-last-backup';
const storageListPageSize = 100;

export const formatLabel = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

export const downloadTextFile = (fileName: string, content: string, mimeType: string) => {
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

export const readStoredBackupTime = () => {
  if (typeof window === 'undefined') {
    return '02:00';
  }
  return window.localStorage.getItem(backupScheduleStorageKey) || '02:00';
};

export const writeStoredBackupTime = (value: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(backupScheduleStorageKey, value);
  }
};

export const readStoredLastBackup = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(lastBackupStorageKey) || '';
};

export const writeStoredLastBackup = (value: string) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(lastBackupStorageKey, value);
  }
};

export const getNextBackupTime = (timeValue: string) => {
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

export const buildBackupCsv = (bundle: BackupBundle) => {
  const headers = ['table_name', 'record_key', 'payload_json'];
  const rows = backupTables.flatMap((table) =>
    bundle.tables[table].map((row) => {
      const recordKey =
        typeof row.id === 'string' ? row.id : typeof row.key === 'string' ? row.key : '';
      return [table, recordKey, JSON.stringify(row)];
    }),
  );

  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(',')),
  ].join('\n');
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
  activity_logs: [],
});

export const emptyRestoreStorage = (): Record<BackupBucket, BackupStorageFile[]> => ({
  requirements: [],
  'enrollment-files': [],
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
  return new Blob([bytes], { type: contentType || 'application/octet-stream' });
};

const listStorageFiles = async (
  bucketName: BackupBucket,
  prefix = '',
): Promise<BackupStorageFile[]> => {
  let offset = 0;
  let hasMorePages = true;
  const files: BackupStorageFile[] = [];

  while (hasMorePages) {
    const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
      limit: storageListPageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
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
            entry.metadata?.mimetype || entry.metadata?.contentType || 'application/octet-stream',
          createdAt: entry.created_at || null,
          updatedAt: entry.updated_at || null,
          lastAccessedAt: entry.last_accessed_at || null,
        });
        continue;
      }

      files.push(...(await listStorageFiles(bucketName, objectPath)));
    }

    if (entries.length < storageListPageSize) {
      hasMorePages = false;
    } else {
      offset += storageListPageSize;
    }
  }

  return files;
};

const captureStorageBackup = async (bucketName: BackupBucket, includeStorageContents: boolean) => {
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
        dataBase64: await fileBlobToBase64(data),
      };
    }),
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
    fileName:
      typeof row.fileName === 'string' && row.fileName ? row.fileName : path.split('/').pop() || path,
    size: typeof row.size === 'number' ? row.size : 0,
    contentType:
      typeof row.contentType === 'string' && row.contentType
        ? row.contentType
        : 'application/octet-stream',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
    lastAccessedAt: typeof row.lastAccessedAt === 'string' ? row.lastAccessedAt : null,
    dataBase64: typeof row.dataBase64 === 'string' ? row.dataBase64 : undefined,
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

      if (
        typeof tableName === 'string' &&
        backupTables.includes(tableName as BackupTable) &&
        payload &&
        typeof payload === 'object'
      ) {
        nextTables[tableName as BackupTable].push(payload as Record<string, unknown>);
      }
    });

    return nextTables;
  }

  const objectValue = value as Record<string, unknown>;
  const candidateTables =
    'tables' in objectValue && objectValue.tables && typeof objectValue.tables === 'object'
      ? (objectValue.tables as Record<string, unknown>)
      : objectValue;

  backupTables.forEach((table) => {
    const rows = candidateTables[table];

    if (Array.isArray(rows)) {
      nextTables[table] = rows.filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === 'object' && !Array.isArray(row),
      );
    }
  });

  return nextTables;
};

export const normalizeRestorePackage = (value: unknown): RestorePackage => {
  const tables = normalizeRestoreTables(value);
  const storage = emptyRestoreStorage();

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { tables, storage };
  }

  const objectValue = value as Record<string, unknown>;
  const candidateStorage =
    'storage' in objectValue && objectValue.storage && typeof objectValue.storage === 'object'
      ? (objectValue.storage as Record<string, unknown>)
      : null;

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

  return { tables, storage };
};

export const buildRestoreDownloadBundle = (restorePackage: RestorePackage) => ({
  exportedAt: new Date().toISOString(),
  tables: restorePackage.tables,
  storage: restorePackage.storage,
});

/** Parse an uploaded .json/.csv backup file into a normalized restore package. */
export const parseRestoreFile = async (file: File): Promise<RestorePackage> => {
  const fileContents = await file.text();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.json')) {
    return normalizeRestorePackage(JSON.parse(fileContents) as unknown);
  }

  if (lowerName.endsWith('.csv')) {
    const [headerLine, ...dataLines] = fileContents.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(headerLine || '');

    if (headers.join('|') !== ['table_name', 'record_key', 'payload_json'].join('|')) {
      throw new Error('Unsupported CSV format. Use a CSV exported from the Admin Dashboard backup section.');
    }

    const normalizedRows = dataLines.map((line) => {
      const [tableName, , payloadText] = parseCsvLine(line);
      return {
        table_name: tableName,
        payload: JSON.parse(payloadText),
      };
    });

    return normalizeRestorePackage(normalizedRows);
  }

  throw new Error('Upload a .json or .csv backup file.');
};

/** Read all managed tables + storage into a recovery bundle. */
export const buildBackupBundle = async (options: {
  generatedBy: BackupActor;
  backupTime: string;
  includeStorageContents: boolean;
}): Promise<BackupBundle> => {
  const queries = await Promise.all(
    backupTables.map(async (table) => {
      const { data, error } = await supabase.from(table).select('*');

      if (error) {
        throw new Error(`${table}: ${error.message}`);
      }

      return [table, (data as Record<string, unknown>[] | null) || []] as const;
    }),
  );

  const storageQueries = await Promise.all(
    backupStorageBuckets.map(async (bucket) => {
      const files = await captureStorageBackup(bucket, options.includeStorageContents);
      return [bucket, files] as const;
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: options.generatedBy,
    backupTime: options.backupTime,
    tables: Object.fromEntries(queries) as Record<BackupTable, Record<string, unknown>[]>,
    storage: Object.fromEntries(storageQueries) as Record<BackupBucket, BackupStorageFile[]>,
  };
};

/** Merge managed tables via the admin-only `restore_backup_bundle` RPC. */
export const restoreBackupTables = async (
  restoreBundle: ReturnType<typeof buildRestoreDownloadBundle>,
): Promise<Partial<RestoreExecutionResult>> => {
  const { data, error } = await supabase.rpc('restore_backup_bundle', {
    restore_bundle: restoreBundle,
  });

  if (error) {
    throw error;
  }

  return (data || {}) as Partial<RestoreExecutionResult>;
};

/** Re-upload private bucket files captured in a JSON restore package. */
export const restoreStorageFiles = async (
  storageFiles: Record<BackupBucket, BackupStorageFile[]>,
): Promise<number> => {
  let restoredFileCount = 0;

  for (const bucket of backupStorageBuckets) {
    for (const file of storageFiles[bucket]) {
      if (!file.dataBase64) {
        continue;
      }

      const fileBlob = base64ToBlob(file.dataBase64, file.contentType);
      const { error } = await supabase.storage.from(bucket).upload(file.path, fileBlob, {
        upsert: true,
        contentType: file.contentType,
      });

      if (error) {
        throw new Error(`${bucket}/${file.path}: ${error.message}`);
      }

      restoredFileCount += 1;
    }
  }

  return restoredFileCount;
};
