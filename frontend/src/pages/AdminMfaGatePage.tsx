import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MailIcon, LogOutIcon, ShieldCheckIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMfaEmailRedirectUrl } from '../lib/authRedirects';
import { useAuth } from '../context/AuthContext';

interface AdminMfaGatePageProps {
  onVerify: (session: { factorId: string; verifiedAt: string }) => void;
}

const getMfaRoleLabel = (role: string | undefined) => {
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

export function AdminMfaGatePage({ onVerify }: AdminMfaGatePageProps) {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSentCode, setHasSentCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleContent = useMemo(() => getMfaRoleLabel(user?.role), [user?.role]);

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

        setHasSentCode(true);
        setInfoMessage(`We sent a verification email to ${user.email}. Open the email link to continue, or enter the 6-digit code below if your template shows one.`);
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

      setHasSentCode(true);
      setInfoMessage(`A new verification email was sent to ${user.email}. Open the email link to continue, or enter the 6-digit code below if your template shows one.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send MFA code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedCode = verificationCode.trim();

    if (!user?.email) {
      setErrorMessage('No email is available for this account.');
      return;
    }

    if (normalizedCode.length < 6) {
      setErrorMessage('Enter the 6-digit verification code from your email.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: user.email,
        token: normalizedCode,
        type: 'email'
      });

      if (verifyError) {
        setErrorMessage(verifyError.message);
        return;
      }

      onVerify({
        factorId: `email:${user.email}`,
        verifiedAt: new Date().toISOString()
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the MFA code.');
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

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Email Verification Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border-2 border-blue-100 bg-[#EFF6FF] px-4 py-3 focus:border-[#60A5FA] focus:outline-none transition-colors"
                  placeholder="Enter 6-digit code"
                />
                <p className="mt-2 text-xs text-gray-500">
                  If the email opens a verification link instead of showing a code, just click that link and you will be returned here automatically.
                </p>
              </div>

              {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

              <button
                type="button"
                onClick={() => void handleVerifyCode()}
                disabled={isSubmitting || !hasSentCode}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSubmitting ? 'Verifying...' : 'Verify and Continue'}
              </button>
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
