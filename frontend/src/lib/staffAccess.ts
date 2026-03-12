import { supabase } from './supabase';

const STAFF_ACCESS_SESSION_KEY_PREFIX = 'staff-access-session:';

export interface StaffAccessSession {
  openerName: string;
  teacherId: string;
  verifiedAt: string;
}

export const loadStaffAccessSession = (userId: string): StaffAccessSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(`${STAFF_ACCESS_SESSION_KEY_PREFIX}${userId}`);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<StaffAccessSession>;

    if (
      typeof parsedValue?.openerName !== 'string' ||
      typeof parsedValue?.teacherId !== 'string' ||
      typeof parsedValue?.verifiedAt !== 'string'
    ) {
      return null;
    }

    return {
      openerName: parsedValue.openerName,
      teacherId: parsedValue.teacherId,
      verifiedAt: parsedValue.verifiedAt
    };
  } catch {
    return null;
  }
};

export const saveStaffAccessSession = (userId: string, session: StaffAccessSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    `${STAFF_ACCESS_SESSION_KEY_PREFIX}${userId}`,
    JSON.stringify(session)
  );
};

export const clearAllStaffAccessSessions = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(STAFF_ACCESS_SESSION_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    window.sessionStorage.removeItem(key);
  });
};

interface RecordStaffAccessVerificationParams {
  userId: string;
  accountName: string;
  accountEmail: string;
  openerName: string;
  teacherId: string;
}

export const recordStaffAccessVerification = async ({
  userId,
  accountName,
  accountEmail,
  openerName,
  teacherId
}: RecordStaffAccessVerificationParams) => {
  const { error } = await supabase.from('activity_logs').insert({
    actor_id: userId,
    actor_role: 'staff',
    actor_name: openerName,
    action: 'staff_session_verified',
    entity_type: 'staff_access',
    entity_id: userId,
    details: {
      opened_by: openerName,
      teacher_id: teacherId,
      account_name: accountName,
      account_email: accountEmail
    }
  });

  return {
    error: error?.message || null
  };
};