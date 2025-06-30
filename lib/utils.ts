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
