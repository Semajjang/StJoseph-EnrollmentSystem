import { useEffect, useMemo, useState } from 'react';
import { DownloadIcon, SettingsIcon } from 'lucide-react';
import { EnrollmentData, useEnrollment } from '../context/EnrollmentContext';
import {
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  PageHeader,
  Tabs,
  useToast,
} from '../components/ui';
import { ApplicantDrawer } from '../features/staff/ApplicantDrawer';
import { EnrollmentBulkBar } from '../features/staff/EnrollmentBulkBar';
import { EnrollmentFilterBar, QueueFilters } from '../features/staff/EnrollmentFilterBar';
import { EnrollmentQueue } from '../features/staff/EnrollmentQueue';
import { useQueueSelection } from '../features/staff/useQueueSelection';
import { useBulkQueueActions } from '../features/staff/useBulkQueueActions';
import { EnrollmentStats } from '../features/staff/EnrollmentStats';
import { SectionInfoModal } from '../features/staff/SectionInfoModal';
import { SectionManager } from '../features/staff/SectionManager';
import { useSectionCatalog } from '../features/staff/useSectionCatalog';
import { useEnrollmentQueue } from '../features/staff/useEnrollmentQueue';
import {
  ProgramOption,
  managedPrograms,
  normalizeSectionName,
  programAliases,
  programOptions,
  sectionCapacity,
} from '../features/staff/sections';
import { buildMasterlistCsv, downloadCsv } from '../features/staff/enrollmentData';

type EnrollmentStatus = EnrollmentData['status'];

const defaultFilters: QueueFilters = {
  lastNameSortOrder: 'a-z',
  programFilter: 'all',
  assignmentFilter: 'all',
  sectionFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',
};

export function StaffDashboard() {
  const { enrollments, isLoading, updateStatus, updateSection, deleteEnrollment } = useEnrollment();
  const toast = useToast();
  const notify = useMemo(() => ({ error: (message: string) => toast.error('Something went wrong', message) }), [toast]);

  const [selectedProgram, setSelectedProgram] = useState<ProgramOption>('All');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentData | null>(null);
  const [filters, setFilters] = useState<QueueFilters>(defaultFilters);
  const [isSectionInfoOpen, setIsSectionInfoOpen] = useState(false);
  const [pendingReject, setPendingReject] = useState<EnrollmentData | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const {
    sectionsByProgram,
    autoAssignByProgram,
    sectionLoadByProgram,
    toggleAutoAssign,
    addSection,
    renameSection,
    deleteSection,
  } = useSectionCatalog({ enrollments, updateSection, notify });

  const activeManagedProgram = selectedProgram === 'All' ? null : selectedProgram;
  const activeSections = activeManagedProgram ? sectionsByProgram[activeManagedProgram] : [];

  const {
    reviewableEnrollments,
    aggregateSummary,
    programCounts,
    masterlistSectionOptions,
    filteredMasterlist,
    selectedSectionStudents,
    scopeLabel,
  } = useEnrollmentQueue({
    enrollments,
    selectedProgram,
    selectedSection,
    activeManagedProgram,
    filters,
  });

  const filteredIds = useMemo(
    () => filteredMasterlist.map((enrollment) => enrollment.id),
    [filteredMasterlist],
  );
  const selection = useQueueSelection(filteredIds);

  const filterSignature = [
    selectedProgram,
    selectedSection ?? '',
    filters.programFilter,
    filters.assignmentFilter,
    filters.sectionFilter,
    filters.statusFilter,
    filters.lastNameSortOrder,
    filters.searchQuery.trim().toLowerCase(),
  ].join('|');

  // Drop the selected section if the program changes or the section disappears.
  useEffect(() => {
    if (!activeManagedProgram) {
      setSelectedSection(null);
      return;
    }
    if (selectedSection && !sectionsByProgram[activeManagedProgram].includes(selectedSection)) {
      setSelectedSection(null);
    }
  }, [activeManagedProgram, sectionsByProgram, selectedSection]);

  // Keep the open drawer in sync with the latest enrollment data.
  useEffect(() => {
    if (!selectedStudent) {
      return;
    }
    const latest = enrollments.find((enrollment) => enrollment.id === selectedStudent.id);
    setSelectedStudent(latest ?? null);
  }, [enrollments, selectedStudent]);

  const canApprove = (enrollment: EnrollmentData) => {
    const program = managedPrograms.find((candidate) =>
      programAliases[candidate].includes(enrollment.program),
    );
    return program ? sectionsByProgram[program].length > 0 : true;
  };

  const applyStatusChange = async (enrollment: EnrollmentData, nextStatus: EnrollmentStatus) => {
    const targetStatus =
      nextStatus === 'Approved' && !canApprove(enrollment) ? 'Waitlisted' : nextStatus;
    const { error } = await updateStatus(enrollment.id, targetStatus);
    if (error) {
      notify.error(error);
      return;
    }
    if (nextStatus === 'Approved' && targetStatus === 'Waitlisted') {
      toast.toast({
        tone: 'warning',
        title: 'Waitlisted instead of approved',
        description: 'Add a section for this program before approving so a slot is available.',
      });
      return;
    }
    toast.success('Status updated', `Set to ${targetStatus}.`);
  };

  // Rejecting is destructive-ish (the family is turned away), so gate it behind a
  // confirm like Delete. Approve / Pending / Waitlisted still apply instantly.
  const handleStatusChange = (enrollment: EnrollmentData, nextStatus: EnrollmentStatus) => {
    if (nextStatus === 'Rejected') {
      setPendingReject(enrollment);
      return;
    }
    void applyStatusChange(enrollment, nextStatus);
  };

  const handleConfirmReject = async () => {
    if (!pendingReject) {
      return;
    }
    setIsRejecting(true);
    await applyStatusChange(pendingReject, 'Rejected');
    setIsRejecting(false);
    setPendingReject(null);
  };

  // Bulk approve + bulk assign consume real section capacity and can span every
  // filtered row (not just the visible ~50), so they run behind a ConfirmDialog
  // that states the count + skip/capacity caveats. See useBulkQueueActions.
  const bulk = useBulkQueueActions({
    filteredMasterlist,
    selectedIds: selection.selectedIds,
    clearSelection: selection.clear,
    canApprove,
    updateStatus,
    updateSection,
    activeManagedProgram,
    sectionLoadByProgram,
    toast,
    notifyError: notify.error,
  });

  const handleSectionChange = async (enrollment: EnrollmentData, nextSection: string | null) => {
    const normalizedSection = nextSection ? normalizeSectionName(nextSection) : null;
    const program = managedPrograms.find((candidate) =>
      programAliases[candidate].includes(enrollment.program),
    );
    const currentCount =
      normalizedSection && program ? sectionLoadByProgram[program][normalizedSection] || 0 : 0;
    const isMoving = !!normalizedSection && enrollment.section !== normalizedSection;
    const projectedCount = normalizedSection && isMoving ? currentCount + 1 : currentCount;

    const { error } = await updateSection(enrollment.id, normalizedSection);
    if (error) {
      notify.error(error);
      return;
    }
    if (normalizedSection && projectedCount > sectionCapacity) {
      toast.toast({
        tone: 'warning',
        title: 'Section is over capacity',
        description: `${normalizedSection} now holds ${projectedCount} learners (max ${sectionCapacity}).`,
      });
      return;
    }
    toast.success(normalizedSection ? 'Section assigned' : 'Section cleared');
  };

  const handleDeleteEnrollment = async (enrollment: EnrollmentData) => {
    const { error } = await deleteEnrollment(enrollment.id);
    if (error) {
      notify.error(error);
      return false;
    }
    toast.success('Record deleted', `${enrollment.childFirstName} ${enrollment.childLastName} was removed.`);
    return true;
  };

  const handleAddSection = (name: string, startTime: string, endTime: string) => {
    if (!activeManagedProgram) {
      return false;
    }
    const added = addSection(activeManagedProgram, name, startTime, endTime);
    if (added) {
      toast.success('Section added');
    }
    return added;
  };

  const handleRenameSection = async (name: string, startTime: string, endTime: string) => {
    if (!activeManagedProgram || !selectedSection) {
      return false;
    }
    const result = await renameSection(activeManagedProgram, selectedSection, name, startTime, endTime);
    if (result.error) {
      notify.error(result.error);
      return false;
    }
    if (result.nextLabel && result.nextLabel !== selectedSection) {
      setSelectedSection(result.nextLabel);
      toast.success('Section updated');
    }
    setIsSectionInfoOpen(false);
    return true;
  };

  const handleDeleteSection = async () => {
    if (!activeManagedProgram || !selectedSection) {
      return false;
    }
    const result = await deleteSection(activeManagedProgram, selectedSection);
    if (result.error) {
      notify.error(result.error);
      return false;
    }
    setSelectedSection(null);
    setIsSectionInfoOpen(false);
    toast.success('Section deleted');
    return true;
  };

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <PageHeader
        eyebrow="Enrollment workqueue"
        title="Applications"
        description="Review submitted applications, update status and sections, and keep the masterlist current."
        actions={
          <Button
            variant="subtle"
            leftIcon={<DownloadIcon className="h-4 w-4" />}
            onClick={() => downloadCsv('masterlist.csv', buildMasterlistCsv(filteredMasterlist))}
            disabled={filteredMasterlist.length === 0}
          >
            Download masterlist
          </Button>
        }
      />

      <EnrollmentStats summary={aggregateSummary} isLoading={isLoading} scopeLabel={scopeLabel} />

      <Card padding="none">
        <CardBody className="space-y-5">
          <Tabs
            value={selectedProgram}
            onChange={(id) => setSelectedProgram(id as ProgramOption)}
            items={programOptions.map((program) => ({
              id: program,
              label: program,
              count: programCounts[program],
            }))}
          />
          {activeManagedProgram ? (
            <SectionManager
              program={activeManagedProgram}
              sections={activeSections}
              sectionLoad={sectionLoadByProgram[activeManagedProgram]}
              selectedSection={selectedSection}
              onSelectSection={setSelectedSection}
              autoAssign={autoAssignByProgram[activeManagedProgram]}
              onToggleAutoAssign={() => toggleAutoAssign(activeManagedProgram)}
              onAddSection={handleAddSection}
            />
          ) : (
            <p className="text-sm text-muted">
              Choose a program above to manage its sections and turn on automatic assignment.
            </p>
          )}
        </CardBody>
      </Card>

      <Card padding="none">
        <CardBody className="space-y-4">
          <EnrollmentFilterBar
            filters={filters}
            onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
            onReset={() => setFilters(defaultFilters)}
            selectedProgram={selectedProgram}
            selectedSection={selectedSection}
            sectionOptions={masterlistSectionOptions}
          />
          {selectedSection ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-sunk/60 px-4 py-3">
              <p className="text-sm font-semibold text-ink">
                Viewing {selectedSection}
                <span className="ml-2 font-normal text-muted">
                  {selectedSectionStudents.length} assigned
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<SettingsIcon className="h-3.5 w-3.5" />}
                  onClick={() => setIsSectionInfoOpen(true)}
                >
                  Section settings
                </Button>
                <Button
                  variant="subtle"
                  size="sm"
                  leftIcon={<DownloadIcon className="h-3.5 w-3.5" />}
                  onClick={() =>
                    downloadCsv(
                      `${selectedSection.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-masterlist.csv`,
                      buildMasterlistCsv(selectedSectionStudents),
                    )
                  }
                >
                  Download section list
                </Button>
              </div>
            </div>
          ) : null}
        </CardBody>
        {selection.selectedCount > 0 ? (
          <EnrollmentBulkBar
            selectedCount={selection.selectedCount}
            isBusy={bulk.isBulkBusy}
            onApproveSelected={bulk.requestBulkApprove}
            onClear={selection.clear}
            sectionOptions={activeManagedProgram ? sectionsByProgram[activeManagedProgram] : null}
            sectionLoad={activeManagedProgram ? sectionLoadByProgram[activeManagedProgram] : null}
            onAssignSection={bulk.requestBulkAssignSection}
          />
        ) : null}
        <EnrollmentQueue
          rows={filteredMasterlist}
          isLoading={isLoading}
          hasReviewable={reviewableEnrollments.length > 0}
          sectionsByProgram={sectionsByProgram}
          sectionLoadByProgram={sectionLoadByProgram}
          onSelect={setSelectedStudent}
          onChangeStatus={handleStatusChange}
          onChangeSection={handleSectionChange}
          selectedIds={selection.selectedIds}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          onToggleRow={selection.toggle}
          onToggleAll={selection.toggleAll}
          filterSignature={filterSignature}
        />
      </Card>

      {selectedStudent ? (
        <ApplicantDrawer
          student={selectedStudent}
          open={Boolean(selectedStudent)}
          onClose={() => setSelectedStudent(null)}
          sectionsByProgram={sectionsByProgram}
          sectionLoadByProgram={sectionLoadByProgram}
          onChangeStatus={handleStatusChange}
          onChangeSection={handleSectionChange}
          onDelete={handleDeleteEnrollment}
        />
      ) : null}

      {activeManagedProgram && selectedSection ? (
        <SectionInfoModal
          open={isSectionInfoOpen}
          program={activeManagedProgram}
          section={selectedSection}
          studentCount={selectedSectionStudents.length}
          onClose={() => setIsSectionInfoOpen(false)}
          onSave={handleRenameSection}
          onDelete={handleDeleteSection}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingReject)}
        onCancel={() => setPendingReject(null)}
        onConfirm={handleConfirmReject}
        isLoading={isRejecting}
        title="Reject this application?"
        message={
          pendingReject
            ? `This sets ${pendingReject.childFirstName} ${pendingReject.childLastName}'s application to Rejected. You can change it back later if needed.`
            : ''
        }
        confirmLabel="Reject application"
      />

      <ConfirmDialog
        open={Boolean(bulk.pendingBulk)}
        onCancel={bulk.cancelBulk}
        onConfirm={bulk.confirmBulk}
        isLoading={bulk.isBulkBusy}
        tone="brand"
        title={bulk.pendingBulk?.title ?? ''}
        message={bulk.pendingBulk?.message ?? ''}
        confirmLabel={bulk.pendingBulk?.confirmLabel ?? 'Confirm'}
      />
    </div>
  );
}
