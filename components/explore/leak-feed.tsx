"use client";

import React, { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CircleCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  FolderGit2,
  FileCode2,
  Lock,
  Chrome,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { LeakedKey, Provider } from "@/types";
import { cn } from "@/lib/utils";
import { INTEL_PROVIDERS } from "@/lib/constants";



interface LeakFeedProps {
  leaks: (LeakedKey | null)[];
  total?: number;
  isLoading?: boolean;
  selectedProvider: Provider;
  plan: "free" | "pro";
  onSignIn?: () => void;
  isOffline?: boolean;
}

const formatTimeAgo = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true })
    .replace(/less than a minute/gi, "1 min")
    .replace(/about\s+/gi, "")
    .replace(/\b1\s+minute?s?\b/gi, "1 min")
    .replace(/\b(\d+)\s+minutess?\b/gi, "$1 mins")
    .replace(/\b1\s+hour?s?\b/gi, "1 hr")
    .replace(/\b(\d+)\s+hourss?\b/gi, "$1 hrs")
    .replace(/a minute/gi, "1 min")
    .replace(/an hour/gi, "1 hr")
    .replace(/\bhours\b/gi, "hrs")
    .replace(/\bminutes\b/gi, "mins");
};

// --- Loading Skeleton ---
const FeedSkeleton = React.memo(() => (
  <div className="flex flex-col divide-y divide-border/20">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={`skel-${i}`}
        className="px-4 py-3.5 sm:px-5 sm:py-4 animate-pulse"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="h-2 w-2 rounded-lg bg-muted/60 mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-16 bg-muted/60 rounded-md" />
                <div className="h-5 w-44 sm:w-64 bg-muted/60 rounded-md" />
              </div>
              <div className="h-4 w-20 bg-muted/60 rounded-md hidden sm:block" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 bg-muted/60 rounded-md" />
              <div className="h-3.5 w-28 bg-muted/60 rounded-md" />
              <div className="h-3.5 w-20 bg-muted/60 rounded-md hidden sm:block" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
));
FeedSkeleton.displayName = "FeedSkeleton";

// --- Empty State ---
const FeedEmptyState = React.memo(
  ({
    selectedProvider,
    isOffline,
  }: {
    selectedProvider: Provider;
    isOffline?: boolean;
  }) => {
    const isAll = selectedProvider === "all";
    const providerLabel = isAll ? "SYSTEM" : selectedProvider.toUpperCase();
    const [nextRetry, setNextRetry] = React.useState(30.0);

    React.useEffect(() => {
      let timer: NodeJS.Timeout;
      if (isOffline) {
        timer = setInterval(() => {
          setNextRetry((prev) => (prev <= 0.1 ? 30.0 : prev - 0.1));
        }, 100);
      }
      return () => clearInterval(timer);
    }, [isOffline]);

    return (
      <div className="text-center py-16 px-4 animate-fade-in transition-all duration-300">
        <div className="space-y-4 max-w-md mx-auto">
          {isOffline ? (
            <>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                  System Offline
                </h3>
                <div className="flex items-center justify-center gap-2">

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
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                  Sensors are clear
                </h3>
                <div className="flex items-center justify-center gap-2">

                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 font-mono">
                    [STATUS: NOMINAL] // NO_EXPOSURES_DETECTED_FOR_{providerLabel}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
                The scanning engine reports zero active exposures for the current
                filters. All monitored{" "}
                {isAll
                  ? "provider repositories"
                  : `${providerLabel} assets`}{" "}
                are currently secured and verified.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
);
FeedEmptyState.displayName = "FeedEmptyState";

// --- Working Keys Coming Soon State ---
const WorkingKeysComingSoon = React.memo(
  ({ onSignIn }: { onSignIn?: () => void }) => (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in-up">
      <div className="space-y-5 max-w-sm mx-auto text-center">
        <div className="mx-auto w-12 h-12 rounded-lg bg-coral/10 border border-coral/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-coral" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Live Verification
          </h3>
          <div className="flex items-center justify-center gap-2">

            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500/80 font-mono">
              Coming Soon
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
          APIRadar will soon verify which exposed keys are still active and
          exploitable. Get notified the moment this feature goes live.
        </p>

        {onSignIn && (
          <button
            onClick={onSignIn}
            className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground bg-background border border-border transition-all duration-200 ease-in-out sm:hover:bg-muted/50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Sign in to get notified"
          >
            <Chrome className="h-4 w-4" />
            <span>Sign in to get notified</span>
          </button>
        )}
      </div>
    </div>
  )
);
WorkingKeysComingSoon.displayName = "WorkingKeysComingSoon";

// --- Single Feed Item ---
const FeedItem = React.memo(
  ({
    leak,
    index,
    onSignIn,
    isAuthenticated,
  }: {
    leak: LeakedKey;
    index: number;
    onSignIn?: () => void;
    isAuthenticated: boolean;
  }) => {
    const [copyState, setCopyState] = useState<"idle" | "copying" | "success">("idle");

    const handleCopyKey = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (copyState !== "idle") return;

      setCopyState("copying");
      try {
        const res = await fetch(`/api/leaks/${leak.id}/fullkey`);
        
        if (res.status === 429) {
          setCopyState("idle");
          toast.error("Rate limit exceeded. Please try again after a minute.");
          return;
        }

        if (!res.ok) throw new Error("Unauthorized or restricted");
        
        const data = await res.json();
        await navigator.clipboard.writeText(data.fullKey);
        
        setCopyState("success");
        toast.success("Credential details successfully copied to clipboard.");
        
        setTimeout(() => setCopyState("idle"), 2000);
      } catch (err) {
        setCopyState("idle");
        toast.error("Failed to recover full secret key");
      }
    };

    return (
      <div 
        className={cn(
          "block px-3.5 py-2 sm:px-5 sm:py-1.5 transition-colors duration-50 group/item animate-fade-in-up opacity-0 sm:hover:bg-white/[0.03]",
        )}
        style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
      >
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 flex-1 min-w-0">
            {/* Top Row (Mobile) / Left Content (Desktop) */}
            <div className="flex items-center justify-between sm:justify-start gap-3 flex-shrink-0 sm:w-[240px] lg:w-[260px]">
              {/* Redacted key */}
              <code className="text-[11px] sm:text-sm font-mono bg-muted/40 px-1 sm:px-2 py-0 rounded-md border border-border/40 text-foreground transition-colors duration-50 truncate min-w-0 tracking-tight">
                <span className="sm:hidden">
                  {leak.redactedKey.length > 20 && leak.redactedKey.includes('*')
                    ? `${leak.redactedKey.slice(0, 6)}${"*".repeat(8)}${leak.redactedKey.slice(-6)}`
                    : leak.redactedKey}
                </span>
                <span className="hidden sm:inline">{leak.redactedKey}</span>
              </code>

              {/* Mobile-only status tools */}
              <div className="flex sm:hidden items-center gap-2 flex-shrink-0">
                <div className={cn(
                  "flex items-center justify-center gap-1.5 px-1.5 py-0 rounded-md text-[9px] uppercase font-bold tracking-wider min-w-[65px] border",
                  index < 6 
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                    : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  <ShieldAlert className="h-3 w-3" />
                  <span>{index < 6 ? "RECENT" : "IDENTIFIED"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums flex items-center gap-1 font-medium">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTimeAgo(new Date(leak.leakDetectedAt)).replace(" ago", "")}
                </span>
              </div>
            </div>

            {/* Bottom Row (Mobile) / Middle Content (Desktop) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-5 text-[11px] sm:text-sm text-muted-foreground/80 min-w-0 flex-1">
              {/* Repository Column */}
              <div className="flex items-center gap-2 sm:w-[160px] lg:w-[190px] flex-shrink-0">
                <FolderGit2 className="h-3.5 w-3.5 flex-shrink-0 text-coral/80" />
                <span 
                  className={cn(
                    "text-coral/90 font-semibold truncate group-hover/item:text-coral transition-colors duration-50",
                    leak.originalUrl && "cursor-pointer group-hover/item:underline"
                  )}
                  onClick={(e) => {
                    if (leak.originalUrl) {
                      e.stopPropagation();
                      let baseUrl = leak.originalUrl;
                      if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                      let finalUrl = baseUrl;
                      if (leak.filePath && !baseUrl.includes('/blob/') && !baseUrl.includes('/tree/')) {
                         finalUrl = `${baseUrl}/blob/main/${leak.filePath}`;
                      }
                      if (!finalUrl.startsWith('http')) finalUrl = `https://${finalUrl}`;
                      window.open(finalUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  {leak.repoUrl || "***"}
                </span>
              </div>

              {/* Path Column (Aligned vertically) */}
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <span className="text-border flex-shrink-0 font-light opacity-40 hidden sm:inline">/</span>
                <FileCode2 className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
                <span className="truncate text-foreground/80 font-medium">
                  {leak.filePath || "***"}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop-only status tools */}
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0 sm:ml-auto">
            {isAuthenticated && index >= 6 && (
              <button
                onClick={handleCopyKey}
                disabled={copyState !== "idle"}
                className={cn(
                  "hidden sm:flex items-center justify-center h-6 w-6 rounded-md border border-border/50 bg-background/50 text-muted-foreground transition-all duration-200 hover:text-coral hover:border-coral/40 active:scale-90",
                  copyState === "success" && "text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:text-emerald-500 hover:border-emerald-500/30"
                )}
                title="Copy Full Key"
              >
                {copyState === "copying" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : copyState === "success" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            )}
            <div className={cn(
              "w-[95px] items-center justify-center gap-1.5 flex px-2 py-0 rounded-md text-[10px] uppercase font-bold tracking-widest flex-shrink-0 border",
              index < 6 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>{index < 6 ? "Recent" : "Identified"}</span>
            </div>
            <span className="text-border flex-shrink-0 text-muted-foreground/30">·</span>
            <span className="text-[13px] text-muted-foreground/70 whitespace-nowrap flex-shrink-0 tabular-nums font-medium inline-flex items-center gap-2 sm:w-[100px] justify-start">
              <Clock className="h-3.5 w-3.5 opacity-60" />
              {formatTimeAgo(new Date(leak.leakDetectedAt))}
            </span>
          </div>
        </div>
      </div>
    );
  }
);
FeedItem.displayName = "FeedItem";

// --- Main Feed Component ---
const LeakFeedComponent = React.memo(
  ({
    leaks,
    total = 0,
    isLoading,
    selectedProvider,
    plan,
    onSignIn,
    isOffline,
  }: LeakFeedProps) => {
    const [activeTab, setActiveTab] = useState<"finds" | "working">("finds");

    const validLeaks = useMemo(
      () => leaks.filter((leak) => leak !== null) as LeakedKey[],
      [leaks]
    );

    const isUnauthenticated = plan === "free";
    const isRestrictionReached = isUnauthenticated && validLeaks.length >= 8;
    const showSignInPrompt = isUnauthenticated;

    const activeDataProvider = validLeaks.length > 0 && selectedProvider !== 'all' 
      ? validLeaks[0].provider 
      : selectedProvider;
      
    const providerObj = INTEL_PROVIDERS.find(p => p.value === activeDataProvider);
    const providerDisplayName = activeDataProvider === 'all' 
      ? 'global'
      : (providerObj?.label || activeDataProvider);

    return (
      <div className="w-full">
        {/* Sub-tabs: Latest Finds / Working Keys */}
        <div className="mb-2 sm:mb-5">
          <div className="relative flex items-center p-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg gap-1 sm:gap-1.5 h-9 sm:h-11">
            <button
              onClick={() => setActiveTab("finds")}
              className={cn(
                "relative flex items-center justify-center py-1.5 px-2 sm:py-2 sm:px-3 text-[13px] sm:text-sm transition-all duration-200 z-10 flex-1 min-w-[fit-content] rounded-md active:scale-95 touch-manipulation font-medium h-full",
                activeTab === "finds"
                  ? "text-foreground font-semibold bg-background border border-border/50"
                  : "text-muted-foreground sm:hover:text-foreground sm:hover:bg-muted/50"
              )}
            >
              <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Recent Detections
              </span>
            </button>
            <button
              disabled
              className={cn(
                "relative flex items-center justify-center py-1.5 px-2 sm:py-2 sm:px-3 text-[13px] sm:text-sm transition-all duration-200 z-10 flex-1 min-w-[fit-content] rounded-md font-medium h-full cursor-not-allowed opacity-80",
                activeTab === "working"
                  ? "text-foreground font-semibold bg-background border border-border/50"
                  : "text-muted-foreground"
              )}
            >
              <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5 grayscale opacity-70">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Live Verification
                <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1 sm:px-1.5 py-0.5 ml-1 leading-none">
                  Soon
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Feed content */}
        {activeTab === "working" ? (
          <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col h-[380px] sm:h-[450px]">
             <WorkingKeysComingSoon onSignIn={onSignIn} />
          </Card>
        ) : (
          <Card 
            className={cn(
              "border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden flex flex-col",
              isUnauthenticated ? "h-fit" : "h-[380px] sm:h-[450px]"
            )}
          >
            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {isLoading && validLeaks.length === 0 ? (
                <FeedSkeleton />
              ) : (validLeaks.length === 0 || isOffline) ? (
                <FeedEmptyState
                  selectedProvider={selectedProvider}
                  isOffline={isOffline}
                />
              ) : (
                <>
                  <div className="flex flex-col divide-y divide-border/20">
                  {validLeaks.map((leak, index) => (
                    <FeedItem
                      key={leak.id || `feed-${index}`}
                      leak={leak}
                      index={index}
                      onSignIn={onSignIn}
                      isAuthenticated={!isUnauthenticated}
                    />
                  ))}
                </div>

                {/* Sign in prompt imitating a feed row */}
                {showSignInPrompt && onSignIn && (
                  <div 
                    onClick={onSignIn}
                    className="block px-3.5 py-2.5 sm:px-5 sm:py-2 sm:hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer group animate-fade-in-up border-t border-border/10"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Lock Icon */}
                      <div className="mt-1 sm:mt-0 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/40 transition-colors group-hover:text-coral/60" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {/* Content Section */}
                        <div className="flex flex-col flex-1 min-w-0 justify-center">
                          <p className="text-[11px] sm:text-[13px] text-foreground/80 font-medium leading-[1.5] sm:line-clamp-none">
                            <span className="font-bold text-foreground/90">[LOCKED]</span> Sign in to unmask repositories, reveal file paths, and enable one-click copying for all {total.toLocaleString()} {providerDisplayName} secrets.
                          </p>
                        </div>

                        {/* Action Section */}
                        <div className="flex-shrink-0 sm:ml-auto pt-1 sm:pt-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSignIn(); }}
                            className="w-full sm:w-auto flex h-9 sm:h-10 items-center justify-center gap-2 px-4 sm:px-6 text-[10px] sm:text-[11px] font-black text-coral uppercase tracking-[0.2em] rounded-md bg-coral/5 hover:bg-coral/10 transition-all duration-300 border border-coral/20 hover:border-coral/40 active:scale-95 whitespace-nowrap"
                          >
                            <span>Sign In for Access</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
          </Card>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.selectedProvider !== nextProps.selectedProvider) return false;
    if (prevProps.plan !== nextProps.plan) return false;
    if (prevProps.isOffline !== nextProps.isOffline) return false;
    if (prevProps.leaks.length !== nextProps.leaks.length) return false;

    const prevIds = new Set(
      prevProps.leaks
        .map((l) => l?.id)
        .filter((id): id is string => Boolean(id))
    );
    const nextIds = new Set(
      nextProps.leaks
        .map((l) => l?.id)
        .filter((id): id is string => Boolean(id))
    );
    if (prevIds.size !== nextIds.size) return false;
    for (const id of Array.from(prevIds)) {
      if (!nextIds.has(id)) return false;
    }

    return true;
  }
);

LeakFeedComponent.displayName = "LeakFeedComponent";

export const LeakFeed = LeakFeedComponent;
