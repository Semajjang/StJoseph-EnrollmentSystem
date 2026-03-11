import React, {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode
} from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

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
  addEnrollment: (data: any) => Promise<{ error: string | null }>;
  deleteEnrollment: (id: string) => Promise<{ error: string | null }>;
  updateStatus: (
  id: string,
  status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted')
  => Promise<{ error: string | null }>;
  updateSection: (id: string, section: string | null) => Promise<{ error: string | null }>;
  updateLatestEnrollmentRequirements: (
  requirements: UploadedRequirement[],
  enrollmentId?: string)
  => Promise<{ error: string | null }>;
  getStudentEnrollment: (studentName: string) => EnrollmentData | undefined;
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

export function EnrollmentProvider({ children }: {children: ReactNode;}) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);

  const fetchEnrollments = useCallback(async () => {
    if (!user) {
      setEnrollments([]);
      return;
    }

    const baseQuery = supabase
      .from('enrollments')
      .select('id, child_first_name, child_last_name, program, status, submitted_at, role, form_data, requirements')
      .order('submitted_at', { ascending: false });

    const hasManagementAccess = user.role === 'admin' || user.role === 'staff';

    const query = hasManagementAccess ?
    baseQuery :
    baseQuery.eq('parent_id', user.id);

    const { data, error } = await query;

    if (error || !data) {
      setEnrollments([]);
      return;
    }

    setEnrollments((data as EnrollmentRow[]).map(mapRowToEnrollment));
  }, [user]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const addEnrollment = async (formData: any) => {
    if (!user) {
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
      return {
        error: profileError.message
      };
    }

    const normalizedFormData = {
      ...formData
    };

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

    const payload = {
      parent_id: user.id,
      child_first_name: formData.childFirstName,
      child_last_name: formData.childLastName,
      program: formData.program || 'Pre-Kindergarten 1',
      status: 'Pending' as const,
      role: 'Student',
      form_data: normalizedFormData,
      requirements: []
    };

    const { data, error } = await supabase
      .from('enrollments')
      .insert(payload)
      .select('id, child_first_name, child_last_name, program, status, submitted_at, role, form_data, requirements')
      .single();

    if (error || !data) {
      return {
        error: error?.message || 'Failed to submit enrollment.'
      };
    }

    setEnrollments((prev) => [mapRowToEnrollment(data as EnrollmentRow), ...prev]);
    return {
      error: null
    };
  };

  const updateStatus = (
  id: string,
  status: 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted') =>
  {
    const targetEnrollment = enrollments.find((enrollment) => enrollment.id === id);
    const shouldClearSection = status !== 'Approved';
    const nextFormData = {
      ...(targetEnrollment?.formData || {}),
      section: shouldClearSection ? null : targetEnrollment?.section || null
    };

    return supabase
      .from('enrollments')
      .update({
        status,
        form_data: nextFormData
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          return {
            error: error.message
          };
        }

        setEnrollments((prev) =>
          prev.map((enrollment) =>
            enrollment.id === id ?
            {
              ...enrollment,
              status,
              section: shouldClearSection ? null : enrollment.section,
              formData: {
                ...(enrollment.formData || {}),
                section: shouldClearSection ? null : enrollment.section || null
              }
            } :
            enrollment
          )
        );

        return {
          error: null
        };
      });
  };

  const updateSection = async (id: string, section: string | null) => {
    const targetEnrollment = enrollments.find((enrollment) => enrollment.id === id);

    if (!targetEnrollment) {
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

    return {
      error: null
    };
  };

  const deleteEnrollment = async (id: string) => {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', id);

    if (error) {
      return {
        error: error.message
      };
    }

    setEnrollments((prev) => prev.filter((enrollment) => enrollment.id !== id));
    return {
      error: null
    };
  };

  const updateLatestEnrollmentRequirements = async (
  requirements: UploadedRequirement[],
  enrollmentId?: string) =>
  {
    const targetEnrollmentId = enrollmentId || enrollments[0]?.id;

    if (!targetEnrollmentId) {
      return {
        error: null
      };
    }

    const { error } = await supabase
      .from('enrollments')
      .update({ requirements })
      .eq('id', targetEnrollmentId);

    if (error) {
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
    return {
      error: null
    };
  };

  // Removed unused getStudentEnrollment and index variable

  return (
    <EnrollmentContext.Provider
      value={{
        enrollments,
        addEnrollment,
        deleteEnrollment,
        updateStatus,
        updateSection,
        updateLatestEnrollmentRequirements,
        getStudentEnrollment
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