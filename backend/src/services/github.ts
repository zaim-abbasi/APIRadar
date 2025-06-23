import axios from 'axios';
type AxiosInstance = ReturnType<typeof axios.create>;
import { config } from '../config/environment';

export interface GitHubRepo {
  repoName: string;
  repoUrl: string;
  authorName: string;
  authorUrl: string;
  stars: number;
  language: string;
  updatedAt: string;
}

export interface GitHubSearchResponse {
  repos: GitHubRepo[];
  totalCount: number;
  hasMore: boolean;
}

export class GitHubService {
  private readonly client: AxiosInstance;
  private readonly token: string;

  constructor() {
    this.token = config.GITHUB_TOKEN;
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'API-Radar-Scanner/1.0',
      },
      timeout: 30000,
    });

    // Add retry logic for rate limiting
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
          const waitTime = resetTime - Date.now() + 1000; // Add 1 second buffer
          
          if (waitTime > 0 && waitTime < 3600000) { // Don't wait more than 1 hour
            console.log(`Rate limited. Waiting ${Math.round(waitTime / 1000)} seconds...`);
            await new Promise<void>(resolve => setTimeout(resolve, waitTime));
            return this.client.request(error.config);
          }
        }
        throw error;
      }
    );
  }

  async getTrendingRepos(
    limit: number = 10,
    page: number = 1,
    language?: string
  ): Promise<GitHubSearchResponse> {
    try {
      // Search for recently updated repositories with high stars
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let query = `stars:>100 pushed:>${oneWeekAgo}`;
      if (language) {
        query += ` language:${language}`;
      }

      const response = await this.client.get<{ items: any[]; total_count: number }>('/search/repositories', {
        params: {
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: limit,
          page,
        },
      });

      const repos: GitHubRepo[] = response.data.items.map((item: any) => ({
        repoName: item.full_name,
        repoUrl: item.html_url,
        authorName: item.owner.login,
        authorUrl: item.owner.html_url,
        stars: item.stargazers_count,
        language: item.language || 'Unknown',
        updatedAt: item.updated_at,
      }));

      return {
        repos,
        totalCount: response.data.total_count,
        hasMore: response.data.total_count > page * limit,
      };
    } catch (error) {
      console.error('Error fetching trending repos:', error);
      throw new Error(`Failed to fetch trending repositories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRecentlyUpdatedRepos(
    limit: number = 10,
    languages: string[] = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Java']
  ): Promise<GitHubRepo[]> {
    try {
      const allRepos: GitHubRepo[] = [];
      
      for (const language of languages) {
        const result = await this.getTrendingRepos(Math.ceil(limit / languages.length), 1, language);
        allRepos.push(...result.repos);
      }

      // Sort by stars and return top results
      return allRepos
        .sort((a, b) => b.stars - a.stars)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recently updated repos:', error);
      throw error;
    }
  }

  async checkRateLimit(): Promise<{
    remaining: number;
    resetTime: Date;
    limit: number;
  }> {
    try {
      const response = await this.client.get<{ resources: { core: { remaining: number; reset: number; limit: number } } }>('/rate_limit');
      const core = response.data.resources.core;
      
      return {
        remaining: core.remaining,
        resetTime: new Date(core.reset * 1000),
        limit: core.limit,
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      throw error;
    }
  }
}

export const githubService = new GitHubService();