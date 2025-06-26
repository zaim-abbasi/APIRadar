export interface LeakedKey {
  id: string;
  redacted_key: string;
  provider: string;
  repo_url: string;
  file_path?: string;
  timestamp: string;
  repo_created_at?: string;
  leak_detected_at: string;
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