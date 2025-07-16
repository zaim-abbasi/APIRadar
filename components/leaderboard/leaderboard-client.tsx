"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/components/home/use-is-mobile";
import { StatsCards } from "@/components/leaderboard/stats-cards";

const LeaderboardSectionMobile = dynamic(() => import("@/components/leaderboard/leaderboard-section-mobile").then(m => m.LeaderboardSectionMobile), { ssr: false, loading: () => null });

const ProviderChart = dynamic(() => import("@/components/leaderboard/provider-chart").then(m => m.ProviderChart), { ssr: false, loading: () => null });

const LeaderboardHeader = React.memo(() => (
  <div className="mb-6 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-2 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight">
      Security Leaderboard
    </h1>
    <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-3 rounded-full opacity-60" />
    <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed hidden md:block">
      Explore real-time API key leak trends. Discover which providers are most public and gain insights with our comprehensive analytics.
    </p>
  </div>
));
LeaderboardHeader.displayName = 'LeaderboardHeader';

const StatsSection = React.memo(({ data }: { data: any }) => (
  <div className="mb-8">
    <StatsCards data={data} />
  </div>
));
StatsSection.displayName = 'StatsSection';

export default function LeaderboardClient({ statsData, chartData }: { statsData: any; chartData: any }) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <LeaderboardSectionMobile statsData={statsData} chartData={chartData} />;
  }
  return (
    <div className="container mx-auto px-4 py-6 flex flex-col flex-1">
      <LeaderboardHeader />
      <StatsSection data={statsData} />
      <div className="flex-1 min-h-0">
        <ProviderChart data={chartData.topProviders} totalLeaks={chartData.totalLeaks} />
      </div>
    </div>
  );
} 