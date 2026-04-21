"use client";
import React from "react";
import { StatsCards } from "@/components/threat-insights/stats-cards";
import { ActivityChart } from "@/components/threat-insights/activity-chart";
import { ProviderChart } from "@/components/threat-insights/provider-chart";
import { ExposureHoursChart } from "@/components/threat-insights/exposure-hours-chart";

export default function ThreatInsightsClient({ statsData }: { statsData: any }) {
  const hasData = statsData && statsData.totalReposScanned > 0;
  const isLoading = !hasData;

  return (
    <div className="container mx-auto px-2.5 sm:px-4 pt-4 sm:pt-9 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-2.5 sm:gap-4 items-stretch mb-2.5 sm:mb-4">
        <StatsCards data={statsData} isLoading={isLoading} />
        <ActivityChart />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-2.5 sm:gap-4 items-stretch">
        <ExposureHoursChart />
        <ProviderChart data={statsData.topProviders || []} isLoading={isLoading} />
      </div>
    </div>
  );
}