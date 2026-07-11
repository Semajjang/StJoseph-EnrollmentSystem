import { getEffectiveIdPicture, getEffectiveIncomeProof, isValidContactNumber } from './helpers';
import type { FormData, StepId } from './types';

/**
 * Per-step validation. The set of checks below is identical to the original
 * single-file form — only regrouped so each wizard step validates its own
 * fields. `ageValidationMessage` is passed in (derived from age rules).
 */
export const validateStep = (
  stepId: StepId,
  formData: FormData,
  ageValidationMessage: string | null
): string | null => {
  const currentEffectiveIdPicture = getEffectiveIdPicture(formData.idPicture);
  const currentEffectiveIncomeProof = getEffectiveIncomeProof(formData.incomeProof);

  if (stepId === 'child') {
    if (!currentEffectiveIdPicture) return 'ID picture is required.';
    if (!formData.childFirstName.trim()) return 'First name is required.';
    if (!formData.childLastName.trim()) return 'Last name is required.';
    if (!formData.sex) return 'Sex is required.';
    if (!formData.dateOfBirth) return 'Birthday is required.';
    if (!formData.region.trim()) return 'Region is required.';
    if (!formData.streetAddress.trim()) return 'Street address is required.';
    if (!formData.municipality.trim()) return 'City or municipality is required.';
    if (!formData.barangay.trim()) return 'Barangay is required.';
    if (!formData.province.trim()) return 'Province is required.';

    if (ageValidationMessage) {
      return ageValidationMessage;
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
      return "If mother's details are provided, complete name, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
    }

    if (hasFatherInput && !isFatherComplete) {
      return "If father's details are provided, complete name, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
    }

    if (hasGuardianInput && !isGuardianComplete) {
      return "If guardian details are provided, complete guardian name, relationship, occupation, and a valid 11-digit contact number (09XXXXXXXXX).";
    }

    if (!isMotherComplete && !isFatherComplete && !isGuardianComplete) {
      return 'Please provide at least one complete caregiver profile (Mother, Father, or Guardian).';
    }
  }

  if (stepId === 'household') {
    if (!formData.financialProgram) return 'Financial program is required.';
    if (
      formData.financialProgram === 'Other National or LGU Assistance Program' &&
      !formData.financialProgramOther.trim()
    ) {
      return 'Please specify the beneficiary program.';
    }

    if (
      formData.enrolledSiblingDetails.some(
        (sibling) => !sibling.name.trim() || !sibling.sex || !sibling.dateOfBirth
      )
    ) {
      return 'Complete each enrolled sibling entry with name, birthday, and sex.';
    }

    if (!formData.incomeSourceCategory) return 'Source of income is required.';
    if (
      formData.incomeSourceCategory === 'Other' &&
      !formData.incomeSourceCategoryOther.trim()
    ) {
      return 'Please specify the source of income.';
    }
    if (!formData.monthlyIncome) return 'Monthly family income is required.';
    if (!currentEffectiveIncomeProof) return 'Proof of income (ITR) is required.';
  }

  return null;
};
