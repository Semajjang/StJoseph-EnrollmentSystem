const ADMIN_MFA_SESSION_KEY_PREFIX = 'admin-mfa-session:';

export interface AdminMfaSession {
  factorId: string;
  verifiedAt: string;
}

export const loadAdminMfaSession = (userId: string): AdminMfaSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(`${ADMIN_MFA_SESSION_KEY_PREFIX}${userId}`);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<AdminMfaSession>;

    if (typeof parsedValue.factorId !== 'string' || typeof parsedValue.verifiedAt !== 'string') {
      return null;
    }

    return {
      factorId: parsedValue.factorId,
      verifiedAt: parsedValue.verifiedAt
    };
  } catch {
    return null;
  }
};

export const saveAdminMfaSession = (userId: string, session: AdminMfaSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    `${ADMIN_MFA_SESSION_KEY_PREFIX}${userId}`,
    JSON.stringify(session)
  );
};

export const clearAllAdminMfaSessions = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(ADMIN_MFA_SESSION_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    window.sessionStorage.removeItem(key);
  });
};
