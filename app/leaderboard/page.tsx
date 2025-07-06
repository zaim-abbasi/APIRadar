"use client";

import React, { Suspense, useMemo, useState, useEffect } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { fetchLeaderboardData } from '@/lib/api';

const ProviderChart = React.lazy(() => import('@/components/leaderboard/provider-chart').then(m => ({ default: m.ProviderChart })));

// Memoized Header component
const LeaderboardHeader = React.memo(() => (
  <div className="mb-3 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-1 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight inline-block relative">
      Security Leaderboard
      <span className="block mx-auto mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-primary to-foreground opacity-60" />
    </h1>
    <p className="text-base text-muted-foreground max-w-xl mx-auto leading-snug mt-1">
      Analytics and trends of API key leaks across different providers.
    </p>
  </div>
));

LeaderboardHeader.displayName = 'LeaderboardHeader';

// Memoized Stats Section
const StatsSection = React.memo(({ data }: { data: any }) => (
  <div>
    <StatsCards data={data} />
  </div>
));

StatsSection.displayName = 'StatsSection';

// Memoized Charts Section with optimized loading
const ChartsSection = React.memo(({ data }: { data: any }) => {
  const chartData = useMemo(() => data.topProviders, [data.topProviders]);
  
  return (
    <div className="flex-1 min-h-0">
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

// Cache helper functions
const CACHE_KEY = 'leaderboard_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.warn('Failed to read cached leaderboard data:', error);
  }
  return null;
};

const setCachedData = (data: any) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to cache leaderboard data:', error);
  }
};

const LeaderboardPage = React.memo(() => {
  const [leaderboardData, setLeaderboardData] = useState<{
    totalReposScanned: number | null;
    totalLeaksFound: number | null;
    repositoryAgeCutoff: string | null;
    topProviders: any[] | null;
    todayLeaks: number | null;
  }>({
    totalReposScanned: null,
    totalLeaksFound: null,
    repositoryAgeCutoff: null,
    topProviders: null,
    todayLeaks: null
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set client flag after mount to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load cached data after client mount
  useEffect(() => {
    if (!isClient) return;
    
    const cached = getCachedData();
    if (cached) {
      setLeaderboardData({
        totalReposScanned: cached.totalReposScanned,
        totalLeaksFound: cached.totalLeaksFound,
        repositoryAgeCutoff: cached.repositoryAgeCutoff,
        topProviders: cached.topProviders,
        todayLeaks: cached.todayLeaks
      });
    }
  }, [isClient]);

  // Fetch all leaderboard data from single endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchLeaderboardData();

        if (response.data) {
          const newData = {
            totalReposScanned: response.data.totalReposScanned,
            totalLeaksFound: response.data.totalLeaksFound,
            repositoryAgeCutoff: response.data.repositoryAgeCutoff,
            topProviders: response.data.topProviders,
            todayLeaks: response.data.todayLeaks
          };
          
          setLeaderboardData(newData);
          setCachedData(newData); // Cache the fresh data
        } else {
          // Set fallback data instead of null for better UX
          setLeaderboardData({
            totalReposScanned: null,
            totalLeaksFound: null,
            repositoryAgeCutoff: null, // Don't set fallback date - only use MongoDB data
            topProviders: [],
            todayLeaks: null
          });
        }
      } catch (error) {
        // Set fallback data on error for better UX
        setLeaderboardData({
          totalReposScanned: null,
          totalLeaksFound: null,
          repositoryAgeCutoff: null, // Don't set fallback date - only use MongoDB data
          topProviders: [],
          todayLeaks: null
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
      leaksFoundToday: leaderboardData.todayLeaks, // Leaks Found Today
      repositoryCutoff: leaderboardData.repositoryAgeCutoff // Repository Cutoff Date
    };
    return data;
  }, [leaderboardData.totalReposScanned, leaderboardData.totalLeaksFound, leaderboardData.repositoryAgeCutoff, leaderboardData.todayLeaks]);

  // Memoize the chart data with real top providers data
  const chartData = useMemo(() => {
    return {
      topProviders: leaderboardData.topProviders || [],
      totalLeaks: leaderboardData.totalLeaksFound || 0
    };
  }, [leaderboardData.topProviders, leaderboardData.totalLeaksFound]);

  return (
    <div className="h-screen flex flex-col flex-1">
      <div className="container mx-auto px-4 py-4 flex flex-col h-full flex-1">
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