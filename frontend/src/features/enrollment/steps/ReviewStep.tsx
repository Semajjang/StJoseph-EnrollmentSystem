import type { ReactNode } from 'react';
import { PencilIcon } from 'lucide-react';
import { StepHeading } from './StepHeading';
import type { EnrollmentFormApi } from '../types';

const dash = '—';

function SummarySection({
  title,
  step,
  onEdit,
  rows,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  rows: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-sunk/40">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-strong transition-colors hover:bg-brand-tint focus-visible:outline-none focus-visible:shadow-focus"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
      <dl className="divide-y divide-line/70">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-4 py-2.5 text-sm">
            <dt className="font-medium text-muted">{row.label}</dt>
            <dd className="min-w-0 break-words font-medium text-ink">{row.value || dash}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ReviewStep({ form }: { form: EnrollmentFormApi }) {
  const { formData, goToStep, effectiveIdPicture, effectiveIncomeProof, assignedProgram, exactAgeLabel } = form;

  const fullName = [formData.childFirstName, formData.childMiddleName, formData.childLastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');

  const relationshipLabel =
    formData.relationship === 'Other' ? formData.relationshipOther : formData.relationship;

  const caregiverValue = (name: string, occupation: string, contact: string, relationship?: string) => {
    if (!name.trim()) return dash;
    const extras = [relationship, occupation, contact].map((part) => part?.trim()).filter(Boolean);
    return extras.length > 0 ? `${name} · ${extras.join(' · ')}` : name;
  };

  const financialProgramValue =
    formData.financialProgram === 'Other National or LGU Assistance Program'
      ? formData.financialProgramOther || formData.financialProgram
      : formData.financialProgram;

  const incomeSourceValue =
    formData.incomeSourceCategory === 'Other'
      ? formData.incomeSourceCategoryOther || 'Other'
      : formData.incomeSourceCategory;

  return (
    <div className="space-y-6">
      <StepHeading
        title="Review and submit"
        description="Check everything below before submitting. Use Edit to jump back to any section."
      />

      <SummarySection
        title="Child"
        step={1}
        onEdit={goToStep}
        rows={[
          { label: 'Full name', value: fullName },
          { label: 'Sex', value: formData.sex },
          { label: 'Birthday', value: formData.dateOfBirth },
          { label: 'Age', value: exactAgeLabel },
          { label: 'PhilSys no.', value: formData.childPhilSysNumber },
          { label: 'Address', value: formData.address },
          { label: 'ID picture', value: effectiveIdPicture?.name },
        ]}
      />

      <SummarySection
        title="Family"
        step={2}
        onEdit={goToStep}
        rows={[
          { label: 'Mother', value: caregiverValue(formData.motherName, formData.motherOccupation, formData.motherContact) },
          { label: 'Father', value: caregiverValue(formData.fatherName, formData.fatherOccupation, formData.fatherContact) },
          {
            label: 'Guardian',
            value: caregiverValue(formData.guardianName, formData.guardianOccupation, formData.guardianContact, relationshipLabel),
          },
          { label: 'Solo parent', value: formData.soloParentStatus },
          { label: 'PhilSys no.', value: formData.parentGuardianPhilSysNumber },
        ]}
      />

      <SummarySection
        title="Household and income"
        step={3}
        onEdit={goToStep}
        rows={[
          { label: 'Beneficiary program', value: financialProgramValue },
          { label: 'Enrolled siblings', value: String(formData.enrolledSiblings) },
          { label: 'Income source', value: incomeSourceValue },
          { label: 'Monthly income', value: formData.monthlyIncome },
          { label: 'Special status', value: formData.parentGuardianSpecialStatus },
          { label: 'Proof of income', value: effectiveIncomeProof?.name },
        ]}
      />

      <SummarySection
        title="Health"
        step={4}
        onEdit={goToStep}
        rows={[{ label: 'Health concerns', value: formData.healthConcerns || 'None reported' }]}
      />

      <SummarySection
        title="Program"
        step={5}
        onEdit={goToStep}
        rows={[{ label: 'Placement', value: assignedProgram ? assignedProgram.name : 'No matching program' }]}
      />
    </div>
  );
}
