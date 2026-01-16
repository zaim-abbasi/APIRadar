const PLACEHOLDER_WORDS = new Set([
  'your', 'here', 'demo', 'example', 'sample', 'placeholder',
  'replace', 'insert', 'put', 'add', 'enter', 'fill', 'change', 'update',
  'real', 'actual', 'temp', 'temporary', 'fake', 'dummy', 'mock',
  'xxxx', 'xxx', 'yyy', 'zzz', 'changeme', 'fixme', 'todo', 'none', 'null'
]);

function isPlaceholderKey(key: string): boolean {
  if (!key || key.length < 4) return false;

  const segments = key.split(/[-_]/).filter(s => s.length > 2);
  for (const segment of segments) {
    if (PLACEHOLDER_WORDS.has(segment.toLowerCase())) return true;
  }

  const counts: Record<string, number> = {};
  let maxRepeat = 1, currentRepeat = 1, prevChar: string | null = null;

  for (let i = 0; i < key.length; i++) {
    const char = key[i]!;
    counts[char] = (counts[char] || 0) + 1;
    if (char === prevChar) {
      currentRepeat++;
      if (currentRepeat > maxRepeat) maxRepeat = currentRepeat;
    } else {
      currentRepeat = 1;
    }
    prevChar = char;
  }

  if (maxRepeat >= 5) return true;

  const maxCount = Math.max(...Object.values(counts));
  if (maxCount / key.length >= 0.9) return true;

  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / key.length;
    entropy -= p * Math.log2(p);
  }
  if (entropy < Math.log2(Math.min(key.length, 36)) * 0.5) return true;

  return false;
}

export function isValidKey(key: string): boolean {
  return !isPlaceholderKey(key);
}
