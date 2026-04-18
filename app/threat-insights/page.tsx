import React, { Suspense } from 'react';
import { StatsCards } from '@/components/threat-insights/stats-cards';
import { ThreatInsightsData, ProviderStats } from '@/types';
import type { Metadata } from 'next';
import ThreatInsightsClient from "@/components/threat-insights/threat-insights-client";
import { headers } from 'next/headers';

// Page-specific metadata
export const metadata: Metadata = {
  title: 'Threat Insights - APIRadar',
  description: 'Global statistics and industry trends on API key exposure events.',
  openGraph: {
    title: 'Threat Insights - APIRadar',
    description: 'Global statistics and industry trends on API key exposure events.',
    url: 'https://apiradar.live/threat-insights',
  },
  twitter: {
    title: 'Threat Insights - APIRadar',
    description: 'Global statistics and industry trends on API key exposure events.',
  },
};

// Production-grade data fetching with proper error handling
async function fetchThreatInsightsData(): Promise<ThreatInsightsData> {
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
    const url = new URL(`${baseUrl}/api/threat-insights`);

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
      totalExposuresFound: Number(data.totalLeaksFound) || 0,
      weeklyGrowth: Number(data.weeklyGrowth) || 0,
      exposuresFoundToday: Number(data.leaksFoundToday) || 0,
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
    
    console.error('Threat Insights data fetch failed:', errorDetails);

    // Return safe fallback data
    return {
      topProviders: [{ provider: 'unknown', count: 0, percentage: 0, trend: 'stable' }],
      totalReposScanned: 0,
      totalExposuresFound: 0,
      weeklyGrowth: 0,
      exposuresFoundToday: 0,
    };
  }
}

// Clean component structure
const ThreatInsightsHeader = React.memo(() => (
  <div className="mb-6 text-center">
  </div>
));

ThreatInsightsHeader.displayName = 'ThreatInsightsHeader';

const StatsSection = React.memo(({ data }: { data: ThreatInsightsData }) => (
  <div className="mb-8">
    <StatsCards data={data} />
  </div>
));

StatsSection.displayName = 'StatsSection';

// Force dynamic rendering - insights data changes frequently
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Always fetch fresh data

// Main page component
export default async function ThreatInsightsPage() {
  const insightsData = await fetchThreatInsightsData();

  const statsData: ThreatInsightsData = insightsData;
  return <ThreatInsightsClient statsData={statsData} />;
}