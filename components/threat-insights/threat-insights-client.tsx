"use client";
import React from "react";
import { StatsCards } from "@/components/threat-insights/stats-cards";
import { ActivityChart } from "@/components/threat-insights/activity-chart";
import { ProviderChart } from "@/components/threat-insights/provider-chart";
import { ExposureHoursChart } from "@/components/threat-insights/exposure-hours-chart";
import useSWR from 'swr';
import { ThreatInsightsData } from "@/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch stats');
  const json = await res.json();
  
  // High-resilience mapping: handles both raw API and mapped proxy responses
  return {
    topProviders: (json.topProviders || []).map((p: any) => ({
      ...p,
      trend: p.trend || 'stable',
    })),
    totalReposScanned: Number(json.totalReposScanned) || 0,
    totalExposuresFound: Number(json.totalExposuresFound || json.totalLeaksFound) || 0,
    weeklyGrowth: Number(json.weeklyGrowth) || 0,
    exposuresFoundToday: Number(json.exposuresFoundToday || json.leaksFoundToday) || 0,
  };
};

export default function ThreatInsightsClient({ statsData: initialData }: { statsData: ThreatInsightsData }) {
  const backendUrl = typeof window !== 'undefined' ? (window.location.origin === 'http://localhost:3000' ? 'http://localhost:3001' : '') : '';
  const apiPath = '/api/threat-insights';
  const swrKey = backendUrl ? `${backendUrl}${apiPath}` : apiPath;

  const { data: statsData = initialData, isLoading, isValidating } = useSWR<ThreatInsightsData>(swrKey, fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const hasData = statsData && statsData.totalReposScanned > 0;
  const isInitialLoading = isLoading && !hasData;

  return (
    <div className="container mx-auto px-2.5 sm:px-4 pt-4 sm:pt-9 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-2.5 sm:gap-4 items-stretch mb-2.5 sm:mb-4">
        <StatsCards data={statsData} isLoading={isInitialLoading} />
        <ActivityChart />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-2.5 sm:gap-4 items-stretch">
        <ExposureHoursChart />
        <ProviderChart data={statsData.topProviders || []} isLoading={isInitialLoading} />
      </div>
    </div>
  );
}