const PLACEHOLDER_WORDS = [
  'placeholder', 'changeme', 'example', 'sample', 'demo',
  'xxxx', 'yyyy', 'zzzz', 'fake', 'dummy', 'mock', 'fixme', 'todo',
  'your_api', 'your_key', 'put_key', 'key_here', 'api_key_here', 'insert_key', 'adapter', 'production', 'development', 'test'
];

const MIN_KEY_LENGTH = 8;

function isPlaceholderKey(key: string): boolean {
  if (!key || key.length < MIN_KEY_LENGTH) return true;

  const lowerKey = key.toLowerCase();
  for (const word of PLACEHOLDER_WORDS) {
    if (lowerKey.includes(word)) return true;
  }

  const len = key.length;
  const counts = new Map<string, number>();
  let maxRepeat = 1;
  let currentRepeat = 1;
  let prevChar = '';

  for (let i = 0; i < len; i++) {
    const char = key[i]!;
    counts.set(char, (counts.get(char) || 0) + 1);
    if (char === prevChar) {
      currentRepeat++;
      if (currentRepeat > maxRepeat) maxRepeat = currentRepeat;
    } else {
      currentRepeat = 1;
    }
    prevChar = char;
  }

  if (maxRepeat >= 5) return true;

  let maxCount = 0;
  for (const count of counts.values()) {
    if (count > maxCount) maxCount = count;
  }
  if (maxCount / len >= 0.9) return true;

  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  if (entropy < Math.log2(Math.min(len, 36)) * 0.60) return true;

  return false;
}

export function isValidKey(key: string): boolean {
  return !isPlaceholderKey(key);
}