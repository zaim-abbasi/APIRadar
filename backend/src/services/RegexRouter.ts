import { isValidKey } from './apiKeyValidator';
import { FARM_CONSTANTS } from './farmConstants';

export interface ProviderRule {
  name: string;
  label: string;
  regex: RegExp;
  prefixes: string[];
}

const PROVIDER_RULES: ProviderRule[] = [
  {
    name: 'anthropic',
    label: 'Anthropic',
    regex: /\bsk-ant-(?:api\d{0,2}-|v\d+-|[a-zA-Z0-9]+-)?[a-zA-Z0-9\-_]{20,120}\b/,
    prefixes: ['sk-ant-']
  },
  {
    name: 'google',
    label: 'Google',
    regex: /\bAIza[0-9A-Za-z\-_]{35,40}\b/,
    prefixes: ['AIza']
  },
  {
    name: 'openrouter',
    label: 'OpenRouter',
    regex: /\bsk-or-(?:v1-)?[a-zA-Z0-9\-]{20,}\b/,
    prefixes: ['sk-or-']
  },
  {
    name: 'openai',
    label: 'OpenAI',
    regex: /\b(sk-(?:proj-|svcacct-)?[A-Za-z0-9\-]{20,}|sk-[A-Za-z0-9]{48})\b/,
    prefixes: ['sk-']
  },
  {
    name: 'xai',
    label: 'xAI (Grok)',
    regex: /\bxai-[a-zA-Z0-9]{32,}\b/,
    prefixes: ['xai-']
  },
  {
    name: 'groq',
    label: 'Groq',
    regex: /\b(gsk_[a-zA-Z0-9]{52,56}|groq_[a-zA-Z0-9]{32,64})\b/,
    prefixes: ['gsk_', 'groq_']
  },
  {
    name: 'cerebras',
    label: 'Cerebras',
    regex: /\bcsk-[a-zA-Z0-9]{32,64}\b/,
    prefixes: ['csk-']
  },
  {
    name: 'discord_webhook',
    label: 'Discord Webhook',
    regex: /\b(?:ptb\.|canary\.)?(?:discord|discordapp)\.com\/api(?:\/v\d+)?\/webhooks\/[0-9]{17,20}\/[a-zA-Z0-9_-]{68}\b/,
    prefixes: ['discord.com/api/webhooks/', 'discordapp.com/api/webhooks/', 'ptb.discord.com/api/webhooks/', 'canary.discord.com/api/webhooks/']
  },
  {
    name: 'discord_token',
    label: 'Discord Bot Token',
    regex: /\b[a-zA-Z0-9_-]{24,28}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27,38}\b/,
    prefixes: ['DISCORD_TOKEN', 'DISCORD_BOT_TOKEN', 'client.login('] 
  },
  {
    name: 'slack_token',
    label: 'Slack Token',
    regex: /\b(xox[pboase]-[a-zA-Z0-9]{10,13}-[a-zA-Z0-9]{10,13}-[a-zA-Z0-9]{24,34})\b/,
    prefixes: ['xoxb-', 'xoxp-', 'xoxa-', 'xoxs-', 'xoxe-']
  },
  {
    name: 'telegram_bot',
    label: 'Telegram Bot Token',
    regex: /\b[0-9]{8,10}:[a-zA-Z0-9_-]{35,40}\b/,
    prefixes: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_API_KEY', 'api.telegram.org/bot'] 
  },
  {
    name: 'slack_webhook',
    label: 'Slack Webhook',
    regex: /\bhooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8,11}\/B[a-zA-Z0-9_]{8,11}\/[a-zA-Z0-9_]{24}\b/,
    prefixes: ['hooks.slack.com/services/T']
  }
];

function buildSearchQueries(): Record<string, string[]> {
  const queries: Record<string, string[]> = {};
  for (const rule of PROVIDER_RULES) {
    const allQueries: string[] = [];
    const searchTerms = rule.prefixes;
    for (const term of searchTerms) {
      const termQueries = FARM_CONSTANTS.PATTERNS.HIGH_RISK_FILES.map(
        file => `filename:${file} ${term}`
      );
      allQueries.push(...termQueries);
    }
    queries[rule.name] = allQueries.filter(q => q.trim());
  }
  return queries;
}

export const PROVIDER_NAMES = PROVIDER_RULES.map(r => r.name);
export const PROVIDER_LABELS = PROVIDER_RULES.map(r => ({ value: r.name, label: r.label }));
export const PROVIDER_QUERIES = buildSearchQueries();
export const TIME_RANGE_DAYS: Record<string, number> = { '7d': 7, '15d': 15, '30d': 30 };
export const TIME_RANGE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '15d', label: 'Last 15 Days' },
  { value: '30d', label: 'Last 30 Days' },
];
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'provider', label: 'Provider' }
];

export class RegexRouter {
  private prefixMap: Map<string, ProviderRule[]> = new Map();
  private triggerRegex: RegExp;

  constructor() {
    const prefixes = new Set<string>();
    for (const rule of PROVIDER_RULES) {
      if (rule.prefixes.length > 0) {
        for (const prefix of rule.prefixes) {
          prefixes.add(prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          if (!this.prefixMap.has(prefix)) {
            this.prefixMap.set(prefix, []);
          }
          this.prefixMap.get(prefix)!.push(rule);
        }
      }
    }
    this.triggerRegex = new RegExp(Array.from(prefixes).join('|'), 'g');
  }

  public scan(content: string): { key: string; provider: string }[] {
    const results: { key: string; provider: string }[] = [];
    const foundKeys = new Set<string>();

    // Memory-efficient trigger-based scanning
    let match: RegExpExecArray | null;
    this.triggerRegex.lastIndex = 0; // Reset global regex for fresh scan

    while ((match = this.triggerRegex.exec(content)) !== null) {
      const startIndex = match.index;

      // Ensure the match starts at a true word boundary in the original text
      if (startIndex > 0) {
        const prevChar = content[startIndex - 1];
        if (prevChar && /[a-zA-Z0-9_]/.test(prevChar)) continue;
      }

      // Extract a reasonable chunk forward to find the full token
      const potentialChunk = content.slice(startIndex, startIndex + 150);

      // Extract the specific token starting from the trigger
      const tokenMatch = potentialChunk.match(/^[a-zA-Z0-9_\-+=]{20,}/);
      const token = tokenMatch?.[0];
      if (!token) continue;

      if (foundKeys.has(token)) {
        // Skip ahead to end of this known key
        this.triggerRegex.lastIndex = startIndex + token.length;
        continue;
      }

      let matched = false;
      // Sort prefixes by length descending for precision (e.g., sk-ant- before sk-)
      const sortedPrefixes = Array.from(this.prefixMap.keys()).sort((a, b) => b.length - a.length);

      for (const prefix of sortedPrefixes) {
        if (token.startsWith(prefix)) {
          const rules = this.prefixMap.get(prefix);
          if (rules) {
            for (const rule of rules) {
              if (rule.regex.test(token) && isValidKey(token)) {
                results.push({ key: token, provider: rule.name });
                foundKeys.add(token);
                matched = true;
                break;
              }
            }
          }
        }
        if (matched) break;
      }

      // If we found a valid key, skip the trigger pointer to its end to avoid redundant sub-matches
      if (matched) {
        this.triggerRegex.lastIndex = startIndex + token.length;
      }
    }


    return results;
  }
}

export const regexRouter = new RegexRouter();
