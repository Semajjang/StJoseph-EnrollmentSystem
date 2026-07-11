import { useEffect, useMemo, useState } from 'react';
import { LogOutIcon, MailIcon, ShieldCheckIcon, SkipForwardIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMfaEmailRedirectUrl } from '../lib/authRedirects';
import { MfaSession, saveMfaSession, savePendingMfaRequest } from '../lib/adminMfa';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Spinner } from '../components/ui';

const getMfaRoleLabel = (role: string | undefined) => {
  if (role === 'admin') {
    return {
      heading: 'Admin verification',
      description: 'Admin access requires an email verification step before the administration portal opens.',
      accountLabel: 'Signed in as admin',
      defaultName: 'Administrator',
    };
  }
  if (role === 'staff') {
    return {
      heading: 'Staff verification',
      description: 'Staff access requires an email verification step before the management portal opens.',
      accountLabel: 'Signed in as staff',
      defaultName: 'Staff member',
    };
  }
  return {
    heading: 'Verify it’s you',
    description: 'We send a one-time link to your email before opening the family portal.',
    accountLabel: 'Signed in as guardian',
    defaultName: 'Guardian',
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
    if (!user) return;
    const session = { factorId: `mfa-skip:${user.role}`, verifiedAt: new Date().toISOString() };
    saveMfaSession(user.id, session);
    onSkip(session);
  };

  const sendCode = async (isResend: boolean) => {
    if (!user?.email) {
      setErrorMessage('No email is available for this account.');
      return false;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false, emailRedirectTo: getMfaEmailRedirectUrl() },
    });
    if (error) {
      setErrorMessage(error.message);
      return false;
    }
    savePendingMfaRequest(user.id, user.email);
    setHasSentCode(true);
    setInfoMessage(
      isResend
        ? `A new verification email was sent to ${user.email}. Open the link to continue.`
        : `We sent a verification email to ${user.email}. Open the link to continue.`,
    );
    return true;
  };

  useEffect(() => {
    let isMounted = true;
    const sendInitialCode = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);
      try {
        await sendCode(false);
      } catch (error) {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : 'Unable to send verification email.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void sendInitialCode();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleSendCode = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      await sendCode(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send verification email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card padding="none" className="w-full max-w-md overflow-hidden">
        <div className="relative overflow-hidden bg-brand-deep px-8 py-8 text-center text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(90% 70% at 50% 0%, rgba(245,158,11,0.18), transparent 60%)' }}
            aria-hidden
          />
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-accent">
            <ShieldCheckIcon className="h-7 w-7" />
          </div>
          <h1 className="relative font-display text-xl font-bold">{roleContent.heading}</h1>
          <p className="relative mx-auto mt-2 max-w-xs text-sm text-white/70">{roleContent.description}</p>
        </div>

        <div className="space-y-5 p-6 sm:p-8">
          <div className="rounded-xl border border-line bg-surface-sunk px-4 py-3">
            <p className="text-2xs font-bold uppercase tracking-[0.12em] text-muted">{roleContent.accountLabel}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{user?.name || roleContent.defaultName}</p>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {infoMessage ? (
                <p className="rounded-xl border border-brand/20 bg-brand-tint px-4 py-3 text-sm font-medium text-brand-strong">{infoMessage}</p>
              ) : null}

              <Button fullWidth size="lg" isLoading={isSubmitting} leftIcon={<MailIcon className="h-4 w-4" />} onClick={() => void handleSendCode()}>
                {hasSentCode ? 'Resend verification email' : 'Send verification email'}
              </Button>

              <p className="text-center text-xs text-muted">
                Open the link in your email. Once you’re sent back to the portal, this screen closes automatically.
              </p>

              <Button
                variant="subtle"
                fullWidth
                leftIcon={<SkipForwardIcon className="h-4 w-4" />}
                onClick={handleSkip}
                className="!border-accent/30 !bg-accent-soft !text-accent-strong hover:!bg-accent-soft"
              >
                Skip for now
              </Button>

              {errorMessage ? <p className="text-center text-sm font-medium text-danger">{errorMessage}</p> : null}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger transition hover:underline"
            >
              <LogOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
