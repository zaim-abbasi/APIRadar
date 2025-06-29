"use client";

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { mockLeaderboard } from '@/lib/mock-data';
import { fetchTotalReposScanned, fetchTotalLeaksFound } from '@/lib/api';

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

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both data points in parallel
        const [reposResponse, leaksResponse] = await Promise.all([
          fetchTotalReposScanned(),
          fetchTotalLeaksFound()
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
      } catch (error) {
        setTotalReposScanned(null);
        setTotalLeaksFound(null);
      }
    };

    fetchData();
  }, []);

  // Memoize the data to prevent unnecessary re-renders
  const leaderboardData = useMemo(() => mockLeaderboard, []);

  // Memoize the stats data with real data from backend
  const statsData = useMemo(() => {
    const data = {
      totalLeaks: totalReposScanned, // Total Repos Scanned
      todayLeaks: totalLeaksFound, // Total Leaks Found
      weeklyGrowth: leaderboardData.weeklyGrowth
    };
    return data;
  }, [totalReposScanned, totalLeaksFound, leaderboardData.weeklyGrowth]);

  // Memoize the chart data
  const chartData = useMemo(() => ({
    topProviders: leaderboardData.topProviders,
    totalLeaks: totalLeaksFound ?? leaderboardData.totalLeaks
  }), [leaderboardData.topProviders, totalLeaksFound, leaderboardData.totalLeaks]);

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