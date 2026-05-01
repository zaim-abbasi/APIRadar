export const PROVIDER_NAMES = ['anthropic', 'cerebras', 'discord_token', 'discord_webhook', 'google', 'groq', 'openai', 'openrouter', 'slack_token', 'slack_webhook', 'telegram_bot', 'xai'] as const;
export const PROVIDER_LABELS = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'discord_token', label: 'Discord Bot Token' },
  { value: 'discord_webhook', label: 'Discord Webhook' },
  { value: 'google', label: 'Google' },
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'slack_token', label: 'Slack Token' },
  { value: 'slack_webhook', label: 'Slack Webhook' },
  { value: 'telegram_bot', label: 'Telegram Bot Token' },
  { value: 'xai', label: 'xAI (Grok)' },
] as const;


export const PROVIDERS = [
  { value: 'all', label: 'Overview' },
  ...PROVIDER_LABELS
] as const;

export const INTEL_PROVIDERS = PROVIDER_LABELS;


export type Provider = typeof PROVIDER_NAMES[number] | 'all';