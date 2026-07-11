import { HeartPulseIcon } from 'lucide-react';
import { Field, Textarea } from '../../../components/ui';
import { StepHeading } from './StepHeading';
import type { EnrollmentFormApi } from '../types';

export function HealthStep({ form }: { form: EnrollmentFormApi }) {
  const { formData, updateFormData } = form;
  const childName = formData.childFirstName.trim() || 'your child';

  return (
    <div className="space-y-6">
      <StepHeading
        title="Health and allergies"
        description="Share anything our teachers should know to keep the child safe and comfortable. This step is optional."
      />

      <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-tint px-4 py-3.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-brand">
          <HeartPulseIcon className="h-5 w-5" />
        </span>
        <p className="text-sm leading-6 text-ink-soft">
          List any allergies, medical conditions, medication, or care routines for {childName}. Leave this blank if
          there is nothing to note.
        </p>
      </div>

      <Field label="Health concerns and allergies">
        {({ id }) => (
          <Textarea
            id={id}
            rows={5}
            value={formData.healthConcerns}
            onChange={(event) => updateFormData('healthConcerns', event.target.value)}
            placeholder="e.g. Allergic to peanuts, mild asthma, takes maintenance medication in the morning…"
          />
        )}
      </Field>
    </div>
  );
}
