import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LogOutIcon, ShieldCheckIcon, SkipForwardIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMfaEmailRedirectUrl } from '../lib/authRedirects';
import { MfaSession, saveMfaSession, savePendingMfaRequest } from '../lib/adminMfa';
import { useAuth } from '../context/AuthContext';

const getMfaRoleLabel = (role: string | undefined) => {
  if (role === 'admin') {
    return {
      heading: 'Admin Multi-Factor Verification',
      description: 'Admin access requires a Supabase email verification step before the administration portal opens.',
      accountLabel: 'Signed in admin account',
      defaultName: 'Administrator'
    };
  }

  if (role === 'staff') {
    return {
      heading: 'Staff Multi-Factor Verification',
      description: 'Staff access requires a Supabase email verification step before the management portal opens.',
      accountLabel: 'Signed in staff account',
      defaultName: 'Staff Member'
    };
  }

  return {
    heading: 'Guardian Multi-Factor Verification',
    description: 'Guardian access requires a Supabase email verification step before the family portal opens.',
    accountLabel: 'Signed in guardian account',
    defaultName: 'Guardian'
  };
};

interface AdminMfaGatePageProps {
  onSkip: (session: MfaSession) => void;
}

export function AdminMfaGatePage({ onSkip }: AdminMfaGatePageProps) {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSentCode, setHasSentCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleContent = useMemo(() => getMfaRoleLabel(user?.role), [user?.role]);

  const handleSkip = () => {
    if (!user) {
      return;
    }

    const session = {
      factorId: `mfa-skip:${user.role}`,
      verifiedAt: new Date().toISOString()
    };

    saveMfaSession(user.id, session);
    onSkip(session);
  };

  useEffect(() => {
    let isMounted = true;

    const sendInitialCode = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        if (!user?.email) {
          if (isMounted) {
            setErrorMessage('No email is available for this account.');
            setIsLoading(false);
          }

          return;
        }

        const { error } = await supabase.auth.signInWithOtp({
          email: user.email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: getMfaEmailRedirectUrl()
          }
        });

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        savePendingMfaRequest(user.id, user.email);
        setHasSentCode(true);
        setInfoMessage(`We sent a verification email to ${user.email}. Open the email link to continue.`);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to send MFA code.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void sendInitialCode();

    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  const handleSendCode = async () => {
    if (!user?.email) {
      setErrorMessage('No email is available for this account.');
      return;
    }

    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: getMfaEmailRedirectUrl()
        }
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      savePendingMfaRequest(user.id, user.email);
      setHasSentCode(true);
      setInfoMessage(`A new verification email was sent to ${user.email}. Open the email link to continue.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send MFA code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-2xl"
      >
        <div className="bg-[#0F172A] p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400">
              <ShieldCheckIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">{roleContent.heading}</h1>
              <p className="text-sm text-slate-400 mt-0.5">{roleContent.description}</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{roleContent.accountLabel}</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{user?.name || roleContent.defaultName}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {infoMessage ? (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  {infoMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <MailIcon className="h-4 w-4" />
                {isSubmitting ? 'Sending...' : hasSentCode ? 'Resend Verification Email' : 'Send Verification Email'}
              </button>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Click the verification link in your email. After Supabase sends you back to the portal, this screen will close automatically.
              </div>

              <button
                type="button"
                onClick={handleSkip}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
              >
                <SkipForwardIcon className="h-4 w-4" />
                Skip MFA For Now
              </button>

              {errorMessage ? (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
              ) : null}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOutIcon className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
