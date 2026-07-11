import { InfoIcon, TriangleAlertIcon } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { cn } from '../../../lib/cn';
import { StepHeading } from './StepHeading';
import type { EnrollmentFormApi } from '../types';

export function ProgramStep({ form }: { form: EnrollmentFormApi }) {
  const { assignedProgram, exactAgeLabel, formData, eligibilityNotification } = form;

  const details = [
    { label: 'Exact age', value: exactAgeLabel },
    { label: 'School year', value: formData.schoolYear },
    { label: 'Schedule', value: assignedProgram ? assignedProgram.scheduleLabel : 'Unavailable' },
    { label: 'Time', value: assignedProgram ? assignedProgram.timeLabel : 'Unavailable' },
  ];

  return (
    <div className="space-y-6">
      <StepHeading
        title="Program placement"
        description="Placement is assigned automatically from the learner's exact age to prevent manual errors."
      />

      <div
        className={cn(
          'rounded-2xl border p-6',
          assignedProgram ? 'border-brand/25 bg-brand-tint' : 'border-danger/25 bg-danger-soft',
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-lg font-bold text-brand-strong shadow-sm">
              {assignedProgram ? assignedProgram.iconLabel : '!'}
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-ink">
                {assignedProgram ? assignedProgram.name : 'No matching program'}
              </h3>
              <p className="text-sm text-muted">
                {assignedProgram ? assignedProgram.ageLabel : 'The learner age does not match the available enrollment bands.'}
              </p>
            </div>
          </div>
          <Badge tone={assignedProgram ? 'brand' : 'danger'}>
            {assignedProgram ? 'Auto-assigned' : 'Not eligible'}
          </Badge>
        </div>

        <dl className="divide-y divide-line/70 rounded-xl bg-surface/70">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <dt className="font-medium text-muted">{detail.label}</dt>
              <dd className="font-semibold text-ink">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {eligibilityNotification ? (
        <p className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {eligibilityNotification}
        </p>
      ) : null}

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-sunk px-4 py-3 text-sm text-ink-soft">
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        Program placement follows the learner's exact age from the birthday you entered. If it looks wrong, go back to
        the Child step and double-check the date of birth.
      </p>
    </div>
  );
}
