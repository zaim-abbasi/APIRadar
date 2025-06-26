import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface GitHubRepo {
  repoName: string;
  repoUrl: string;
  authorName: string;
  authorUrl: string;
  stars: number;
  language: string;
  updatedAt: string;
  createdAt: string;
  isFork: boolean;
  isArchived: boolean;
  riskyFiles: string[];
  contributors: number;
  hasReadme: boolean;
  commitCount: number;
}

export interface GitHubSearchResponse {
  repos: GitHubRepo[];
  totalCount: number;
  hasMore: boolean;
}

export class GitHubService {
  private readonly clients: AxiosInstance[];
  private currentTokenIndex: number = 0;
  private lastRequestTime: number = 0;
  private readonly rateLimitDelay: number;
  
  // Rate limit tracking
  private rateLimitResetTime: number | null = null;
  private lastRateLimitWarning: number = 0;

  constructor() {
    this.rateLimitDelay = config.GITHUB_RATE_LIMIT_DELAY;
    
    // Create clients for all available tokens
    const tokens = [config.GITHUB_TOKEN, ...config.GITHUB_TOKENS];
    this.clients = tokens.map(token => this.createClient(token));
    
    // Ensure we have at least one client
    if (this.clients.length === 0) {
      throw new Error('No valid GitHub tokens provided');
    }
  }

  private createClient(token: string): AxiosInstance {
    const client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'API-Radar-Scanner/1.0',
      },
      timeout: 30000,
    });

    // Add retry logic for rate limiting
    client.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
          const waitTime = resetTime - Date.now() + 1000; // Add 1 second buffer
          
          if (waitTime > 0 && waitTime < 3600000) { // Don't wait more than 1 hour
            // Only log warning once per rate limit window
            const now = Date.now();
            if (this.rateLimitResetTime !== resetTime || now - this.lastRateLimitWarning > 60000) {
              logger.rateLimit(waitTime, new Date(resetTime));
              this.rateLimitResetTime = resetTime;
              this.lastRateLimitWarning = now;
            }
            
            await new Promise<void>(resolve => setTimeout(resolve, waitTime));
            
            // Log reset message
            logger.rateLimitReset();
            
            return client.request(error.config);
          }
        }
        throw error;
      }
    );

    return client;
  }

  private getCurrentClient(): AxiosInstance {
    // Always return a valid client (defensive)
    return this.clients[this.currentTokenIndex % this.clients.length]!;
  }

  private rotateToken(): void {
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.clients.length;
    logger.debug('github', 'Rotated to token ' + (this.currentTokenIndex + 1) + '/' + this.clients.length);
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async makeRequest<T>(requestFn: (client: AxiosInstance) => Promise<T>): Promise<T> {
    await this.throttleRequest();
    
    // Try with current token first
    try {
      return await requestFn(this.getCurrentClient());
    } catch (error: any) {
      // If rate limited and we have multiple tokens, try the next one
      if (error.response?.status === 403 && this.clients.length > 1) {
        this.rotateToken();
        logger.warn('Retrying with next token due to rate limit');
        return await requestFn(this.getCurrentClient());
      }
      throw error;
    }
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

      const response = await this.makeRequest(client => 
        client.get<{ items: any[]; total_count: number }>('/search/repositories', {
        params: {
          q: query,
          sort: 'stars',
          order: 'desc',
          per_page: limit,
          page,
        },
        })
      );

      const repos: GitHubRepo[] = response.data.items.map((item: any) => ({
        repoName: item.full_name,
        repoUrl: item.html_url,
        authorName: item.owner.login,
        authorUrl: item.owner.html_url,
        stars: item.stargazers_count,
        language: item.language || 'Unknown',
        updatedAt: item.updated_at,
        createdAt: item.created_at,
        isFork: item.fork,
        isArchived: item.archived,
        riskyFiles: [],
        contributors: 1,
        hasReadme: true,
        commitCount: 10,
      }));

      return {
        repos,
        totalCount: response.data.total_count,
        hasMore: response.data.total_count > page * limit,
      };
    } catch (error) {
      logger.error(`Error fetching trending repos: ${error instanceof Error ? error.message : String(error)}`);
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
      const response = await this.makeRequest(client => 
        client.get<{ resources: { core: { remaining: number; reset: number; limit: number } } }>('/rate_limit')
      );
      const core = response.data.resources.core;
      
      return {
        remaining: core.remaining,
        resetTime: new Date(core.reset * 1000),
        limit: core.limit,
      };
    } catch (error) {
      logger.error(`Error checking rate limit: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async searchRepos(query: string, page: number = 1): Promise<GitHubSearchResponse> {
    try {
      const response = await this.makeRequest(client => 
        client.get<{ items: any[]; total_count: number }>('/search/repositories', {
          params: {
            q: query,
            sort: 'updated',
            order: 'desc',
            per_page: 20,
            page,
          },
        })
      );
      
      const repos: GitHubRepo[] = (await Promise.all(response.data.items.map(async (item: any) => {
        try {
          const repoName = item.full_name;
          const repoUrl = item.html_url;
          const authorName = item.owner.login;
          const authorUrl = item.owner.html_url;
          const stars = item.stargazers_count;
          const language = item.language;
          const updatedAt = item.updated_at;
          const createdAt = item.created_at;
          const isFork = item.fork;
          const isArchived = item.archived;

          // Get additional details
          const [riskyFiles, contributors, hasReadme, commitCount] = await Promise.all([
            this.getRiskyFiles(repoName),
            this.getContributorCount(repoName),
            this.hasReadme(repoName),
            this.getCommitCount(repoName),
          ]);

          return {
            repoName,
            repoUrl,
            authorName,
            authorUrl,
            stars,
            language,
            updatedAt,
            createdAt,
            isFork,
            isArchived,
            riskyFiles,
            contributors,
            hasReadme,
            commitCount,
          };
        } catch (error) {
          logger.error(`Error processing repo ${item.full_name}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }))).filter((repo): repo is GitHubRepo => repo !== null);
      
      return {
        repos,
        totalCount: response.data.total_count,
        hasMore: response.data.total_count > page * 20,
      };
    } catch (error: any) {
      const message = error.response?.data?.message || 'No message';
      logger.error(message);
      throw error;
    }
  }

  async getRepoMetadata(repoName: string): Promise<{
    createdAt: string;
    riskyFiles: string[];
    contributors: number;
    hasReadme: boolean;
    commitCount: number;
  }> {
    try {
      // Get repository metadata including creation date
      const repoResponse = await this.makeRequest(client => 
        client.get(`/repos/${repoName}`)
      );
      
      const createdAt = repoResponse.data.created_at;
      
      // Get additional metadata
      const [riskyFiles, contributors, hasReadme, commitCount] = await Promise.all([
        this.getRiskyFiles(repoName),
        this.getContributorCount(repoName),
        this.hasReadme(repoName),
        this.getCommitCount(repoName),
      ]);

      return {
        createdAt,
        riskyFiles,
        contributors,
        hasReadme,
        commitCount,
      };
    } catch (error) {
      logger.error(`Error getting metadata for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        createdAt: new Date().toISOString(),
        riskyFiles: [],
        contributors: 1,
        hasReadme: true,
        commitCount: 10,
      };
    }
  }

  private async getRiskyFiles(repoName: string): Promise<string[]> {
    try {
      // Fetch repo metadata for default_branch
      let defaultBranch = 'main';
      try {
        const meta = await this.makeRequest(client => client.get(`/repos/${repoName}`));
        defaultBranch = meta.data.default_branch || 'main';
      } catch (err: any) {
        logger.error(err.response?.data?.message || 'No message');
      }

      // Risky files
      const riskyFiles = [] as string[];
      try {
        const contents = await this.makeRequest(client => 
          client.get(`/repos/${repoName}/contents?ref=${defaultBranch}`)
        );
        for (const file of contents.data) {
          if ([
            '.env',
            'config.json',
            'secrets.yaml',
            'docker-compose.yml',
          ].includes(file.name)) {
            riskyFiles.push(file.name);
          }
        }
      } catch (err: any) {
        logger.error(err.response?.data?.message || 'No message');
      }
      return riskyFiles;
    } catch (error) {
      logger.error(`Error getting risky files for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async getContributorCount(repoName: string): Promise<number> {
    try {
      const contribs = await this.makeRequest(client => 
        client.get(`/repos/${repoName}/contributors?per_page=2`)
      );
      return contribs.data.length;
    } catch (err: any) {
      logger.error(err.response?.data?.message || 'No message');
      return 1;
    }
  }

  private async hasReadme(repoName: string): Promise<boolean> {
    try {
      // Fetch repo metadata for default_branch
      let defaultBranch = 'main';
      try {
        const meta = await this.makeRequest(client => client.get(`/repos/${repoName}`));
        defaultBranch = meta.data.default_branch || 'main';
      } catch (err: any) {
        logger.error(err.response?.data?.message || 'No message');
      }

      try {
        await this.makeRequest(client => 
          client.get(`/repos/${repoName}/readme?ref=${defaultBranch}`)
        );
        return true;
      } catch (err: any) {
        if (err.response?.status === 404) {
          // README not found - log as info, not error
          logger.warn(`README not found for ${repoName} (404)`);
          return false;
        } else {
          logger.error(err.response?.data?.message || 'No message');
          return false;
        }
      }
    } catch (error) {
      logger.error(`Error checking README for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return true; // Default to true to avoid false positives
    }
  }

  private async getCommitCount(repoName: string): Promise<number> {
    try {
      // Fetch repo metadata for default_branch
      let defaultBranch = 'main';
      try {
        const meta = await this.makeRequest(client => client.get(`/repos/${repoName}`));
        defaultBranch = meta.data.default_branch || 'main';
      } catch (err: any) {
        logger.error(err.response?.data?.message || 'No message');
      }

      try {
        const commits = await this.makeRequest(client => 
          client.get(`/repos/${repoName}/commits?sha=${defaultBranch}&per_page=1`)
        );
        const link = commits.headers['link'];
        const totalCommits = link ? parseInt(link.match(/&page=(\d+)>; rel="last"/)?.[1] || '1', 10) : 1;
        return totalCommits;
      } catch (err: any) {
        logger.error(err.response?.data?.message || 'No message');
        return 10;
      }
    } catch (error) {
      logger.error(`Error getting commit count for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return 10;
    }
  }

  async getFileLatestCommitDate(repoName: string, filePath: string): Promise<Date> {
    try {
      const [owner, repo] = repoName.split('/');
      const response = await this.makeRequest(client =>
        client.get(`/repos/${owner}/${repo}/commits`, {
          params: { path: filePath, per_page: 1 }
        })
      );
      const commit = response.data?.[0]?.commit;
      return commit?.author?.date ? new Date(commit.author.date) : new Date();
    } catch (error) {
      logger.error(`Commit history error: ${repoName}/${filePath} - ${error instanceof Error ? error.message : String(error)}`);
      return new Date();
    }
  }

  async getFileLatestCommitHash(repoName: string, filePath: string): Promise<string> {
    try {
      const [owner, repo] = repoName.split('/');
      const response = await this.makeRequest(client =>
        client.get(`/repos/${owner}/${repo}/commits`, {
          params: { path: filePath, per_page: 1 }
        })
      );
      const commit = response.data?.[0];
      return commit?.sha || '';
    } catch (error) {
      logger.error(`Commit hash error: ${repoName}/${filePath} - ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }
}

export const githubService = new GitHubService();