import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export interface GraphQLRepo {
  nameWithOwner: string;
  description: string | null;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: {
    name: string;
  } | null;
  repositoryTopics: {
    nodes: Array<{
      topic: {
        name: string;
      };
    }>;
  };
  updatedAt: string;
  isArchived: boolean;
  isFork: boolean;
}

export interface GraphQLSearchResponse {
  search: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    nodes: GraphQLRepo[];
  };
}

export interface GraphQLRepoWithMetadata extends GraphQLRepo {
  repoName: string;
  repoUrl: string;
  authorName: string;
  authorUrl: string;
  stars: number;
  language: string;
  createdAt: string;
  riskyFiles: string[];
  contributors: number;
  hasReadme: boolean;
  commitCount: number;
}

export class GitHubGraphQLService {
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
    
    logger.status('GitHub GraphQL', 'Validated', `${this.clients.length} token(s) available`);
  }

  private createClient(token: string): AxiosInstance {
    const client = axios.create({
      baseURL: 'https://api.github.com/graphql',
      headers: {
        'Authorization': `Bearer ${token}`,
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
          if (waitTime > 0 && waitTime < 3600000) {
            // Only set pause, do not log here
            this.rateLimitResetTime = resetTime;
            this.lastRateLimitWarning = Date.now();
            await new Promise<void>(resolve => setTimeout(resolve, waitTime));
            // Log reset message
            logger.rateLimitReset();
            return client.request(error.config);
          }
        }
        const status = error.response?.status || 'unknown';
        const message = error.response?.data?.message || 'No message';
        const url = error.config?.url || 'unknown URL';
        logger.error('github', `GraphQL API error (${status}) for ${url} → ${message}`);
        throw error;
      }
    );

    return client;
  }

  private async makeRequest<T>(requestFn: (client: AxiosInstance) => Promise<{ data: T }>): Promise<{ data: T }> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();

    // Token rotation
    const client = this.clients[this.currentTokenIndex];
    this.currentTokenIndex = (this.currentTokenIndex + 1) % this.clients.length;

    if (!client) {
      throw new Error('No valid Axios client available');
    }

    return requestFn(client);
  }

  async searchReposGraphQL(query: string, after?: string): Promise<{
    repos: GraphQLRepoWithMetadata[];
    hasMore: boolean;
    endCursor?: string;
  }> {
    try {
      const graphqlQuery = `
        query SearchRepositories($query: String!, $after: String) {
          search(query: $query, type: REPOSITORY, first: 10, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              ... on Repository {
                nameWithOwner
                description
                stargazerCount
                forkCount
                updatedAt
                isArchived
                isFork
                primaryLanguage {
                  name
                }
                repositoryTopics(first: 10) {
                  nodes {
                    topic {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.makeRequest(client => 
        client.post<{ data: GraphQLSearchResponse }>('', {
          query: graphqlQuery,
          variables: {
            query,
            after,
          },
        })
      );

      const repos: GraphQLRepoWithMetadata[] = response.data.data.search.nodes.map((repo: GraphQLRepo) => {
        const split = repo.nameWithOwner.split('/');
        const authorName = split[0] || '';
        const repoShortName = split[1] || '';
        const repoUrl = `https://github.com/${repo.nameWithOwner}`;
        const authorUrl = `https://github.com/${authorName}`;

        return {
          ...repo,
          repoName: repo.nameWithOwner,
          repoUrl,
          authorName,
          authorUrl,
          stars: repo.stargazerCount,
          language: repo.primaryLanguage?.name || 'Unknown',
          createdAt: repo.updatedAt, // GraphQL doesn't provide createdAt in search, using updatedAt as fallback
          riskyFiles: [], // Will be populated separately if needed
          contributors: 1, // Will be populated separately if needed
          hasReadme: true, // Will be populated separately if needed
          commitCount: 10, // Will be populated separately if needed
        };
      });

      return {
        repos,
        hasMore: response.data.data.search.pageInfo.hasNextPage,
        endCursor: response.data.data.search.pageInfo.endCursor,
      };
    } catch (error: any) {
      const status = error.response?.status || 'unknown';
      const message = error.response?.data?.message || 'No message';
      const url = error.config?.url || 'unknown URL';
      logger.error('github', `GraphQL API error (${status}) for ${url} → ${message}`);
      throw error;
    }
  }

  async getRepoMetadata(repoName: string): Promise<{
    riskyFiles: string[];
    contributors: number;
    hasReadme: boolean;
    commitCount: number;
  }> {
    try {
      // For now, we'll use REST API for additional metadata since GraphQL search doesn't provide all fields
      // This could be optimized with a more complex GraphQL query if needed
      const restClient = axios.create({
        baseURL: 'https://api.github.com',
        headers: {
          'Authorization': `Bearer ${config.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'API-Radar-Scanner/1.0',
        },
        timeout: 30000,
      });

      const [riskyFiles, contributors, hasReadme, commitCount] = await Promise.all([
        this.getRiskyFiles(restClient, repoName),
        this.getContributorCount(restClient, repoName),
        this.hasReadme(restClient, repoName),
        this.getCommitCount(restClient, repoName),
      ]);

      return {
        riskyFiles,
        contributors,
        hasReadme,
        commitCount,
      };
    } catch (error) {
      logger.error('github', `Error getting metadata for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        riskyFiles: [],
        contributors: 1,
        hasReadme: true,
        commitCount: 10,
      };
    }
  }

  private async getRiskyFiles(client: AxiosInstance, repoName: string): Promise<string[]> {
    try {
      // Fetch repo metadata for default_branch
      let defaultBranch = 'main';
      try {
        const meta = await client.get(`/repos/${repoName}`);
        defaultBranch = meta.data.default_branch || 'main';
      } catch (err: any) {
        const status = err.response?.status || 'unknown';
        const message = err.response?.data?.message || 'No message';
        const url = err.config?.url || 'unknown URL';
        logger.error('github', `API error (${status}) for ${url} → ${message}`);
      }

      // Expanded list of risky files to match discovery queries
      const riskyFilePatterns = [
        '.env',
        'docker-compose.yml',
        'access_token',
        'secrets',
        'config.json',
        'credentials.json',
        'api_key',
        'private_key',
        'secret',
        'password',
        'token',
        'key',
        'auth',
        'login',
        'config.yml',
        'settings.json',
        'secrets.json',
        'env.example',
        '.env.local',
        '.env.production',
      ];

      // Risky files
      const riskyFiles = [] as string[];
      try {
        const contents = await client.get(`/repos/${repoName}/contents?ref=${defaultBranch}`);
        for (const file of contents.data) {
          if (riskyFilePatterns.some(pattern => file.name.includes(pattern))) {
            riskyFiles.push(file.name);
          }
        }
      } catch (err: any) {
        const status = err.response?.status || 'unknown';
        const message = err.response?.data?.message || 'No message';
        const url = err.config?.url || 'unknown URL';
        logger.error('github', `API error (${status}) for ${url} → ${message}`);
      }
      return riskyFiles;
    } catch (error) {
      logger.error('github', `Error getting risky files for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async getContributorCount(client: AxiosInstance, repoName: string): Promise<number> {
    try {
      const contribs = await client.get(`/repos/${repoName}/contributors?per_page=2`);
      return contribs.data.length;
    } catch (err: any) {
      const status = err.response?.status || 'unknown';
      const message = err.response?.data?.message || 'No message';
      const url = err.config?.url || 'unknown URL';
      logger.error('github', `API error (${status}) for ${url} → ${message}`);
      return 1;
    }
  }

  private async hasReadme(client: AxiosInstance, repoName: string): Promise<boolean> {
    try {
      // Fetch repo metadata for default_branch
      let defaultBranch = 'main';
      try {
        const meta = await client.get(`/repos/${repoName}`);
        defaultBranch = meta.data.default_branch || 'main';
      } catch (err: any) {
        const status = err.response?.status || 'unknown';
        const message = err.response?.data?.message || 'No message';
        const url = err.config?.url || 'unknown URL';
        logger.error('github', `API error (${status}) for ${url} → ${message}`);
      }

      try {
        await client.get(`/repos/${repoName}/readme?ref=${defaultBranch}`);
        return true;
      } catch (err: any) {
        const status = err.response?.status || 'unknown';
        const message = err.response?.data?.message || 'No message';
        const url = err.config?.url || 'unknown URL';
        if (status === 404) {
          // README not found - log as info, not error
          logger.info('github', `README not found for ${repoName} (404)`);
          return false;
        } else {
          logger.error('github', `API error (${status}) for ${url} → ${message}`);
          return false;
        }
      }
    } catch (error) {
      logger.error('github', `Error checking README for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return true; // Default to true to avoid false positives
    }
  }

  private async getCommitCount(client: AxiosInstance, repoName: string): Promise<number> {
    try {
      // Fetch repo metadata for default_branch
      let defaultBranch = 'main';
      try {
        const meta = await client.get(`/repos/${repoName}`);
        defaultBranch = meta.data.default_branch || 'main';
      } catch (err: any) {
        const status = err.response?.status || 'unknown';
        const message = err.response?.data?.message || 'No message';
        const url = err.config?.url || 'unknown URL';
        logger.error('github', `API error (${status}) for ${url} → ${message}`);
      }

      try {
        const commits = await client.get(`/repos/${repoName}/commits?sha=${defaultBranch}&per_page=1`);
        const link = commits.headers['link'];
        const totalCommits = link ? parseInt(link.match(/&page=(\d+)>; rel="last"/)?.[1] || '1', 10) : 1;
        return totalCommits;
      } catch (err: any) {
        const status = err.response?.status || 'unknown';
        const message = err.response?.data?.message || 'No message';
        const url = err.config?.url || 'unknown URL';
        logger.error('github', `API error (${status}) for ${url} → ${message}`);
        return 10;
      }
    } catch (error) {
      logger.error('github', `Error getting commit count for ${repoName}: ${error instanceof Error ? error.message : String(error)}`);
      return 10;
    }
  }
}

export const githubGraphQLService = new GitHubGraphQLService(); 