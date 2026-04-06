import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, BadgeIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StaffAccessSession } from '../lib/staffAccess';

interface StaffAccessGatePageProps {
  onVerify: (session: StaffAccessSession) => Promise<{ error: string | null; warning: string | null }>;
}

export function StaffAccessGatePage({ onVerify }: StaffAccessGatePageProps) {
  const { user, logout } = useAuth();
  const [openerName, setOpenerName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedOpenerName = openerName.trim();
    const normalizedTeacherId = teacherId.trim();

    if (!normalizedOpenerName || !normalizedTeacherId) {
      setErrorMessage('Enter the staff member name and teacher ID before continuing.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setWarningMessage(null);

    const result = await onVerify({
      openerName: normalizedOpenerName,
      teacherId: normalizedTeacherId,
      verifiedAt: new Date().toISOString()
    });

    if (result.error) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }

    if (result.warning) {
      setWarningMessage(result.warning);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-blue-100 bg-white shadow-xl"
      >
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-white/90 text-blue-700">
            <BadgeIcon className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Staff Access Verification</h1>
          <p className="mt-2 font-medium text-blue-900">
            Confirm who is opening this staff account before entering the dashboard.
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">Signed in account</p>
            <p className="mt-1">{user?.name || 'Staff Account'}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Staff Member Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={openerName}
                  onChange={(event) => setOpenerName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter the name of the person opening this account"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Teacher ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <BadgeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={teacherId}
                  onChange={(event) => setTeacherId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter teacher ID"
                />
              </div>
            </div>

            {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}
            {warningMessage ? <p className="text-sm font-medium text-amber-700">{warningMessage}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3 font-bold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ?
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> :
                <>
                  Continue to Staff Dashboard <ArrowRightIcon className="h-5 w-5" />
                </>}
            </button>
          </form>

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