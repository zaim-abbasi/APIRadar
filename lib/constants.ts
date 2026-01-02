export const PROVIDERS = [
  { value: 'all', label: 'All Providers' },
  { value: 'ai-key', label: 'AI Key' },
] as const;

export const TIME_RANGES = [
  { value: 'all', label: 'All' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '15d', label: 'Last 15 Days' },
  { value: '30d', label: 'Last 30 Days' },
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'provider', label: 'Provider' }
] as const;

// Add a mapping for frontend-to-backend provider values
export const PROVIDER_API_MAP: Record<string, string> = {
  'ai-key': 'ai-key',
  all: 'all',
};