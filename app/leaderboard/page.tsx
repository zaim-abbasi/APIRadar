"use client";

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { fetchLeaderboardData } from '@/lib/api';

const ProviderChart = React.lazy(() => import('@/components/leaderboard/provider-chart').then(m => ({ default: m.ProviderChart })));

// Memoized Header component
const LeaderboardHeader = React.memo(() => (
  <div className="mb-4 animate-fade-in-up opacity-0 animate-delay-100">
    <h1 className="text-2xl md:text-3xl font-bold mb-2">
      Security Leaderboard
    </h1>
    <p className="text-sm md:text-base text-muted-foreground">
      Analytics and trends of API key leaks across different providers.
    </p>
  </div>
));

LeaderboardHeader.displayName = 'LeaderboardHeader';

// Memoized Stats Section
const StatsSection = React.memo(({ data }: { data: any }) => (
  <div className="animate-fade-in-up opacity-0 animate-delay-150">
    <StatsCards data={data} />
  </div>
));

StatsSection.displayName = 'StatsSection';

// Memoized Charts Section with optimized loading
const ChartsSection = React.memo(({ data }: { data: any }) => {
  const chartData = useMemo(() => data.topProviders, [data.topProviders]);
  
  return (
    <div className="animate-fade-in-up opacity-0 animate-delay-300 flex-1 min-h-0">
      <Suspense fallback={
        <div className="h-full w-full flex items-center justify-center">
          <div className="space-y-4 w-full max-w-md">
            <div className="h-8 skeleton rounded"></div>
            <div className="h-64 skeleton rounded"></div>
          </div>
        </div>
      }>
        <ProviderChart data={chartData} totalLeaks={data.totalLeaks} />
      </Suspense>
    </div>
  );
});

ChartsSection.displayName = 'ChartsSection';

const LeaderboardPage = React.memo(() => {
  const [leaderboardData, setLeaderboardData] = useState<{
    totalReposScanned: number | null;
    totalLeaksFound: number | null;
    repositoryAgeCutoff: string | null;
    topProviders: any[] | null;
  }>({
    totalReposScanned: null,
    totalLeaksFound: null,
    repositoryAgeCutoff: null,
    topProviders: null
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Fetch all leaderboard data from single endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchLeaderboardData();

        if (response.data) {
          setLeaderboardData({
            totalReposScanned: response.data.totalReposScanned,
            totalLeaksFound: response.data.totalLeaksFound,
            repositoryAgeCutoff: response.data.repositoryAgeCutoff,
            topProviders: response.data.topProviders
          });
        } else {
          // Set fallback data instead of null for better UX
          setLeaderboardData({
            totalReposScanned: 0,
            totalLeaksFound: 0,
            repositoryAgeCutoff: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
            topProviders: []
          });
        }
      } catch (error) {
        // Set fallback data on error for better UX
        setLeaderboardData({
          totalReposScanned: 0,
          totalLeaksFound: 0,
          repositoryAgeCutoff: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          topProviders: []
        });
      } finally {
        setIsDataLoaded(true);
      }
    };

    fetchData();
  }, []);

  // Memoize the stats data with real data from backend
  const statsData = useMemo(() => {
    const data = {
      totalLeaks: leaderboardData.totalReposScanned, // Total Repos Scanned
      todayLeaks: leaderboardData.totalLeaksFound, // Total Leaks Found
      repositoryCutoff: leaderboardData.repositoryAgeCutoff // Repository Cutoff Date
    };
    return data;
  }, [leaderboardData.totalReposScanned, leaderboardData.totalLeaksFound, leaderboardData.repositoryAgeCutoff]);

  // Memoize the chart data with real top providers data
  const chartData = useMemo(() => {
    return {
      topProviders: leaderboardData.topProviders || [],
      totalLeaks: leaderboardData.totalLeaksFound || 0
    };
  }, [leaderboardData.topProviders, leaderboardData.totalLeaksFound]);

  return (
    <div className="h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4 flex flex-col h-full">
        {/* Header */}
        <LeaderboardHeader />

        {/* Stats Cards - Always show, with skeleton loading */}
        <StatsSection data={statsData} />

        {/* Charts - Show skeleton while loading */}
        <ChartsSection data={chartData} />
      </div>
    </div>
  );
});

LeaderboardPage.displayName = 'LeaderboardPage';

export default LeaderboardPage;