import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HomePageContent, fetchHomePageContent, loadHomePageContent } from '../lib/homepageContent';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [content, setContent] = useState<HomePageContent>(() => loadHomePageContent());
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      const nextContent = await fetchHomePageContent();

      if (!isMounted) {
        return;
      }

      setContent(nextContent);
      setIsLoadingContent(false);
    };

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden p-8">
      <div className="h-full overflow-auto pr-1">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[32px] bg-[#0F3BA8] shadow-[0_18px_45px_rgba(29,78,216,0.22)]"
      >
        {content.heroImageUrl ?
          <img
            src={content.heroImageUrl}
            alt={content.heroTitle}
            className="absolute inset-0 h-full w-full object-cover"
          /> :
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(147,197,253,0.38),_transparent_28%),linear-gradient(120deg,_#1D4ED8_0%,_#3B82F6_48%,_#93C5FD_100%)]" />}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,24,68,0.84)_0%,rgba(15,59,168,0.74)_38%,rgba(15,59,168,0.22)_70%,rgba(15,59,168,0.08)_100%)]" />
        <div className="pointer-events-none absolute -left-12 top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-cyan-200/10 blur-3xl" />

        <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 md:min-h-[420px] md:p-8 lg:p-10">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-50 backdrop-blur-sm">
              {content.heroEyebrow}
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              {content.heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-blue-50/95 md:text-lg">
              {isLoadingContent ? 'Loading homepage content...' : content.heroDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('enrollment')}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#1D4ED8] shadow-lg shadow-black/10 transition hover:bg-blue-50"
              >
                Enroll Now
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="rounded-2xl border border-white/20 bg-[#0F2F88]/70 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 backdrop-blur-sm transition hover:bg-[#0C266F]/85"
              >
                Contact
              </button>
              <div className="rounded-2xl border border-white/15 bg-slate-900/20 px-4 py-3 text-sm font-semibold text-blue-50 backdrop-blur-sm">
                Enrollment, updates, and school announcements in one place
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-6 rounded-[28px] bg-[#1840B8] p-5 shadow-[0_14px_35px_rgba(29,78,216,0.18)] md:p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-blue-100 mb-2">Featured Moments</p>
            <h2 className="text-2xl font-extrabold text-white">Campus Highlights</h2>
          </div>
          <p className="hidden max-w-sm text-right text-sm font-medium text-blue-100 lg:block">
            Showcase school events, campus life, and featured stories directly from the staff homepage manager.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {content.highlights.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#15359A] shadow-lg shadow-black/10"
            >
              <div className="relative overflow-hidden bg-[#0A2A7A]">
                {item.imageUrl ?
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="block w-full h-auto max-h-[320px] object-contain transition duration-500 group-hover:scale-[1.02]"
                  /> :
                  <div className="h-48 w-full bg-gradient-to-br from-[#93C5FD] via-[#60A5FA] to-[#1D4ED8]" />}
              </div>
              <div className="bg-[#15359A] px-4 py-4 text-white">
                <p className="text-base font-extrabold leading-tight">{item.title}</p>
                <p className="mt-1 text-sm text-blue-100 leading-snug">{item.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-blue-700 font-bold mb-2">{content.announcementsTitle}</p>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">School Updates</h2>
        <p className="text-sm text-gray-500 mb-5">{content.announcementsIntro}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.announcements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="rounded-2xl border border-blue-100 bg-[#F8FBFF] p-5"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mb-2">
                {announcement.dateLabel}
              </p>
              <h3 className="text-lg font-extrabold text-gray-800 mb-2">{announcement.title}</h3>
              <p className="text-sm text-gray-600 leading-6">{announcement.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr,1fr] gap-6 mt-6">
        <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-blue-700 font-bold mb-2">Portal Flow</p>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">{content.flowTitle}</h2>
          <p className="text-sm text-gray-500 mb-5">{content.flowDescription}</p>

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
          <h3 className="text-2xl font-extrabold mb-2">{content.quickActionTitle}</h3>
          <p className="text-sm text-blue-50 mb-5">{content.quickActionDescription}</p>
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
    </div>
  );
}
