import { ArrowLeftIcon, ArrowRightIcon, TriangleAlertIcon } from 'lucide-react';
import { Button, Card, PageHeader } from '../components/ui';
import { useEnrollmentForm } from '../features/enrollment/useEnrollmentForm';
import { Stepper } from '../features/enrollment/Stepper';
import { ChildStep } from '../features/enrollment/steps/ChildStep';
import { FamilyStep } from '../features/enrollment/steps/FamilyStep';
import { HouseholdStep } from '../features/enrollment/steps/HouseholdStep';
import { HealthStep } from '../features/enrollment/steps/HealthStep';
import { ProgramStep } from '../features/enrollment/steps/ProgramStep';
import { ReviewStep } from '../features/enrollment/steps/ReviewStep';

interface EnrollmentFormProps {
  onSuccess: () => void;
}

export function EnrollmentForm({ onSuccess }: EnrollmentFormProps) {
  const form = useEnrollmentForm(onSuccess);
  const { currentStep, steps, submitError, isSubmitting, enrollmentNoticeRef, handleBack, handleNext, handleSubmit, goToStep } =
    form;

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
        title="New enrollment"
        description="Complete each step to enroll your child. Your progress is saved automatically on this device. Fields marked * are required."
      />

      <Card padding="sm">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={goToStep} />
      </Card>

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
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Back
          </Button>
          {isReview ? (
            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit enrollment'}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              Next step
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
