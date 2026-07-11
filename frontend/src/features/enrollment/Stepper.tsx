import { CheckIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { StepDef } from './types';

interface StepperProps {
  steps: StepDef[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

/** Persistent progress rail across the top of the enrollment wizard. */
export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <ol className="flex items-center" role="list">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className={cn('flex items-center', !isLast && 'flex-1')}>
            <button
              type="button"
              onClick={() => onStepClick(stepNumber)}
              aria-current={isCurrent ? 'step' : undefined}
              className="group flex min-w-0 flex-col items-center gap-1.5 text-center focus-visible:outline-none sm:flex-row sm:gap-3 sm:text-left"
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors group-focus-visible:shadow-focus',
                  isComplete && 'border-brand bg-brand text-white',
                  isCurrent && 'border-brand bg-brand-tint text-brand-strong',
                  !isComplete && !isCurrent && 'border-line bg-surface text-muted',
                )}
              >
                {isComplete ? <CheckIcon className="h-4 w-4" /> : stepNumber}
              </span>
              <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                <span
                  className={cn(
                    'truncate text-sm font-semibold',
                    isCurrent || isComplete ? 'text-ink' : 'text-muted',
                  )}
                >
                  {step.label}
                </span>
                <span className="truncate text-2xs text-faint">{step.description}</span>
              </span>
              <span
                className={cn(
                  'text-2xs font-semibold sm:hidden',
                  isCurrent ? 'text-brand-strong' : 'text-muted',
                )}
              >
                {step.label}
              </span>
            </button>
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  'mx-2 h-0.5 flex-1 rounded-full transition-colors sm:mx-4',
                  isComplete ? 'bg-brand' : 'bg-line',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
