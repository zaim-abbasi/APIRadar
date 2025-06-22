"use client";

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { StatsCards } from '@/components/leaderboard/stats-cards';
import { mockLeaderboard } from '@/lib/mock-data';

const ProviderChart = React.lazy(() => import('@/components/leaderboard/provider-chart').then(m => ({ default: m.ProviderChart })));

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Security Leaderboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Analytics and trends of API key leaks across different providers.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards data={mockLeaderboard} />

      {/* Charts */}
      <Suspense fallback={<div className="h-96 w-full flex items-center justify-center text-sm text-muted-foreground">Loading chart data...</div>}>
        <ProviderChart data={mockLeaderboard.topProviders} />
      </Suspense>
    </div>
  );
}