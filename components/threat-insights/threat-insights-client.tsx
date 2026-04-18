"use client";
import React from "react";
import { StatsCards } from "@/components/threat-insights/stats-cards";
import { ActivityChart } from "@/components/threat-insights/activity-chart";
import { HallOfShame } from "@/components/threat-insights/hall-of-shame";

const ThreatInsightsHeader = React.memo(() => (
  <div className="mb-6 text-center">
  </div>
));
ThreatInsightsHeader.displayName = 'ThreatInsightsHeader';

export default function ThreatInsightsClient({ statsData }: { statsData: any }) {
  return (
    <div className="container mx-auto px-4 pt-3 pb-6 flex flex-col flex-1">
      <ThreatInsightsHeader />
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