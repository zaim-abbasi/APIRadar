export const PROVIDER_NAMES = ['openai', 'anthropic', 'google', 'mistral', 'grok', 'deepseek'] as const;
export const PROVIDER_LABELS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'grok', label: 'Grok' },
  { value: 'deepseek', label: 'DeepSeek' },
] as const;

export const TIME_RANGE_DAYS: Record<string, number> = { '7d': 7, '15d': 15, '30d': 30 };
export const TIME_RANGES = [
  { value: 'all', label: 'All' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '15d', label: 'Last 15 Days' },
  { value: '30d', label: 'Last 30 Days' },
] as const;

export const PROVIDERS = [
  { value: 'all', label: 'All Providers' },
  ...PROVIDER_LABELS
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'provider', label: 'Provider' }
] as const;

export type Provider = typeof PROVIDER_NAMES[number] | 'all';
export type TimeRange = keyof typeof TIME_RANGE_DAYS | 'all';