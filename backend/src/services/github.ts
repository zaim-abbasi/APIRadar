import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { rateLimitOptimizer } from './rateLimitOptimizer';

export class GitHubService {
  private readonly clientMap: Map<string, AxiosInstance> = new Map();

  constructor() {
    // Clients will be created lazily to support DB-loaded tokens
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
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const token = rateLimitOptimizer.getCurrentToken();
      if (!token) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      let client = this.clientMap.get(token);
      if (!client) {
        client = this.createClient(token);
        this.clientMap.set(token, client);
      }

      try {
        return await requestFn(client);
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        if (status === 401 || status === 403 || status === 429) {
          rateLimitOptimizer.rotate();
          logger.warn(`[GITHUB] Token rotation triggered by ${status}`);
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error('All tokens exhausted or request failed');
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
    try {
      const [owner, repo] = repoName.split('/');
      const response = await this.makeRequest(client =>
        client.get(`/repos/${owner}/${repo}/commits`, {
          params: { path: filePath, per_page: 1 }
        })
      );
      return response.data?.[0]?.sha || '';
    } catch (error: any) {
      if (error.response?.status === 422 || error.response?.status === 404) return '';
      throw error;
    }
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
