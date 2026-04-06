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
    <div className="h-screen overflow-hidden p-6 md:p-8">
      <div className="h-full overflow-auto pr-1">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-[#0F172A] shadow-xl"
      >
        {content.heroImageUrl ?
          <img
            src={content.heroImageUrl}
            alt={content.heroTitle}
            className="absolute inset-0 h-full w-full object-cover"
          /> :
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.25),_transparent_50%),linear-gradient(135deg,_#0F172A_0%,_#1E293B_100%)]" />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/90 via-[#0F172A]/60 to-transparent" />

        <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-6 md:min-h-[380px] md:p-8 lg:p-10">
          <div className="max-w-2xl">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-300 backdrop-blur-sm">
              {content.heroEyebrow}
            </div>
            <h1 className="mt-4 max-w-xl text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300 md:text-base">
              {isLoadingContent ? 'Loading...' : content.heroDescription}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('enrollment')}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Enroll Now
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 backdrop-blur-sm transition hover:bg-white/10"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-1">Featured Moments</p>
            <h2 className="text-xl font-bold text-slate-900">Campus Highlights</h2>
          </div>
          <p className="hidden max-w-sm text-right text-xs text-slate-400 lg:block">
            Showcase school events, campus life, and featured stories directly from the staff homepage manager.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {content.highlights.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <div className="relative overflow-hidden bg-slate-100">
                {item.imageUrl ?
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="block w-full h-auto max-h-[280px] object-contain transition duration-500 group-hover:scale-[1.02]"
                  /> :
                  <div className="h-40 w-full bg-gradient-to-br from-slate-200 to-slate-300" />}
              </div>
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500 leading-snug">{item.subtitle}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <p className="text-xs uppercase tracking-widest text-blue-600 font-semibold mb-1">{content.announcementsTitle}</p>
        <h2 className="text-xl font-bold text-slate-900 mb-1">School Updates</h2>
        <p className="text-sm text-slate-500 mb-5">{content.announcementsIntro}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.announcements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-2">
                {announcement.dateLabel}
              </p>
              <h3 className="text-base font-bold text-slate-800 mb-1.5">{announcement.title}</h3>
              <p className="text-sm text-slate-500 leading-6">{announcement.body}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr,1fr] gap-5 mt-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Portal Flow</p>
          <h2 className="text-xl font-bold text-slate-900 mb-1">{content.flowTitle}</h2>
          <p className="text-sm text-slate-500 mb-5">{content.flowDescription}</p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('enrollment')}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              Enroll Now
            </button>
            <button
              type="button"
              onClick={() => onNavigate('requirements')}
              className="px-5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              Upload Requirements
            </button>
            <button
              type="button"
              onClick={() => onNavigate('status')}
              className="px-5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
            >
              View Application
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] p-5 text-white shadow-sm md:p-6">
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Quick Action</p>
          <h3 className="text-xl font-bold mb-2">{content.quickActionTitle}</h3>
          <p className="text-sm text-slate-400 mb-5">{content.quickActionDescription}</p>
          <button
            type="button"
            onClick={() => onNavigate('enrollment')}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
          >
            Enroll Now
          </button>
        </div>
      </div>

      </div>
    </div>
  );
}
