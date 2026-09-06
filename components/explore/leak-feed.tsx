"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
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
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeakedKey, Provider } from "@/types";
import { cn } from "@/lib/utils";
import { INTEL_PROVIDERS, PROVIDER_LABELS } from "@/lib/constants";



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
const FeedSkeleton = React.memo(({ isUnauthenticated }: { isUnauthenticated?: boolean }) => (
  <div className="flex flex-col divide-y divide-border/20">
    {Array.from({ length: isUnauthenticated ? 8 : 12 }).map((_, i) => (
      <div
        key={`skel-${i}`}
        className="block px-2 py-1 sm:px-5 sm:py-1.5 animate-pulse opacity-50"
      >
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
            {/* Main Content Row */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-1 sm:flex-initial sm:w-[240px] lg:w-[260px] min-w-0">
              {/* Redacted key skeleton */}
              <Skeleton className="h-[16px] sm:h-[22px] w-[140px] sm:w-[210px] rounded-md bg-muted/40" />
              
              {/* Mobile-only status tools skeleton */}
              <div className="flex sm:hidden items-center justify-end gap-1.5 flex-shrink-0 min-w-[125px]">
                <div className="w-5 flex items-center justify-center shrink-0"></div>
                <Skeleton className="h-[14px] w-[68px] rounded-md bg-muted/30 shrink-0" />
                <Skeleton className="h-[10px] w-[32px] rounded bg-muted/20 shrink-0" />
              </div>
            </div>

            {/* Bottom Row / Middle Content (Desktop) */}
            <div className="hidden sm:flex flex-row sm:items-center gap-1 sm:gap-5 text-[10px] sm:text-sm text-muted-foreground/80 min-w-0 flex-1">
              {/* Repository Column */}
              <div className="flex items-center gap-1.5 sm:w-[160px] lg:w-[190px] flex-shrink-0">
                <Skeleton className="h-3 sm:h-3.5 w-3 sm:w-3.5 rounded-full bg-muted/30 flex-shrink-0" />
                <Skeleton className="h-[12px] sm:h-[14px] w-[110px] sm:w-[130px] rounded bg-muted/30" />
              </div>

              {/* Path Column */}
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                <span className="text-border flex-shrink-0 font-light opacity-40 hidden sm:inline">/</span>
                <Skeleton className="h-3 sm:h-3.5 w-3 sm:w-3.5 rounded bg-muted/30 flex-shrink-0" />
                <Skeleton className="h-[12px] sm:h-[14px] w-[120px] sm:w-[160px] rounded bg-muted/20" />
              </div>
            </div>
          </div>

          {/* Desktop-only status tools */}
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0 sm:ml-auto">
             <Skeleton className="h-[16px] sm:h-[16px] w-[95px] rounded-md bg-muted/30 shrink-0" />
             <span className="text-border flex-shrink-0 text-muted-foreground/30">·</span>
             <div className="inline-flex items-center gap-2 sm:w-[100px] justify-start">
               <Skeleton className="h-3.5 w-3.5 rounded-full bg-muted/30" />
               <Skeleton className="h-[12px] w-[48px] bg-muted/20 rounded shrink-0" />
             </div>
          </div>
        </div>
      </div>
    ))}

    {/* Sign-in prompt skeleton */}
    {isUnauthenticated && (
      <div className="block px-2 py-2 sm:px-5 sm:py-2 border-t border-border/10 opacity-50 animate-pulse">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="mt-1 sm:mt-0 flex-shrink-0">
            <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-sm bg-muted/30" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <div className="flex flex-col flex-1 min-w-0 justify-center">
               <Skeleton className="h-[14px] sm:h-[17px] w-[80%] max-w-[400px] rounded bg-muted/20" />
            </div>
            <div className="flex-shrink-0 sm:ml-auto pt-1 sm:pt-0 w-full sm:w-auto">
              <Skeleton className="h-7 sm:h-10 w-full sm:w-[160px] rounded-md bg-muted/30" />
            </div>
          </div>
        </div>
      </div>
    )}
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
    const providerLabel = isAll ? "SYSTEM" : (PROVIDER_LABELS.find(lbl => lbl.value === selectedProvider)?.label || selectedProvider).toUpperCase();
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
                <span className="text-[9px] font-bold font-mono tracking-widest text-amber-500/60 uppercase">
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
        <div className="mx-auto w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-amber-500" />
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
            className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground bg-background border border-border transition-all duration-200 ease-in-out sm:hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

const fullKeyCache = new Map<string, string>();

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

      if (fullKeyCache.has(leak.id)) {
        await navigator.clipboard.writeText(fullKeyCache.get(leak.id)!);
        setCopyState("success");
        toast.success("Credential details successfully copied to clipboard.");
        setTimeout(() => setCopyState("idle"), 2000);
        return;
      }

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
        fullKeyCache.set(leak.id, data.fullKey);
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
          "block px-2 py-1 sm:px-5 sm:py-1.5 transition-colors duration-50 group/item animate-fade-in-up opacity-0 sm:hover:bg-white/[0.03]",
        )}
        style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
      >
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-row items-center gap-3 sm:gap-5 flex-1 min-w-0">
            {/* Main Content Row */}
            <div className="flex items-center justify-between sm:justify-start gap-2.5 flex-1 sm:flex-initial sm:w-[240px] lg:w-[260px] min-w-0">
              {/* Redacted key */}
              <code className="text-[10px] sm:text-sm font-mono bg-muted/40 px-1.5 sm:px-2 py-0 rounded-md border border-border/40 text-foreground transition-colors duration-50 truncate min-w-0 tracking-tight">
                <span className="sm:hidden">
                  {leak.redactedKey.length > 20 && leak.redactedKey.includes('*')
                    ? `${leak.redactedKey.slice(0, 6)}${"*".repeat(8)}${leak.redactedKey.slice(-6)}`
                    : leak.redactedKey}
                </span>
                <span className="hidden sm:inline">{leak.redactedKey}</span>
              </code>

              {/* Mobile-only status tools + Copy Button */}
              <div className="flex sm:hidden items-center justify-end gap-1.5 flex-shrink-0 min-w-[125px]">
                <div className="w-5 flex items-center justify-center shrink-0">
                  {isAuthenticated && (
                    <button
                      onClick={handleCopyKey}
                      disabled={copyState !== "idle"}
                      className={cn(
                        "flex items-center justify-center h-5 w-5 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-500 transition-all duration-200",
                        copyState === "success" && "text-emerald-500 border-emerald-500/30 bg-emerald-500/5"
                      )}
                    >
                      {copyState === "copying" ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : copyState === "success" ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : (
                        <Copy className="h-2.5 w-2.5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 px-1 py-0 rounded-md text-[8px] uppercase font-bold tracking-wider w-[68px] shrink-0 border bg-red-500/10 text-red-500 border-red-500/20">
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  <span>IDENTIFIED</span>
                </div>
                <span className="text-[9px] text-muted-foreground/60 tabular-nums flex items-center gap-1 font-medium min-w-[32px] justify-end">
                  {formatTimeAgo(new Date(leak.leakIntroducedAt)).replace(" ago", "")}
                </span>
              </div>
            </div>

            {/* Bottom Row (Hides on Mobile) / Middle Content (Desktop) */}
            <div className="hidden sm:flex flex-row sm:items-center gap-1 sm:gap-5 text-[10px] sm:text-sm text-muted-foreground/80 min-w-0 flex-1">
              {/* Repository Column */}
              <div className="flex items-center gap-1.5 sm:w-[160px] lg:w-[190px] flex-shrink-0">
                <FolderGit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-amber-500/80" />
                <span 
                  className={cn(
                    "text-amber-500/90 font-semibold truncate group-hover/item:text-amber-500 transition-colors duration-50",
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
              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                <span className="text-border flex-shrink-0 font-light opacity-40 hidden sm:inline">/</span>
                <FileCode2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 opacity-70" />
                <span className="truncate text-foreground/80 font-medium">
                  {leak.filePath || "***"}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop-only status tools */}
          <div className="hidden sm:flex items-center gap-4 flex-shrink-0 sm:ml-auto">
            {isAuthenticated && (
              <button
                onClick={handleCopyKey}
                disabled={copyState !== "idle"}
                className={cn(
                  "hidden sm:flex items-center justify-center h-6 w-6 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-500 transition-all duration-200 hover:ring-[0.75px] hover:ring-amber-500/40",
                  copyState === "success" && "text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:ring-0"
                )}
                title="Copy Full Key"
              >
                {copyState === "copying" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : copyState === "success" ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <div className="w-[95px] items-center justify-center gap-1.5 flex px-2 py-0 rounded-md text-[10px] uppercase font-bold tracking-widest flex-shrink-0 border bg-red-500/10 text-red-500 border-red-500/20">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Identified</span>
            </div>
            <span className="text-border flex-shrink-0 text-muted-foreground/30">·</span>
            <span className="text-[13px] text-muted-foreground/70 whitespace-nowrap flex-shrink-0 tabular-nums font-medium inline-flex items-center gap-2 sm:w-[100px] justify-start">
              <Clock className="h-3.5 w-3.5 opacity-60" />
              {formatTimeAgo(new Date(leak.leakIntroducedAt))}
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
          <div className="relative flex items-center p-1 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg gap-1 sm:gap-1.5 h-[32px] sm:h-11">
            <button
              onClick={() => setActiveTab("finds")}
              className={cn(
                "relative flex items-center justify-center py-1 px-2 sm:py-2 sm:px-3 text-[11px] sm:text-sm transition-all duration-200 z-10 flex-1 min-w-[fit-content] rounded-md touch-manipulation font-medium h-full",
                activeTab === "finds"
                  ? "text-foreground font-semibold bg-background border border-border/50"
                  : "text-muted-foreground sm:hover:text-foreground sm:hover:bg-muted/50"
              )}
            >
              <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1.5">
                <ShieldAlert className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Recent</span> Detections
              </span>
            </button>
            <button
              disabled
              className={cn(
                "relative flex items-center justify-center py-1 px-2 sm:py-2 sm:px-3 text-[11px] sm:text-sm transition-all duration-200 z-10 flex-1 min-w-[fit-content] rounded-md font-medium h-full cursor-not-allowed opacity-80",
                activeTab === "working"
                  ? "text-foreground font-semibold bg-background border border-border/50"
                  : "text-muted-foreground"
              )}
            >
              <span className="relative z-10 truncate px-1 flex items-center justify-center gap-1 sm:gap-1.5 grayscale opacity-70">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline text-nowrap">Live Verification</span>
                <span className="sm:hidden">Verification</span>
                <span className="text-[7.5px] sm:text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1 sm:px-1.5 py-0.5 ml-0.5 sm:ml-1 leading-none">
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
              isUnauthenticated ? "h-fit" : "h-[420px] sm:h-[450px]"
            )}
          >
            <div className="flex-1 overflow-y-auto overscroll-auto custom-scrollbar min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {isLoading && validLeaks.length === 0 ? (
                <FeedSkeleton isUnauthenticated={isUnauthenticated} />
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
                    className="block px-2 py-2 sm:px-5 sm:py-2 sm:hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer group animate-fade-in-up border-t border-border/10"
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Lock Icon */}
                      <div className="mt-1 sm:mt-0 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/40 transition-colors group-hover:text-amber-500/60" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {/* Content Section */}
                        <div className="flex flex-col flex-1 min-w-0 justify-center">
                          <p className="text-[10px] sm:text-[13px] text-foreground/80 font-medium leading-[1.3] sm:line-clamp-none">
                            <span className="font-bold text-foreground/90">[LOCKED]</span> Sign in with Google to copy API keys, view repositories, file paths, and more for all {total.toLocaleString()} {providerDisplayName} secrets.
                          </p>
                        </div>

                        {/* Action Section */}
                        <div className="flex-shrink-0 sm:ml-auto pt-1 sm:pt-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSignIn(); }}
                            className="w-full sm:w-auto flex h-7 sm:h-10 items-center justify-center gap-2 px-3 sm:px-6 text-[9px] sm:text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] rounded-md bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-300 border border-amber-500/20 hover:border-amber-500/40 whitespace-nowrap"
                          >
                            <span>Sign In with Google</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact CTA banner for authenticated users at end of feed */}
                {!isUnauthenticated && (
                  <div className="block px-3 py-3 sm:px-5 sm:py-3.5 bg-amber-500/[0.03] border-t border-amber-500/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                      <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500 shrink-0 mt-0.5 sm:mt-0">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] sm:text-xs font-semibold text-foreground/90 leading-tight">
                            Need full database access or custom secret monitoring?
                          </span>
                          <span className="text-[10px] sm:text-[11px] text-muted-foreground/70 leading-tight mt-0.5">
                            Contact us for enterprise access, custom API integrations & bulk dumps.
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/#about"
                        className="flex h-7 sm:h-8 items-center justify-center gap-1.5 px-3 sm:px-4 text-[10px] sm:text-[11px] font-bold text-amber-500 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition-all duration-200 border border-amber-500/30 whitespace-nowrap shrink-0"
                      >
                        <span>Enterprise Inquiries</span>
                      </Link>
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
      (prevProps.leaks || [])
        .map((l) => l?.id)
        .filter((id): id is string => Boolean(id))
    );
    const nextIds = new Set(
      (nextProps.leaks || [])
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
