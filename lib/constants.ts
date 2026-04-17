export const PROVIDER_NAMES = ['openai', 'anthropic', 'google', 'openrouter', 'xai', 'groq', 'cerebras'] as const;
export const PROVIDER_LABELS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'groq', label: 'Groq' },
  { value: 'cerebras', label: 'Cerebras' },
] as const;


export const PROVIDERS = [
  { value: 'all', label: 'Overview' },
  ...PROVIDER_LABELS
] as const;

export const INTEL_PROVIDERS = PROVIDER_LABELS;


export type Provider = typeof PROVIDER_NAMES[number] | 'all';