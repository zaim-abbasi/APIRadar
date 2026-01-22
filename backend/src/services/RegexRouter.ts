import { isValidKey } from './apiKeyValidator';
import { FARM_CONSTANTS } from './farmConstants';

export interface ProviderRule {
  name: string;
  label: string;
  regex: RegExp;
  prefix?: string;
}

const PROVIDER_RULES: ProviderRule[] = [
  {
    name: 'ai-key',
    label: 'AI Key',
    regex: /\b(sk-(?:ant-api\d{2}-[a-zA-Z0-9+/=]{30,150}|(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,}))\b/,
    prefix: 'sk-'
  },
  {
    name: 'github-token',
    label: 'GitHub Token',
    regex: /\b((?:ghp|gho)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/,
    prefix: 'gh'
  }
];

function buildSearchQueries(): Record<string, string[]> {
  const queries: Record<string, string[]> = {};
  for (const rule of PROVIDER_RULES) {
    queries[rule.name] = FARM_CONSTANTS.PATTERNS.HIGH_RISK_FILES.map(
      file => `filename:${file} ${rule.prefix || ''}`
    ).filter(q => q.trim());
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
  private wildcardRules: ProviderRule[] = [];

  constructor() {
    for (const rule of PROVIDER_RULES) {
      if (rule.prefix) {
        if (!this.prefixMap.has(rule.prefix)) {
          this.prefixMap.set(rule.prefix, []);
        }
        this.prefixMap.get(rule.prefix)!.push(rule);
      } else {
        this.wildcardRules.push(rule);
      }
    }
  }

  public scan(content: string): { key: string; provider: string }[] {
    const results: { key: string; provider: string }[] = [];
    const foundKeys = new Set<string>();
    const tokens = content.match(/[a-zA-Z0-9_\-+=]{20,}/g);
    if (!tokens) return [];

    for (const token of tokens) {
      if (foundKeys.has(token)) continue;
      let matched = false;

      for (const [prefix, rules] of this.prefixMap) {
        if (token.startsWith(prefix)) {
          for (const rule of rules) {
            if (rule.regex.test(token) && isValidKey(token)) {
              results.push({ key: token, provider: rule.name });
              foundKeys.add(token);
              matched = true;
            }
          }
        }
      }

      if (!matched && this.wildcardRules.length > 0) {
        for (const rule of this.wildcardRules) {
          if (rule.regex.test(token) && isValidKey(token)) {
            results.push({ key: token, provider: rule.name });
            foundKeys.add(token);
          }
        }
      }
    }
    return results;
  }
}

export const regexRouter = new RegexRouter();
