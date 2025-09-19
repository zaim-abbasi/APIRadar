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
  // repositoryCutoff?: string | null; // commented out
} 