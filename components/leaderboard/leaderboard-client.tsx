"use client";
import React from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/components/home/use-is-mobile";
import { StatsCards } from "@/components/leaderboard/stats-cards";

const LeaderboardSectionMobile = dynamic(() => import("@/components/leaderboard/leaderboard-section-mobile").then(m => m.LeaderboardSectionMobile), { ssr: false, loading: () => null });

const ProviderChart = dynamic(() => import("@/components/leaderboard/provider-chart").then(m => m.ProviderChart), { ssr: false, loading: () => null });

const LeaderboardHeader = React.memo(() => (
  <div className="mb-6 text-center">
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