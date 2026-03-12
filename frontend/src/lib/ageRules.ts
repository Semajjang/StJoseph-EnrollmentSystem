import { supabase } from './supabase';

export interface AgeBreakdown {
  years: number;
  months: number;
  totalMonths: number;
}

export interface AgeRule {
  id: 'ited' | 'prek1' | 'prek2';
  name: string;
  ageLabel: string;
  iconLabel: string;
  scheduleLabel: string;
  timeLabel: string;
  minMonths: number;
  maxMonths: number;
  accentClassName: string;
  borderClassName: string;
  badgeClassName: string;
}

const ageRulesContentKey = 'age-rules';
const ageRulesStorageKey = 'age-rules-content';

const clampMonths = (value: unknown, fallback: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.round(value));
};

export const defaultAgeRules: AgeRule[] = [
  {
    id: 'ited',
    name: 'ITEd (Infant/Toddler)',
    ageLabel: 'Birth to 2 years 11 months',
    iconLabel: 'IT',
    scheduleLabel: 'Monday - Friday',
    timeLabel: 'Daycare Guided Routine',
    minMonths: 0,
    maxMonths: 35,
    accentClassName: 'bg-[#FDE68A]/25',
    borderClassName: 'border-[#FDE68A]',
    badgeClassName: 'bg-[#F59E0B]'
  },
  {
    id: 'prek1',
    name: 'Pre-Kindergarten 1',
    ageLabel: '3 years old only',
    iconLabel: 'PK',
    scheduleLabel: 'Monday - Friday',
    timeLabel: '8:00 AM - 11:00 AM',
    minMonths: 36,
    maxMonths: 47,
    accentClassName: 'bg-[#BAE6FD]/20',
    borderClassName: 'border-[#BAE6FD]',
    badgeClassName: 'bg-[#38BDF8]'
  },
  {
    id: 'prek2',
    name: 'Pre-Kindergarten 2',
    ageLabel: '4 to 5 years old',
    iconLabel: 'P2',
    scheduleLabel: 'Monday - Friday',
    timeLabel: 'Schedule assigned by school',
    minMonths: 48,
    maxMonths: 71,
    accentClassName: 'bg-[#DCFCE7]/50',
    borderClassName: 'border-[#86EFAC]',
    badgeClassName: 'bg-[#22C55E]'
  }
];

const normalizeAgeRule = (rule: Partial<AgeRule> | null | undefined, fallback: AgeRule): AgeRule => {
  const nextMinMonths = clampMonths(rule?.minMonths, fallback.minMonths);
  const nextMaxMonths = clampMonths(rule?.maxMonths, fallback.maxMonths);

  return {
    ...fallback,
    name: typeof rule?.name === 'string' && rule.name.trim() ? rule.name.trim() : fallback.name,
    ageLabel: typeof rule?.ageLabel === 'string' && rule.ageLabel.trim() ? rule.ageLabel.trim() : fallback.ageLabel,
    scheduleLabel:
      typeof rule?.scheduleLabel === 'string' && rule.scheduleLabel.trim() ?
        rule.scheduleLabel.trim() :
        fallback.scheduleLabel,
    timeLabel: typeof rule?.timeLabel === 'string' && rule.timeLabel.trim() ? rule.timeLabel.trim() : fallback.timeLabel,
    minMonths: Math.min(nextMinMonths, nextMaxMonths),
    maxMonths: Math.max(nextMinMonths, nextMaxMonths)
  };
};

export const normalizeAgeRules = (value: unknown): AgeRule[] => {
  if (!Array.isArray(value)) {
    return defaultAgeRules;
  }

  return defaultAgeRules.map((fallbackRule) => {
    const matchingRule = value.find((entry) => {
      return !!entry && typeof entry === 'object' && (entry as Partial<AgeRule>).id === fallbackRule.id;
    }) as Partial<AgeRule> | undefined;

    return normalizeAgeRule(matchingRule, fallbackRule);
  });
};

export const loadAgeRules = (): AgeRule[] => {
  if (typeof window === 'undefined') {
    return defaultAgeRules;
  }

  try {
    const rawValue = window.localStorage.getItem(ageRulesStorageKey);

    if (!rawValue) {
      return defaultAgeRules;
    }

    return normalizeAgeRules(JSON.parse(rawValue) as unknown);
  } catch {
    return defaultAgeRules;
  }
};

export const fetchAgeRules = async (): Promise<AgeRule[]> => {
  const { data, error } = await supabase
    .from('site_content')
    .select('content')
    .eq('key', ageRulesContentKey)
    .maybeSingle();

  if (error || !data?.content) {
    return loadAgeRules();
  }

  const normalizedRules = normalizeAgeRules(data.content);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ageRulesStorageKey, JSON.stringify(normalizedRules));
  }

  return normalizedRules;
};

export const saveAgeRules = async (rules: AgeRule[]) => {
  const normalizedRules = normalizeAgeRules(rules);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ageRulesStorageKey, JSON.stringify(normalizedRules));
  }

  const { error } = await supabase
    .from('site_content')
    .upsert(
      {
        key: ageRulesContentKey,
        content: normalizedRules.map(({ id, name, ageLabel, scheduleLabel, timeLabel, minMonths, maxMonths }) => ({
          id,
          name,
          ageLabel,
          scheduleLabel,
          timeLabel,
          minMonths,
          maxMonths
        }))
      },
      {
        onConflict: 'key'
      }
    );

  return {
    error,
    rules: normalizedRules
  };
};

export const getProgramPlacement = (
  ageBreakdown: AgeBreakdown | null,
  rules: AgeRule[] = defaultAgeRules
): AgeRule | null => {
  if (!ageBreakdown || ageBreakdown.totalMonths < 0) {
    return null;
  }

  return rules.find(
    (rule) => ageBreakdown.totalMonths >= rule.minMonths && ageBreakdown.totalMonths <= rule.maxMonths
  ) || null;
};

export const getProgramAgeValidationMessage = (
  ageBreakdown: AgeBreakdown | null,
  rules: AgeRule[] = defaultAgeRules
) => {
  if (!ageBreakdown) {
    return null;
  }

  if (ageBreakdown.totalMonths < 0) {
    return 'Birthday cannot be in the future.';
  }

  if (getProgramPlacement(ageBreakdown, rules)) {
    return null;
  }

  const ruleSummary = rules.map((rule) => `${rule.name} is for ${rule.ageLabel}`).join(', ');
  return `The learner age does not match the available enrollment programs. ${ruleSummary}.`;
};

const formatDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const getAllowedBirthdateRange = (rules: AgeRule[] = defaultAgeRules) => {
  const today = new Date();
  const latestBirthdate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const maximumAllowedMonths = Math.max(...rules.map((rule) => rule.maxMonths), defaultAgeRules[0].maxMonths);
  const earliestBirthdate = new Date(
    today.getFullYear(),
    today.getMonth() - maximumAllowedMonths - 1,
    today.getDate() + 1
  );

  return {
    min: formatDateInputValue(earliestBirthdate),
    max: formatDateInputValue(latestBirthdate)
  };
};