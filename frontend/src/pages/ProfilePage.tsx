import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
  }, [user?.email, user?.name, user?.phone]);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);

    const nextName = profileForm.name.trim();
    const nextEmail = profileForm.email.trim().toLowerCase();
    const nextPhone = profileForm.phone.trim();

    if (!nextName) {
      setProfileError('Full name is required.');
      return;
    }

    if (!nextEmail) {
      setProfileError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setProfileError('Enter a valid email address.');
      return;
    }

    if (nextPhone && !/^09\d{9}$/.test(nextPhone)) {
      setProfileError('Phone number must use 11 digits starting with 09.');
      return;
    }

    setIsSavingProfile(true);

    const { error, message } = await updateProfile({
      name: nextName,
      email: nextEmail,
      phone: nextPhone
    });

    setIsSavingProfile(false);

    if (error) {
      setProfileError(error);
      return;
    }

    setProfileMessage(message || 'Profile updated successfully.');
  };

  return (
    <div className="p-6 pb-24 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      >
        <div className="mb-6 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Account Settings</p>
            <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Update your name, email, and phone number.
            </p>
          </div>
          <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold capitalize text-slate-500">
            {user?.role || 'N/A'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Email Address
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Phone Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              value={profileForm.phone}
              onChange={(event) =>
                setProfileForm((prev) => ({
                  ...prev,
                  phone: event.target.value.replace(/\D/g, '').slice(0, 11)
                }))
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="09XXXXXXXXX"
            />
          </div>
        </div>

        {profileError ?
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {profileError}
          </div> :
          null}
        {profileMessage ?
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {profileMessage}
          </div> :
          null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={isSavingProfile}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSavingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}