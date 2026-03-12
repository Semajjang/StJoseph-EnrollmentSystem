const MFA_SESSION_KEY_PREFIX = 'mfa-session:';

const readAuthCallbackType = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  return (hashParams.get('type') || searchParams.get('type') || '').trim().toLowerCase();
};

export interface MfaSession {
  factorId: string;
  verifiedAt: string;
}

export const isEmailMfaCallbackUrl = () => {
  const callbackType = readAuthCallbackType();
  return callbackType === 'magiclink' || callbackType === 'email';
};

export const clearAuthCallbackUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
};

export const loadMfaSession = (userId: string): MfaSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.sessionStorage.getItem(`${MFA_SESSION_KEY_PREFIX}${userId}`);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<MfaSession>;

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

export const saveMfaSession = (userId: string, session: MfaSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    `${MFA_SESSION_KEY_PREFIX}${userId}`,
    JSON.stringify(session)
  );
};

export const clearAllMfaSessions = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(MFA_SESSION_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    window.sessionStorage.removeItem(key);
  });
};

export type AdminMfaSession = MfaSession;
export const loadAdminMfaSession = loadMfaSession;
export const saveAdminMfaSession = saveMfaSession;
export const clearAllAdminMfaSessions = clearAllMfaSessions;
