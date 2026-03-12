import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { UserIcon, LockIcon, ArrowRightIcon } from 'lucide-react';
import schoolLogo from '../../school-logo.png';
interface LoginPageProps {
  onSwitchToSignup: () => void;
}
export function LoginPage({ onSwitchToSignup }: LoginPageProps) {
  const { login, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogoVisible, setIsLogoVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const { error } = await login(email, password);

    if (error) {
      setErrorMessage(error);
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your email first so we know where to send the reset link.');
      setResetMessage(null);
      return;
    }

    setIsResettingPassword(true);
    setErrorMessage(null);
    setResetMessage(null);

    const { error } = await requestPasswordReset(email.trim());

    if (error) {
      setErrorMessage(error);
    } else {
      setResetMessage('Password reset link sent. Check your email and open the reset link.');
    }

    setIsResettingPassword(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF5FF] p-4">
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] p-8 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-white/95 shadow-sm">
            {isLogoVisible ?
              <img
                src={schoolLogo}
                alt="St. Joseph Daycare Center logo"
                className="h-full w-full object-contain"
                onError={() => setIsLogoVisible(false)}
              /> :
              <span className="text-xs font-bold text-blue-700">LOGO</span>}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            St. Joseph Daycare Center
          </h1>
          <p className="text-blue-900 font-medium">Sign in to continue.</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-blue-100 bg-[#EFF6FF] focus:border-[#60A5FA] focus:outline-none transition-colors"
                    placeholder="parent@example.com" />

                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-blue-100 bg-[#EFF6FF] focus:border-[#60A5FA] focus:outline-none transition-colors"
                    placeholder="••••••••" />

                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={isResettingPassword}
                    className="text-sm font-bold text-[#2563EB] transition hover:underline disabled:cursor-not-allowed disabled:text-blue-300"
                  >
                    {isResettingPassword ? 'Sending reset link...' : 'Forgot password?'}
                  </button>
                </div>
              </div>
            </div>

            {errorMessage ?
            <p className="text-sm font-medium text-red-600">{errorMessage}</p> :
            null}

            {resetMessage ?
              <p className="text-sm font-medium text-green-700">{resetMessage}</p> :
              null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">

              {isLoading ?
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> :

              <>
                  Sign In <ArrowRightIcon className="w-5 h-5" />
                </>
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-[#3B82F6] font-bold hover:underline">

                Sign up here
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>);

}