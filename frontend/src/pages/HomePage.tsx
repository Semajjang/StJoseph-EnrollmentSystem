import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardListIcon,
  FolderOpenIcon,
  GraduationCapIcon,
  MessageCircleIcon,
  SearchCheckIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, CardBody, Skeleton } from '../components/ui';
import { cn } from '../lib/cn';
import { HomePageContent, fetchHomePageContent, loadHomePageContent } from '../lib/homepageContent';
import { useEnrollment } from '../context/EnrollmentContext';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const REQUIRED_DOCUMENT_COUNT = 4;

interface TrackerStage {
  id: string;
  label: string;
  caption: string;
  icon: LucideIcon;
}

const trackerStages: TrackerStage[] = [
  { id: 'apply', label: 'Apply', caption: 'Submit the enrollment form', icon: ClipboardListIcon },
  { id: 'requirements', label: 'Requirements', caption: 'Upload the required documents', icon: FolderOpenIcon },
  { id: 'review', label: 'Review', caption: 'Staff review your application', icon: SearchCheckIcon },
  { id: 'enrolled', label: 'Enrolled', caption: 'Your child has a slot', icon: GraduationCapIcon },
];

export function HomePage({ onNavigate }: HomePageProps) {
  const [content, setContent] = useState<HomePageContent>(() => loadHomePageContent());
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const { enrollments, isLoading: isLoadingEnrollments } = useEnrollment();

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

  const { activeStage, nextStep } = useMemo(() => {
    const latest = enrollments[0];

    if (!latest) {
      return {
        activeStage: 0,
        nextStep: { label: 'Start enrollment', page: 'enrollment' },
      };
    }

    if (latest.status === 'Approved') {
      return {
        activeStage: 3,
        nextStep: { label: 'View your children', page: 'yourChild' },
      };
    }

    const uploadedCount = (latest.requirements || []).length;
    if (uploadedCount < REQUIRED_DOCUMENT_COUNT) {
      return {
        activeStage: 1,
        nextStep: { label: 'Upload requirements', page: 'requirements' },
      };
    }

    return {
      activeStage: 2,
      nextStep: { label: 'View application status', page: 'status' },
    };
  }, [enrollments]);

  const heroHasImage = Boolean(content.heroImageUrl);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      {/* Hero */}
      <section
        className={cn(
          'relative overflow-hidden rounded-3xl border border-line shadow-md animate-fade-up',
          heroHasImage ? 'bg-brand-deep' : 'bg-brand-deep',
        )}
      >
        {heroHasImage ? (
          <img src={content.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(90% 70% at 12% 0%, rgba(245,158,11,0.22), transparent 55%)' }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(19,78,74,0.92)_0%,rgba(19,78,74,0.78)_45%,rgba(19,78,74,0.35)_100%)]" />
        <div className="relative z-10 flex min-h-[300px] flex-col justify-end gap-5 p-6 md:min-h-[360px] md:p-10">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-2xs font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
              {content.heroEyebrow}
            </span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-white md:text-5xl">
              {content.heroTitle}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 md:text-base">
              {isLoadingContent ? 'Loading homepage content…' : content.heroDescription}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="accent" size="lg" onClick={() => onNavigate('enrollment')} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              Enroll now
            </Button>
            <Button
              variant="subtle"
              size="lg"
              onClick={() => onNavigate('contact')}
              leftIcon={<MessageCircleIcon className="h-4 w-4" />}
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              Message staff
            </Button>
          </div>
        </div>
      </section>

      {/* Enrollment progress tracker */}
      <Card padding="none" className="animate-fade-up">
        <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-brand">Your enrollment</p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-ink">Track your progress</h2>
          </div>
          <Button onClick={() => onNavigate(nextStep.page)} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
            {nextStep.label}
          </Button>
        </div>
        <CardBody>
          {isLoadingEnrollments ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trackerStages.map((stage) => (
                <Skeleton key={stage.id} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trackerStages.map((stage, index) => {
                const isComplete = index < activeStage;
                const isCurrent = index === activeStage;
                const Icon = stage.icon;
                return (
                  <li
                    key={stage.id}
                    className={cn(
                      'relative flex flex-col gap-2 rounded-2xl border p-4 transition-colors',
                      isCurrent && 'border-brand/40 bg-brand-tint',
                      isComplete && 'border-line bg-surface-sunk/60',
                      !isCurrent && !isComplete && 'border-line bg-surface',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl',
                          isComplete && 'bg-success-soft text-success',
                          isCurrent && 'bg-surface text-brand shadow-sm',
                          !isCurrent && !isComplete && 'bg-surface-sunk text-faint',
                        )}
                      >
                        {isComplete ? <CheckIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </span>
                      <span className="text-2xs font-bold uppercase tracking-wide text-faint">
                        Step {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={cn('text-sm font-bold', isCurrent || isComplete ? 'text-ink' : 'text-muted')}>
                          {stage.label}
                        </p>
                        {isCurrent ? (
                          <Badge tone="brand" className="px-2 py-0">
                            You're here
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs leading-5 text-muted">{stage.caption}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* Campus highlights */}
      {content.highlights.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-brand">Featured moments</p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-ink">Campus highlights</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {content.highlights.map((item) => (
              <Card key={item.id} padding="none" className="overflow-hidden">
                <div className="aspect-[4/3] w-full overflow-hidden bg-surface-sunk">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-brand-soft via-brand-tint to-accent-soft" />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-bold leading-tight text-ink">{item.title}</p>
                  {item.subtitle ? <p className="mt-1 text-sm text-muted">{item.subtitle}</p> : null}
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Announcements */}
      {content.announcements.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.14em] text-brand">{content.announcementsTitle}</p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-ink">School updates</h2>
            {content.announcementsIntro ? (
              <p className="mt-1 text-sm text-muted">{content.announcementsIntro}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {content.announcements.map((announcement) => (
              <Card key={announcement.id}>
                <Badge tone="accent">{announcement.dateLabel}</Badge>
                <h3 className="mt-3 font-display text-lg font-bold text-ink">{announcement.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">{announcement.body}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
