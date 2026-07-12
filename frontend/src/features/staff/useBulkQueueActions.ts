import { useState } from 'react';
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

/**
 * Bulk approve + bulk section-assign for the enrollment queue.
 *
 * These actions consume real section capacity and — via "select all filtered" —
 * can span far more than the visible rows, so each one is now gated behind a
 * ConfirmDialog that spells out the count and the skip/capacity caveats the run
 * will apply. The per-row Supabase mutations (approve→section gating, capacity
 * warnings) run unchanged once confirmed; cancelling leaves the selection intact.
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
  const [pendingBulk, setPendingBulk] = useState<PendingBulkAction | null>(null);

  const selectedRows = () =>
    filteredMasterlist.filter((enrollment) => selectedIds.has(enrollment.id));

  const runBulkApprove = async (toApprove: EnrollmentData[], blockedCount: number) => {
    setIsBulkBusy(true);
    let approvedCount = 0;
    let errorCount = 0;
    for (const enrollment of toApprove) {
      const { error } = await updateStatus(enrollment.id, 'Approved');
      if (error) {
        errorCount += 1;
      } else {
        approvedCount += 1;
      }
    }
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
      toast.success('Applications approved', `${approvedCount} learner(s) set to Approved.`);
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
    setIsBulkBusy(true);
    let assignedCount = 0;
    let errorCount = 0;
    for (const enrollment of eligible) {
      if (enrollment.section === normalizedSection) {
        continue;
      }
      const { error } = await updateSection(enrollment.id, normalizedSection);
      if (error) {
        errorCount += 1;
      } else {
        assignedCount += 1;
      }
    }
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
      if (projectedCount > sectionCapacity) {
        toast.toast({
          tone: 'warning',
          title: 'Section is over capacity',
          description: `${normalizedSection} now holds ${projectedCount} learners (max ${sectionCapacity}).`,
        });
      } else {
        toast.success('Section assigned', `${assignedCount} learner(s) moved to ${normalizedSection}.`);
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
    if (!pendingBulk) {
      return;
    }
    await pendingBulk.run();
    setPendingBulk(null);
  };

  const cancelBulk = () => setPendingBulk(null);

  return {
    isBulkBusy,
    pendingBulk,
    requestBulkApprove,
    requestBulkAssignSection,
    confirmBulk,
    cancelBulk,
  };
}
