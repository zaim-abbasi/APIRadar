import React, { Suspense } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { LeaderboardData, ProviderStats } from '@/types';
import type { Metadata } from 'next';

const ProviderChart = React.lazy(() => import('@/components/leaderboard/provider-chart').then(m => ({ default: m.ProviderChart })));

// Page-specific metadata
export const metadata: Metadata = {
  title: 'Security Leaderboard - API Radar',
  description: 'Explore real-time API key leak trends. Discover which providers are most public and gain insights with our comprehensive analytics.',
  openGraph: {
    title: 'Security Leaderboard - API Radar',
    description: 'Explore real-time API key leak trends. Discover which providers are most public and gain insights with our comprehensive analytics.',
    url: 'https://apiradar.live/leaderboard',
  },
  twitter: {
    title: 'Security Leaderboard - API Radar',
    description: 'Explore real-time API key leak trends. Discover which providers are most public and gain insights with our comprehensive analytics.',
  },
};

// Types for better type safety
interface StatsData {
  totalLeaks: number;
  todayLeaks: number;
  repositoryCutoff: string | null;
}

interface ChartData {
  topProviders: ProviderStats[];
  totalLeaks: number;
}

// Production-grade data fetching with proper error handling
async function fetchLeaderboardData(): Promise<LeaderboardData> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  
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
    
    // Map topProviders to include 'trend' (default to 'stable' if missing)
    const topProviders: ProviderStats[] = Array.isArray(data.topProviders)
      ? data.topProviders.map((p: any) => ({
          provider: p.provider,
          count: p.count,
          percentage: p.percentage,
          trend: p.trend || 'stable',
        }))
      : [];

    return {
      topProviders,
      totalLeaks: Number(data.totalReposScanned) || 0, // map to totalReposScanned
      todayLeaks: Number(data.totalLeaksFound) || 0,  // map to totalLeaksFound
      weeklyGrowth: Number(data.weeklyGrowth) || 0,
      repositoryCutoff: data.repositoryAgeCutoff || null, // map to repositoryAgeCutoff
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
      topProviders: [{ provider: 'unknown', count: 0, percentage: 0, trend: 'stable' }],
      totalLeaks: 0,
      todayLeaks: 0,
      weeklyGrowth: 0,
      repositoryCutoff: null,
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
      Explore real-time API key leak trends. Discover which providers are most public and gain insights with our comprehensive analytics.
    </p>
  </div>
));

LeaderboardHeader.displayName = 'LeaderboardHeader';

const StatsSection = React.memo(({ data }: { data: LeaderboardData }) => (
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
  const statsData: LeaderboardData = leaderboardData;
  const chartData = {
    topProviders: leaderboardData.topProviders.map((p) => ({
      ...p,
      trend: p.trend || 'stable',
    })),
    totalLeaks: leaderboardData.totalLeaks
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Structured Data for Leaderboard */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://apiradar.live/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Leaderboard",
                "item": "https://apiradar.live/leaderboard"
              }
            ]
          })
        }}
      />
      
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