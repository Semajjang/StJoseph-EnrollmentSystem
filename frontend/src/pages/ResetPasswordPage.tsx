import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, LockIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ResetPasswordPage() {
  const { updatePassword, cancelPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
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
    <div className="flex min-h-screen items-center justify-center bg-[#EEF5FF] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl"
      >
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] p-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-white/90 text-blue-700">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Reset Password</h1>
          <p className="font-medium text-blue-900">Set a new password for your account.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border-2 border-blue-100 bg-[#EFF6FF] py-3 pl-10 pr-4 focus:border-[#60A5FA] focus:outline-none transition-colors"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border-2 border-blue-100 bg-[#EFF6FF] py-3 pl-10 pr-4 focus:border-[#60A5FA] focus:outline-none transition-colors"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}
            {successMessage ?
              <p className="text-sm font-medium text-green-700">{successMessage}</p> :
              null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ?
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> :
                <>
                  Save New Password <ArrowRightIcon className="h-5 w-5" />
                </>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => void cancelPasswordRecovery()}
              className="text-sm font-bold text-[#2563EB] hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}