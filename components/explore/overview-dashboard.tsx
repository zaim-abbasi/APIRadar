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
import { cn } from "@/lib/utils";
import { fetchProviderStats } from "@/lib/api";
import { PROVIDERS, TICKER_REPOS } from "@/components/home/hero-section";

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
  isOffline: isOfflineProp,
  onProviderChange,
}: {
  leaks: LeakedKey[];
  isLoading: boolean;
  onSignIn?: () => void;
  plan: "free" | "pro";
  isOffline?: boolean;
  onProviderChange?: (provider: any) => void;
}) {
  const [providerStats, setProviderStats] = useState<
    { provider: string; count: number; todayCount: number }[]
  >([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const [nextRetry, setNextRetry] = useState(30.0);

  const isOffline =
    isOfflineProp ?? (!statsLoading && providerStats.length === 0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOffline) {
      timer = setInterval(() => {
        setNextRetry((prev) => (prev <= 0.1 ? 30.0 : prev - 0.1));
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isOffline]);

  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetchProviderStats();
        if (res.data && res.data.length > 0) {
          setProviderStats(res.data);
        }
      } catch (e) {}
      setStatsLoading(false);
    };
    loadStats();
  }, []);

  return (
    <div className="flex flex-col space-y-6 w-full animate-fade-in-up">
      {/* Live Ticker */}
      <div className="w-full bg-coral/5 border border-coral/20 rounded-md p-1 sm:p-1.5 flex items-center gap-2 sm:gap-3 overflow-hidden relative h-[38px] sm:h-[44px] group">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,114,94,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(255,114,94,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)] opacity-20 pointer-events-none"></div>

        <div className="z-20 flex items-center gap-1.5 px-3 py-1 bg-background border border-coral/30 rounded-full shrink-0 ml-1 backdrop-blur-md">
          <Activity className="h-3.5 w-3.5 text-coral animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-coral">
            Live Intel
          </span>
        </div>

        <div
          className="flex-1 overflow-hidden relative flex h-full"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
          }}
        >
          <div className="animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap flex items-center text-[10px] sm:text-xs text-muted-foreground font-mono h-full gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 border-x border-coral/10">
              <span className="text-[8px] sm:text-[9px] text-coral/60 uppercase font-bold tracking-widest">
                System Status
              </span>
              <span className="font-mono font-bold tracking-wider text-emerald-500 animate-pulse">
                NOMINAL
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 border-r border-coral/10 pr-1.5 sm:pr-2">
              <span className="text-[8px] sm:text-[9px] text-coral/60 uppercase font-bold tracking-widest">
                Keys Secured
              </span>
              <span className="text-foreground font-bold italic">
                {providerStats
                  .reduce((sum, s) => sum + s.count, 0)
                  .toLocaleString()}
              </span>
            </div>

            {(leaks.length > 0
              ? leaks.slice(0, 20).map((l) => ({
                  provider: l.provider,
                  repo: l.repoUrl || "***",
                  date: l.leakDetectedAt,
                  isAlert: true,
                }))
              : Array.from({ length: 20 }).map((_, i) => {
                  const repo = TICKER_REPOS[i % TICKER_REPOS.length];
                  const [owner, name] = repo.split("/");
                  return {
                    provider: PROVIDERS[i % PROVIDERS.length],
                    repo: name || "unknown",
                    date: new Date(Date.now() - Math.random() * 3600000),
                    isAlert: false,
                  };
                })
            ).map((l, i) => (
              <React.Fragment key={`mq1-${i}`}>
                <span className="inline-block hover:text-foreground transition-colors cursor-default">
                  <span
                    className={cn(
                      "font-bold",
                      l.isAlert ? "text-coral/80" : "text-muted-foreground/60",
                    )}
                  >
                    [{l.isAlert ? "ALERT" : "SYSTEM"}]
                  </span>{" "}
                  <span
                    className={cn(
                      "font-bold",
                      l.isAlert
                        ? providerColors[l.provider] || "text-coral"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {l.provider.toUpperCase()}
                  </span>{" "}
                  {l.isAlert ? "leak in" : "//"}{" "}
                  <span className="text-muted-foreground/90 italic">
                    {l.repo}
                  </span>{" "}
                  ·{" "}
                  <span className="opacity-70 text-[9px] sm:text-[10px]">
                    {l.isAlert ? safeFormatDate(l.date) : "RETRYING..."}
                  </span>
                </span>
                <span className="inline-block px-2 sm:px-3 text-coral/30 flex-shrink-0 font-light">
                  //
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Duplicated for seamless loop */}
          <div
            className="animate-marquee group-hover:[animation-play-state:paused] whitespace-nowrap flex items-center text-[10px] sm:text-xs text-muted-foreground font-mono absolute left-0 top-0 h-full gap-2 sm:gap-3"
            style={{ "--marquee-start": "100%" } as React.CSSProperties}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 border-x border-coral/10">
              <span className="text-[8px] sm:text-[9px] text-coral/60 uppercase font-bold tracking-widest">
                System Status
              </span>
              <span className="font-mono font-bold tracking-wider text-emerald-500 animate-pulse">
                NOMINAL
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 border-r border-coral/10 pr-1.5 sm:pr-2">
              <span className="text-[8px] sm:text-[9px] text-coral/60 uppercase font-bold tracking-widest">
                Keys Secured
              </span>
              <span className="text-foreground font-bold italic">
                {providerStats
                  .reduce((sum, s) => sum + s.count, 0)
                  .toLocaleString()}
              </span>
            </div>

            {(leaks.length > 0
              ? leaks.slice(0, 20).map((l) => ({
                  provider: l.provider,
                  repo: l.repoUrl || "***",
                  date: l.leakDetectedAt,
                  isAlert: true,
                }))
              : Array.from({ length: 20 }).map((_, i) => {
                  const repo = TICKER_REPOS[i % TICKER_REPOS.length];
                  const [owner, name] = repo.split("/");
                  return {
                    provider: PROVIDERS[i % PROVIDERS.length],
                    repo: name || "unknown",
                    date: new Date(Date.now() - Math.random() * 3600000),
                    isAlert: false,
                  };
                })
            ).map((l, i) => (
              <React.Fragment key={`mq2-${i}`}>
                <span className="inline-block hover:text-foreground transition-colors cursor-default">
                  <span
                    className={cn(
                      "font-bold",
                      l.isAlert ? "text-coral/80" : "text-muted-foreground/60",
                    )}
                  >
                    [{l.isAlert ? "ALERT" : "SYSTEM"}]
                  </span>{" "}
                  <span
                    className={cn(
                      "font-bold",
                      l.isAlert
                        ? providerColors[l.provider] || "text-coral"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {l.provider.toUpperCase()}
                  </span>{" "}
                  {l.isAlert ? "leak in" : "//"}{" "}
                  <span className="text-muted-foreground/90 italic">
                    {l.repo}
                  </span>{" "}
                  ·{" "}
                  <span className="opacity-70 text-[9px] sm:text-[10px]">
                    {l.isAlert ? safeFormatDate(l.date) : "RETRYING..."}
                  </span>
                </span>
                <span className="inline-block px-2 sm:px-3 text-coral/30 flex-shrink-0 font-light">
                  //
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
          animation: marquee 45s linear infinite;
        }
      `,
        }}
      />

      {/* Main Layout: Dynamic Provider Stat Grid & Recent Sidebar */}
      {isOffline ? (
        <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-6 sm:p-10 text-center animate-fade-in">
          <div className="space-y-4 max-w-md mx-auto">
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                System Offline
              </h3>
              <div className="flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-red-500/80 font-mono">
                  [SIGNAL_LOST] // UPLINK_SEVERED_CORE_STREAM
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
              The intelligence bridge has been severed. Autonomous recovery
              protocols have been initiated to restore the live intel stream.
            </p>

            <div className="pt-2">
              <span className="text-[9px] font-bold font-mono tracking-widest text-coral/60 uppercase">
                AUTONOMOUS_RECOVERY: RETRYING_IN {nextRetry.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Center: Dynamic Provider Stats */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {statsLoading ? (
                <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground text-sm">
                  <Activity className="h-4 w-4 animate-spin mr-2" />
                  Loading statistics...
                </div>
              ) : (
                providerStats
                  .map((stat, i) => {
                    const color = providerColors[stat.provider] || "text-coral";
                    return (
                      <button
                        key={i}
                        onClick={() => onProviderChange?.(stat.provider)}
                        className="text-left h-full outline-none"
                      >
                        <Card
                          className={`border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden group hover:border-border transition-all duration-150 h-full flex flex-col justify-center relative ${stat.todayCount > 0 ? "shadow-[0_0_15px_rgba(255,114,94,0.03)]" : ""} cursor-pointer`}
                        >
                          <CardContent className="p-3 sm:p-5 relative">
                            <div className="flex justify-between items-start mb-1 sm:mb-2">
                              <div className="space-y-0.5 sm:space-y-1 z-10">
                                <p
                                  className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${color}`}
                                >
                                  {stat.provider}
                                </p>
                                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                                  {stat.count.toLocaleString()}
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
                            {/* Subtle background icon */}
                            <Zap
                              className={`absolute -bottom-2 -right-2 h-16 w-16 ${color} opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 pointer-events-none`}
                            />
                          </CardContent>
                        </Card>
                      </button>
                    );
                  })
                  .concat(
                    <button
                      key="total-today"
                      onClick={() => onProviderChange?.("openai")} // Take to feed if clicked (default to openai to force tab switch)
                      className="text-left h-full outline-none"
                    >
                      <Card className="border-coral/20 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-coral/60 transition-all duration-150 h-full flex flex-col justify-center cursor-pointer">
                        <CardContent className="p-3 sm:p-5 relative">
                          <div className="flex justify-between items-start mb-1 sm:mb-2">
                            <div className="space-y-0.5 sm:space-y-1 z-10">
                              <p className="text-[10px] sm:text-xs font-semibold text-coral uppercase tracking-wider">
                                Total Today
                              </p>
                              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                                {providerStats
                                  .reduce(
                                    (sum, stat) => sum + (stat.todayCount || 0),
                                    0,
                                  )
                                  .toLocaleString()}
                              </h3>
                            </div>
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-coral z-10" />
                          </div>
                        </CardContent>
                      </Card>
                    </button>,
                  )
              )}
            </div>
          </div>

          {/* Right: Vertical Recent Feed */}
          <div className="lg:col-span-1 lg:h-0 lg:min-h-full">
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden h-full flex flex-col">
              <div className="p-3 sm:p-4 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card/60 backdrop-blur-xl z-20">
                <h3 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
                  Recent Activity
                </h3>
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Live
                </Badge>
              </div>
              <div className="p-0 overflow-y-auto overscroll-contain flex-1 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Activity className="h-4 w-4 animate-spin mx-auto mb-2 opacity-50" />
                    Loading feed...
                  </div>
                ) : leaks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No recent activity detected.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-border/20">
                    {leaks.slice(0, 20).map((leak, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-2 sm:px-4 sm:py-2.5 hover:bg-white/5 transition-colors group flex items-center gap-2 sm:gap-3"
                      >
                        <div
                          className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full flex-shrink-0 shadow-sm animate-pulse ${!leak.isLocked ? "bg-coral shadow-coral/50" : "bg-blue-500 shadow-blue-500/50"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 sm:gap-2">
                            <span
                              className={`text-[11px] sm:text-xs font-bold truncate ${providerColors[leak.provider] || "text-foreground"}`}
                            >
                              {leak.provider.toUpperCase()}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground whitespace-nowrap">
                              {safeFormatDate(leak.leakDetectedAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-muted-foreground/80 font-mono truncate mt-0.5">
                            <FolderGit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 opacity-70" />
                            <span className="truncate">{leak.repoUrl || "***"}</span>
                            {leak.filePath && (
                              <>
                                <span className="opacity-40 flex-shrink-0 text-[8px] sm:text-[10px]">/</span>
                                <FileCode2 className="h-2 w-2 sm:h-2.5 sm:w-2.5 flex-shrink-0 opacity-60" />
                                <span className="truncate opacity-80">{leak.filePath}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
