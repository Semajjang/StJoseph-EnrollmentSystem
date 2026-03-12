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
    <div className="flex min-h-screen items-center justify-center bg-[#EEF5FF] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl"
      >
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-white/90 text-blue-700">
            <ShieldCheckIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{roleContent.heading}</h1>
          <p className="mt-2 font-medium text-blue-900">
            {roleContent.description}
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 rounded-2xl border border-blue-100 bg-[#EFF6FF] px-4 py-3 text-sm text-gray-700">
            <p className="font-bold text-gray-800">{roleContent.accountLabel}</p>
            <p className="mt-1">{user?.name || roleContent.defaultName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#BAE6FD] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-5">
              {infoMessage ? (
                <div className="rounded-2xl border border-blue-100 bg-[#EFF6FF] px-4 py-3 text-sm font-medium text-gray-700">
                  {infoMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => void handleSendCode()}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                <MailIcon className="h-5 w-5" />
                {isSubmitting ? 'Sending Email...' : hasSentCode ? 'Resend Verification Email' : 'Send Verification Email'}
              </button>

              <div className="rounded-2xl border border-blue-100 bg-[#EFF6FF] px-4 py-3 text-sm text-gray-700">
                Click the verification link in your email. After Supabase sends you back to the portal, this screen will close automatically.
              </div>

              <button
                type="button"
                onClick={handleSkip}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-3 font-bold text-amber-800 transition-colors hover:bg-amber-100"
              >
                <SkipForwardIcon className="h-5 w-5" />
                Skip MFA For Now
              </button>

              {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 text-sm font-bold text-red-500 hover:underline"
            >
              <LogOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
