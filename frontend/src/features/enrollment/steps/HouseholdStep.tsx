import { PlusIcon, Trash2Icon, UploadCloudIcon } from 'lucide-react';
import { Button, Combobox, Field, Input, Select } from '../../../components/ui';
import { StepHeading } from './StepHeading';
import { normalizeDateOfBirthInput } from '../helpers';
import { beneficiaryProgramOptions, incomeSourceOptions, monthlyIncomeOptions } from '../types';
import type { EnrollmentFormApi } from '../types';

export function HouseholdStep({ form }: { form: EnrollmentFormApi }) {
  const {
    formData,
    updateFormData,
    updateSiblingFormData,
    addSibling,
    removeSibling,
    siblingBirthdateRange,
    handleIncomeProofChange,
    effectiveIncomeProof,
  } = form;

  return (
    <div className="space-y-6">
      <StepHeading
        title="Household and income"
        description="These details help us assess financial assistance eligibility. Proof of income is required."
      />

      <Field label="Beneficiary program" required>
        {({ id }) => (
          <>
            <Combobox
              id={id}
              value={formData.financialProgram}
              placeholder="Search beneficiary program…"
              options={beneficiaryProgramOptions.map((programOption) => ({ value: programOption, label: programOption }))}
              onChange={(value) => {
                updateFormData('financialProgram', value);
                if (value !== 'Other National or LGU Assistance Program') {
                  updateFormData('financialProgramOther', '');
                }
              }}
            />
            {formData.financialProgram === 'Other National or LGU Assistance Program' ? (
              <Input
                className="mt-2"
                value={formData.financialProgramOther}
                onChange={(event) => updateFormData('financialProgramOther', event.target.value)}
                placeholder="Please specify"
              />
            ) : null}
          </>
        )}
      </Field>

      <div className="space-y-4 rounded-2xl border border-line bg-surface-sunk/50 p-5">
        <div>
          <h3 className="text-sm font-bold text-ink">Enrolled siblings</h3>
          <p className="mt-0.5 text-sm text-muted">
            Add any children you already have enrolled at the daycare. Age and program fill in from each birthday.
          </p>
        </div>

        {formData.enrolledSiblingDetails.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface px-4 py-3 text-sm text-muted">
            No enrolled siblings added yet.
          </p>
        ) : null}

        {formData.enrolledSiblingDetails.map((sibling, siblingIndex) => (
          <div key={`enrolled-sibling-${siblingIndex}`} className="rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-2xs font-bold uppercase tracking-[0.14em] text-brand">Sibling {siblingIndex + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSibling(siblingIndex)}
                leftIcon={<Trash2Icon className="h-4 w-4 text-danger" />}
                aria-label={`Remove sibling ${siblingIndex + 1}`}
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Sibling name" required>
                {({ id }) => (
                  <Input
                    id={id}
                    value={sibling.name}
                    onChange={(event) => updateSiblingFormData(siblingIndex, 'name', event.target.value)}
                    placeholder="Full name"
                  />
                )}
              </Field>
              <Field label="Sex" required>
                {({ id }) => (
                  <Select id={id} value={sibling.sex} onChange={(event) => updateSiblingFormData(siblingIndex, 'sex', event.target.value)}>
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Select>
                )}
              </Field>
              <Field label="Birthday" required>
                {({ id }) => (
                  <Input
                    id={id}
                    type="date"
                    min={siblingBirthdateRange.min}
                    max={siblingBirthdateRange.max}
                    value={sibling.dateOfBirth}
                    onChange={(event) => updateSiblingFormData(siblingIndex, 'dateOfBirth', normalizeDateOfBirthInput(event.target.value))}
                  />
                )}
              </Field>
              <Field label="Program placement" hint="Set from the sibling's age">
                {({ id }) => (
                  <Input
                    id={id}
                    readOnly
                    className="bg-surface-sunk text-muted"
                    value={sibling.program || (sibling.dateOfBirth ? 'No matching program' : '')}
                    placeholder="Calculated automatically"
                  />
                )}
              </Field>
            </div>
          </div>
        ))}

        <Button type="button" variant="subtle" onClick={addSibling} leftIcon={<PlusIcon className="h-4 w-4" />}>
          Add sibling
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Source of income" required>
          {({ id }) => (
            <>
              <Select
                id={id}
                value={formData.incomeSourceCategory}
                onChange={(event) => {
                  const value = event.target.value;
                  updateFormData('incomeSourceCategory', value);
                  if (value !== 'Other') {
                    updateFormData('incomeSourceCategoryOther', '');
                  }
                }}
              >
                <option value="">Select income source</option>
                {incomeSourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {formData.incomeSourceCategory === 'Other' ? (
                <Input
                  className="mt-2"
                  value={formData.incomeSourceCategoryOther}
                  onChange={(event) => updateFormData('incomeSourceCategoryOther', event.target.value)}
                  placeholder="Please specify"
                />
              ) : null}
            </>
          )}
        </Field>
        <Field label="Monthly family income" required>
          {({ id }) => (
            <Select id={id} value={formData.monthlyIncome} onChange={(event) => updateFormData('monthlyIncome', event.target.value)}>
              <option value="">Select income range</option>
              {monthlyIncomeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Parent / guardian disability or senior citizen status">
          {({ id }) => (
            <Select id={id} value={formData.parentGuardianSpecialStatus} onChange={(event) => updateFormData('parentGuardianSpecialStatus', event.target.value)}>
              <option value="">Select status</option>
              <option value="None">None</option>
              <option value="Person with Disability">Person with Disability</option>
              <option value="Senior Citizen">Senior Citizen</option>
              <option value="Both">Both</option>
            </Select>
          )}
        </Field>
        <Field label="Proof of income (ITR)" required hint="JPEG, PNG, or PDF up to 5MB">
          {({ id }) => (
            <label
              htmlFor={id}
              className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-surface-sunk px-3.5 text-sm text-ink-soft transition-colors hover:border-brand/40 focus-within:shadow-focus"
            >
              <UploadCloudIcon className="h-4 w-4 shrink-0 text-muted" />
              <span className="truncate">{effectiveIncomeProof ? effectiveIncomeProof.name : 'Upload file'}</span>
              <input id={id} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleIncomeProofChange} className="hidden" />
            </label>
          )}
        </Field>
      </div>
    </div>
  );
}
