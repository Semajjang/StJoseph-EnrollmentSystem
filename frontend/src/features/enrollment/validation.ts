import { getEffectiveIdPicture, getEffectiveIncomeProof, isValidContactNumber } from './helpers';
import type { FormData, StepId } from './types';

/**
 * Reserved key for step-level / cross-field errors that don't attribute to a
 * single control (e.g. "provide at least one complete caregiver"). Anything
 * stored under this key is surfaced in the top banner rather than inline.
 */
export const FORM_LEVEL_ERROR_KEY = '_form';

/** field key -> human message. Empty object means the step is valid. */
export type FieldErrors = Record<string, string>;

/**
 * Per-step validation. Every check below is identical in rule and wording to
 * the original single-error form — only now each failure is attributed to the
 * field key it belongs to, so the wizard can render errors inline. Cross-field
 * failures use `FORM_LEVEL_ERROR_KEY`. The union of a step's checks is
 * unchanged, so the set of states that block advancement is identical.
 * `ageValidationMessage` is passed in (derived from age rules).
 */
export const validateStep = (
  stepId: StepId,
  formData: FormData,
  ageValidationMessage: string | null
): FieldErrors => {
  const errors: FieldErrors = {};
  const currentEffectiveIdPicture = getEffectiveIdPicture(formData.idPicture);
  const currentEffectiveIncomeProof = getEffectiveIncomeProof(formData.incomeProof);

  if (stepId === 'child') {
    if (!currentEffectiveIdPicture) errors.idPicture = 'ID picture is required.';
    if (!formData.childFirstName.trim()) errors.childFirstName = 'First name is required.';
    if (!formData.childLastName.trim()) errors.childLastName = 'Last name is required.';
    if (!formData.sex) errors.sex = 'Sex is required.';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Birthday is required.';
    if (!formData.region.trim()) errors.region = 'Region is required.';
    if (!formData.streetAddress.trim()) errors.streetAddress = 'Street address is required.';
    if (!formData.municipality.trim()) errors.municipality = 'City or municipality is required.';
    if (!formData.barangay.trim()) errors.barangay = 'Barangay is required.';
    if (!formData.province.trim()) errors.province = 'Province is required.';

    // Eligibility rule lives on the birthday — it can only be non-null once a
    // valid date is present, so it never collides with the "required" message.
    if (ageValidationMessage) {
      errors.dateOfBirth = ageValidationMessage;
    }
  }

  if (stepId === 'family') {
    const hasMotherInput =
      formData.motherName.trim().length > 0 ||
      formData.motherOccupation.trim().length > 0 ||
      formData.motherContact.trim().length > 0;
    const hasFatherInput =
      formData.fatherName.trim().length > 0 ||
      formData.fatherOccupation.trim().length > 0 ||
      formData.fatherContact.trim().length > 0;
    const hasGuardianInput =
      formData.guardianName.trim().length > 0 ||
      formData.relationship.trim().length > 0 ||
      formData.relationshipOther.trim().length > 0 ||
      formData.guardianOccupation.trim().length > 0 ||
      formData.guardianContact.trim().length > 0;

    const hasRelationshipValue =
      formData.relationship !== 'Other' ?
      formData.relationship.trim().length > 0 :
      formData.relationshipOther.trim().length > 0;

    const isMotherComplete =
      formData.motherName.trim().length > 0 &&
      formData.motherOccupation.trim().length > 0 &&
      isValidContactNumber(formData.motherContact);
    const isFatherComplete =
      formData.fatherName.trim().length > 0 &&
      formData.fatherOccupation.trim().length > 0 &&
      isValidContactNumber(formData.fatherContact);
    const isGuardianComplete =
      formData.guardianName.trim().length > 0 &&
      hasRelationshipValue &&
      formData.guardianOccupation.trim().length > 0 &&
      isValidContactNumber(formData.guardianContact);

    if (hasMotherInput && !isMotherComplete) {
      // Attribute the group message to the first actually-incomplete sub-field
      // so the inline error and focus land on the control the user must fix.
      const motherErrorKey =
        formData.motherName.trim().length === 0 ? 'motherName' :
        formData.motherOccupation.trim().length === 0 ? 'motherOccupation' :
        'motherContact';
      errors[motherErrorKey] =
        "If mother's details are provided, complete name, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
    }

    if (hasFatherInput && !isFatherComplete) {
      const fatherErrorKey =
        formData.fatherName.trim().length === 0 ? 'fatherName' :
        formData.fatherOccupation.trim().length === 0 ? 'fatherOccupation' :
        'fatherContact';
      errors[fatherErrorKey] =
        "If father's details are provided, complete name, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
    }

    if (hasGuardianInput && !isGuardianComplete) {
      const guardianErrorKey =
        formData.guardianName.trim().length === 0 ? 'guardianName' :
        !hasRelationshipValue ?
          (formData.relationship === 'Other' ? 'relationshipOther' : 'relationship') :
        formData.guardianOccupation.trim().length === 0 ? 'guardianOccupation' :
        'guardianContact';
      errors[guardianErrorKey] =
        "If guardian details are provided, complete guardian name, relationship, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
    }

    // Only surface the cross-field "at least one caregiver" message when no
    // partially-filled group already reported its own error — this mirrors the
    // original's short-circuit priority exactly.
    if (
      Object.keys(errors).length === 0 &&
      !isMotherComplete &&
      !isFatherComplete &&
      !isGuardianComplete
    ) {
      errors[FORM_LEVEL_ERROR_KEY] =
        'Please provide at least one complete caregiver profile (Mother, Father, or Guardian).';
    }
  }

  if (stepId === 'household') {
    if (!formData.financialProgram) errors.financialProgram = 'Financial program is required.';
    if (
      formData.financialProgram === 'Other National or LGU Assistance Program' &&
      !formData.financialProgramOther.trim()
    ) {
      errors.financialProgramOther = 'Please specify the beneficiary program.';
    }

    // Each incomplete sibling sub-field is attributed to its own key so it gets
    // an inline error + aria-invalid the focus effect can land on. Same rule and
    // wording as before — a row missing name, sex, or birthday still blocks.
    const siblingErrorMessage = 'Complete each enrolled sibling entry with name, birthday, and sex.';
    formData.enrolledSiblingDetails.forEach((sibling, index) => {
      if (!sibling.name.trim()) errors[`sibling.${index}.name`] = siblingErrorMessage;
      if (!sibling.sex) errors[`sibling.${index}.sex`] = siblingErrorMessage;
      if (!sibling.dateOfBirth) errors[`sibling.${index}.dateOfBirth`] = siblingErrorMessage;
    });

    if (!formData.incomeSourceCategory) errors.incomeSourceCategory = 'Source of income is required.';
    if (
      formData.incomeSourceCategory === 'Other' &&
      !formData.incomeSourceCategoryOther.trim()
    ) {
      errors.incomeSourceCategoryOther = 'Please specify the source of income.';
    }
    if (!formData.monthlyIncome) errors.monthlyIncome = 'Monthly family income is required.';
    if (!currentEffectiveIncomeProof) errors.incomeProof = 'Proof of income (ITR) is required.';
  }

  return errors;
};
