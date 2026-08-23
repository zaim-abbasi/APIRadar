import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { gitHubAppAuthService } from './GitHubAppAuthService';

export class GitHubService {
  private async getClient(): Promise<AxiosInstance> {
    const headers = await gitHubAppAuthService.getAuthHeader();
    return axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        ...headers,
        'User-Agent': 'API-Radar-Scanner/1.0',
      },
      timeout: 30000,
    });
  }

  private async makeRequest<T>(requestFn: (client: AxiosInstance) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    return await requestFn(client);
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
}

export const githubService = new GitHubService();
