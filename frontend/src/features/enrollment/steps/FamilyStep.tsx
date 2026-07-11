import type { ReactNode } from 'react';
import { Field, Input, Select } from '../../../components/ui';
import { StepHeading } from './StepHeading';
import { formatGuardianContact } from '../helpers';
import type { EnrollmentFormApi, FormData } from '../types';

function CaregiverGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line bg-surface-sunk/50 p-5">
      <legend className="px-1 text-2xs font-bold uppercase tracking-[0.14em] text-brand">{title}</legend>
      {children}
    </fieldset>
  );
}

export function FamilyStep({ form }: { form: EnrollmentFormApi }) {
  const { formData, fieldErrors, updateFormData } = form;

  const contactField = (field: keyof FormData, label: string, wide = false) => (
    <Field label={label} className={wide ? 'md:col-span-2' : undefined}>
      {({ id }) => (
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          maxLength={11}
          value={String(formData[field] ?? '')}
          onChange={(event) => updateFormData(field, formatGuardianContact(event.target.value))}
          placeholder="09XXXXXXXXX"
        />
      )}
    </Field>
  );

  return (
    <div className="space-y-6">
      <StepHeading
        title="Parents and guardian"
        description="Provide at least one complete caregiver profile — Mother, Father, or Guardian — with a valid 11-digit contact number."
      />

      <CaregiverGroup title="Mother">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Mother's name" error={fieldErrors.motherName}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} value={formData.motherName} onChange={(event) => updateFormData('motherName', event.target.value)} placeholder="Full name" />
            )}
          </Field>
          <Field label="Mother's occupation">
            {({ id }) => (
              <Input id={id} value={formData.motherOccupation} onChange={(event) => updateFormData('motherOccupation', event.target.value)} placeholder="Occupation" />
            )}
          </Field>
          {contactField('motherContact', "Mother's contact no.", true)}
        </div>
      </CaregiverGroup>

      <CaregiverGroup title="Father">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Father's name" error={fieldErrors.fatherName}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} value={formData.fatherName} onChange={(event) => updateFormData('fatherName', event.target.value)} placeholder="Full name" />
            )}
          </Field>
          <Field label="Father's occupation">
            {({ id }) => (
              <Input id={id} value={formData.fatherOccupation} onChange={(event) => updateFormData('fatherOccupation', event.target.value)} placeholder="Occupation" />
            )}
          </Field>
          {contactField('fatherContact', "Father's contact no.", true)}
        </div>
      </CaregiverGroup>

      <CaregiverGroup title="Guardian (if different from parents)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Guardian's name" error={fieldErrors.guardianName}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} aria-describedby={describedBy} invalid={invalid} value={formData.guardianName} onChange={(event) => updateFormData('guardianName', event.target.value)} placeholder="If different from parents" />
            )}
          </Field>
          <Field label="Relationship">
            {({ id }) => (
              <>
                <Select
                  id={id}
                  value={formData.relationship}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateFormData('relationship', value);
                    if (value !== 'Other') {
                      updateFormData('relationshipOther', '');
                    }
                  }}
                >
                  <option value="">Select relationship</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Aunt/Uncle">Aunt/Uncle</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </Select>
                {formData.relationship === 'Other' ? (
                  <Input
                    className="mt-2"
                    value={formData.relationshipOther}
                    onChange={(event) => updateFormData('relationshipOther', event.target.value)}
                    placeholder="Please specify relationship"
                  />
                ) : null}
              </>
            )}
          </Field>
          <Field label="Guardian's occupation">
            {({ id }) => (
              <Input id={id} value={formData.guardianOccupation} onChange={(event) => updateFormData('guardianOccupation', event.target.value)} placeholder="Occupation" />
            )}
          </Field>
          {contactField('guardianContact', "Guardian's contact no.")}
        </div>
      </CaregiverGroup>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Solo parent status">
          {({ id }) => (
            <Select id={id} value={formData.soloParentStatus} onChange={(event) => updateFormData('soloParentStatus', event.target.value)}>
              <option value="">Select status</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </Select>
          )}
        </Field>
        <Field label="Parent / guardian PhilSys number">
          {({ id }) => (
            <Input
              id={id}
              value={formData.parentGuardianPhilSysNumber}
              onChange={(event) => updateFormData('parentGuardianPhilSysNumber', event.target.value)}
              placeholder="Enter the parent or guardian's PhilSys number"
            />
          )}
        </Field>
      </div>
    </div>
  );
}
