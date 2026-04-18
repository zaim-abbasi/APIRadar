import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts the owner and repo name from a GitHub repo URL.
 * @param repoUrl Full GitHub repo URL (e.g. https://github.com/user/repo)
 * @returns { owner: string, repo: string } or null if invalid
 */
export function parseGitHubRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  try {
    const match = repoUrl.match(/github\.com\/(.+?)\/(.+?)(?:$|\/|\?|#)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

export function redact(s: string): string {
  if (s.length <= 5) return `${s.slice(0, 2)}${'*'.repeat(Math.max(3, Math.floor(s.length * 0.8)))}`;
  return `${s.slice(0, 3)}${'*'.repeat(Math.max(3, Math.floor((s.length - 5) * 0.8)))}${s.slice(-2)}`;
}
