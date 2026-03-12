const MFA_SESSION_KEY_PREFIX = 'mfa-session:';
const MFA_PENDING_REQUEST_KEY_PREFIX = 'mfa-pending:';
const MFA_PENDING_REQUEST_MAX_AGE_MS = 15 * 60 * 1000;

const getPendingMfaStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
};

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

interface PendingMfaRequest {
  email: string;
  requestedAt: string;
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

const loadPendingMfaRequest = (userId: string): PendingMfaRequest | null => {
  const storage = getPendingMfaStorage();

  if (!storage) {
    return null;
  }

  try {
    const storedValue = storage.getItem(`${MFA_PENDING_REQUEST_KEY_PREFIX}${userId}`);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue) as Partial<PendingMfaRequest>;

    if (typeof parsedValue.email !== 'string' || typeof parsedValue.requestedAt !== 'string') {
      return null;
    }

    const requestedAtTime = new Date(parsedValue.requestedAt).getTime();

    if (Number.isNaN(requestedAtTime) || Date.now() - requestedAtTime > MFA_PENDING_REQUEST_MAX_AGE_MS) {
      storage.removeItem(`${MFA_PENDING_REQUEST_KEY_PREFIX}${userId}`);
      return null;
    }

    return {
      email: parsedValue.email,
      requestedAt: parsedValue.requestedAt
    };
  } catch {
    return null;
  }
};

export const savePendingMfaRequest = (userId: string, email: string) => {
  const storage = getPendingMfaStorage();

  if (!storage) {
    return;
  }

  storage.setItem(
    `${MFA_PENDING_REQUEST_KEY_PREFIX}${userId}`,
    JSON.stringify({
      email,
      requestedAt: new Date().toISOString()
    })
  );
};

export const clearPendingMfaRequest = (userId: string) => {
  const storage = getPendingMfaStorage();

  if (!storage) {
    return;
  }

  storage.removeItem(`${MFA_PENDING_REQUEST_KEY_PREFIX}${userId}`);
};

export const completePendingMfaRequest = (userId: string): MfaSession | null => {
  const pendingRequest = loadPendingMfaRequest(userId);

  if (!pendingRequest) {
    return null;
  }

  const session = {
    factorId: `email-link:${pendingRequest.email}`,
    verifiedAt: new Date().toISOString()
  };

  saveMfaSession(userId, session);
  clearPendingMfaRequest(userId);
  return session;
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

    if (key?.startsWith(MFA_SESSION_KEY_PREFIX) || key?.startsWith(MFA_PENDING_REQUEST_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    window.sessionStorage.removeItem(key);
  });

  const pendingStorage = getPendingMfaStorage();

  if (!pendingStorage) {
    return;
  }

  const pendingKeysToRemove: string[] = [];

  for (let index = 0; index < pendingStorage.length; index += 1) {
    const key = pendingStorage.key(index);

    if (key?.startsWith(MFA_PENDING_REQUEST_KEY_PREFIX)) {
      pendingKeysToRemove.push(key);
    }
  }

  pendingKeysToRemove.forEach((key) => {
    pendingStorage.removeItem(key);
  });
};

export type AdminMfaSession = MfaSession;
export const loadAdminMfaSession = loadMfaSession;
export const saveAdminMfaSession = saveMfaSession;
export const clearAllAdminMfaSessions = clearAllMfaSessions;
