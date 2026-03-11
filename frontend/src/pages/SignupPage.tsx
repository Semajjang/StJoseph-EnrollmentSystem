import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth, UserRole } from '../context/AuthContext';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  LockIcon,
  ArrowRightIcon } from
'lucide-react';
interface SignupPageProps {
  onSwitchToLogin: () => void;
}
export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const { signup } = useAuth();
  const [role, setRole] = useState<UserRole>('guardian');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const { error } = await signup({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        suffix: formData.suffix,
        email: formData.email,
        role: role === 'parent' ? 'guardian' : role,
        phone: formData.phone,
        password: formData.password
      });

      if (error) {
        setErrorMessage(error);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Signup failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEF5FF] p-4 py-8">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95
        }}
        animate={{
          opacity: 1,
          scale: 1
        }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">

        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#60A5FA] p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-blue-900 font-medium">
            Join St. Joseph Daycare Center
          </p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector */}
            <div className="bg-gray-100 p-1 rounded-xl grid grid-cols-3 gap-1 mb-6">
              <button
                type="button"
                onClick={() => setRole('guardian')}
                className={`py-2 rounded-lg text-sm font-bold transition-all ${role === 'guardian' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>

                Guardian
              </button>
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`py-2 rounded-lg text-sm font-bold transition-all ${role === 'staff' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>

                Staff
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 rounded-lg text-sm font-bold transition-all ${role === 'admin' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>

                Admin
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Juan" />

                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Middle Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="middleName"
                    type="text"
                    value={formData.middleName}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Santos" />

                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="Dela Cruz" />

                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Suffix
                </label>
                <select
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors bg-white"
                >
                  <option value="">None</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                  <option value="V">V</option>
                  <option value="VI">VI</option>
                  <option value="VII">VII</option>
                  <option value="VIII">VIII</option>
                  <option value="IX">IX</option>
                  <option value="X">X</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                  placeholder="juan@example.com" />

              </div>
            </div>

            <div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Phone (+63) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="912 345 6789" />

                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="••••••" />

                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Confirm <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                    placeholder="••••••" />

                </div>
              </div>
            </div>

            {errorMessage ?
            <p className="text-sm font-medium text-red-600">{errorMessage}</p> :
            null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">

              {isLoading ?
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> :

              <>
                  Create Account <ArrowRightIcon className="w-5 h-5" />
                </>
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-[#3B82F6] font-bold hover:underline">

                Sign in here
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>);

}