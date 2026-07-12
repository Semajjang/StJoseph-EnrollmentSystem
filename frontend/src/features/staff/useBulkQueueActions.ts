import { useRef, useState } from 'react';
import type { EnrollmentData } from '../../context/EnrollmentContext';
import type { useToast } from '../../components/ui';
import { ManagedProgram, normalizeSectionName, sectionCapacity } from './sections';

type EnrollmentStatus = EnrollmentData['status'];
type ToastApi = ReturnType<typeof useToast>;

interface UseBulkQueueActionsParams {
  /** Rows currently visible under the active filter/scope. */
  filteredMasterlist: EnrollmentData[];
  /** Ids the staffer has ticked in the queue. */
  selectedIds: Set<string>;
  /** Clears the queue selection after a run completes. */
  clearSelection: () => void;
  /** True when the learner's program has at least one section to hold them. */
  canApprove: (enrollment: EnrollmentData) => boolean;
  updateStatus: (id: string, status: EnrollmentStatus) => Promise<{ error: string | null }>;
  updateSection: (id: string, section: string | null) => Promise<{ error: string | null }>;
  /** The single program in view, or null when viewing all programs. */
  activeManagedProgram: ManagedProgram | null;
  sectionLoadByProgram: Record<ManagedProgram, Record<string, number>>;
  toast: ToastApi;
  notifyError: (message: string) => void;
}

/** Confirm payload surfaced to the shared ConfirmDialog before a bulk run. */
interface PendingBulkAction {
  title: string;
  message: string;
  confirmLabel: string;
  run: () => Promise<void>;
}

const learners = (count: number) => `${count} learner${count === 1 ? '' : 's'}`;

/** Live progress of an in-flight bulk run, surfaced in the confirm dialog. */
export interface BulkProgress {
  processed: number;
  total: number;
}

/**
 * Bulk approve + bulk section-assign for the enrollment queue.
 *
 * These actions consume real section capacity and — via "select all filtered" —
 * can span far more than the visible rows, so each one is gated behind a
 * ConfirmDialog that spells out the count and the skip/capacity caveats the run
 * will apply. While a run executes it reports live `processed / total` progress,
 * and each completed run surfaces a time-boxed **Undo** that reverses only the
 * rows it actually changed (restoring each learner's prior status or section).
 * The per-row Supabase mutations run unchanged once confirmed; cancelling leaves
 * the selection intact.
 */
export function useBulkQueueActions({
  filteredMasterlist,
  selectedIds,
  clearSelection,
  canApprove,
  updateStatus,
  updateSection,
  activeManagedProgram,
  sectionLoadByProgram,
  toast,
  notifyError,
}: UseBulkQueueActionsParams) {
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);
  const [pendingBulk, setPendingBulk] = useState<PendingBulkAction | null>(null);
  // Guards against a double-fire of confirm before `isBulkBusy` has flushed.
  const runningRef = useRef(false);

  const selectedRows = () =>
    filteredMasterlist.filter((enrollment) => selectedIds.has(enrollment.id));

  const tickProgress = () =>
    setBulkProgress((current) => (current ? { ...current, processed: current.processed + 1 } : current));

  const undoApprovals = async (entries: { id: string; previousStatus: EnrollmentStatus }[]) => {
    let reverted = 0;
    let failed = 0;
    for (const entry of entries) {
      const { error } = await updateStatus(entry.id, entry.previousStatus);
      if (error) {
        failed += 1;
      } else {
        reverted += 1;
      }
    }
    if (reverted > 0) {
      toast.success('Approval undone', `${learners(reverted)} set back to their previous status.`);
    }
    if (failed > 0) {
      notifyError(`${failed} couldn't be undone. Please try again.`);
    }
  };

  const undoAssignments = async (entries: { id: string; previousSection: string | null }[]) => {
    let reverted = 0;
    let failed = 0;
    for (const entry of entries) {
      const { error } = await updateSection(entry.id, entry.previousSection);
      if (error) {
        failed += 1;
      } else {
        reverted += 1;
      }
    }
    if (reverted > 0) {
      toast.success('Section change undone', `${learners(reverted)} moved back to where they were.`);
    }
    if (failed > 0) {
      notifyError(`${failed} couldn't be undone. Please try again.`);
    }
  };

  const runBulkApprove = async (toApprove: EnrollmentData[], blockedCount: number) => {
    setIsBulkBusy(true);
    setBulkProgress({ processed: 0, total: toApprove.length });
    const undoEntries: { id: string; previousStatus: EnrollmentStatus }[] = [];
    let approvedCount = 0;
    let errorCount = 0;
    for (const enrollment of toApprove) {
      const previousStatus = enrollment.status;
      const { error } = await updateStatus(enrollment.id, 'Approved');
      if (error) {
        errorCount += 1;
      } else {
        approvedCount += 1;
        undoEntries.push({ id: enrollment.id, previousStatus });
      }
      tickProgress();
    }
    setBulkProgress(null);
    setIsBulkBusy(false);
    clearSelection();

    if (blockedCount > 0) {
      toast.toast({
        tone: 'warning',
        title: 'Some learners need a section first',
        description: `${blockedCount} couldn't be approved because their program has no sections yet. Add a section, then approve.`,
      });
    }
    if (errorCount > 0) {
      notifyError(`${errorCount} update(s) failed. Please try again.`);
    }
    if (approvedCount > 0) {
      toast.toast({
        tone: 'success',
        title: 'Applications approved',
        description: `${learners(approvedCount)} set to Approved.`,
        duration: 8000,
        action: { label: 'Undo', onClick: () => undoApprovals(undoEntries) },
      });
    } else if (blockedCount === 0 && errorCount === 0) {
      toast.toast({
        tone: 'info',
        title: 'Nothing to approve',
        description: 'The selected learners are already approved.',
      });
    }
  };

  const requestBulkApprove = () => {
    const selected = selectedRows();
    const blocked = selected.filter((enrollment) => !canApprove(enrollment));
    const toApprove = selected.filter(
      (enrollment) => canApprove(enrollment) && enrollment.status !== 'Approved',
    );
    const alreadyApproved = selected.filter((enrollment) => enrollment.status === 'Approved');

    const parts = [
      `Approve ${selected.length} selected application${selected.length === 1 ? '' : 's'}?`,
    ];
    if (toApprove.length > 0) {
      parts.push(`${learners(toApprove.length)} will be set to Approved.`);
    }
    if (blocked.length > 0) {
      parts.push(
        `${blocked.length} in ${
          blocked.length === 1 ? 'a program with no section' : 'programs with no sections'
        } yet will be skipped.`,
      );
    }
    if (alreadyApproved.length > 0) {
      parts.push(`${alreadyApproved.length} already approved will be left unchanged.`);
    }

    setPendingBulk({
      title: 'Approve selected applications?',
      message: parts.join(' '),
      confirmLabel: toApprove.length > 0 ? `Approve ${toApprove.length}` : 'Approve',
      run: () => runBulkApprove(toApprove, blocked.length),
    });
  };

  const runBulkAssignSection = async (
    normalizedSection: string,
    eligible: EnrollmentData[],
    notApprovedCount: number,
    projectedCount: number,
  ) => {
    // Only rows that actually change section are mutated (and counted in progress).
    const movers = eligible.filter((enrollment) => enrollment.section !== normalizedSection);
    setIsBulkBusy(true);
    setBulkProgress({ processed: 0, total: movers.length });
    const undoEntries: { id: string; previousSection: string | null }[] = [];
    let assignedCount = 0;
    let errorCount = 0;
    for (const enrollment of movers) {
      const previousSection = enrollment.section ?? null;
      const { error } = await updateSection(enrollment.id, normalizedSection);
      if (error) {
        errorCount += 1;
      } else {
        assignedCount += 1;
        undoEntries.push({ id: enrollment.id, previousSection });
      }
      tickProgress();
    }
    setBulkProgress(null);
    setIsBulkBusy(false);
    clearSelection();

    if (notApprovedCount > 0) {
      toast.toast({
        tone: 'warning',
        title: 'Some learners were skipped',
        description: `${notApprovedCount} aren't approved yet. Approve them before assigning a section.`,
      });
    }
    if (errorCount > 0) {
      notifyError(`${errorCount} assignment(s) failed. Please try again.`);
    }
    if (assignedCount > 0) {
      const undoAction = { label: 'Undo', onClick: () => undoAssignments(undoEntries) };
      if (projectedCount > sectionCapacity) {
        toast.toast({
          tone: 'warning',
          title: 'Section is over capacity',
          description: `${normalizedSection} now holds ${projectedCount} learners (max ${sectionCapacity}).`,
          duration: 8000,
          action: undoAction,
        });
      } else {
        toast.toast({
          tone: 'success',
          title: 'Section assigned',
          description: `${learners(assignedCount)} moved to ${normalizedSection}.`,
          duration: 8000,
          action: undoAction,
        });
      }
    }
  };

  const requestBulkAssignSection = (section: string) => {
    if (!activeManagedProgram) {
      return;
    }
    const normalizedSection = normalizeSectionName(section);
    const selected = selectedRows();
    // Only Approved learners can hold a section (the approve-first rule).
    const eligible = selected.filter((enrollment) => enrollment.status === 'Approved');
    const notApproved = selected.filter((enrollment) => enrollment.status !== 'Approved');
    const movingIn = eligible.filter(
      (enrollment) => enrollment.section !== normalizedSection,
    ).length;
    const projectedCount =
      (sectionLoadByProgram[activeManagedProgram][normalizedSection] || 0) + movingIn;

    const parts = [
      `Assign section "${normalizedSection}" to ${eligible.length} selected approved learner${
        eligible.length === 1 ? '' : 's'
      }?`,
    ];
    if (notApproved.length > 0) {
      parts.push(`${notApproved.length} not yet approved will be skipped.`);
    }
    if (projectedCount > sectionCapacity) {
      parts.push(
        `${normalizedSection} would then hold ${projectedCount} learners (max ${sectionCapacity}).`,
      );
    }

    setPendingBulk({
      title: 'Assign section to selected learners?',
      message: parts.join(' '),
      confirmLabel: 'Assign section',
      run: () => runBulkAssignSection(normalizedSection, eligible, notApproved.length, projectedCount),
    });
  };

  const confirmBulk = async () => {
    if (!pendingBulk || runningRef.current) {
      return;
    }
    runningRef.current = true;
    try {
      await pendingBulk.run();
    } finally {
      runningRef.current = false;
      setPendingBulk(null);
    }
  };

  const cancelBulk = () => setPendingBulk(null);

  return {
    isBulkBusy,
    bulkProgress,
    pendingBulk,
    requestBulkApprove,
    requestBulkAssignSection,
    confirmBulk,
    cancelBulk,
  };
}
