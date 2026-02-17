export const PROVIDER_NAMES = ['openai', 'anthropic', 'google', 'deepseek', 'mistral', 'xai', 'groq', 'cerebras'] as const;
export const PROVIDER_LABELS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'groq', label: 'Groq' },
  { value: 'cerebras', label: 'Cerebras' },
] as const;


export const PROVIDERS = [
  { value: 'all', label: 'All Providers' },
  ...PROVIDER_LABELS
] as const;


export type Provider = typeof PROVIDER_NAMES[number] | 'all';