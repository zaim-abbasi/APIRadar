import React, { Suspense } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { LeaderboardData, ProviderStats } from '@/types';
import type { Metadata } from 'next';
import LeaderboardClient from "@/components/leaderboard/leaderboard-client";
import { headers, cookies } from 'next/headers';

// Page-specific metadata
export const metadata: Metadata = {
  title: 'Security Leaderboard - APIRadar',
  description: '',
  openGraph: {
    title: 'Security Leaderboard - APIRadar',
    description: '',
    url: 'https://apiradar.live/leaderboard',
  },
  twitter: {
    title: 'Security Leaderboard - APIRadar',
    description: '',
  },
};

// Types for better type safety
// interface StatsData {
//   totalLeaks: number;
//   todayLeaks: number;
// }

// Production-grade data fetching with proper error handling
async function fetchLeaderboardData(): Promise<LeaderboardData> {
  // Use Next.js API route as proxy (similar to leaks)
  // Get the base URL for server-side requests
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  // If not set, try to get from headers (works in server components)
  if (!baseUrl) {
    try {
      const headersList = await headers();
      const host = headersList.get('host');
      const protocol = headersList.get('x-forwarded-proto') || 'http';
      baseUrl = `${protocol}://${host}`;
    } catch {
      // Fallback to localhost if headers() fails
      baseUrl = 'http://localhost:3000';
    }
  }
  
  try {
    const url = new URL(`${baseUrl}/api/leaderboard`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // No caching - page is fully dynamic, always fetch fresh data
      cache: 'no-store'
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: await response.text().catch(() => 'Unable to parse error') };
      }
      
      const errorMessage = errorData.error || `API route error: ${response.status} ${response.statusText}`;
      const errorDetails = errorData.details ? ` Details: ${errorData.details}` : '';
      
      throw new Error(`${errorMessage}${errorDetails}`);
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
      totalReposScanned: Number(data.totalReposScanned) || 0,
      totalLeaksFound: Number(data.totalLeaksFound) || 0,
      weeklyGrowth: Number(data.weeklyGrowth) || 0,
      leaksFoundToday: Number(data.leaksFoundToday) || 0,
    };
    
  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      baseUrl
    };
    
    console.error('Leaderboard data fetch failed:', errorDetails);

    // Return safe fallback data
    return {
      topProviders: [{ provider: 'unknown', count: 0, percentage: 0, trend: 'stable' }],
      totalReposScanned: 0,
      totalLeaksFound: 0,
      weeklyGrowth: 0,
      leaksFoundToday: 0,
    };
  }
}

// Clean component structure
const LeaderboardHeader = React.memo(() => (
  <div className="mb-6 text-center">
  </div>
));

LeaderboardHeader.displayName = 'LeaderboardHeader';

const StatsSection = React.memo(({ data }: { data: LeaderboardData }) => (
  <div className="mb-8">
    <StatsCards data={data} />
  </div>
));

StatsSection.displayName = 'StatsSection';

// Force dynamic rendering - leaderboard data changes frequently
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Always fetch fresh data

// Main page component
export default async function LeaderboardPage() {
  const leaderboardData = await fetchLeaderboardData();

  const statsData: LeaderboardData = leaderboardData;
  return <LeaderboardClient statsData={statsData} />;
}