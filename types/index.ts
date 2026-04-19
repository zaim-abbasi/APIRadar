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
  originalUrl?: string | null;
}

export interface ProviderStats {
  provider: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ThreatInsightsData {
  topProviders: ProviderStats[];
  totalReposScanned: number;
  totalExposuresFound: number;
  weeklyGrowth: number;
  exposuresFoundToday: number;
}

export interface FilterOptions {
  provider: string;
}

export type { Provider } from '@/lib/constants';