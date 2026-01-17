import { isValidKey } from './apiKeyValidator';

interface PatternRule {
  provider: string;
  regex: RegExp;
}

export class RegexRouter {
  private prefixMap: Map<string, PatternRule[]> = new Map();
  private wildcardRules: PatternRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    this.addRule('ai-key', /\b(sk-(?:ant-api\d{2}-[a-zA-Z0-9+/=]{30,150}|(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,}))\b/, 'sk-');
  }

  private addRule(provider: string, regex: RegExp, prefix?: string) {
    const rule = { provider, regex };
    if (prefix) {
      if (!this.prefixMap.has(prefix)) {
        this.prefixMap.set(prefix, []);
      }
      this.prefixMap.get(prefix)!.push(rule);
    } else {
      this.wildcardRules.push(rule);
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
            if (rule.regex.test(token)) {
              if (isValidKey(token)) {
                results.push({ key: token, provider: rule.provider });
                foundKeys.add(token);
                matched = true;
              }
            }
          }
        }
      }

      if (!matched && this.wildcardRules.length > 0) {
        for (const rule of this.wildcardRules) {
          if (rule.regex.test(token) && isValidKey(token)) {
            results.push({ key: token, provider: rule.provider });
            foundKeys.add(token);
          }
        }
      }
    }
    return results;
  }
}

export const regexRouter = new RegexRouter();
