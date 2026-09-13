"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Eye, Calendar, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton";
import { ThreatInsightsData } from '@/types';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  data: ThreatInsightsData;
}

interface AnimatedCounterProps {
  value: number;
  isPercentage?: boolean;
}

interface AnimatedDateProps {
  dateString: string | null;
}

const AnimatedCounter = React.memo(({ value, isPercentage = false }: AnimatedCounterProps) => {
  const formattedValue = useMemo(() => {
    if (value === null || value === undefined) return "";
    if (isPercentage) return `${value.toFixed(1)}%`;
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }, [value, isPercentage]);

  if (value === null || value === undefined) {
    return (
      <span className="transition-all duration-600 ease-out">
        <span className="inline-block w-16 h-6 skeleton rounded-md"></span>
      </span>
    );
  }

  return (
    <span className="transition-all duration-600 ease-out">
      {formattedValue}
    </span>
  );
});

AnimatedCounter.displayName = 'AnimatedCounter';

const AnimatedDate = React.memo(({ dateString }: AnimatedDateProps) => {
  if (!dateString || isNaN(new Date(dateString).getTime())) return null;
  const displayDate = new Date(dateString).toISOString().slice(0, 10);

  return (
    <span className="transition-all duration-600 ease-out">{displayDate}</span>
  );
});

AnimatedDate.displayName = 'AnimatedDate';

function AnimatedDateCounterInline({ dateString }: { dateString: string | null }) {
  if (!dateString || isNaN(new Date(dateString).getTime())) return null;
  
  const date = new Date(dateString);
  const targetDay = date.getUTCDate();
  const targetYear = date.getUTCFullYear();
  const month = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ][date.getUTCMonth()];

  return (
    <span className="transition-all duration-600 ease-out font-mono tabular-nums tracking-tighter" suppressHydrationWarning>
      {`${targetDay} ${month}, ${targetYear}`}
    </span>
  );
}

const StatCardSkeleton = () => (
  <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden h-full flex flex-col justify-center">
    <CardContent className="p-1.5 sm:p-2.5 relative">
      <div className="space-y-2">
        <Skeleton className="h-2 w-20 sm:h-3 sm:w-24 bg-amber-500/10" />
        <Skeleton className="h-5 w-24 sm:h-8 sm:w-32 bg-muted/20" />
      </div>
    </CardContent>
  </Card>
);

const StatCard = React.memo(({ 
  stat, 
  index 
}: { 
  stat: any; 
  index: number; 
}) => {
  const IconComponent = useMemo(() => stat.icon, [stat.icon]);
  
  return (
    <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden group hover:border-border transition-all duration-200 h-full flex flex-col justify-center relative cursor-pointer">
      <CardContent className="p-1.5 sm:p-2.5 relative">
        <div className="flex justify-between items-start mb-0 sm:mb-0.5 text-left">
          <div className="space-y-0 z-10">
            <CardTitle className="text-[8px] sm:text-xs font-bold uppercase tracking-wide text-amber-500 leading-none border-none bg-transparent shadow-none p-0 mb-0.5">
              {stat.title}
            </CardTitle>
            <h3 className="text-sm sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums leading-tight">
              {typeof stat.value === 'number' && stat.value !== null ? (
                stat.isPercentage ? (
                  <span>{stat.value.toFixed(1)}%</span>
                ) : (
                  <span>{stat.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                )
              ) : stat.isDate && stat.value ? (
                <span>{new Date(stat.value).toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}</span>
              ) : (
                <span className="inline-block w-16 h-6 skeleton rounded-md"></span>
              )}
            </h3>
          </div>
        </div>
        
        {/* Subtle background icon watermark */}
        <IconComponent 
          className={cn("absolute -bottom-2 -right-2 h-16 w-16 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none", stat.color)} 
        />
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

function StatsErrorFallback() {
  return (
    <div className="text-center text-destructive my-4" role="alert">
      Failed to load statistics. Please try refreshing the page.
    </div>
  );
}

export const StatsCards = React.memo(function StatsCards({ data, isLoading }: StatsCardsProps & { isLoading?: boolean }) {
  const hasNoData = !data || (data.totalReposScanned === 0 && data.totalExposuresFound === 0);
  const isValidData = Boolean(data && typeof data === 'object');

  const safeTotalReposScanned = isValidData && typeof data?.totalReposScanned === 'number' && isFinite(data.totalReposScanned) ? data.totalReposScanned : 0;
  const safeTotalExposuresFound = isValidData && typeof data?.totalExposuresFound === 'number' && isFinite(data.totalExposuresFound) ? data.totalExposuresFound : 0;
  const safeExposuresFoundToday = isValidData && typeof data?.exposuresFoundToday === 'number' && isFinite(data.exposuresFoundToday) ? data.exposuresFoundToday : 0;

  const stats = useMemo(() => [
    {
      title: 'Exposures Identified Today',
      value: safeExposuresFoundToday,
      todayValue: safeExposuresFoundToday,
      icon: Eye,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      title: 'Total Exposures Identified',
      value: safeTotalExposuresFound,
      todayValue: safeExposuresFoundToday,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      title: 'Total Repositories Evaluated',
      value: safeTotalReposScanned,
      todayValue: safeExposuresFoundToday,
      icon: Search,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    }
  ], [safeExposuresFoundToday, safeTotalExposuresFound, safeTotalReposScanned]);

  if (isLoading && hasNoData) {
    return (
      <div id="stats-container" className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 h-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!isValidData) {
    return <StatsErrorFallback />;
  }

  return (
    <div id="stats-container" className="grid grid-cols-3 lg:grid-cols-1 gap-2.5 h-full">
      {stats.map((stat, index) => (
        <StatCard key={stat.title} stat={stat} index={index} />
      ))}
    </div>
  );
});

StatsCards.displayName = 'StatsCards';