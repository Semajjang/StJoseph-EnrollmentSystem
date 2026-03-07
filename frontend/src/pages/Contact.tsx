import React, { useState } from 'react';
import { motion } from 'framer-motion';
export function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 3000);
  };
  return (
    <div className="p-8 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-800">Contact Us</h1>
        <p className="text-gray-500 mt-1">
          Get in touch with the school administration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          className="bg-white rounded-2xl shadow-md p-8 border border-gray-50">

          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Send a Message
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Your Name
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                placeholder="Full Name" />

            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                  placeholder="Email Address" />

              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors"
                  placeholder="Phone Number" />

              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                Message
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#BAE6FD] focus:outline-none transition-colors resize-none"
                placeholder="How can we help you?" />

            </div>
            <button
              type="submit"
              className="w-full bg-[#BAE6FD] hover:bg-[#7DD3FC] text-gray-800 font-bold py-3 rounded-xl transition-colors shadow-sm">

              {isSubmitted ? 'Message Sent' : 'Send Message'}
            </button>
          </form>
        </motion.div>

        {/* Contact Info Card */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            delay: 0.1
          }}
          className="bg-[#FBCFE8] rounded-2xl shadow-md p-8 text-gray-800 relative overflow-hidden">

          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-20 rounded-full -mr-10 -mt-10" />

          <h2 className="text-2xl font-bold mb-8 relative z-10">
            Contact Information
          </h2>

          <div className="space-y-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                A
              </div>
              <div>
                <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                  Administrator
                </p>
                <p className="text-xl font-bold">Mrs. Maggie Radam-Silais</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                P
              </div>
              <div>
                <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-xl font-bold">+63 977 098 3240</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                E
              </div>
              <div>
                <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-xl font-bold break-all">
                  stjosephes.cainta2a@gmail.com
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/50 rounded-xl flex items-center justify-center text-2xl">
                L
              </div>
              <div>
                <p className="text-sm font-bold opacity-60 uppercase tracking-wide">
                  Address
                </p>
                <p className="text-xl font-bold">Cainta, Rizal, Philippines</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>);

}