import { ClipboardListIcon, FileCheck2Icon } from 'lucide-react';
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
import type { EnrollmentData } from '../context/EnrollmentContext';

interface ApplicationStatusProps {
  onStartEnrollment: () => void;
}

const REQUIRED_DOCUMENT_COUNT = 4;

const statusMessage: Record<EnrollmentData['status'], string> = {
  Pending: "We've received the application and it's waiting for staff review.",
  Waitlisted: 'Placed on the waitlist, usually for applicants outside Cainta, Rizal. Staff will reach out with next steps.',
  Approved: 'Approved — your child has a confirmed slot. Check My Children for the assigned section.',
  Rejected: 'This application was not approved. You may review the details and submit a new one.',
};

export function ApplicationStatus({ onStartEnrollment }: ApplicationStatusProps) {
  const { enrollments, isLoading } = useEnrollment();

  if (isLoading && enrollments.length === 0) {
    return <LoadingScreen label="Checking your applications" />;
  }

  if (enrollments.length === 0) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
        <PageHeader eyebrow="Application status" title="Your applications" description="Track where each enrollment stands." />
        <EmptyState
          icon={<ClipboardListIcon />}
          title="No application found"
          description="You haven't submitted an enrollment yet. Start your child's application with St. Joseph Daycare today."
          action={<Button onClick={onStartEnrollment}>Start enrollment</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Application status"
        title="Your applications"
        description="Here's where each of your child's enrollments currently stands."
      />

      <div className="space-y-4">
        {enrollments.map((enrollment) => {
          const uploadedCount = Math.min((enrollment.requirements || []).length, REQUIRED_DOCUMENT_COUNT);
          const isRequirementsComplete = uploadedCount >= REQUIRED_DOCUMENT_COUNT;

          return (
            <Card key={enrollment.id} padding="none" className="animate-fade-up">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">
                    {enrollment.childFirstName} {enrollment.childLastName}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {enrollment.program} · Submitted {new Date(enrollment.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusPill status={enrollment.status} />
              </div>
              <CardBody className="space-y-4">
                <p className="text-sm leading-6 text-ink-soft">{statusMessage[enrollment.status]}</p>
                <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-sunk/60 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                    <FileCheck2Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">Requirements</p>
                    <p className="text-xs text-muted">{uploadedCount} of {REQUIRED_DOCUMENT_COUNT} documents uploaded</p>
                  </div>
                  <Badge tone={isRequirementsComplete ? 'success' : 'warning'} className="ml-auto">
                    {isRequirementsComplete ? 'Complete' : 'In progress'}
                  </Badge>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
