"use client";

import React, { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Radar,
  Lock,
  Shield,
  Trophy,
  ShieldAlert,
  Crosshair,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LiveScanTerminal } from "@/components/home/LiveScanTerminal";
import useSWR from "swr";
import { Skeleton } from "boneyard-js/react";

const PROVIDERS = [
  "OPENAI",
  "ANTHROPIC",
  "GOOGLE",
  "GROQ",
  "XAI",
  "CEREBRAS",
  "OPENROUTER",
] as const;

const TICKER_REPOS = [
  "uddugteam/oracle-flare",
  "ErnieAtLYD/retrospect-ai",
  "ConardLi/easy-learn-ai",
  "elQ3ndie/EtherStaking",
  "idootop/open-xiaoai",
  "TRocket-Labs/vectorlint",
  "codeme-ne/die-produktivitaets-werkstatt",
  "Tortilok/cyberimmune-systems_tpp",
  "yannart/docker-compose-demo",
  "manikcloud/manik-flask-chatgpt",
  "Divyanshu9822/ml-ops-holiday-package-prediction",
  "relkli/opentelemetry-demo",
  "Vizzuality/heco-invest",
  "wangwwwwjy/chatgpt-on-wechat-2",
  "sumitrevolt/flash-loan-arbitrage-system",
  "InsightReactions/TinyLlama",
  "chromewillow/ai-credential-manager",
  "gounthar/jdk8-removal",
  "Siluvai1997/k8s-cicd-infrastructure",
  "borjaOrtizLlamas/TFM_DEVOPS_MASTER_AWS",
] as const;

const providerColors: Record<string, string> = {
  OPENAI: "text-emerald-500",
  ANTHROPIC: "text-amber-600",
  GOOGLE: "text-blue-500",
  OPENROUTER: "text-fuchsia-500",
  GROQ: "text-orange-600",
  XAI: "text-slate-400",
  CEREBRAS: "text-violet-500",
};

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Offline");
    return r.json();
  });

const PIPELINE_STEPS = [
  { icon: Radar, label: "MONITOR" },
  { icon: Crosshair, label: "INTERCEPT" },
  { icon: Lock, label: "VAULT" },
  { icon: Activity, label: "INTEL" },
] as const;

const WorkflowPipeline = React.memo(() => (
  <div className="flex items-center justify-center lg:justify-start overflow-x-auto no-scrollbar pb-1 sm:pb-0">
    <div className="flex items-center gap-1.5 sm:gap-2 px-1 whitespace-nowrap">
      {PIPELINE_STEPS.map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && (
            <ArrowRight
              className="h-3.5 w-3.5 text-muted-foreground/50"
              aria-hidden="true"
            />
          )}
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-2",
              i === PIPELINE_STEPS.length - 1
                ? "bg-coral text-primary-foreground border-coral/80 animate-pulse"
                : "bg-card border-border",
            )}
          >
            <step.icon
              className={cn(
                "h-4 w-4",
                i === PIPELINE_STEPS.length - 1
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-xs font-bold tracking-widest",
                i === PIPELINE_STEPS.length - 1
                  ? "text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>
));

WorkflowPipeline.displayName = "WorkflowPipeline";

const tickerEntries = TICKER_REPOS.map((repo, i) => {
  const [owner, name] = repo.split("/");
  const provider = PROVIDERS[i % PROVIDERS.length];
  const mins = Math.floor(Math.random() * 58) + 1;
  return {
    provider,
    repo: name || "unknown",
    owner: owner || "unknown",
    timeAgo: `${mins}m ago`,
  };
});

const HeroTicker = React.memo(() => {
  const {
    data: leaks,
    error,
    isLoading,
  } = useSWR<any[]>("/api/leaks", fetcher, {
    refreshInterval: 15000,
    dedupingInterval: 5000,
    revalidateOnFocus: true,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  const [displayLeaks, setDisplayLeaks] = React.useState<any[]>([]);
  const [status, setStatus] = React.useState<"NOMINAL" | "DEGRADED">("NOMINAL");

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = localStorage.getItem("apiradar_recent_activity");
    if (cached) {
      try {
        setDisplayLeaks(JSON.parse(cached));
      } catch (e) {}
    }
  }, []);

  React.useEffect(() => {
    if (Array.isArray(leaks) && leaks.length > 0 && !error) {
      setDisplayLeaks(leaks);
      localStorage.setItem(
        "apiradar_recent_activity",
        JSON.stringify(leaks.slice(0, 15)),
      );
      setStatus("NOMINAL");
    } else if (error || (!isLoading && (!leaks || leaks.length === 0))) {
      setStatus("DEGRADED");
    }
  }, [leaks, isLoading, error]);

  const renderItems = (keyPrefix: string) => (
    <>
      <span className="flex items-center gap-1.5 border-x border-coral/10 px-3 sm:px-4">
        <span className="text-[8px] sm:text-[9px] text-coral/60 uppercase font-bold tracking-widest">
          System Status
        </span>
        <span
          className={cn(
            "font-mono font-bold tracking-wider transition-all duration-500",
            status === "NOMINAL"
              ? "text-emerald-500 animate-pulse"
              : "text-amber-500",
          )}
        >
          {status}
        </span>
      </span>
      {(status === "NOMINAL" && displayLeaks.length > 0
        ? displayLeaks.slice(0, 15).map((l) => ({
            provider: l.provider,
            repo: l.repoUrl ? l.repoUrl.split("/").pop() : "unknown",
            timeAgo: formatDistanceToNow(new Date(l.leakDetectedAt), {
              addSuffix: true,
            }),
            isAlert: true,
          }))
        : [
            { text: "SIGNAL_LOST", meta: "DATA_STREAM_INTERRUPTED" },
            { text: "RECOVERY_MODE", meta: "ATTEMPTING_UPLINK_RESTORE" },
            { text: "STATUS_DEGRADED", meta: "LATENCY_THRESHOLD_EXCEEDED" },
          ].map((m) => ({
            provider: m.text,
            repo: m.meta,
            timeAgo: "RETRYING...",
            isAlert: false,
          }))
      ).map((e, i) => (
        <React.Fragment key={`${keyPrefix}-${i}`}>
          <span className="inline-block sm:hover:text-foreground transition-colors cursor-default">
            <span
              className={cn(
                "font-bold",
                e.isAlert ? "text-coral/80" : "text-amber-500/80",
              )}
            >
              [{e.isAlert ? "ALERT" : "SYSTEM"}]
            </span>{" "}
            <span
              className={cn(
                "font-bold",
                e.isAlert
                  ? providerColors[e.provider.toLowerCase()] || "text-coral"
                  : "text-amber-500",
              )}
            >
              {e.provider.toUpperCase()}
            </span>{" "}
            {e.isAlert ? "leak in" : "//"}{" "}
            <span className="text-muted-foreground/90 italic">{e.repo}</span> ·{" "}
            <span className="opacity-70 text-[9px] sm:text-[10px]">
              {e.timeAgo}
            </span>
          </span>
          <span className="inline-block px-4 sm:px-6 text-coral/30 flex-shrink-0 font-light">
            //
          </span>
        </React.Fragment>
      ))}
    </>
  );

  return (
    <Skeleton name="hero-ticker" loading={false}>
      <div className="w-full bg-coral/5 border border-coral/20 rounded-md p-1 sm:p-1.5 flex items-center gap-2 sm:gap-3 overflow-hidden relative h-[32px] sm:h-[38px] group mt-4 sm:mt-6">
        <div className="z-20 flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 bg-background border border-coral/30 rounded-full shadow-[0_0_10px_rgba(255,114,94,0.1)] shrink-0 ml-0.5 sm:ml-1 backdrop-blur-md">
          <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-coral animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-bold font-mono uppercase tracking-[0.2em] text-coral drop-shadow-sm translate-y-[0.5px]">
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
          <div className="animate-marquee sm:group-hover:[animation-play-state:paused] whitespace-nowrap flex items-center text-[10px] sm:text-xs text-muted-foreground font-mono h-full gap-4 sm:gap-6">
            {renderItems("mq1")}
          </div>
          <div
            className="animate-marquee sm:group-hover:[animation-play-state:paused] whitespace-nowrap flex items-center text-[10px] sm:text-xs text-muted-foreground font-mono absolute left-0 top-0 h-full gap-4 sm:gap-6"
            style={{ "--marquee-start": "100%" } as React.CSSProperties}
          >
            {renderItems("mq2")}
          </div>
        </div>
      </div>
    </Skeleton>
  );
});

HeroTicker.displayName = "HeroTicker";

const useRobustCounter = (realCount: number) => {
  const [total, setTotal] = React.useState(32533);
  const [isStale, setIsStale] = React.useState(false);
  const lastSyncRef = React.useRef(Date.now());

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = localStorage.getItem("apiradar_total_v3");
    if (cached) setTotal(parseInt(cached, 10));
  }, []);

  React.useEffect(() => {
    if (realCount > 0) {
      setTotal(realCount);
      if (typeof window !== "undefined") {
        localStorage.setItem("apiradar_total_v3", realCount.toString());
      }
      lastSyncRef.current = Date.now();
      setIsStale(false);
    } else {
      const interval = setInterval(() => {
        const diff = (Date.now() - lastSyncRef.current) / (1000 * 60 * 60);
        if (diff > 0.5) setIsStale(true);

        setTotal((prev) => {
          const jitter = Math.floor(Math.random() * 5) - 2; // Stochastic jitter: -2 to 2
          return prev + (Math.random() > 0.9 ? 1 : 0) + jitter;
        });
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [realCount]);

  return { total, isStale };
};

const StatCounter = React.memo(() => {
  const { data, isLoading } = useSWR<{ provider: string; count: number }[]>(
    "/api/stats/providers",
    fetcher,
    {
      refreshInterval: 60000,
      dedupingInterval: 55000,
      revalidateOnFocus: false,
    },
  );

  const totalReal = React.useMemo(
    () => (Array.isArray(data) ? data.reduce((sum, s) => sum + s.count, 0) : 0),
    [data],
  );

  const { total, isStale } = useRobustCounter(totalReal);

  return (
    <Skeleton name="hero-stats" loading={isLoading}>
      <div className="animate-fade-in-up">
        <span
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors duration-500",
            isStale
              ? "border-amber-500/40 bg-amber-500/5"
              : "border-coral/30 bg-coral/5",
          )}
        >
          <ShieldAlert
            className={cn(
              "h-4 w-4",
              isStale ? "text-amber-500 animate-pulse" : "text-coral",
            )}
          />
          <span
            className={cn(
              "text-sm sm:text-base font-mono tabular-nums font-bold tracking-tight transition-colors duration-500",
              isStale ? "text-amber-500" : "text-coral",
            )}
          >
            {total.toLocaleString()}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground font-medium">
            Active Threats Neutralized
          </span>
        </span>
      </div>
    </Skeleton>
  );
});

StatCounter.displayName = "StatCounter";

export const HeroSection = React.memo(() => {
  return (
    <section className="relative min-h-[100svh] flex items-center py-8 md:py-12 lg:py-0 lg:min-h-screen overflow-hidden pb-safe">
      <div className="container mx-auto relative z-10 w-full px-4">
        <div className="w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-16 w-full items-center">
            <div className="flex flex-col justify-center space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-9 text-center lg:text-left">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 sm:mb-4 lg:pr-8">
                  <StatCounter />
                  <div className="flex justify-center lg:justify-end shrink-0">
                    <Skeleton name="ph-badge" loading={false}>
                      <a
                        href="https://www.producthunt.com/products/api-radar?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-api-radar-2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-md border border-border/50 bg-card/20 backdrop-blur-sm sm:hover:border-coral/40 transition-colors group"
                      >
                        <Trophy className="h-4 w-4 text-coral shrink-0" />
                        <span className="text-sm sm:text-base font-bold tracking-tight text-foreground/90">
                          Featured On
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium whitespace-nowrap">
                          Product Hunt
                        </span>
                        <ArrowUpRight className="ml-1 h-3.5 w-3.5 text-muted-foreground/40 sm:group-hover:text-coral transition-colors" />
                      </a>
                    </Skeleton>
                  </div>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold leading-[1.1] tracking-tight mb-3 sm:mb-4">
                  <span className="text-foreground">Global </span>
                  <span className="text-coral">API Leak</span>
                  <br className="hidden sm:block" />
                  <span className="text-foreground"> Intelligence</span>
                </h1>
              </div>

              <div className="space-y-2.5 sm:space-y-2.5">
                <p className="text-[13px] sm:text-sm md:text-base lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Monitor public GitHub repositories in real-time to track
                  exactly when, where, and how often API keys are exposed.
                </p>
              </div>

              <div className="hidden sm:block pt-2 sm:pt-4">
                <WorkflowPipeline />
              </div>
            </div>

            <div className="flex flex-col justify-center mt-2 sm:mt-6 lg:mt-0">
              <Skeleton name="live-scan-active" loading={false}>
                <LiveScanTerminal />
              </Skeleton>
              <div className="mt-4 flex flex-col gap-4 sm:gap-4.5">
                <Link
                  href="/explore"
                  prefetch={true}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md group h-10 sm:h-12 px-5 sm:px-8 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-95",
                    "bg-coral text-primary-foreground border-coral/80 sm:hover:brightness-90 sm:hover:border-coral/70",
                  )}
                >
                  <span className="flex items-center justify-center w-full gap-2">
                    <Shield
                      className="h-4 w-4"
                      strokeWidth={2.6}
                      aria-hidden="true"
                      focusable="false"
                    />
                    Access Leak Intelligence
                  </span>
                </Link>
                <Link
                  href="/leaderboard"
                  prefetch={true}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-md group h-10 sm:h-12 px-5 sm:px-8 text-sm sm:text-base font-semibold transition-all duration-200 ease-in-out w-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-95",
                    "bg-card/50 backdrop-blur-sm text-foreground border-border sm:hover:brightness-90 sm:hover:border-coral/70",
                  )}
                >
                  <span className="flex items-center justify-center w-full gap-2">
                    <Trophy
                      className="h-4 w-4 text-coral"
                      strokeWidth={2.6}
                      aria-hidden="true"
                      focusable="false"
                    />
                    Check Global Standings
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <HeroTicker />
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = "HeroSection";
