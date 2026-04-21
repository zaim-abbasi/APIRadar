"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import useSWR from "swr";

type ActivityPoint = { date: string; count: number };

const PLACEHOLDER_DATA: ActivityPoint[] = Array.from({ length: 14 }, (_, i) => ({
  date: "",
  count: 0,
}));

const CustomTooltip = React.memo(function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border/50 px-3 py-2 rounded-lg text-left">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">{label}</div>
      <div className="text-xs text-muted-foreground font-medium">
        Exposures: <span className="font-bold text-foreground font-mono tabular-nums">{typeof value === "number" ? value.toLocaleString() : 0}</span>
      </div>
    </div>
  );
});

CustomTooltip.displayName = "CustomTooltip";

export const ActivityChart = React.memo(function ActivityChart({ className }: { className?: string }) {
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed: ${res.status}`);
    }
    const json = await res.json();
    if (!Array.isArray(json)) return PLACEHOLDER_DATA;
    const normalized: ActivityPoint[] = json
      .map((row: any) => ({
        date: typeof row?.date === "string" ? row.date : "",
        count: typeof row?.count === "number" ? row.count : 0,
      }))
      .filter((r) => r.date);
    return normalized.length ? normalized : PLACEHOLDER_DATA;
  };

  const { data: swrData, error, isLoading } = useSWR<ActivityPoint[]>('/api/threat-insights/activity', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const chartData = useMemo(() => swrData || PLACEHOLDER_DATA, [swrData]);

  return (
    <Card className={cn("border-border/50 bg-card/30 backdrop-blur-sm w-full h-full", className)}>
      <CardHeader className="pb-1 sm:pb-3 px-2.5 sm:px-5 pt-2 sm:pt-5">
        <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-amber-500 leading-none">
          Bi-weekly Exposure Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2.5 sm:px-5 pb-2.5 sm:pb-5">
        <div className="h-[130px] sm:h-[180px] w-full relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Failed to load activity
            </div>
          ) : null}
          {isLoading ? (
            <div className="absolute inset-0 z-10">
              <Skeleton className="w-full h-full bg-amber-500/5 rounded-md" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-2">
                  {[65, 45, 75, 55, 85, 40].map((h, i) => (
                    <Skeleton 
                      key={i} 
                      className="w-1.5 bg-amber-500/10 rounded-full" 
                      style={{ height: `${h}%` }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                width={40}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--border) / 0.2)" }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f59e0b" // Amber-500
                strokeWidth={2}
                fill="url(#activityFill)"
                animationDuration={400}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
