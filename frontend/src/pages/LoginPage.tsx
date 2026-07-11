import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRightIcon, LockIcon, MailIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/app/AuthLayout';
import { Button, Field, Input } from '../components/ui';

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

export function LoginPage({ onSwitchToSignup }: LoginPageProps) {
  const { login, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    const { error } = await login(email, password);
    if (error) setErrorMessage(error);
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your email first so we know where to send the reset link.');
      setResetMessage(null);
      return;
    }
    setIsResetting(true);
    setErrorMessage(null);
    setResetMessage(null);
    const { error } = await requestPasswordReset(email.trim());
    if (error) setErrorMessage(error);
    else setResetMessage('Password reset link sent. Check your email and open the reset link.');
    setIsResetting(false);
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your St. Joseph Daycare account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email address" required>
          {({ id }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              leftIcon={<MailIcon />}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field
          label={
            <span className="flex w-full items-center justify-between">
              <span>Password</span>
              <button
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={isResetting}
                className="text-xs font-semibold text-brand transition hover:text-brand-strong disabled:text-faint"
              >
                {isResetting ? 'Sending…' : 'Forgot password?'}
              </button>
            </span>
          }
          required
        >
          {({ id }) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              leftIcon={<LockIcon />}
              placeholder="••••••••"
            />
          )}
        </Field>

        {errorMessage ? (
          <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{errorMessage}</p>
        ) : null}
        {resetMessage ? (
          <p className="rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success">{resetMessage}</p>
        ) : null}

        <Button type="submit" fullWidth size="lg" isLoading={isLoading} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Don’t have an account?{' '}
        <button type="button" onClick={onSwitchToSignup} className="font-semibold text-brand transition hover:text-brand-strong">
          Create one
        </button>
      </p>
    </AuthLayout>
  );
}
