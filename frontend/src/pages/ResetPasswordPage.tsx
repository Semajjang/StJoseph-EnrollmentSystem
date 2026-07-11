import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRightIcon, LockIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/app/AuthLayout';
import { Button, Field, Input } from '../components/ui';

export function ResetPasswordPage() {
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 6) {
      setErrorMessage('Use at least 6 characters for the new password.');
      setSuccessMessage(null);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      setSuccessMessage(null);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const { error } = await updatePassword(password);
    if (error) {
      setErrorMessage(error);
      setIsSubmitting(false);
      return;
    }
    setSuccessMessage('Password updated. Sign in using your new password.');
    setPassword('');
    setConfirmPassword('');
    setIsSubmitting(false);
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a new password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New password" required>
          {({ id }) => (
            <Input
              id={id}
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              leftIcon={<LockIcon />}
              placeholder="Enter new password"
            />
          )}
        </Field>
        <Field label="Confirm password" required>
          {({ id }) => (
            <Input
              id={id}
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              leftIcon={<LockIcon />}
              placeholder="Confirm new password"
            />
          )}
        </Field>

        {errorMessage ? (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success">{successMessage}</p>
        ) : null}

        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
          Save new password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <button type="button" onClick={() => void cancelPasswordRecovery()} className="font-semibold text-brand transition hover:text-brand-strong">
          Back to sign in
        </button>
      </p>
    </AuthLayout>
  );
}
