import type { User, UserRole } from '../context/AuthContext';

/**
 * Development-only auth helpers. Everything here is gated on `import.meta.env.DEV`,
 * which Vite sets to `false` for production builds (`npm run build`) — so none of
 * this can ever run on the deployed site, regardless of env vars.
 */

export type DevRole = 'guardian' | 'staff' | 'admin';

/** Skip the login screen entirely and browse as a mock user. Set VITE_DEV_BYPASS_AUTH=true in .env.local. */
export const DEV_BYPASS_AUTH = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

/** Optional: auto sign in with a real Supabase account so data works. Set the two vars in .env.local. */
export const DEV_AUTOLOGIN = import.meta.env.DEV
  ? {
      email: (import.meta.env.VITE_DEV_AUTOLOGIN_EMAIL as string | undefined) || '',
      password: (import.meta.env.VITE_DEV_AUTOLOGIN_PASSWORD as string | undefined) || '',
    }
  : { email: '', password: '' };

const DEV_ROLE_KEY = 'dev-bypass-role';

export function loadDevRole(): DevRole {
  if (typeof window === 'undefined') return 'guardian';
  const stored = window.localStorage.getItem(DEV_ROLE_KEY);
  return stored === 'staff' || stored === 'admin' ? stored : 'guardian';
}

export function saveDevRole(role: DevRole) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEV_ROLE_KEY, role);
}

export function makeDevUser(role: DevRole): User {
  return {
    id: `dev-${role}`,
    name: `Dev ${role.charAt(0).toUpperCase()}${role.slice(1)}`,
    email: `${role}@dev.local`,
    role: role as UserRole,
    phone: '',
  };
}
