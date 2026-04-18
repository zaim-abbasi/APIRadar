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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { LeakedKey, Provider } from "@/types";
import { cn } from "@/lib/utils";
import { INTEL_PROVIDERS } from "@/lib/constants";

const ALLOWED_PROVIDERS = [...INTEL_PROVIDERS]
  .sort((a, b) => a.label.localeCompare(b.label))
  .slice(0, 2)
  .map((p) => p.value);

interface LeakFeedProps {
  leaks: (LeakedKey | null)[];
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
          <div className="h-2 w-2 rounded-full bg-muted/60 mt-2 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-16 bg-muted/60 rounded-sm" />
                <div className="h-5 w-44 sm:w-64 bg-muted/60 rounded-md" />
              </div>
              <div className="h-4 w-20 bg-muted/60 rounded hidden sm:block" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
              <div className="h-3.5 w-28 bg-muted/60 rounded" />
              <div className="h-3.5 w-20 bg-muted/60 rounded hidden sm:block" />
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
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
                  Sensors are clear
                </h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-500/80 font-mono">
                    [STATUS: NOMINAL] // NO_EXPOSURES_DETECTED_FOR_{providerLabel}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
                The scanning engine reports zero active leaks for the current
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
        <div className="mx-auto w-12 h-12 rounded-xl bg-coral/10 border border-coral/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-coral" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Working Keys
          </h3>
          <div className="flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500/80 font-mono">
              Coming Soon
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
          APIRadar will soon verify which leaked keys are still active and
          exploitable. Get notified the moment this feature goes live.
        </p>

        {onSignIn && (
          <button
            onClick={onSignIn}
            className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-foreground bg-background border border-border rounded-md shadow-sm px-4 py-2.5 transition-all duration-200 ease-in-out sm:hover:bg-muted/50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    return (
      <div
        className="block px-3.5 py-1.5 sm:px-5 sm:py-2 sm:hover:bg-white/[0.03] transition-colors duration-150 group/item animate-fade-in-up opacity-0"
        style={{ animationDelay: `${Math.min(index * 40, 300)}ms` }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Status dot */}
          <div className="flex-shrink-0">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full shadow-sm animate-pulse",
                !leak.isLocked
                  ? "bg-coral shadow-coral/40"
                  : "bg-blue-500 shadow-blue-500/40"
              )}
            />
          </div>

          {/* Main content */}
          {/* Main content - Single Horizontal Row */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
             
             {/* Left Section: Provider & Key */}
             <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0 lg:w-[260px] xl:w-[280px]">
                {/* Redacted key */}
                <code className="text-xs sm:text-sm font-mono bg-muted/40 px-2 sm:px-2.5 py-0.5 rounded-md border border-border/40 text-foreground transition-colors duration-150 truncate min-w-0 tracking-tight">
                  <span className="sm:hidden">
                    {leak.redactedKey.length > 20
                      ? `${leak.redactedKey.slice(0, 6)}${"*".repeat(8)}${leak.redactedKey.slice(-6)}`
                      : leak.redactedKey}
                  </span>
                  <span className="hidden sm:inline">{leak.redactedKey}</span>
                </code>
             </div>

             {/* Middle Section: Repo & File — values are pre-masked by the server */}
             <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground/80 min-w-0 flex-1">
                <FolderGit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-coral/80" />
                <span className="text-coral/90 font-semibold truncate group-hover/item:text-coral transition-colors duration-150">
                  {leak.repoUrl || "***"}
                </span>

                <>
                  <span className="text-border flex-shrink-0 font-light">/</span>
                  <FileCode2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 opacity-70" />
                  <span className="truncate text-foreground/80 font-medium">
                    {leak.filePath || "***"}
                  </span>
                </>
             </div>

             </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 lg:ml-auto">
             {/* Exposed Badge */}
             <div className="w-[75px] sm:w-[90px] items-center justify-center gap-1.5 flex bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest flex-shrink-0">
               <ShieldAlert className="h-3 w-3" />
               <span className="hidden sm:inline">Exposed</span>
               <span className="sm:hidden">Exp.</span>
             </div>

             <span className="text-border flex-shrink-0 text-muted-foreground/30">·</span>


             {/* Timestamp at the full end */}
             <span className="text-xs text-muted-foreground/70 whitespace-nowrap flex-shrink-0 tabular-nums font-medium inline-flex items-center gap-1.5 lg:w-[90px] justify-start">
               <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-60" />
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
    const isRestricted = isUnauthenticated && selectedProvider !== 'all' && !ALLOWED_PROVIDERS.includes(selectedProvider as any);
    const showSignInPrompt = isUnauthenticated;

    return (
      <div className="w-full">
        {/* Sub-tabs: Latest Finds / Working Keys */}
        <div className="mb-4 sm:mb-5">
          <div className="relative flex items-center p-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg gap-1.5 h-11">
            <button
              onClick={() => setActiveTab("finds")}
              className={cn(
                "relative flex items-center justify-center py-2 px-3 text-sm transition-all duration-200 z-10 flex-1 min-w-[fit-content] rounded-md active:scale-95 touch-manipulation font-medium h-full",
                activeTab === "finds"
                  ? "text-foreground font-semibold bg-background shadow-sm border border-border/50"
                  : "text-muted-foreground sm:hover:text-foreground sm:hover:bg-muted/50"
              )}
            >
              <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Latest Finds
              </span>
            </button>
            <button
              disabled
              className={cn(
                "relative flex items-center justify-center py-2 px-3 text-sm transition-all duration-200 z-10 flex-1 min-w-[fit-content] rounded-md font-medium h-full cursor-not-allowed opacity-80",
                activeTab === "working"
                  ? "text-foreground font-semibold bg-background shadow-sm border border-border/50"
                  : "text-muted-foreground"
              )}
            >
              <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5 grayscale opacity-70">
                <Sparkles className="h-3.5 w-3.5" />
                Working Keys
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 ml-1 leading-none">
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
              ) : (validLeaks.length === 0 || isOffline) && !isRestricted ? (
                <FeedEmptyState
                  selectedProvider={selectedProvider}
                  isOffline={isOffline}
                />
              ) : (
                <>
                  <div className="flex flex-col divide-y divide-border/20">
                  {!isRestricted && validLeaks.map((leak, index) => (
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
                    className="block px-3.5 py-1.5 sm:px-5 sm:py-2 sm:hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer group animate-fade-in-up border-t border-border/10"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Lock dot equivalent */}
                      <div className="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock h-4 w-4 text-muted-foreground/60 flex-shrink-0" style={{ minWidth: '16px' }}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                        {/* Left Section: Provider & Key Mimic */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0 lg:w-[260px] xl:w-[280px]">
                           <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wider border flex-shrink-0 bg-coral/10 text-coral border-coral/20">
                             RADAR_PRO
                           </span>
                           <code className="text-xs sm:text-sm font-mono bg-muted/40 px-2 sm:px-2.5 py-0.5 rounded-md border border-border/40 text-muted-foreground/60 transition-colors duration-150 truncate min-w-0 tracking-tight">
                             PAYLOAD_RESTRICTED
                           </code>
                        </div>

                        {/* Middle Section: Repo & File equivalent */}
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground/80 min-w-0 flex-1">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-coral/80 hidden sm:block"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
                           <span className="text-coral/90 font-semibold truncate group-hover:text-coral transition-colors duration-150">
                             {isRestricted ? "Access Restricted" : "Limit Reached"}
                           </span>
                           <span className="hidden lg:inline text-border flex-shrink-0 font-light">/</span>
                           <span className="truncate text-foreground/70 font-medium text-xs sm:text-sm">
                             Sign in with Google to unlock all leaks for free.
                           </span>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 lg:ml-auto">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSignIn(); }}
                            className="group relative flex h-8 sm:h-9 items-center justify-center gap-2 px-3.5 sm:px-4 text-[11px] font-bold text-coral uppercase tracking-[0.18em] rounded-md bg-coral/5 hover:bg-coral/10 transition-all duration-300 border border-coral/20 hover:border-coral/40 shadow-sm active:scale-95 pointer-events-auto whitespace-nowrap"
                            aria-label="Sign in"
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
