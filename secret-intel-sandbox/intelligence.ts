import * as fs from 'fs';
import * as path from 'path';

const MODEL_PATH = path.join(__dirname, 'model.json');
let model: { probabilities: Record<string, Record<string, number>> } | null = null;

export function loadModel() {
    if (!model) {
        if (!fs.existsSync(MODEL_PATH)) {
            throw new Error(`Model not found at ${MODEL_PATH}. Run train.ts first.`);
        }
        model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf-8'));
    }
}

export function calculateEntropy(str: string): number {
    const len = str.length;
    if (len === 0) return 0;
    
    const counts: Record<string, number> = {};
    for (let i = 0; i < len; i++) {
        const char = str[i];
        counts[char] = (counts[char] || 0) + 1;
    }

    let entropy = 0;
    for (const char in counts) {
        const p = counts[char] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

export function calculateLanguageProbability(str: string): number {
    if (!model) loadModel();
    const probs = model!.probabilities;
    
    // Normalize string: only keep letters/numbers, lowercase
    const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.length < 3) return 0; // Too short to be linguistic
    
    const w = `^${normalized}$`;
    let logProb = 0;
    let validTransitions = 0;
    
    for (let i = 0; i < w.length - 2; i++) {
        const prefix = w.substring(i, i + 2);
        const next = w[i + 2];
        
        let p = 0.0001; // smoothing for unseen transitions
        if (probs[prefix] && probs[prefix][next]) {
            p = Math.max(probs[prefix][next], 0.0001);
        }
        
        logProb += Math.log(p);
        validTransitions++;
    }
    
    // Average log probability per transition
    const avgLogProb = logProb / validTransitions;
    
    // Convert back from log space to a 0-1 scale.
    // e^ -2 = 0.13 avg prob per char (highly english)
    // e^ -9 = 0.0001 (highly random/unseen transitions)
    const mapped = (avgLogProb - (-9)) / (-2 - (-9));
    let bounded = Math.max(0, Math.min(1, mapped));
    
    return bounded;
}

export function ScoreIntelligence(str: string): { entropy: number, languageProb: number, score: number, reason?: string } {
    // 1. Fast-Path Regex Reject
    if (/(.)\1{4,}/.test(str)) { // Repeats like xxxxx
        return { entropy: 0, languageProb: 0, score: 0, reason: "Fast-Path: Repeated characters" };
    }
    const lazyPhrases = ['example', 'placeholder', 'dummy', 'insert', 'your', 'demo', 'template', 'changeme'];
    const lowerStr = str.toLowerCase();
    for (const lazy of lazyPhrases) {
        if (lowerStr.includes(lazy)) {
            return { entropy: 0, languageProb: 1, score: 0, reason: `Fast-Path: Found lazy word '${lazy}'` };
        }
    }

    // 2. Entropy Check
    // Strip prefixes to only analyze the "secret" part
    let secretPart = str.replace(/^sk-[a-zA-Z0-9\-]+-/, '');
    secretPart = secretPart.replace(/^sk-/, '');
    secretPart = secretPart.replace(/^AIza[a-zA-Z0-9_\-]+/, ''); // Basic Google strip
    
    const H = calculateEntropy(secretPart);
    
    // 3. Markov Check
    const L = calculateLanguageProbability(secretPart);
    
    // 4. Intelligence Integration formula
    // IntelligenceScore = Entropy * (1 - LanguageProbability)
    // Normalize entropy by typical max (around 5 bits for alphanumerics of reasonable length)
    const normalizedH = Math.min(H / 5.0, 1.0); 
    
    let score = normalizedH * (1 - L);
    
    // Steep penalty if entropy is purely garbage (like 123456789)
    if (H < 2.5) {
        score *= 0.1; 
    }
    
    return {
        entropy: H,
        languageProb: L,
        score
    };
}
