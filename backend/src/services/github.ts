import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { waitForRateLimitIfNeeded, setRateLimit, clearRateLimit } from './rateLimitManager';
import { rateLimitOptimizer } from './rateLimitOptimizer';

export class GitHubService {
  private readonly clients: AxiosInstance[];
  
  constructor() {
    // Support GITHUB_TOKEN as a single token or comma-separated list
    const tokens = config.GITHUB_TOKEN.split(',').map(t => t.trim()).filter(Boolean);
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
        // Handle both 403 and 429 rate limit errors
        if ((error.response?.status === 403 || error.response?.status === 429) && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = parseInt(error.response.headers['x-ratelimit-reset']) * 1000;
          const now = Date.now();
          
          // If the reset time is in the past, clear the rate limit state
          if (resetTime <= now) {
            clearRateLimit();
            return client.request(error.config);
          }
          
          setRateLimit(resetTime);
          await waitForRateLimitIfNeeded();
          return client.request(error.config);
        }
        throw error;
      }
    );

    return client;
  }


  private async makeRequest<T>(requestFn: (client: AxiosInstance) => Promise<T>): Promise<T> {
    // Priority 2: Use best available token (proactive load balancing)
    if (rateLimitOptimizer.shouldRotateToken()) {
      rateLimitOptimizer.rotateToBestToken();
    }

    // Get client for current token (aligned with optimizer)
    const tokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
    const client = this.clients[tokenIndex % this.clients.length]!;

    try {
      const response = await requestFn(client);
      
      // Priority 2: Update rate limit info from response headers
      if (response && (response as any).headers) {
        rateLimitOptimizer.updateFromHeaders((response as any).headers, tokenIndex);
      }
      
      return response;
    } catch (error: any) {
      // Priority 2: Update rate limit info from error response headers
      if (error.response?.headers) {
        rateLimitOptimizer.updateFromHeaders(error.response.headers, tokenIndex);
      }

      // Priority 2: Handle 401 (invalid token) - rotate to next token
      if (error.response?.status === 401 && this.clients.length > 1) {
        rateLimitOptimizer.rotateToBestToken();
        const newTokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
        const newClient = this.clients[newTokenIndex % this.clients.length]!;
        logger.warn(`[GITHUB] 401 Unauthorized - Rotated to token ${newTokenIndex + 1} (previous token may be invalid)`);
        // Retry with new token
        try {
          return await requestFn(newClient);
        } catch (retryError: any) {
          // If new token also fails with 401, mark it as invalid and try next
          if (retryError.response?.status === 401 && this.clients.length > 1) {
            rateLimitOptimizer.rotateToBestToken();
            const nextTokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
            const nextClient = this.clients[nextTokenIndex % this.clients.length]!;
            logger.warn(`[GITHUB] Token ${newTokenIndex + 1} also invalid, trying token ${nextTokenIndex + 1}`);
            return await requestFn(nextClient);
          }
          throw retryError;
        }
      }

      // If rate limited (403 or 429) and we have multiple tokens, try the next one
      if ((error.response?.status === 403 || error.response?.status === 429) && this.clients.length > 1) {
        rateLimitOptimizer.rotateToBestToken();
        const newTokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
        const newClient = this.clients[newTokenIndex % this.clients.length]!;
        logger.warn(`[GITHUB] Rotated to token ${newTokenIndex + 1} due to rate limit`);
        return await requestFn(newClient);
      }
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
          // README not found - do not log anything
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

  /**
   * Priority 2: Search code using GitHub API with token rotation
   */
  async searchCode(query: string, page: number = 1, perPage: number = 10): Promise<any> {
    return await this.makeRequest(client =>
      client.get('/search/code', {
        params: { q: query, per_page: perPage, page }
      })
    );
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

  /**
   * Priority 4: Get repository's latest commit hash (HEAD of default branch)
   * Used for repo-level incremental scanning
   */
  async getRepoLatestCommitHash(repoName: string): Promise<string> {
    try {
      // Get repo info to find default branch
      const repoInfo = await this.makeRequest(client =>
        client.get(`/repos/${repoName}`)
      );
      const defaultBranch = repoInfo.data?.default_branch || 'main';
      
      // Get latest commit from default branch
      const response = await this.makeRequest(client =>
        client.get(`/repos/${repoName}/commits/${defaultBranch}`)
      );
      return response.data?.sha || '';
    } catch (error) {
      logger.error(`Repo commit hash error: ${repoName} - ${error instanceof Error ? error.message : String(error)}`);
      return '';
    }
  }
}

export const githubService = new GitHubService();