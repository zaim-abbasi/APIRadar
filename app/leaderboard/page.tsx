import React, { Suspense } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';

const ProviderChart = React.lazy(() => import('@/components/leaderboard/provider-chart').then(m => ({ default: m.ProviderChart })));

// Types for better type safety
interface LeaderboardData {
  totalReposScanned: number;
  totalLeaksFound: number;
  repositoryAgeCutoff: string | null;
  topProviders: Array<{ provider: string; count: number; percentage: number }>;
  todayLeaks: number;
}

interface StatsData {
  totalLeaks: number;
  todayLeaks: number;
  repositoryCutoff: string | null;
}

interface ChartData {
  topProviders: Array<{ provider: string; count: number; percentage: number }>;
  totalLeaks: number;
}

// Production-grade data fetching with proper error handling
async function fetchLeaderboardData(): Promise<LeaderboardData> {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(`${backendUrl}/api/leaderboard-data`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'anonymous',
        'x-user-email': 'anonymous@example.com',
        'x-user-plan': 'free',
        'x-user-authenticated': 'false',
      },
      // Production caching - 5 minutes
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure received from backend');
    }

    return {
      totalReposScanned: Number(data.totalReposScanned) || 0,
      totalLeaksFound: Number(data.totalLeaksFound) || 0,
      repositoryAgeCutoff: data.repositoryAgeCutoff || null,
      topProviders: Array.isArray(data.topProviders) ? data.topProviders : [],
      todayLeaks: Number(data.todayLeaks) || 0
    };
    
  } catch (error) {
    // Log error for monitoring in production
    console.error('Leaderboard data fetch failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      backendUrl
    });

    // Return safe fallback data
    return {
      totalReposScanned: 0,
      totalLeaksFound: 0,
      repositoryAgeCutoff: null,
      topProviders: [],
      todayLeaks: 0
    };
  }
}

// Clean component structure
const LeaderboardHeader = React.memo(() => (
  <div className="mb-6 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-2 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight">
      Security Leaderboard
    </h1>
    <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-3 rounded-full opacity-60" />
    <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
      Real-time analytics and trends of API key leaks across different providers. 
      Track security insights as they happen.
    </p>
  </div>
));

LeaderboardHeader.displayName = 'LeaderboardHeader';

const StatsSection = React.memo(({ data }: { data: StatsData }) => (
  <div className="mb-8">
    <StatsCards data={data} />
  </div>
));

StatsSection.displayName = 'StatsSection';

const ChartsSection = React.memo(({ data }: { data: ChartData }) => (
  <div className="flex-1 min-h-0">
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <div className="h-8 skeleton rounded animate-pulse"></div>
          <div className="h-64 skeleton rounded animate-pulse"></div>
        </div>
      </div>
    }>
      <ProviderChart data={data.topProviders} totalLeaks={data.totalLeaks} />
    </Suspense>
  </div>
));

ChartsSection.displayName = 'ChartsSection';

// Main page component
export default async function LeaderboardPage() {
  // Fetch data server-side
  const leaderboardData = await fetchLeaderboardData();

  // Prepare data with proper validation
  const statsData: StatsData = {
    totalLeaks: leaderboardData.totalReposScanned,
    todayLeaks: leaderboardData.totalLeaksFound,
    repositoryCutoff: leaderboardData.repositoryAgeCutoff
  };

  const chartData: ChartData = {
    topProviders: leaderboardData.topProviders,
    totalLeaks: leaderboardData.totalLeaksFound
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-6 flex flex-col flex-1">
        {/* Header */}
        <LeaderboardHeader />

        {/* Stats Cards */}
        <StatsSection data={statsData} />

        {/* Charts */}
        <ChartsSection data={chartData} />
      </div>
    </div>
  );
}