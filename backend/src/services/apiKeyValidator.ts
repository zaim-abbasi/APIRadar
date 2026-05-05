import model from './model.json';

const PLACEHOLDER_KEYWORDS = [
    'placeholder', 'changeme', 'example', 'sample', 'demo',
    'xxxx', 'yyyy', 'zzzz', 'fake', 'dummy', 'mock', 'fixme', 'todo',
    'your_api', 'your_key', 'put_key', 'key_here', 'api_key_here',
    'insert_key', 'adapter', 'production', 'development', 'test',
    'your-key', 'api-key', 'here', 'key', 'env',
    'secret', 'local', 'foo', 'bar', 'baz', 'qux', 'asdf', 'qwerty',
    'password', 'admin', 'hidden', 'private', 'public', 'mocking',
    'dummykey', 'fakekey', 'replace', 'token', 'auth', 'bearer', '12345', 'apikey'
];

function calculateEntropy(str: string): number {
    const len = str.length;
    if (len === 0) return 0;
    const counts: Record<string, number> = {};
    for (const char of str) counts[char] = (counts[char] || 0) + 1;
    let entropy = 0;
    for (const char in counts) {
        const charCount = counts[char];
        if (charCount !== undefined) {
            const p = charCount / len;
            entropy -= p * Math.log2(p);
        }
    }
    return entropy;
}

function calculateLanguageProbability(str: string): number {
    const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.length < 3) return 0;
    const probs = (model as any).probabilities;
    const w = `^${normalized}$`;
    let logProb = 0;
    for (let i = 0; i < w.length - 2; i++) {
        const prefix = w.substring(i, i + 2);
        const next = w[i + 2];
        if (prefix && next) {
            const p = (probs[prefix] && probs[prefix][next]) ? Math.max(probs[prefix][next], 1e-7) : 1e-7;
            logProb += Math.log(p);
        }
    }
    const avgLogProb = logProb / (w.length - 2);
    const mapped = (avgLogProb - (-15)) / (-2 - (-15));
    return Math.max(0, Math.min(1, mapped));
}

export function isValidKey(key: string): boolean {
    if (!key || key.length < 8 || /(.)\1{4,}/.test(key)) return false;

    let secretPart = key;

    if (secretPart.includes('slack.com/') || secretPart.includes('discord.com/') || secretPart.includes('discordapp.com/') || secretPart.includes('telegram.org/')) {
        const parts = secretPart.split('/');
        secretPart = parts[parts.length - 1] || secretPart;
    }

    if (/^[a-zA-Z0-9_-]{24,28}\.[a-zA-Z0-9_-]{6}\.[a-zA-Z0-9_-]{27,38}$/.test(key)) {
        const segments = key.split('.');
        secretPart = segments[segments.length - 1] || secretPart;
    }

    secretPart = secretPart
        .replace(/^sk-[a-zA-Z0-9\-]+-/, '')
        .replace(/^sk-/, '')
        .replace(/^AIza/, '')
        .replace(/^xox[pboase]-/, '')
        .replace(/^[0-9]{8,10}:/, '');

    const lowerSecret = secretPart.toLowerCase();
    if (PLACEHOLDER_KEYWORDS.some(word => lowerSecret.includes(word))) return false;

    const H = calculateEntropy(secretPart);
    if (H < 2.5) return false;

    const L = calculateLanguageProbability(secretPart);
    const normalizedH = Math.min(H / 5.0, 1.0);
    const intelligenceScore = normalizedH * (1 - L);

    return intelligenceScore > 0.5;
}