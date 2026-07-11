import { ChangeEvent, useMemo, useState } from 'react';
import { DatabaseBackupIcon, DownloadIcon, UploadIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  useToast,
} from '../../components/ui';
import {
  BackupActor,
  BackupBundle,
  RestorePackage,
  backupStorageBuckets,
  backupTables,
  buildBackupCsv,
  buildRestoreDownloadBundle,
  downloadTextFile,
  emptyRestoreStorage,
  formatLabel,
  buildBackupBundle,
  getNextBackupTime,
  parseRestoreFile,
  readStoredLastBackup,
  restoreBackupTables,
  restoreStorageFiles,
  writeStoredLastBackup,
} from './backup';
import { formatDateTime } from './activityLog';

interface BackupRestoreProps {
  actor: BackupActor;
  backupTime: string;
  onBackupTimeChange: (value: string) => void;
  onRestored: () => void;
}

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

/** Build recovery backups and merge uploaded restore packages (admin-only). */
export function BackupRestore({ actor, backupTime, onBackupTimeChange, onRestored }: BackupRestoreProps) {
  const toast = useToast();
  const [lastBackupAt, setLastBackupAt] = useState(() => readStoredLastBackup());
  const [isGeneratingBackup, setIsGeneratingBackup] = useState(false);
  const [restorePackage, setRestorePackage] = useState<RestorePackage | null>(null);
  const [isApplyingRestore, setIsApplyingRestore] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  const restoreTableCounts = useMemo(() => {
    if (!restorePackage) {
      return [] as Array<{ label: string; value: number }>;
    }

    return [
      ...backupTables.map((table) => ({
        label: formatLabel(table),
        value: restorePackage.tables[table].length,
      })),
      ...backupStorageBuckets.map((bucket) => ({
        label: `${formatLabel(bucket)} files`,
        value: restorePackage.storage[bucket].length,
      })),
    ];
  }, [restorePackage]);

  const generateBackup = async (format: 'json' | 'csv') => {
    setIsGeneratingBackup(true);
    try {
      const bundle = await buildBackupBundle({
        generatedBy: actor,
        backupTime,
        includeStorageContents: format === 'json',
      });
      const storageFileCount = backupStorageBuckets.reduce(
        (sum, bucket) => sum + bundle.storage[bucket].length,
        0,
      );

      if (format === 'json') {
        downloadTextFile(
          `admin-backup-${timestamp()}.json`,
          JSON.stringify(bundle, null, 2),
          'application/json;charset=utf-8;',
        );
      } else {
        downloadTextFile(`admin-backup-${timestamp()}.csv`, buildBackupCsv(bundle), 'text/csv;charset=utf-8;');
      }

      writeStoredLastBackup(bundle.generatedAt);
      setLastBackupAt(bundle.generatedAt);
      toast.success(
        'Backup ready',
        format === 'json'
          ? `Full recovery backup generated with ${storageFileCount} private upload files.`
          : 'Table backup CSV generated.',
      );
    } catch (error) {
      toast.error('Backup failed', error instanceof Error ? error.message : 'Unable to generate backup.');
    } finally {
      setIsGeneratingBackup(false);
    }
  };

  const handleRestoreFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const parsed = await parseRestoreFile(file);
      setRestorePackage(parsed);
      toast.success('Restore package loaded', 'Review the managed table counts, then apply or export.');
    } catch (error) {
      setRestorePackage(null);
      toast.error('Unable to read package', error instanceof Error ? error.message : undefined);
    } finally {
      event.target.value = '';
    }
  };

  const downloadRestoreBundle = (format: 'json' | 'csv') => {
    if (!restorePackage) {
      return;
    }

    const bundle = buildRestoreDownloadBundle(restorePackage);

    if (format === 'json') {
      downloadTextFile(
        `restore-package-${timestamp()}.json`,
        JSON.stringify(bundle, null, 2),
        'application/json;charset=utf-8;',
      );
      return;
    }

    const csvBundle: BackupBundle = {
      generatedAt: bundle.exportedAt,
      generatedBy: actor,
      backupTime,
      tables: restorePackage.tables,
      storage: emptyRestoreStorage(),
    };

    downloadTextFile(`restore-package-${timestamp()}.csv`, buildBackupCsv(csvBundle), 'text/csv;charset=utf-8;');
  };

  const applyRestoreBundle = async () => {
    if (!restorePackage) {
      return;
    }

    setIsApplyingRestore(true);
    setConfirmRestoreOpen(false);
    let restoreStage: 'tables' | 'storage' = 'tables';

    try {
      const restoreBundle = buildRestoreDownloadBundle(restorePackage);
      const result = await restoreBackupTables(restoreBundle);

      restoreStage = 'storage';
      const restoredFileCount = await restoreStorageFiles(restorePackage.storage);
      const totalRows = typeof result.total === 'number' ? result.total : 0;

      toast.success(
        'Restore applied',
        `${totalRows} records merged and ${restoredFileCount} private upload files restored.`,
      );
      onRestored();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to apply restore package.';
      toast.error(
        'Restore failed',
        restoreStage === 'storage'
          ? `Managed tables were restored, but private file restore failed: ${message}`
          : message,
      );
    } finally {
      setIsApplyingRestore(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card padding="none">
          <CardHeader
            eyebrow="Recovery"
            title="System maintenance"
            description="Prepare recovery packages and set the preferred backup window."
          />
          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Backup time" hint={`Next window: ${getNextBackupTime(backupTime)}`}>
                {({ id }) => (
                  <Input
                    id={id}
                    type="time"
                    value={backupTime}
                    onChange={(event) => onBackupTimeChange(event.target.value)}
                  />
                )}
              </Field>
              <div className="rounded-xl border border-line bg-surface-sunk p-4">
                <p className="text-2xs font-bold uppercase tracking-[0.1em] text-muted">Last backup export</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {lastBackupAt ? formatDateTime(lastBackupAt) : 'No backup exported yet.'}
                </p>
                <p className="mt-2 text-xs text-muted">
                  JSON includes private uploads; CSV is a lighter managed-table export.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                leftIcon={<DatabaseBackupIcon className="h-4 w-4" />}
                onClick={() => generateBackup('json')}
                isLoading={isGeneratingBackup}
              >
                Download full backup (JSON)
              </Button>
              <Button
                variant="outline"
                leftIcon={<DownloadIcon className="h-4 w-4" />}
                onClick={() => generateBackup('csv')}
                disabled={isGeneratingBackup}
              >
                Table backup (CSV)
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card padding="none">
          <CardHeader
            eyebrow="Recovery"
            title="Restore package builder"
            description="Upload a backup, review its contents, then merge it into the managed tables."
          />
          <CardBody className="space-y-5">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-surface-sunk/60 px-6 py-8 text-center transition hover:border-brand/40">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand">
                <UploadIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-ink">Upload a restore source</span>
              <span className="text-xs text-muted">JSON restores private uploads too. CSV covers managed tables only.</span>
              <input
                type="file"
                accept=".json,.csv"
                className="hidden"
                onChange={(event) => void handleRestoreFileChange(event)}
              />
            </label>

            {restorePackage ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {restoreTableCounts.map((item) => (
                    <div key={item.label} className="rounded-xl border border-line bg-surface px-4 py-3">
                      <p className="text-2xs font-bold uppercase tracking-[0.08em] text-muted">{item.label}</p>
                      <p className="mt-1 font-display text-xl font-bold text-ink tabular-nums">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="danger"
                    onClick={() => setConfirmRestoreOpen(true)}
                    isLoading={isApplyingRestore}
                  >
                    Apply restore
                  </Button>
                  <Button variant="subtle" onClick={() => downloadRestoreBundle('json')}>
                    Export restore JSON
                  </Button>
                  <Button variant="subtle" onClick={() => downloadRestoreBundle('csv')}>
                    Export restore CSV
                  </Button>
                </div>
              </div>
            ) : (
              <Badge tone="neutral">No restore package loaded yet.</Badge>
            )}
          </CardBody>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmRestoreOpen}
        onCancel={() => setConfirmRestoreOpen(false)}
        onConfirm={applyRestoreBundle}
        isLoading={isApplyingRestore}
        title="Apply this restore package?"
        message="This merges the uploaded records into the live managed tables and re-uploads private files. This can't be undone — export a fresh backup first if you're unsure."
        confirmLabel="Apply restore"
      />
    </>
  );
}
