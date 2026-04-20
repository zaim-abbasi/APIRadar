"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  const [data, setData] = useState<ActivityPoint[]>(PLACEHOLDER_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setIsLoading(true);
    fetch(`/api/threat-insights/activity`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed: ${res.status}`);
        }
        return res.json();
      })
      .then((json: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(json)) {
          setData(PLACEHOLDER_DATA);
          setIsLoading(false);
          return;
        }
        const normalized: ActivityPoint[] = json
          .map((row: any) => ({
            date: typeof row?.date === "string" ? row.date : "",
            count: typeof row?.count === "number" ? row.count : 0,
          }))
          .filter((r) => r.date);
        setData(normalized.length ? normalized : PLACEHOLDER_DATA);
        setIsLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load activity");
        setData(PLACEHOLDER_DATA);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(() => data, [data]);

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
            <div className="absolute right-0 top-0 text-xs text-muted-foreground/70">
              Loading…
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
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
