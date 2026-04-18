export const PROVIDER_NAMES = ['anthropic', 'cerebras', 'google', 'groq', 'openai', 'openrouter', 'xai'] as const;
export const PROVIDER_LABELS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'xai', label: 'xAI (Grok)' },
] as const;


export const PROVIDERS = [
  { value: 'all', label: 'Overview' },
  ...PROVIDER_LABELS
] as const;

export const INTEL_PROVIDERS = PROVIDER_LABELS;


export type Provider = typeof PROVIDER_NAMES[number] | 'all';