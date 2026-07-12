import { useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FolderOpenIcon,
  MessageCircleIcon,
  PartyPopperIcon,
  SearchCheckIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Button, Card, PageHeader } from '../components/ui';
import { cn } from '../lib/cn';
import { useEnrollment } from '../context/EnrollmentContext';
import { useEnrollmentForm } from '../features/enrollment/useEnrollmentForm';
import { Stepper } from '../features/enrollment/Stepper';
import { RequirementsUploader, REQUIRED_DOCUMENT_COUNT } from '../features/enrollment/RequirementsUploader';
import { ChildStep } from '../features/enrollment/steps/ChildStep';
import { FamilyStep } from '../features/enrollment/steps/FamilyStep';
import { HouseholdStep } from '../features/enrollment/steps/HouseholdStep';
import { HealthStep } from '../features/enrollment/steps/HealthStep';
import { ProgramStep } from '../features/enrollment/steps/ProgramStep';
import { ReviewStep } from '../features/enrollment/steps/ReviewStep';

interface EnrollmentFormProps {
  onNavigate: (page: string) => void;
}

type Phase = 'form' | 'documents' | 'done';

const journeyStages: { id: Phase; label: string }[] = [
  { id: 'form', label: 'Application' },
  { id: 'documents', label: 'Documents' },
  { id: 'done', label: 'Submitted' },
];

/**
 * Slim, non-numbered phase strip (Application → Documents → Submitted). It sits
 * above the detailed 6-step Stepper as a different visual class — a segmented bar
 * with labels, no circles — so the two never read as competing numbered rails.
 */
function JourneyProgress({ phase }: { phase: Phase }) {
  const activeIndex = journeyStages.findIndex((stage) => stage.id === phase);
  return (
    <ol className="flex items-stretch gap-2.5" aria-label="Enrollment progress">
      {journeyStages.map((stage, index) => {
        const isComplete = index < activeIndex;
        const isCurrent = index === activeIndex;
        return (
          <li key={stage.id} className="min-w-0 flex-1" aria-current={isCurrent ? 'step' : undefined}>
            <div className="mb-1.5 flex items-center gap-1">
              <span
                className={cn(
                  'truncate text-xs font-semibold',
                  isCurrent ? 'text-brand-strong' : isComplete ? 'text-ink' : 'text-muted',
                )}
              >
                {stage.label}
              </span>
              {isComplete ? <CheckIcon className="h-3 w-3 shrink-0 text-brand" aria-hidden /> : null}
            </div>
            <span
              aria-hidden
              className={cn(
                'block h-1.5 rounded-full transition-colors',
                isComplete || isCurrent ? 'bg-brand' : 'bg-surface-sunk',
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

export function EnrollmentForm({ onNavigate }: EnrollmentFormProps) {
  const { enrollments } = useEnrollment();
  const [phase, setPhase] = useState<Phase>('form');
  const [newEnrollmentId, setNewEnrollmentId] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  const form = useEnrollmentForm((enrollmentId) => {
    setNewEnrollmentId(enrollmentId);
    setPhase('documents');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  const {
    currentStep,
    steps,
    submitError,
    isSubmitting,
    enrollmentNoticeRef,
    handleBack,
    handleNext,
    handleSubmit,
    goToStep,
  } = form;

  const newEnrollment = enrollments.find((enrollment) => enrollment.id === newEnrollmentId) || enrollments[0] || null;
  const childName = newEnrollment?.childFirstName || 'your child';

  const stepId = steps[currentStep - 1].id;
  const isReview = stepId === 'review';

  const renderStep = () => {
    switch (stepId) {
      case 'child':
        return <ChildStep form={form} />;
      case 'family':
        return <FamilyStep form={form} />;
      case 'household':
        return <HouseholdStep form={form} />;
      case 'health':
        return <HealthStep form={form} />;
      case 'program':
        return <ProgramStep form={form} />;
      case 'review':
        return <ReviewStep form={form} />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Enrollment"
        title={phase === 'done' ? 'Enrollment submitted' : 'Enroll your child'}
        description={
          phase === 'form'
            ? 'Fill in the application, upload a few documents, and you’re done. Your typed answers are saved on this device as you go — uploaded files aren’t, so keep your ID picture and proof of income handy.'
            : phase === 'documents'
              ? `Application received — now add ${childName}’s documents.`
              : undefined
        }
      />

      <Card padding="md">
        <JourneyProgress phase={phase} />
        {phase === 'form' ? (
          <div className="mt-5 border-t border-line pt-5">
            <Stepper steps={steps} currentStep={currentStep} onStepClick={goToStep} />
          </div>
        ) : null}
      </Card>

      {phase === 'form' ? (
        <Card padding="lg" className="space-y-6">
          {submitError ? (
            <div
              ref={enrollmentNoticeRef}
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          {renderStep()}

          <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
            <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1} leftIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
            {isReview ? (
              <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
                {isSubmitting ? 'Submitting…' : 'Submit application'}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
                Next step
              </Button>
            )}
          </div>
        </Card>
      ) : null}

      {phase === 'documents' && newEnrollment ? (
        <Card padding="lg" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Upload documents</h2>
              <p className="text-sm text-muted">
                {uploadedCount} of {REQUIRED_DOCUMENT_COUNT} uploaded. Choose a file for each — it uploads right away.
              </p>
            </div>
            <span className="font-display text-3xl font-extrabold text-brand-strong">
              {Math.round((uploadedCount / REQUIRED_DOCUMENT_COUNT) * 100)}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-sunk">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${(uploadedCount / REQUIRED_DOCUMENT_COUNT) * 100}%` }}
            />
          </div>

          <RequirementsUploader enrollment={newEnrollment} onProgress={(uploaded) => setUploadedCount(uploaded)} />

          <div className="flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">You can also finish these later from My Children.</p>
            <Button onClick={() => setPhase('done')} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              {uploadedCount === REQUIRED_DOCUMENT_COUNT ? 'Continue' : 'Continue for now'}
            </Button>
          </div>
        </Card>
      ) : null}

      {phase === 'done' ? (
        <Card padding="lg" className="space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-success-soft text-success">
              <PartyPopperIcon className="h-8 w-8" />
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink">You’re all set!</h2>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
                {childName}’s application has been submitted to St. Joseph Daycare. Here’s what happens next.
              </p>
            </div>
          </div>

          <div className="mx-auto grid max-w-lg gap-3 text-left">
            {[
              { icon: SearchCheckIcon, title: 'Staff review', body: 'The daycare reviews the application and documents.' },
              { icon: FolderOpenIcon, title: 'Track your status', body: 'Watch for updates on your application status anytime.' },
              { icon: MessageCircleIcon, title: 'Stay in touch', body: 'We’ll reach you through Messages if anything is needed.' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-line bg-surface-sunk/60 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <item.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{item.title}</p>
                  <p className="text-sm text-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => onNavigate('home')}>
              Back to home
            </Button>
            <Button onClick={() => onNavigate('status')} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              View application status
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
