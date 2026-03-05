import { motion } from 'framer-motion';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const highlights = [
    {
      title: 'Mayor Kit Nieto',
      subtitle: 'Community Partner'
    },
    {
      title: 'Scouting',
      subtitle: 'Student Activities'
    },
    {
      title: 'Principal',
      subtitle: 'Welcome Message'
    },
    {
      title: 'Toothbrush Day',
      subtitle: 'Health Program'
    }
  ];

  return (
    <div className="p-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-gradient-to-r from-[#1D4ED8] via-[#60A5FA] to-[#1D4ED8] p-8 text-white shadow-md"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-blue-100 mb-2">
              St. Joseph Daycare Center
            </p>
            <h1 className="text-4xl font-extrabold mb-2">Our School</h1>
            <p className="text-base font-medium text-blue-50 max-w-2xl">
              Enrollment, requirements, and status tracking in one portal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="px-5 py-2.5 rounded-xl bg-white text-[#1D4ED8] font-bold hover:bg-blue-50 transition-colors"
          >
            Contact
          </button>
        </div>
      </motion.div>

      <div className="mt-6 rounded-2xl bg-[#1D4ED8] p-5 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="rounded-xl overflow-hidden bg-white/10 border border-blue-300/20"
            >
              <div className="h-24 bg-gradient-to-r from-[#93C5FD] to-[#60A5FA]" />
              <div className="px-3 py-2 bg-black/60 text-white">
                <p className="text-sm font-bold truncate">{item.title}</p>
                <p className="text-xs text-blue-100 truncate">{item.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr,1fr] gap-6 mt-6">
        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-700 font-bold mb-2">Portal Flow</p>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Complete Enrollment Steps</h2>
          <p className="text-sm text-gray-500 mb-5">Follow these steps to complete your child’s application.</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('enrollment')}
              className="px-5 py-2.5 rounded-xl bg-[#1D4ED8] text-white font-bold hover:bg-[#1E40AF] transition-colors"
            >
              Enroll Now
            </button>
            <button
              type="button"
              onClick={() => onNavigate('requirements')}
              className="px-5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] font-bold hover:bg-[#DBEAFE] transition-colors"
            >
              Upload Requirements
            </button>
            <button
              type="button"
              onClick={() => onNavigate('status')}
              className="px-5 py-2.5 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] font-bold hover:bg-[#DBEAFE] transition-colors"
            >
              View Application
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#60A5FA] to-[#1D4ED8] p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-100 font-bold mb-2">Quick Action</p>
          <h3 className="text-2xl font-extrabold mb-2">Enroll Now</h3>
          <p className="text-sm text-blue-50 mb-5">Start a new enrollment form for your child.</p>
          <button
            type="button"
            onClick={() => onNavigate('enrollment')}
            className="px-5 py-2.5 rounded-xl bg-white text-[#1D4ED8] font-bold hover:bg-blue-50 transition-colors"
          >
            Enroll Now
          </button>
        </div>
      </div>
    </div>
  );
}
