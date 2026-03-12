import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRoundIcon, LogOutIcon, ShieldCheckIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AdminMfaGatePageProps {
  onVerify: (session: { factorId: string; verifiedAt: string }) => void;
}

interface TotpFactor {
  id: string;
  factor_type?: string;
  status?: string;
  friendly_name?: string | null;
}

interface EnrolledFactor {
  id: string;
  totp?: {
    qr_code?: string;
    secret?: string;
  } | null;
}

const getMfaClient = () => (supabase.auth as typeof supabase.auth & { mfa: any }).mfa;

const getMfaRoleLabel = (role: string | undefined) => {
  if (role === 'staff') {
    return {
      heading: 'Staff Multi-Factor Verification',
      description: 'Staff access requires an authenticator code before the management portal opens.',
      accountLabel: 'Signed in staff account',
      defaultName: 'Staff Member',
      continueLabel: 'Continue to the staff portal',
      setupLabel: 'protect the staff portal',
      friendlyName: 'Staff Portal Authenticator'
    };
  }

  return {
    heading: 'Guardian Multi-Factor Verification',
    description: 'Guardian access requires an authenticator code before the family portal opens.',
    accountLabel: 'Signed in guardian account',
    defaultName: 'Guardian',
    continueLabel: 'Continue to the guardian portal',
    setupLabel: 'protect the guardian portal',
    friendlyName: 'Guardian Portal Authenticator'
  };
};

export function AdminMfaGatePage({ onVerify }: AdminMfaGatePageProps) {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeMarkup, setQrCodeMarkup] = useState<string | null>(null);
  const [sharedSecret, setSharedSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasEnrollmentStep = useMemo(() => !!qrCodeMarkup || !!sharedSecret, [qrCodeMarkup, sharedSecret]);
  const qrCodeImageSrc = useMemo(() => {
    if (!qrCodeMarkup) {
      return null;
    }

    return qrCodeMarkup.startsWith('data:image/') ? qrCodeMarkup : null;
  }, [qrCodeMarkup]);
  const qrCodeSvgMarkup = useMemo(() => {
    if (!qrCodeMarkup || qrCodeImageSrc) {
      return null;
    }

    return qrCodeMarkup;
  }, [qrCodeImageSrc, qrCodeMarkup]);
  const roleContent = useMemo(() => getMfaRoleLabel(user?.role), [user?.role]);

  useEffect(() => {
    let isMounted = true;

    const loadFactors = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);

      try {
        const { data, error } = await getMfaClient().listFactors();

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        const verifiedTotpFactor = (((data?.totp as TotpFactor[] | undefined) || [])
          .find((entry) => entry.status === 'verified'));

        if (verifiedTotpFactor?.id) {
          setFactorId(verifiedTotpFactor.id);
          setInfoMessage(`Enter the code from your authenticator app to ${roleContent.continueLabel.toLowerCase()}.`);
        } else {
          setInfoMessage(`Set up an authenticator app to ${roleContent.setupLabel} with multi-factor authentication.`);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : 'Unable to load MFA factors.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadFactors();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEnrollFactor = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const { data, error } = await getMfaClient().enroll({
        factorType: 'totp',
        friendlyName: roleContent.friendlyName
      });

      if (error) {
        setErrorMessage(error.message);
        setIsSubmitting(false);
        return;
      }

      const enrolledFactor = data as EnrolledFactor | null;

      if (!enrolledFactor?.id) {
        setErrorMessage('Unable to enroll an MFA factor for this account.');
        setIsSubmitting(false);
        return;
      }

      setFactorId(enrolledFactor.id);
      setQrCodeMarkup(enrolledFactor.totp?.qr_code || null);
      setSharedSecret(enrolledFactor.totp?.secret || null);
      setInfoMessage('Scan the QR code with your authenticator app, then enter the generated 6-digit code to verify this account.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to enroll MFA.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedCode = verificationCode.trim();

    if (!factorId || normalizedCode.length < 6) {
      setErrorMessage('Enter the 6-digit verification code from your authenticator app.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const { data: challengeData, error: challengeError } = await getMfaClient().challenge({
        factorId
      });

      if (challengeError) {
        setErrorMessage(challengeError.message);
        setIsSubmitting(false);
        return;
      }

      const { error: verifyError } = await getMfaClient().verify({
        factorId,
        challengeId: challengeData?.id,
        code: normalizedCode
      });

      if (verifyError) {
        setErrorMessage(verifyError.message);
        setIsSubmitting(false);
        return;
      }

      onVerify({
        factorId,
        verifiedAt: new Date().toISOString()
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify the MFA code.');
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

              {!factorId ? (
                <button
                  type="button"
                  onClick={() => void handleEnrollFactor()}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  <KeyRoundIcon className="h-5 w-5" />
                  {isSubmitting ? 'Preparing MFA Setup...' : 'Set Up Authenticator App'}
                </button>
              ) : null}

              {hasEnrollmentStep ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr,1fr]">
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Scan QR Code</p>
                    <div className="mt-4 flex justify-center rounded-2xl bg-gray-50 p-4">
                      {qrCodeImageSrc ? (
                        <img
                          src={qrCodeImageSrc}
                          alt="Authenticator app QR code"
                          className="h-[220px] w-[220px]"
                        />
                      ) : qrCodeSvgMarkup ? (
                        <div className="h-[220px] w-[220px]" dangerouslySetInnerHTML={{ __html: qrCodeSvgMarkup }} />
                      ) : (
                        <div className="flex h-[220px] w-[220px] items-center justify-center text-center text-sm font-medium text-gray-500">
                          QR code unavailable. Use the shared secret manually in your authenticator app.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Manual Setup Secret</p>
                    <p className="mt-3 break-all rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
                      {sharedSecret || 'Secret unavailable'}
                    </p>
                  </div>
                </div>
              ) : null}

              {factorId ? (
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    Authenticator Code <span className="text-red-500">*</span>
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
                </div>
              ) : null}

              {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

              {factorId ? (
                <button
                  type="button"
                  onClick={() => void handleVerifyCode()}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify and Continue'}
                </button>
              ) : null}
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
