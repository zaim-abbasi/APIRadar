export interface ProviderStats {
  provider: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ThreatInsightsData {
  topProviders: ProviderStats[];
  totalExposures: number;
  todayExposures: number;
  weeklyGrowth: number;
  exposuresFoundToday: number;
}