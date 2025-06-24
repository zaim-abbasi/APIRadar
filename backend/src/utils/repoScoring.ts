export interface RepoScoringInput {
  createdAt: string;
  riskyFiles: string[];
  contributors: number;
  stars: number;
  hasReadme: boolean;
  commitCount: number;
  isFork: boolean;
  isArchived: boolean;
  language: string;
}

export interface RepoScoreResult {
  score: number;
  reasons: string[];
}

const LEAKY_LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'YAML', 'Shell'];
const HIGH_RISK_FILES = ['.env', '.yml', 'docker-compose.yml', 'config.js', 'config.json'];

export function scoreRepo(repo: RepoScoringInput): RepoScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  if (repo.isFork || repo.isArchived) return { score: 0, reasons: ['archived/forked'] };
  if (new Date(repo.createdAt).getTime() > ninetyDaysAgo) {
    score += 40;
    reasons.push('recent');
  }
  if (repo.riskyFiles.some(f => HIGH_RISK_FILES.includes(f))) {
    score += 30;
    reasons.push('risky_file');
  }
  if (LEAKY_LANGUAGES.includes(repo.language)) {
    score += 30;
    reasons.push(repo.language.toLowerCase());
  }
  if (!repo.hasReadme) {
    score += 20;
    reasons.push('no_readme');
  }
  if (repo.commitCount < 10 || repo.contributors === 1) {
    score += 10;
    reasons.push('low_commits');
  }
  if (repo.stars < 5) {
    score += 5;
    reasons.push('low_stars');
  }
  return { score, reasons };
} 