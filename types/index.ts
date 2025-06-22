export interface LeakedKey {
  id: string;
  redacted_key: string;
  provider: string;
  repo_name: string;
  repo_url: string;
  author_name: string;
  author_url: string;
  timestamp: string;
  file_path?: string;
  commit_hash?: string;
}

export interface ProviderStats {
  provider: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface LeaderboardData {
  topProviders: ProviderStats[];
  totalLeaks: number;
  todayLeaks: number;
  weeklyGrowth: number;
}

export interface FilterOptions {
  provider: string;
  timeRange: string;
  sortBy: string;
}

export type Provider = 
  | 'openai'
  | 'aws'
  | 'google-cloud'
  | 'stripe'
  | 'github'
  | 'discord'
  | 'twilio'
  | 'sendgrid'
  | 'all';