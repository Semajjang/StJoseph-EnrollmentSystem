import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEnrollment } from '../context/EnrollmentContext';
import { PageHeader } from '../components/ui';
import { AdminOverview } from '../features/admin/AdminOverview';
import { AgeRuleEditor } from '../features/admin/AgeRuleEditor';
import { AuditViewer } from '../features/admin/AuditViewer';
import { BackupRestore } from '../features/admin/BackupRestore';
import { useOperationalData } from '../features/admin/useOperationalData';
import { readStoredBackupTime, writeStoredBackupTime } from '../features/admin/backup';

export function AdminDashboard() {
  const { user } = useAuth();
  const { enrollments } = useEnrollment();
  const { activityLogs, isLoadingLogs, activityError, reloadLogs, performanceMetrics } =
    useOperationalData();
  const [backupTime, setBackupTime] = useState(() => readStoredBackupTime());

  useEffect(() => {
    writeStoredBackupTime(backupTime);
  }, [backupTime]);

  const backupActor = {
    id: user?.id || 'unknown',
    name: user?.name || 'Unknown Admin',
    email: user?.email || '',
  };

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <PageHeader
        eyebrow="Admin"
        title="Operations & maintenance"
        description="Monitor enrollment health, review the audit trail, tune program age rules, and manage backups."
      />

      <AdminOverview
        enrollments={enrollments}
        activityLogs={activityLogs}
        performanceMetrics={performanceMetrics}
        backupTime={backupTime}
      />

      <AuditViewer activityLogs={activityLogs} isLoading={isLoadingLogs} error={activityError} />

      <AgeRuleEditor />

      <BackupRestore
        actor={backupActor}
        backupTime={backupTime}
        onBackupTimeChange={setBackupTime}
        onRestored={reloadLogs}
      />
    </div>
  );
}
