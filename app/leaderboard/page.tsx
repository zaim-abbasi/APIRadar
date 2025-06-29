"use client";

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { fetchTotalReposScanned, fetchTotalLeaksFound, fetchTopProviders } from '@/lib/api';

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
          <span className="text-muted-foreground text-sm">Loading chart data...</span>
        </div>
      }>
        <ProviderChart data={chartData} totalLeaks={data.totalLeaks} />
      </Suspense>
    </div>
  );
});

ChartsSection.displayName = 'ChartsSection';

const LeaderboardPage = React.memo(() => {
  const [totalReposScanned, setTotalReposScanned] = useState<number | null>(null);
  const [totalLeaksFound, setTotalLeaksFound] = useState<number | null>(null);
  const [topProviders, setTopProviders] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Fetch all data points in parallel
        const [reposResponse, leaksResponse, providersResponse] = await Promise.all([
          fetchTotalReposScanned(),
          fetchTotalLeaksFound(),
          fetchTopProviders()
        ]);

        if (reposResponse.data) {
          setTotalReposScanned(reposResponse.data.totalReposScanned);
        } else {
          setTotalReposScanned(null);
        }

        if (leaksResponse.data) {
          setTotalLeaksFound(leaksResponse.data.totalLeaksFound);
        } else {
          setTotalLeaksFound(null);
        }

        if (providersResponse.data) {
          setTopProviders(providersResponse.data.topProviders);
        } else {
          setTopProviders(null);
        }
      } catch (error) {
        setTotalReposScanned(null);
        setTotalLeaksFound(null);
        setTopProviders(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Memoize the stats data with real data from backend
  const statsData = useMemo(() => {
    const data = {
      totalLeaks: totalReposScanned, // Total Repos Scanned
      todayLeaks: totalLeaksFound, // Total Leaks Found
      weeklyGrowth: 0 // We'll keep this as 0 for now since we don't have this data from backend
    };
    return data;
  }, [totalReposScanned, totalLeaksFound]);

  // Memoize the chart data with real top providers data
  const chartData = useMemo(() => {
    return {
      topProviders: topProviders || [],
      totalLeaks: totalLeaksFound || 0
    };
  }, [topProviders, totalLeaksFound]);

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="container mx-auto px-4 py-4 flex flex-col h-full">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Security Leaderboard
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Analytics and trends of API key leaks across different providers.
            </p>
          </div>
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground text-sm">Loading data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="container mx-auto px-4 py-4 flex flex-col h-full">
        {/* Header */}
        <LeaderboardHeader />

        {/* Stats Cards */}
        <StatsSection data={statsData} />

        {/* Charts */}
        <ChartsSection data={chartData} />
      </div>
    </div>
  );
});

LeaderboardPage.displayName = 'LeaderboardPage';

export default LeaderboardPage;