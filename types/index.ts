export interface LeakedKey {
  id: string;
  redactedKey: string;
  provider: string;
  repoUrl: string | null;
  filePath?: string | null;
  leakDetectedAt: string;
  leakIntroducedAt: string;
  repoCreatedAt?: string | null;
  isLocked?: boolean;
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
  leaksFoundToday: number;
}

export interface FilterOptions {
  provider: string;
  timeRange: string;
  sortBy: string;
}

export type { Provider } from '@/lib/constants';