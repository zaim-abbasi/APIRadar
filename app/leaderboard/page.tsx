"use client";

import React, { Suspense, useMemo } from 'react';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { mockLeaderboard } from '@/lib/mock-data';

const ProviderChart = React.lazy(() => import('@/components/leaderboard/provider-chart').then(m => ({ default: m.ProviderChart })));

// Memoized Header component
const LeaderboardHeader = React.memo(() => (
  <div className="mb-8 animate-fade-in-up opacity-0 animate-delay-100">
    <h1 className="text-3xl md:text-4xl font-bold mb-4">
      Security Leaderboard
    </h1>
    <p className="text-lg text-muted-foreground">
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

// Memoized Charts Section
const ChartsSection = React.memo(({ data }: { data: any }) => (
  <div className="animate-fade-in-up opacity-0 animate-delay-300">
    <Suspense fallback={
      <div className="h-96 w-full flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading chart data...</span>
      </div>
    }>
      <ProviderChart data={data.topProviders} />
    </Suspense>
  </div>
));

ChartsSection.displayName = 'ChartsSection';

const LeaderboardPage = React.memo(() => {
  // Memoize the data to prevent unnecessary re-renders
  const leaderboardData = useMemo(() => mockLeaderboard, []);

  return (
    <div className="container mx-auto px-2 sm:px-2 md:px-4 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <LeaderboardHeader />

      {/* Stats Cards */}
      <StatsSection data={leaderboardData} />

      {/* Charts */}
      <ChartsSection data={leaderboardData} />
    </div>
  );
});

LeaderboardPage.displayName = 'LeaderboardPage';

export default LeaderboardPage;