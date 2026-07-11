import { BabyIcon, CalendarClockIcon, CheckCircle2Icon, FolderOpenIcon, LayersIcon, PlusIcon } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  LoadingScreen,
  PageHeader,
  StatusPill,
} from '../components/ui';
import { useEnrollment } from '../context/EnrollmentContext';
import { REQUIRED_DOCUMENT_COUNT } from '../features/enrollment/RequirementsUploader';

interface ChildProfileProps {
  onStartEnrollment: () => void;
  onManageRequirements: (enrollmentId: string) => void;
}

const programTone: Record<string, 'brand' | 'accent' | 'info'> = {
  'ITEd (Infant/Toddler)': 'accent',
  'Pre-Kindergarten 1': 'info',
  'Pre-Kindergarten 2': 'brand',
};

export function ChildProfile({ onStartEnrollment, onManageRequirements }: ChildProfileProps) {
  const { enrollments, isLoading } = useEnrollment();

  if (isLoading && enrollments.length === 0) {
    return <LoadingScreen label="Loading your children" />;
  }

  if (enrollments.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
        <PageHeader eyebrow="My children" title="Your children" description="Every child you enroll appears here with their status and section." />
        <EmptyState
          icon={<BabyIcon />}
          title="No child record yet"
          description="Submit an enrollment first, and your child's details will show up here."
          action={<Button onClick={onStartEnrollment} leftIcon={<PlusIcon className="h-4 w-4" />}>Start enrollment</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="My children"
        title="Your children"
        description="The enrollment details currently on file for each child."
        actions={
          <Button variant="subtle" onClick={onStartEnrollment} leftIcon={<PlusIcon className="h-4 w-4" />}>
            Enroll another child
          </Button>
        }
      />

      <div className="space-y-4">
        {enrollments.map((enrollment) => {
          const rawSectionLabel = enrollment.section && enrollment.section.trim() ? enrollment.section.trim() : '';
          const sectionMatch = rawSectionLabel.match(/^(.*?)(?:\s*\(([^()]+)\))?$/);
          const sectionName = sectionMatch?.[1]?.trim() || '';
          const sectionScheduleRange = sectionMatch?.[2]?.trim() || '';
          const sectionLabel = sectionName || 'Not assigned yet';
          const rawSchedule = typeof enrollment.formData?.schedule === 'string' ? enrollment.formData.schedule : '';
          const normalizedSchedule = rawSchedule.trim().toUpperCase();
          const inferredFromSection = sectionScheduleRange.toUpperCase();
          const schedule =
            normalizedSchedule === 'AM' || normalizedSchedule === 'PM'
              ? normalizedSchedule
              : inferredFromSection.includes('AM')
                ? 'AM'
                : inferredFromSection.includes('PM')
                  ? 'PM'
                  : null;
          const scheduleTimeLabel = sectionScheduleRange
            ? sectionScheduleRange
            : schedule === 'AM'
              ? '10:00 AM - 12:00 PM'
              : schedule === 'PM'
                ? '1:00 PM - 3:00 PM'
                : 'Not assigned yet';

          const uploadedDocs = enrollment.requirements?.length || 0;
          const docsComplete = uploadedDocs >= REQUIRED_DOCUMENT_COUNT;

          return (
            <Card key={enrollment.id} padding="none" className="animate-fade-up">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">
                    <BabyIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink">
                      {enrollment.childFirstName} {enrollment.childLastName}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone={programTone[enrollment.program] ?? 'neutral'}>{enrollment.program}</Badge>
                      <span className="text-xs text-muted">
                        Submitted {new Date(enrollment.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <StatusPill status={enrollment.status} />
              </div>
              <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface-sunk/60 p-4">
                  <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wide text-muted">
                    <LayersIcon className="h-3.5 w-3.5" />
                    Current section
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-ink">{sectionLabel}</p>
                </div>
                <div className="rounded-xl border border-line bg-surface-sunk/60 p-4">
                  <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wide text-muted">
                    <CalendarClockIcon className="h-3.5 w-3.5" />
                    Schedule
                  </p>
                  <p className="mt-1.5 font-display text-xl font-bold text-ink">{schedule || 'Not assigned yet'}</p>
                  <p className="mt-0.5 text-sm font-medium text-muted">{scheduleTimeLabel}</p>
                </div>
              </CardBody>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2 text-sm">
                  {docsComplete ? (
                    <CheckCircle2Icon className="h-4 w-4 text-success" />
                  ) : (
                    <FolderOpenIcon className="h-4 w-4 text-muted" />
                  )}
                  <span className="text-ink-soft">
                    <span className="font-bold text-ink">{uploadedDocs}</span> of {REQUIRED_DOCUMENT_COUNT} documents uploaded
                  </span>
                  {docsComplete ? <Badge tone="success">Complete</Badge> : null}
                </div>
                <Button
                  size="sm"
                  variant={docsComplete ? 'subtle' : 'primary'}
                  onClick={() => onManageRequirements(enrollment.id)}
                  leftIcon={<FolderOpenIcon className="h-4 w-4" />}
                >
                  {uploadedDocs === 0 ? 'Upload documents' : docsComplete ? 'Manage documents' : 'Finish documents'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
