function isPlaceholderKey(key: string): boolean {
  if (!key || key.length < 4) return false;
  const counts: Record<string, number> = {};
  let maxRepeat = 1, currentRepeat = 1, prevChar: string | null = null;
  let entropy = 0;
  for (let i = 0; i < key.length; i++) {
    const char: string = key[i]!;
    counts[char] = (counts[char] || 0) + 1;
    if (prevChar !== null && char === prevChar) {
      currentRepeat++;
      if (currentRepeat > maxRepeat) maxRepeat = currentRepeat;
    } else {
      currentRepeat = 1;
    }
    prevChar = char;
  }
  const len = key.length;
  for (const count of Object.values(counts)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  const expectedEntropy = Math.log2(Math.min(len, 16));
  if (entropy < expectedEntropy * 0.3) return true;
  if (maxRepeat >= 5) return true;
  const maxCount = Math.max(...Object.values(counts));
  if (maxCount / len >= 0.9) return true;
  const lower: string = key.toLowerCase();
  if (/(01234|12345|23456|34567|45678|56789|98765|87654|76543|65432|54321|43210|abcdef|bcdef|abcdefgh|hijklmnop|qrstuvwxyz)/.test(lower)) return true;
  return false;
}

export function isValidOpenAIKey(key: string): boolean {
  if (isPlaceholderKey(key)) return false;
  return /^sk-(?!ant-)(?:proj-)?[a-zA-Z0-9_-]{20,}$/.test(key);
}

export function isValidGeminiKey(key: string): boolean {
  if (isPlaceholderKey(key)) return false;
  return /^AIza[0-9A-Za-z]{35,36}$/.test(key);
}

export function isValidAnthropicKey(key: string): boolean {
  if (isPlaceholderKey(key)) return false;
  return /^sk-ant-api\d{2}-[a-zA-Z0-9]{32,}$/.test(key);
}

export const KEY_VALIDATORS: Record<string, (key: string) => boolean> = {
  openai: isValidOpenAIKey,
  google_gemini: isValidGeminiKey,
  anthropic: isValidAnthropicKey
};
