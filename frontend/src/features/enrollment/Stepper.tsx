import { CheckIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { StepDef } from './types';

interface StepperProps {
  steps: StepDef[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

/**
 * Compact progress rail for the enrollment wizard. Labels sit under the circles
 * and each step shares the row equally (flex-1), so it never overflows the page
 * regardless of how many steps or how narrow the screen.
 */
export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <ol className="flex w-full items-start">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isComplete = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className={cn('relative flex min-w-0 flex-col items-center', !isLast && 'flex-1')}>
            {!isLast ? (
              <span
                aria-hidden
                className={cn(
                  'absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2 rounded-full',
                  isComplete ? 'bg-brand' : 'bg-line',
                )}
              />
            ) : null}
            <button
              type="button"
              onClick={() => onStepClick(stepNumber)}
              aria-current={isCurrent ? 'step' : undefined}
              className="group relative z-10 flex min-w-0 flex-col items-center gap-1.5 px-1 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors group-focus-visible:shadow-focus',
                  isComplete && 'border-brand bg-brand text-white',
                  isCurrent && 'border-brand bg-brand-tint text-brand-strong',
                  !isComplete && !isCurrent && 'border-line bg-surface text-muted',
                )}
              >
                {isComplete ? <CheckIcon className="h-4 w-4" /> : stepNumber}
              </span>
              <span
                className={cn(
                  'max-w-full truncate text-2xs font-semibold sm:text-xs',
                  isCurrent ? 'text-brand-strong' : isComplete ? 'text-ink' : 'text-muted',
                )}
              >
                {step.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
