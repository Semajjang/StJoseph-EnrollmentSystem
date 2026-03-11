import { supabase } from './supabase';

export interface ContactPageContent {
  pageTitle: string;
  pageDescription: string;
  formTitle: string;
  formDescription: string;
  administratorLabel: string;
  administratorName: string;
  phone: string;
  email: string;
  address: string;
  officeHours: string;
}

const contactContentKey = 'contact-page';
const contactContentStorageKey = 'contact-page-content';

export const defaultContactPageContent: ContactPageContent = {
  pageTitle: 'Contact Us',
  pageDescription: 'Get in touch with the school administration.',
  formTitle: 'Send a Message',
  formDescription: 'Share your questions, concerns, or requests with the staff.',
  administratorLabel: 'Administrator',
  administratorName: 'Mrs. Maggie Radam-Silais',
  phone: '+63 977 098 3240',
  email: 'stjosephes.cainta2a@gmail.com',
  address: 'Cainta, Rizal, Philippines',
  officeHours: 'Monday to Friday, 8:00 AM to 5:00 PM'
};

export const normalizeContactPageContent = (
  value: Partial<ContactPageContent> | null | undefined
): ContactPageContent => {
  const parsedValue = value || {};

  return {
    pageTitle:
      typeof parsedValue.pageTitle === 'string' ? parsedValue.pageTitle : defaultContactPageContent.pageTitle,
    pageDescription:
      typeof parsedValue.pageDescription === 'string'
        ? parsedValue.pageDescription
        : defaultContactPageContent.pageDescription,
    formTitle:
      typeof parsedValue.formTitle === 'string' ? parsedValue.formTitle : defaultContactPageContent.formTitle,
    formDescription:
      typeof parsedValue.formDescription === 'string'
        ? parsedValue.formDescription
        : defaultContactPageContent.formDescription,
    administratorLabel:
      typeof parsedValue.administratorLabel === 'string'
        ? parsedValue.administratorLabel
        : defaultContactPageContent.administratorLabel,
    administratorName:
      typeof parsedValue.administratorName === 'string'
        ? parsedValue.administratorName
        : defaultContactPageContent.administratorName,
    phone: typeof parsedValue.phone === 'string' ? parsedValue.phone : defaultContactPageContent.phone,
    email: typeof parsedValue.email === 'string' ? parsedValue.email : defaultContactPageContent.email,
    address:
      typeof parsedValue.address === 'string' ? parsedValue.address : defaultContactPageContent.address,
    officeHours:
      typeof parsedValue.officeHours === 'string'
        ? parsedValue.officeHours
        : defaultContactPageContent.officeHours
  };
};

export const loadContactPageContent = (): ContactPageContent => {
  if (typeof window === 'undefined') {
    return defaultContactPageContent;
  }

  try {
    const rawValue = window.localStorage.getItem(contactContentStorageKey);

    if (!rawValue) {
      return defaultContactPageContent;
    }

    return normalizeContactPageContent(JSON.parse(rawValue) as Partial<ContactPageContent>);
  } catch {
    return defaultContactPageContent;
  }
};

export const fetchContactPageContent = async (): Promise<ContactPageContent> => {
  const { data } = await supabase
    .from('site_content')
    .select('content')
    .eq('key', contactContentKey)
    .maybeSingle();

  if (!data?.content) {
    return loadContactPageContent();
  }

  const normalizedContent = normalizeContactPageContent(data.content as Partial<ContactPageContent>);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(contactContentStorageKey, JSON.stringify(normalizedContent));
  }

  return normalizedContent;
};

export const saveContactPageContent = async (content: ContactPageContent) => {
  const normalizedContent = normalizeContactPageContent(content);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(contactContentStorageKey, JSON.stringify(normalizedContent));
  }

  await supabase.from('site_content').upsert(
    {
      key: contactContentKey,
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

export const resetContactPageContent = async () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(contactContentStorageKey);
  }

  await supabase.from('site_content').upsert(
    {
      key: contactContentKey,
      content: defaultContactPageContent
    },
    {
      onConflict: 'key'
    }
  );

  return {
    error: null,
    content: defaultContactPageContent
  };
};