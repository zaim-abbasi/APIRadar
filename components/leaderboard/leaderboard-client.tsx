"use client";
import React from "react";
import { StatsCards } from "@/components/leaderboard/stats-cards";
import { ActivityChart } from "@/components/leaderboard/activity-chart";
import { HallOfShame } from "@/components/leaderboard/hall-of-shame";


const LeaderboardHeader = React.memo(() => (
  <div className="mb-6 text-center">
  </div>
));
LeaderboardHeader.displayName = 'LeaderboardHeader';

export default function LeaderboardClient({ statsData }: { statsData: any }) {
  return (
    <div className="container mx-auto px-4 pt-3 pb-6 flex flex-col flex-1">
      <LeaderboardHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:gap-5 items-start">
        <div className="flex flex-col gap-4 lg:gap-5">
          <StatsCards data={statsData} />
          <HallOfShame />
        </div>
        <ActivityChart />
      </div>
    </div>
  );
} 