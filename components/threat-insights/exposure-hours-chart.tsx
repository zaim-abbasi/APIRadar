"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HourBucket = { hour: number; count: number };
type ExposureHoursData = {
  hours: HourBucket[];
  peakWindow: { start: number; end: number };
  totalSamples: number;
};

const formatHourLabel = (hour: number): string => {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
};

const isInPeakWindow = (hour: number, start: number, end: number): boolean => {
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

const CustomTooltip = React.memo(({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card/95 backdrop-blur-sm border border-border/50 px-3 py-2 rounded-lg">
      <div className="text-xs font-medium text-foreground/90">
        {formatHourLabel(d.hour)} UTC
      </div>
      <div className="text-xs text-muted-foreground">
        Exposures:{" "}
        <span className="font-semibold text-foreground">
          {d.count.toLocaleString()}
        </span>
      </div>
    </div>
  );
});

CustomTooltip.displayName = "CustomTooltip";

export const ExposureHoursChart = React.memo(function ExposureHoursChart({
  className,
}: {
  className?: string;
}) {
  const [data, setData] = useState<ExposureHoursData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setIsLoading(true);
    fetch("/api/threat-insights/exposure-hours")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((json: ExposureHoursData) => {
        if (!cancelled) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(
    () =>
      data?.hours.map((h) => ({
        ...h,
        label: h.hour % 3 === 0 ? formatHourLabel(h.hour) : "",
        shortLabel: `${h.hour}`,
      })) ?? [],
    [data]
  );

  const insightText = useMemo(() => {
    if (!data || data.totalSamples === 0) return null;
    const { start, end } = data.peakWindow;
    return `Most exposures occur between ${formatHourLabel(start)} – ${formatHourLabel(end)} UTC`;
  }, [data]);

  return (
    <Card
      className={cn(
        "border-border/50 bg-card/30 backdrop-blur-sm w-full h-full",
        className
      )}
    >
      <CardHeader className="pb-1 sm:pb-3 px-2.5 sm:px-5 pt-2 sm:pt-5">
        <CardTitle className="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-amber-500 leading-none">
          Active Exposure Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-2.5 sm:px-5 pb-2.5 sm:pb-5">
        <div className="h-[130px] sm:h-[180px] w-full relative">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Failed to load exposure hours
            </div>
          ) : null}
          {isLoading ? (
            <div className="absolute right-0 top-0 text-xs text-muted-foreground/70">
              Loading…
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -10, bottom: 0 }}
              barCategoryGap="15%"
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeOpacity={0.2}
              />
              <XAxis
                dataKey="shortLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={40}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--border) / 0.15)" }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} animationDuration={1200}>
                {chartData.map((entry) => (
                  <Cell
                    key={`h-${entry.hour}`}
                    fill={
                      data && isInPeakWindow(entry.hour, data.peakWindow.start, data.peakWindow.end)
                        ? "#f59e0b"
                        : "hsl(var(--muted-foreground))"
                    }
                    fillOpacity={
                      data && isInPeakWindow(entry.hour, data.peakWindow.start, data.peakWindow.end)
                        ? 0.85
                        : 0.25
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {insightText && (
          <div className="text-center mt-2">
            <span className="text-[10px] sm:text-xs text-amber-500/80 font-semibold tracking-wide">
              {insightText}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
