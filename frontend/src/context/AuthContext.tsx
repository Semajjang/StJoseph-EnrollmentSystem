import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode
} from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'guardian' | 'staff' | 'admin' | 'parent';

const normalizeRole = (role: UserRole | string | null | undefined): UserRole => {
  if (role === 'parent') {
    return 'guardian';
  }

  if (role === 'guardian' || role === 'staff' || role === 'admin') {
    return role;
  }

  return 'guardian';
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

interface SignupPayload {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  email: string;
  role: 'guardian' | 'staff' | 'admin';
  phone?: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (data: SignupPayload) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  cancelPasswordRecovery: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isPasswordRecovery: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface ProfileRow {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
}

const isRecoveryUrl = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  return hashParams.get('type') === 'recovery' || searchParams.get('type') === 'recovery';
};

const clearRecoveryUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, nextUrl);
};

const getPasswordResetRedirectUrl = () => {
  const configuredRedirectUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL?.trim();

  if (configuredRedirectUrl) {
    return configuredRedirectUrl;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (isLocalHost) {
    return undefined;
  }

  return `${window.location.origin}${window.location.pathname}`;
};

export function AuthProvider({ children }: {children: ReactNode;}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isRecoveryUrl);

  const buildUserFromProfile = (
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: { full_name?: string };
  },
  profile: ProfileRow | null,
  fallbackRole: UserRole = 'guardian'):
  User =>
  {
    const fallbackNameFromMetadata = authUser.user_metadata?.full_name;
    const fallbackNameFromEmail = authUser.email ?
    authUser.email.split('@')[0] :
    'User';

    return {
      id: authUser.id,
      email: authUser.email || '',
      name: profile?.full_name || fallbackNameFromMetadata || fallbackNameFromEmail,
      role: normalizeRole(profile?.role || fallbackRole),
      phone: profile?.phone || undefined
    };
  };

  const loadProfileAndUpdateUser = async (
  authUser: {
    id: string;
    email?: string | null;
    user_metadata?: { full_name?: string; role?: UserRole };
  }) =>
  {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, role, phone')
        .eq('id', authUser.id)
        .maybeSingle();

      const fallbackRole = normalizeRole(authUser.user_metadata?.role);
      setUser(buildUserFromProfile(authUser, profile as ProfileRow | null, fallbackRole));
    } catch (error) {
      console.error('Profile fetch failed:', error);
    }
  };

  const loadUserFromSession = async () => {
    try {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.user) {
        setUser(null);
        return;
      }

      const authUser = data.session.user;
      const fallbackRole = normalizeRole(authUser.user_metadata?.role);
      setUser(buildUserFromProfile(authUser, null, fallbackRole));
      void loadProfileAndUpdateUser(authUser);
    } catch (error) {
      console.error('Failed to load auth session:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadingFallbackTimeout = window.setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    loadUserFromSession().finally(() => {
      window.clearTimeout(loadingFallbackTimeout);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (_event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (_event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
        }

        if (!session?.user) {
          setUser(null);
          return;
        }

        const fallbackRole = normalizeRole(session.user.user_metadata?.role);
        setUser(buildUserFromProfile(session.user, null, fallbackRole));
        void loadProfileAndUpdateUser(session.user);
      } catch (error) {
        console.error('Auth state update failed:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return {
      error: error?.message || null
    };
  };

  const requestPasswordReset = async (email: string) => {
    const redirectTo = getPasswordResetRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    return {
      error: error?.message || null
    };
  };

  const cancelPasswordRecovery = async () => {
    setIsPasswordRecovery(false);
    clearRecoveryUrl();
    setUser(null);

    try {
      await supabase.auth.signOut({
        scope: 'local'
      });
    } catch (error) {
      console.error('Recovery cancel sign out failed:', error);
    }
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      return {
        error: error.message
      };
    }

    await cancelPasswordRecovery();

    return {
      error: null
    };
  };

  const signup = async (data: SignupPayload) => {
    try {
      const fullName = [
      data.firstName,
      data.middleName,
      data.lastName,
      data.suffix].
      filter(Boolean).
      join(' ');

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: data.role,
            full_name: fullName,
            first_name: data.firstName,
            middle_name: data.middleName || null,
            last_name: data.lastName,
            suffix: data.suffix || null
          }
        }
      });

      if (signUpError) {
        const duplicateEmailError = /already registered|already exists|duplicate/i.test(
          signUpError.message
        );

        return {
          error: duplicateEmailError ?
          'This email is already registered. Sign in instead. One email can only have one account role.' :
          signUpError.message
        };
      }

      const isExistingUser =
      !!signUpData.user &&
      Array.isArray(signUpData.user.identities) &&
      signUpData.user.identities.length === 0;

      if (isExistingUser) {
        return {
          error:
          'This email is already registered. Sign in instead. One email can only have one account role.'
        };
      }

      if (signUpData.user) {
        const baseProfile = {
          id: signUpData.user.id,
          full_name: fullName,
          role: data.role,
          phone: data.phone || null
        };

        const { error: detailedUpsertError } = await supabase.from('profiles').upsert({
          ...baseProfile,
          first_name: data.firstName,
          middle_name: data.middleName || null,
          last_name: data.lastName,
          suffix: data.suffix || null
        });

        if (detailedUpsertError) {
          const { error: fallbackUpsertError } = await supabase
            .from('profiles')
            .upsert(baseProfile);

          if (fallbackUpsertError) {
            return {
              error: fallbackUpsertError.message
            };
          }
        }
      }

      return {
        error: null
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Signup failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    setUser(null);
    setIsLoading(false);

    try {
      await supabase.auth.signOut({
        scope: 'local'
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        requestPasswordReset,
        updatePassword,
        cancelPasswordRecovery,
        logout,
        isLoading,
        isPasswordRecovery
      }}>

      {children}
    </AuthContext.Provider>);

}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}