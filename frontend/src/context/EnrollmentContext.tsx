import { useState, createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { createPerformanceTimer } from '../lib/performanceMonitor';

export interface UploadedRequirement {
  id: string;
  label: string;
  fileName: string;
  storagePath?: string;
  publicUrl?: string;
}

export interface EnrollmentData {
  id: string;
  childFirstName: string;
  childLastName: string;
  program: string;
  section?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted';
  submittedAt: string;
  role: string; // Usually 'Student'
  formData: any; // Full form data
  requirements: UploadedRequirement[];
}
interface EnrollmentContextType {
  enrollments: EnrollmentData[];
  isLoading: boolean;
  addEnrollment: (data: any) => Promise<{ error: string | null }>;
  deleteEnrollment: (id: string) => Promise<{ error: string | null }>;
  updateStatus: (
    id: string,
    status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted'
  ) => Promise<{ error: string | null }>;
  updateSection: (id: string, section: string | null) => Promise<{ error: string | null }>;
  updateLatestEnrollmentRequirements: (
    requirements: UploadedRequirement[],
    enrollmentId?: string
  ) => Promise<{ error: string | null }>;
}

const EnrollmentContext = createContext<EnrollmentContextType | undefined>(
  undefined
);

interface EnrollmentRow {
  id: string;
  child_first_name: string;
  child_last_name: string;
  program: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted';
  submitted_at: string;
  role: string;
  form_data: Record<string, unknown>;
  requirements: UploadedRequirement[] | null;
}

interface ProfileRoleRow {
  role: string;
}

const ENROLLMENT_SELECT_COLUMNS = 'id, child_first_name, child_last_name, program, status, submitted_at, role, form_data, requirements';

const mapRowToEnrollment = (row: EnrollmentRow): EnrollmentData => {
  const sectionValue = row.form_data?.section;

  return {
    id: row.id,
    childFirstName: row.child_first_name,
    childLastName: row.child_last_name,
    program: row.program,
    section: typeof sectionValue === 'string' && sectionValue.trim() ? sectionValue : null,
    status: row.status,
    submittedAt: row.submitted_at,
    role: row.role,
    formData: row.form_data || {},
    requirements: row.requirements || []
  };
};

const composeAddress = (formData: Record<string, unknown>) => {
  const region = typeof formData.region === 'string' ? formData.region.trim() : '';
  const streetAddress = typeof formData.streetAddress === 'string' ? formData.streetAddress.trim() : '';
  const barangay = typeof formData.barangay === 'string' ? formData.barangay.trim() : '';
  const municipality = typeof formData.municipality === 'string' ? formData.municipality.trim() : '';
  const province = typeof formData.province === 'string' ? formData.province.trim() : '';

  return [streetAddress, barangay, municipality, province, region].filter(Boolean).join(', ');
};

const shouldStartAsWaitlisted = (formData: Record<string, unknown>) => {
  const municipality = typeof formData.municipality === 'string' ? formData.municipality.trim().toLowerCase() : '';
  const province = typeof formData.province === 'string' ? formData.province.trim().toLowerCase() : '';

  if (municipality) {
    return municipality !== 'cainta' || (!!province && province !== 'rizal');
  }

  if (province) {
    return province !== 'rizal';
  }

  const address = typeof formData.address === 'string' ? formData.address.trim().toLowerCase() : '';
  return address.length > 0 && (!address.includes('cainta') || !address.includes('rizal'));
};

const normalizeComparableText = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';

export function EnrollmentProvider({ children }: {children: ReactNode;}) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEnrollments = useCallback(async () => {
    const finishMeasurement = createPerformanceTimer('fetch_enrollments', 'data-read');
    setIsLoading(true);

    if (!user) {
      setEnrollments([]);
      setIsLoading(false);
      finishMeasurement('success', 'No authenticated user.');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const resolvedRole = (profileData as ProfileRoleRow | null)?.role || user.role;
    const hasManagementAccess = resolvedRole === 'admin' || resolvedRole === 'staff';

    if (hasManagementAccess) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.name,
        role: resolvedRole,
        phone: user.phone || null
      });
    }

    const { data: secureData, error: secureError } = await supabase.rpc('get_enrollments_secure');

    const shouldUseSecureData = !secureError && Array.isArray(secureData) && (!hasManagementAccess || secureData.length > 0);

    if (shouldUseSecureData) {
      setEnrollments((secureData as EnrollmentRow[]).map(mapRowToEnrollment));
      setIsLoading(false);
      finishMeasurement('success', `Loaded ${(secureData as EnrollmentRow[]).length} secure enrollment records.`);
      return;
    }

    const baseQuery = supabase
      .from('enrollments')
      .select(ENROLLMENT_SELECT_COLUMNS)
      .order('submitted_at', { ascending: false });

    const query = hasManagementAccess ?
      baseQuery :
      baseQuery.eq('parent_id', user.id);

    const { data, error } = await query;

    if (error || !data) {
      setEnrollments([]);
      setIsLoading(false);
      finishMeasurement('error', secureError?.message || error?.message || 'Failed to fetch enrollments.');
      return;
    }

    setEnrollments((data as EnrollmentRow[]).map(mapRowToEnrollment));
    setIsLoading(false);
    finishMeasurement(
      'success',
      secureError || (hasManagementAccess && Array.isArray(secureData) && secureData.length === 0) ?
        `Loaded ${(data as EnrollmentRow[]).length} enrollment records using fallback table access.` :
        `Loaded ${(data as EnrollmentRow[]).length} enrollment records.`
    );
  }, [user]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const addEnrollment = async (formData: any) => {
    const finishMeasurement = createPerformanceTimer('submit_enrollment', 'form-submit');

    if (!user) {
      finishMeasurement('error', 'User is not authenticated.');
      return {
        error: 'You must be logged in to submit enrollment.'
      };
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.name,
      role: user.role,
      phone: user.phone || null
    });

    if (profileError) {
      finishMeasurement('error', profileError.message);
      return {
        error: profileError.message
      };
    }

    const normalizedFormData = {
      ...formData
    };

    const duplicateCheckFirstName = normalizeComparableText(formData.childFirstName);
    const duplicateCheckLastName = normalizeComparableText(formData.childLastName);
    const duplicateCheckMiddleName = normalizeComparableText(formData.childMiddleName);
    const duplicateCheckDateOfBirth = normalizeComparableText(formData.dateOfBirth);

    const { data: possibleDuplicates, error: duplicateCheckError } = await supabase
      .from('enrollments')
      .select('id, child_first_name, child_last_name, status, form_data, parent_id')
      .eq('parent_id', user.id)
      .ilike('child_first_name', formData.childFirstName.trim())
      .ilike('child_last_name', formData.childLastName.trim());

    if (duplicateCheckError) {
      finishMeasurement('error', duplicateCheckError.message);
      return {
        error: duplicateCheckError.message
      };
    }

    const duplicateEnrollment = (possibleDuplicates || []).find((row) => {
      const duplicateRow = row as {
        child_first_name?: unknown;
        child_last_name?: unknown;
        status?: unknown;
        form_data?: Record<string, unknown>;
      };

      const isSameLearner = (
        normalizeComparableText(duplicateRow.child_first_name) === duplicateCheckFirstName &&
        normalizeComparableText(duplicateRow.child_last_name) === duplicateCheckLastName &&
        normalizeComparableText(duplicateRow.form_data?.childMiddleName) === duplicateCheckMiddleName &&
        normalizeComparableText(duplicateRow.form_data?.dateOfBirth) === duplicateCheckDateOfBirth
      );

      if (!isSameLearner) {
        return false;
      }

      return duplicateRow.status !== 'Rejected';
    });

    if (duplicateEnrollment) {
      finishMeasurement('error', 'Duplicate learner enrollment is still active.');
      return {
        error: 'The enrollment for this learner is still being processed. Please review the existing record before submitting another one. You can only resubmit after the previous enrollment has been rejected.'
      };
    }

    normalizedFormData.address = composeAddress(normalizedFormData as Record<string, unknown>);

    if (
      typeof File !== 'undefined' &&
      formData.idPicture instanceof File
    ) {
      const sanitizedFileName = formData.idPicture.name.replace(/\s+/g, '_');
      const storagePath = `${user.id}/id-picture/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('enrollment-files')
        .upload(storagePath, formData.idPicture, {
          upsert: false
        });

      if (uploadError) {
        finishMeasurement('error', uploadError.message);
        return {
          error: uploadError.message
        };
      }

      normalizedFormData.idPicture = {
        fileName: formData.idPicture.name,
        storagePath
      };
    } else {
      normalizedFormData.idPicture = null;
    }

    if (
      typeof File !== 'undefined' &&
      formData.incomeProof instanceof File
    ) {
      const sanitizedFileName = formData.incomeProof.name.replace(/\s+/g, '_');
      const storagePath = `${user.id}/income-proof/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('enrollment-files')
        .upload(storagePath, formData.incomeProof, {
          upsert: false
        });

      if (uploadError) {
        finishMeasurement('error', uploadError.message);
        return {
          error: uploadError.message
        };
      }

      normalizedFormData.incomeProof = {
        fileName: formData.incomeProof.name,
        storagePath
      };
    } else {
      normalizedFormData.incomeProof = null;
    }

    const initialStatus = shouldStartAsWaitlisted(normalizedFormData as Record<string, unknown>) ?
      'Waitlisted' as const :
      'Pending' as const;

    const payload = {
      parent_id: user.id,
      child_first_name: formData.childFirstName,
      child_last_name: formData.childLastName,
      program: formData.program || 'Pre-Kindergarten 1',
      status: initialStatus,
      role: 'Student',
      form_data: normalizedFormData,
      requirements: []
    };

    const { error } = await supabase
      .from('enrollments')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      finishMeasurement('error', error?.message || 'Failed to submit enrollment.');
      return {
        error: error?.message || 'Failed to submit enrollment.'
      };
    }

    await fetchEnrollments();
    finishMeasurement('success', 'Enrollment submitted successfully.');
    return {
      error: null
    };
  };

  const updateStatus = async (
  id: string,
  status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted'
): Promise<{ error: string | null }> => {
  const finishMeasurement = createPerformanceTimer('update_enrollment_status', 'data-write');
  const targetEnrollment = enrollments.find((enrollment) => enrollment.id === id);
  const shouldClearSection = status !== 'Approved';

  const nextFormData = {
    ...(targetEnrollment?.formData || {}),
    section: shouldClearSection ? null : targetEnrollment?.section || null
  };

  const { error } = await supabase
    .from('enrollments')
    .update({
      status,
      form_data: nextFormData
    })
    .eq('id', id);

  if (error) {
    finishMeasurement('error', error.message);
    return {
      error: error.message
    };
  }

  setEnrollments((prev) =>
    prev.map((enrollment) =>
      enrollment.id === id
        ? {
            ...enrollment,
            status,
            section: shouldClearSection ? null : enrollment.section,
            formData: {
              ...(enrollment.formData || {}),
              section: shouldClearSection ? null : enrollment.section || null
            }
          }
        : enrollment
    )
  );

  finishMeasurement('success', `Enrollment status updated to ${status}.`);

  return {
    error: null
  };
};

  const updateSection = async (id: string, section: string | null) => {
    const finishMeasurement = createPerformanceTimer('update_enrollment_section', 'data-write');
    const targetEnrollment = enrollments.find((enrollment) => enrollment.id === id);

    if (!targetEnrollment) {
      finishMeasurement('error', 'Enrollment not found.');
      return {
        error: 'Enrollment not found.'
      };
    }

    const nextFormData = {
      ...(targetEnrollment.formData || {}),
      section
    };

    const { error } = await supabase
      .from('enrollments')
      .update({ form_data: nextFormData })
      .eq('id', id);

    if (error) {
      finishMeasurement('error', error.message);
      return {
        error: error.message
      };
    }

    setEnrollments((prev) =>
      prev.map((enrollment) =>
        enrollment.id === id ?
        {
          ...enrollment,
          section,
          formData: nextFormData
        } :
        enrollment
      )
    );

    finishMeasurement('success', section ? `Assigned section ${section}.` : 'Cleared assigned section.');

    return {
      error: null
    };
  };

  const deleteEnrollment = async (id: string) => {
    const finishMeasurement = createPerformanceTimer('delete_enrollment', 'data-write');
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', id);

    if (error) {
      finishMeasurement('error', error.message);
      return {
        error: error.message
      };
    }

    setEnrollments((prev) => prev.filter((enrollment) => enrollment.id !== id));
    finishMeasurement('success', 'Enrollment deleted.');
    return {
      error: null
    };
  };

  const updateLatestEnrollmentRequirements = async (
  requirements: UploadedRequirement[],
  enrollmentId?: string) =>
  {
    const finishMeasurement = createPerformanceTimer('update_enrollment_requirements', 'data-write');
    const targetEnrollmentId = enrollmentId || enrollments[0]?.id;

    if (!targetEnrollmentId) {
      finishMeasurement('success', 'No enrollment available for requirements update.');
      return {
        error: null
      };
    }

    const { error } = await supabase
      .from('enrollments')
      .update({ requirements })
      .eq('id', targetEnrollmentId);

    if (error) {
      finishMeasurement('error', error.message);
      return {
        error: error.message
      };
    }

    setEnrollments((prev) =>
      prev.map((enrollment) =>
        enrollment.id === targetEnrollmentId ?
        {
          ...enrollment,
          requirements
        } :
        enrollment
      )
    );
    finishMeasurement('success', `Updated ${requirements.length} requirement files.`);
    return {
      error: null
    };
  };

  // Removed unused getStudentEnrollment and index variable

  return (
    <EnrollmentContext.Provider
      value={{
        enrollments,
        isLoading,
        addEnrollment,
        deleteEnrollment,
        updateStatus,
        updateSection,
        updateLatestEnrollmentRequirements,
        // getStudentEnrollment removed
      }}>

      {children}
    </EnrollmentContext.Provider>);

}
export function useEnrollment() {
  const context = useContext(EnrollmentContext);
  if (context === undefined) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return context;
}