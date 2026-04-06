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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl flex overflow-hidden rounded-2xl shadow-2xl border border-slate-200/60">

        {/* Left branding panel */}
        <div className="hidden md:flex md:w-2/5 flex-col justify-between bg-[#0F172A] p-10 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow">
              {isLogoVisible ?
                <img src={schoolLogo} alt="St. Joseph logo" className="h-full w-full object-contain" onError={() => setIsLogoVisible(false)} /> :
                <span className="text-[9px] font-bold text-slate-400">LOGO</span>}
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">St. Joseph</p>
              <p className="text-xs text-slate-400">Daycare Center</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight mb-3">Online Enrollment System</h2>
            <p className="text-sm text-slate-400 leading-relaxed">Access your guardian portal, manage your child's enrollment, and track application status — all in one place.</p>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} St. Joseph Daycare Center</p>
        </div>

        {/* Right form panel */}
        <div className="flex-1 bg-white p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="you@example.com" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  disabled={isResettingPassword}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  {isResettingPassword ? 'Sending...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
                  placeholder="••••••••" />
              </div>
            </div>

            {errorMessage ?
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> :
              null}

            {resetMessage ?
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{resetMessage}</div> :
              null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2">
              {isLoading ?
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> :
                <>Sign In <ArrowRightIcon className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button onClick={onSwitchToSignup} className="font-semibold text-blue-600 hover:text-blue-700 transition">
                Create one
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>);
}