import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { rateLimitOptimizer } from './rateLimitOptimizer';

export class GitHubService {
  private readonly clients: AxiosInstance[];

  constructor() {
    const tokens = config.GITHUB_TOKEN;
    this.clients = tokens.map(token => this.createClient(token));
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

    client.interceptors.response.use(
      (response: any) => {
        const tokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
        rateLimitOptimizer.updateStateFromResponse(tokenIndex, response.headers);
        return response;
      },
      async (error: any) => {
        if (error.response?.headers) {
          const tokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
          rateLimitOptimizer.updateStateFromResponse(tokenIndex, error.response.headers);
        }
        throw error;
      }
    );

    return client;
  }

  private async makeRequest<T>(requestFn: (client: AxiosInstance) => Promise<T>): Promise<T> {
    const maxAttempts = Math.min(3, this.clients.length);
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (rateLimitOptimizer.shouldRotate()) {
        rateLimitOptimizer.rotate();
      }
      const tokenIndex = rateLimitOptimizer.getCurrentTokenIndex();
      const client = this.clients[tokenIndex % this.clients.length]!;

      try {
        return await requestFn(client);
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        if (status === 401 || status === 403 || status === 429) {
          rateLimitOptimizer.rotate();
          logger.warn(`[GITHUB] Token ${tokenIndex + 1} failed (${status}), rotating...`);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async getRepoCreatedAt(repoName: string): Promise<string> {
    try {
      const response = await this.makeRequest(client => client.get(`/repos/${repoName}`));
      return response.data.created_at || new Date().toISOString();
    } catch (error) {
      logger.error(`[GITHUB] Error getting repo created_at for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return new Date().toISOString();
    }
  }

  async searchCode(query: string, page: number = 1, perPage: number = 10): Promise<any> {
    return await this.makeRequest(client =>
      client.get('/search/code', {
        params: { q: query, per_page: perPage, page }
      })
    );
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
      logger.error(`[GITHUB] Commit history error: ${repoName}/${filePath} - ${error instanceof Error ? error.message : String(error)}`);
      return new Date();
    }
  }

  async getFileLatestCommitHash(repoName: string, filePath: string): Promise<string> {
    const [owner, repo] = repoName.split('/');
    const response = await this.makeRequest(client =>
      client.get(`/repos/${owner}/${repo}/commits`, {
        params: { path: filePath, per_page: 1 }
      })
    );
    return response.data?.[0]?.sha || '';
  }

  async getRepoLatestCommitHash(repoName: string): Promise<string> {
    for (const branch of ['main', 'master']) {
      try {
        const response = await this.makeRequest(client =>
          client.get(`/repos/${repoName}/commits/${branch}`)
        );
        return response.data?.sha || '';
      } catch (err: any) {
        if (err.response?.status === 404) continue;
        throw err;
      }
    }
    return '';
  }

  async getUserProfile(username: string): Promise<{ login: string; avatar_url: string; html_url: string } | null> {
    try {
      const response = await this.makeRequest((client) => client.get(`/users/${username}`));
      return {
        login: response.data?.login || username,
        avatar_url: response.data?.avatar_url || '',
        html_url: response.data?.html_url || ''
      };
    } catch (error) {
      logger.error(`[GITHUB] User profile fetch failed: ${username} - ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}

export const githubService = new GitHubService();
