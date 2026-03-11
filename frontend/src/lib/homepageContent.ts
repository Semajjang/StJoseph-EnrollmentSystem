import { supabase } from './supabase';

export interface HomeHighlight {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface HomeAnnouncement {
  id: string;
  title: string;
  body: string;
  dateLabel: string;
}

export interface HomePageContent {
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  highlights: HomeHighlight[];
  announcementsTitle: string;
  announcementsIntro: string;
  announcements: HomeAnnouncement[];
  flowTitle: string;
  flowDescription: string;
  quickActionTitle: string;
  quickActionDescription: string;
}

const homepageContentKey = 'homepage';
const homepageContentStorageKey = 'homepage-content';

export const defaultHomePageContent: HomePageContent = {
  heroEyebrow: 'St. Joseph Daycare Center',
  heroTitle: 'Our School',
  heroDescription: 'Enrollment, requirements, and status tracking in one portal.',
  heroImageUrl: '',
  highlights: [
    {
      id: 'highlight-1',
      title: 'Mayor Kit Nieto',
      subtitle: 'Community Partner',
      imageUrl: ''
    },
    {
      id: 'highlight-2',
      title: 'Scouting',
      subtitle: 'Student Activities',
      imageUrl: ''
    },
    {
      id: 'highlight-3',
      title: 'Principal',
      subtitle: 'Welcome Message',
      imageUrl: ''
    },
    {
      id: 'highlight-4',
      title: 'Toothbrush Day',
      subtitle: 'Health Program',
      imageUrl: ''
    }
  ],
  announcementsTitle: 'Announcements',
  announcementsIntro: 'Latest school updates and notices for families.',
  announcements: [
    {
      id: 'announcement-1',
      title: 'Enrollment Is Open',
      body: 'Families may now submit new applications and upload requirements through the portal.',
      dateLabel: 'This Week'
    },
    {
      id: 'announcement-2',
      title: 'Parent Orientation',
      body: 'A parent orientation schedule will be posted after initial application review.',
      dateLabel: 'Upcoming'
    }
  ],
  flowTitle: 'Complete Enrollment Steps',
  flowDescription: 'Follow these steps to complete your child\'s application.',
  quickActionTitle: 'Enroll Now',
  quickActionDescription: 'Start a new enrollment form for your child.'
};

const normalizeHighlights = (highlights: unknown): HomeHighlight[] => {
  if (!Array.isArray(highlights)) {
    return defaultHomePageContent.highlights;
  }

  return highlights.slice(0, 4).map((highlight, index) => {
    const value = highlight as Partial<HomeHighlight>;

    return {
      id: typeof value.id === 'string' ? value.id : `highlight-${index + 1}`,
      title: typeof value.title === 'string' ? value.title : `Highlight ${index + 1}`,
      subtitle: typeof value.subtitle === 'string' ? value.subtitle : '',
      imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : ''
    };
  });
};

const normalizeAnnouncements = (announcements: unknown): HomeAnnouncement[] => {
  if (!Array.isArray(announcements)) {
    return defaultHomePageContent.announcements;
  }

  return announcements
    .filter((announcement): announcement is Partial<HomeAnnouncement> => typeof announcement === 'object' && announcement !== null)
    .map((announcement, index) => ({
      id: typeof announcement.id === 'string' ? announcement.id : `announcement-${index + 1}`,
      title: typeof announcement.title === 'string' ? announcement.title : `Announcement ${index + 1}`,
      body: typeof announcement.body === 'string' ? announcement.body : '',
      dateLabel: typeof announcement.dateLabel === 'string' ? announcement.dateLabel : 'Update'
    }));
};

export const loadHomePageContent = (): HomePageContent => {
  if (typeof window === 'undefined') {
    return defaultHomePageContent;
  }

  try {
    const rawValue = window.localStorage.getItem(homepageContentStorageKey);

    if (!rawValue) {
      return defaultHomePageContent;
    }

    return normalizeHomePageContent(JSON.parse(rawValue) as Partial<HomePageContent>);
  } catch {
    return defaultHomePageContent;
  }
};

export const normalizeHomePageContent = (value: Partial<HomePageContent> | null | undefined): HomePageContent => {
  const parsedValue = value || {};

  return {
    heroEyebrow:
      typeof parsedValue.heroEyebrow === 'string' ? parsedValue.heroEyebrow : defaultHomePageContent.heroEyebrow,
    heroTitle:
      typeof parsedValue.heroTitle === 'string' ? parsedValue.heroTitle : defaultHomePageContent.heroTitle,
    heroDescription:
      typeof parsedValue.heroDescription === 'string' ? parsedValue.heroDescription : defaultHomePageContent.heroDescription,
    heroImageUrl:
      typeof parsedValue.heroImageUrl === 'string' ? parsedValue.heroImageUrl : defaultHomePageContent.heroImageUrl,
    highlights: normalizeHighlights(parsedValue.highlights),
    announcementsTitle:
      typeof parsedValue.announcementsTitle === 'string' ? parsedValue.announcementsTitle : defaultHomePageContent.announcementsTitle,
    announcementsIntro:
      typeof parsedValue.announcementsIntro === 'string' ? parsedValue.announcementsIntro : defaultHomePageContent.announcementsIntro,
    announcements: normalizeAnnouncements(parsedValue.announcements),
    flowTitle:
      typeof parsedValue.flowTitle === 'string' ? parsedValue.flowTitle : defaultHomePageContent.flowTitle,
    flowDescription:
      typeof parsedValue.flowDescription === 'string' ? parsedValue.flowDescription : defaultHomePageContent.flowDescription,
    quickActionTitle:
      typeof parsedValue.quickActionTitle === 'string' ? parsedValue.quickActionTitle : defaultHomePageContent.quickActionTitle,
    quickActionDescription:
      typeof parsedValue.quickActionDescription === 'string' ? parsedValue.quickActionDescription : defaultHomePageContent.quickActionDescription
  };
};

export const fetchHomePageContent = async (): Promise<HomePageContent> => {
  const { data, error } = await supabase
    .from('site_content')
    .select('content')
    .eq('key', homepageContentKey)
    .maybeSingle();

  if (error || !data?.content) {
    return loadHomePageContent();
  }

  const normalizedContent = normalizeHomePageContent(data.content as Partial<HomePageContent>);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(homepageContentStorageKey, JSON.stringify(normalizedContent));
  }

  return normalizedContent;
};

export const saveHomePageContent = async (content: HomePageContent) => {
  const normalizedContent = normalizeHomePageContent(content);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(homepageContentStorageKey, JSON.stringify(normalizedContent));
  }

  const { error } = await supabase
    .from('site_content')
    .upsert(
      {
        key: homepageContentKey,
        content: normalizedContent
      },
      {
        onConflict: 'key'
      }
    );

  return {
    error: null,
    content: normalizedContent
  };
};

export const resetHomePageContent = async () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(homepageContentStorageKey);
  }

  const { error } = await supabase
    .from('site_content')
    .upsert(
      {
        key: homepageContentKey,
        content: defaultHomePageContent
      },
      {
        onConflict: 'key'
      }
    );

  return {
    error: null,
    content: defaultHomePageContent
  };
};