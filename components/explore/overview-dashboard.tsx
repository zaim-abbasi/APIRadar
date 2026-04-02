"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ShieldAlert,
  Zap,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Key,
  FileCode2,
  FolderGit2,
} from "lucide-react";
import { LeakedKey } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { parseGitHubRepoUrl } from "@/lib/utils";
import { fetchProviderStats } from "@/lib/api";

const safeFormatDate = (dateStr: string | Date | undefined) => {
  if (!dateStr) return "Unknown time";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown time";
  return formatDistanceToNow(d, { addSuffix: true });
};

// Color mapping for providers
const providerColors: Record<string, string> = {
  openai: "text-emerald-500",
  anthropic: "text-amber-600",
  google: "text-blue-500",
  openrouter: "text-fuchsia-500",
  groq: "text-orange-600",
  xai: "text-slate-500",
  cerebras: "text-violet-600",
};

export function OverviewDashboard({
  leaks,
  isLoading,
  onSignIn,
  plan,
}: {
  leaks: LeakedKey[];
  isLoading: boolean;
  onSignIn?: () => void;
  plan: "free" | "pro";
}) {
  const [providerStats, setProviderStats] = useState<
    { provider: string; count: number; todayCount: number }[]
  >([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      const res = await fetchProviderStats();
      if (res.data) {
        setProviderStats(res.data);
      }
      setStatsLoading(false);
    };
    loadStats();
  }, []);

  return (
    <div className="flex flex-col space-y-6 w-full animate-fade-in-up">
      {/* Live Ticker */}
      <div className="w-full bg-coral/5 border border-coral/20 rounded-md p-1.5 sm:p-2 flex items-center gap-2 sm:gap-3 overflow-hidden relative h-[36px] sm:h-[42px]">
        <div className="z-20 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-background border border-coral/20 rounded-full shadow-sm shrink-0 ml-0.5 sm:ml-1">
          <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-coral animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-coral drop-shadow-sm">
            Live Intel
          </span>
        </div>
        <div
          className="flex-1 overflow-hidden relative flex h-full"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)",
          }}
        >
          <div className="animate-marquee whitespace-nowrap flex items-center text-[10px] sm:text-xs text-muted-foreground font-mono h-full">
            {leaks.slice(0, 15).map((l, i) => (
              <React.Fragment key={`mq1-${i}`}>
                <span className="inline-block">
                  [ALERT] {l.provider.toUpperCase()} leak detected in{" "}
                  {l.repoUrl
                    ? parseGitHubRepoUrl(l.repoUrl)?.repo || "Unknown Repo"
                    : "Unknown Repo"}{" "}
                  · {safeFormatDate(l.leakDetectedAt)}
                </span>
                <span className="inline-block px-4 sm:px-6 text-coral/50 flex-shrink-0">
                  •
                </span>
              </React.Fragment>
            ))}
          </div>
          <div
            className="animate-marquee whitespace-nowrap flex items-center text-[10px] sm:text-xs text-muted-foreground font-mono absolute left-0 top-0 h-full"
            style={{ "--marquee-start": "100%" } as React.CSSProperties}
          >
            {leaks.slice(0, 15).map((l, i) => (
              <React.Fragment key={`mq2-${i}`}>
                <span className="inline-block">
                  [ALERT] {l.provider.toUpperCase()} leak detected in{" "}
                  {l.repoUrl
                    ? parseGitHubRepoUrl(l.repoUrl)?.repo || "Unknown Repo"
                    : "Unknown Repo"}{" "}
                  · {safeFormatDate(l.leakDetectedAt)}
                </span>
                <span className="inline-block px-4 sm:px-6 text-coral/50 flex-shrink-0">
                  •
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes marquee {
          0% { transform: translateX(var(--marquee-start, 0%)); }
          100% { transform: translateX(calc(-100% + var(--marquee-start, 0%))); }
        }
        .animate-marquee {
          animation: marquee 50s linear infinite;
        }
      `,
        }}
      />

      {/* Main Layout: Dynamic Provider Stat Grid & Recent Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Center: Dynamic Provider Stats */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {statsLoading ? (
              <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground text-sm">
                Loading statistics...
              </div>
            ) : (
              providerStats
                .map((stat, i) => {
                  const color = providerColors[stat.provider] || "text-coral";
                  return (
                    <Card
                      key={i}
                      className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden group hover:border-border transition-colors h-full flex flex-col justify-center"
                    >
                      <CardContent className="p-3 sm:p-5 relative">
                        <div className="flex justify-between items-start mb-1 sm:mb-2">
                          <div className="space-y-0.5 sm:space-y-1 z-10">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {stat.provider}
                            </p>
                            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                              {stat.count}
                            </h3>
                            {stat.todayCount > 0 ? (
                              <span className="flex items-center gap-1 mt-0.5 sm:mt-1 font-semibold text-[10px] sm:text-xs text-emerald-500">
                                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />{" "}
                                +{stat.todayCount} today
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 mt-0.5 sm:mt-1 font-semibold text-[10px] sm:text-xs text-muted-foreground/40">
                                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />{" "}
                                +0 today
                              </span>
                            )}
                          </div>
                          <Zap
                            className={`h-4 w-4 sm:h-5 sm:w-5 ${color} z-10`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
                .concat(
                  <Card
                    key="total-today"
                    className="border-emerald-500/20 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-emerald-500/50 transition-colors h-full flex flex-col justify-center shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]"
                  >
                    <CardContent className="p-3 sm:p-5 relative">
                      <div className="flex justify-between items-start mb-1 sm:mb-2">
                        <div className="space-y-0.5 sm:space-y-1 z-10">
                          <p className="text-[10px] sm:text-xs font-medium text-emerald-500 uppercase tracking-wider">
                            Total Today
                          </p>
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                            {providerStats.reduce(
                              (sum, stat) => sum + (stat.todayCount || 0),
                              0,
                            )}
                          </h3>
                        </div>
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 z-10" />
                      </div>
                    </CardContent>
                  </Card>,
                )
            )}
          </div>
        </div>

        {/* Right: Vertical Recent Feed */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm h-full max-h-[500px] flex flex-col">
            <div className="p-3 sm:p-4 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card/60 backdrop-blur-xl z-20">
              <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
                Recent Activity
              </h3>
              <Badge variant="secondary" className="text-[10px] uppercase">
                Live
              </Badge>
            </div>
            <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading feed...
                </div>
              ) : leaks.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No recent activity detected.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border/20">
                  {leaks.slice(0, 20).map((leak, idx) => (
                    <a
                      key={idx}
                      href={
                        leak.repoUrl && leak.filePath
                          ? `${leak.repoUrl}/blob/HEAD/${leak.filePath}`
                          : leak.repoUrl || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 sm:px-4 sm:py-2.5 hover:bg-white/5 transition-colors group cursor-pointer flex items-center gap-2 sm:gap-3 block"
                    >
                      <div
                        className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full flex-shrink-0 shadow-sm animate-pulse ${!leak.isLocked ? "bg-coral shadow-coral/50" : "bg-blue-500 shadow-blue-500/50"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 sm:gap-2">
                          <span className="text-[11px] sm:text-xs font-bold text-foreground truncate">
                            {leak.provider.toUpperCase()}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap">
                            {safeFormatDate(leak.leakDetectedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground/80 font-mono truncate mt-0.5">
                          <FolderGit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 opacity-70" />
                          <span className="truncate">
                            {leak.repoUrl
                              ? parseGitHubRepoUrl(leak.repoUrl)?.repo ||
                                "Unknown Repo"
                              : "Unknown Repo"}
                          </span>
                          {leak.filePath && (
                            <>
                              <span className="opacity-40 flex-shrink-0 text-[8px] sm:text-[10px]">
                                /
                              </span>
                              <FileCode2 className="h-2 w-2 sm:h-2.5 sm:w-2.5 flex-shrink-0 opacity-60" />
                              <span className="truncate opacity-80">
                                {leak.filePath.split("/").pop()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
