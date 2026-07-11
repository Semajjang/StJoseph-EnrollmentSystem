import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/app/AuthLayout';
import { Button, Field, Input, Select } from '../components/ui';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const { error } = await signup({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        suffix: formData.suffix,
        email: formData.email,
        role: 'guardian',
        phone: formData.phone,
        password: formData.password,
      });
      if (error) {
        setErrorMessage(error);
      } else {
        setSuccessMessage(
          'Account created. Sign in with your new password to continue, then complete the email verification step when the portal asks for it.',
        );
        setFormData(emptyForm);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Guardian registration for St. Joseph Daycare Center.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            {({ id }) => <Input id={id} name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="Juan" />}
          </Field>
          <Field label="Middle name">
            {({ id }) => <Input id={id} name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Santos" />}
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Last name" required>
            {({ id }) => <Input id={id} name="lastName" required value={formData.lastName} onChange={handleChange} placeholder="Dela Cruz" />}
          </Field>
          <Field label="Suffix">
            {({ id }) => (
              <Select id={id} name="suffix" value={formData.suffix} onChange={handleChange}>
                <option value="">None</option>
                {suffixes.map((suffix) => (
                  <option key={suffix} value={suffix}>
                    {suffix}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Email" required>
          {({ id }) => (
            <Input id={id} name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="juan@example.com" />
          )}
        </Field>

        <Field label="Phone" hint="Philippine mobile number" required>
          {({ id }) => (
            <Input id={id} name="phone" type="tel" required value={formData.phone} onChange={handleChange} placeholder="+63 912 345 6789" />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" required>
            {({ id }) => (
              <Input id={id} name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="••••••" />
            )}
          </Field>
          <Field label="Confirm" required>
            {({ id }) => (
              <Input
                id={id}
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••"
              />
            )}
          </Field>
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success">{successMessage}</p>
        ) : null}

        <Button type="submit" fullWidth size="lg" isLoading={isLoading} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-brand transition hover:text-brand-strong">
          Sign in
        </button>
      </p>
    </AuthLayout>
  );
}
