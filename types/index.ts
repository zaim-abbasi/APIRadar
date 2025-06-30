export interface LeakedKey {
  id: string;
  redactedKey: string;
  provider: string;
  repoUrl: string;
  filePath?: string;
  fullKey?: string;
  leakDetectedAt: string;
  leakIntroducedAt: string;
  repoCreatedAt?: string;
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
  repositoryCutoff: string | null;
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