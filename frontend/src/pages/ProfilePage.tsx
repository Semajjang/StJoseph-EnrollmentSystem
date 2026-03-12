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
    <div className="p-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-3xl rounded-3xl border border-blue-100 bg-white p-8 shadow-sm"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">Profile</p>
            <h1 className="text-3xl font-extrabold text-gray-800">Edit Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Update your account name, email, and phone number used in the portal.
            </p>
          </div>
          <p className="text-sm font-medium text-gray-500">Role: {user?.role || 'N/A'}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Email Address
            </label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
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
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 outline-none transition focus:border-sky-300"
              placeholder="09XXXXXXXXX"
            />
          </div>
        </div>

        {profileError ?
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {profileError}
          </div> :
          null}
        {profileMessage ?
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {profileMessage}
          </div> :
          null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSaveProfile()}
            disabled={isSavingProfile}
            className="rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSavingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}