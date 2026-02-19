"use client";

import React, { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  ExternalLink,
  Calendar,
  User,
  FileText,
  GitBranch,
  LogIn,
  CircleCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LeakedKey, Provider } from '@/types';
import { cn, parseGitHubRepoUrl } from '@/lib/utils';

interface LeakTableProps {
  leaks: (LeakedKey | null)[];
  isLoading?: boolean;
  selectedProvider: Provider;
  plan: 'free' | 'pro';
  onSignIn?: () => void;
}

const providerColors: Record<string, string> = {
  'openai': "bg-emerald-500/10 text-emerald-500",
  'anthropic': "bg-amber-600/10 text-amber-600",
  'google': "bg-blue-500/10 text-blue-500",
  'openrouter': "bg-fuchsia-500/10 text-fuchsia-500",
  'groq': "bg-orange-600/10 text-orange-600",
  'xai': "bg-slate-500/10 text-slate-500",
  'cerebras': "bg-violet-600/10 text-violet-600",
}

// Memoized Loading Skeleton component
const LoadingSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
    {Array.from({ length: 6 }).map((_, i) => (
      <div 
        key={`skeleton-${i}`}
        className="group"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm animate-pulse">
          <CardContent className="p-3 sm:p-4 relative">
            <div className="flex flex-col h-full">
              <div className="flex-1 flex flex-col gap-2.5 w-full">
                {/* Provider & Key skeleton */}
                <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3 min-w-0 w-full">
                  <div className="h-6 w-3/4 sm:w-4/5 bg-muted/60 rounded-md" />
                  <div className="h-6 w-16 bg-muted/60 rounded-sm flex-shrink-0" />
                </div>

                {/* Repository Info skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
                    <div className="h-4 w-20 bg-muted/60 rounded" />
                  </div>
                  <div className="h-4 w-32 bg-muted/60 rounded" />
                  <div className="hidden sm:block h-4 w-4 bg-muted/60 rounded" />
                  <div className="hidden sm:flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
                    <div className="h-4 w-24 bg-muted/60 rounded" />
                  </div>
                </div>

                {/* Metadata skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
                    <div className="h-3.5 w-12 bg-muted/60 rounded" />
                    <div className="h-3.5 w-16 bg-muted/60 rounded" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
                    <div className="h-3.5 w-16 bg-muted/60 rounded" />
                    <div className="h-3.5 w-14 bg-muted/60 rounded" />
                  </div>
                </div>

                {/* File Path skeleton */}
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 bg-muted/60 rounded" />
                  <div className="h-3.5 w-16 bg-muted/60 rounded" />
                  <div className="h-4 flex-1 bg-muted/60 rounded" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Memoized Empty State component
const EmptyState = React.memo(({ selectedProvider }: { selectedProvider: Provider }) => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-coral/10 border border-coral/20 mb-4">
      <FileText className="h-8 w-8 text-coral animate-pulse-slow" />
    </div>
    <h3 className="text-lg font-semibold mb-2 text-foreground">Sensors are clear</h3>
    <p className="text-muted-foreground/80 max-w-md mx-auto text-sm leading-relaxed px-4">
      No leaks found for current filters. This could mean the system is updating or the backend is currently processing new scans. Check back shortly.
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

/*
const CopyButton = React.memo(({ 
  leak, 
  copiedKey, 
  onCopy,
  plan
}: { 
  leak: LeakedKey; 
  copiedKey: string | null; 
  onCopy: (text: string, keyId: string) => void; 
  plan: 'free' | 'pro';
}) => {
  if (!leak.fullKey && !leak.redactedKey) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
        className="h-11 w-11 sm:h-9 sm:w-9 md:hidden cursor-pointer focus:outline-none !bg-transparent !hover:bg-muted/50 transition-all duration-200 rounded-md focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0"
        aria-label={copiedKey === leak.id ? 'Copied' : 'Copy API key'}
      >
        <div className="transition-transform duration-200 active:scale-95">
          {copiedKey === leak.id ? (
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral" />
          ) : (
            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground/70 hover:text-coral transition-colors duration-200" />
          )}
        </div>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
        className="hidden md:flex items-center gap-2 h-9 px-3 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !bg-transparent !hover:bg-muted/50 cursor-pointer focus:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1"
        aria-label={copiedKey === leak.id ? 'Copied' : 'Copy API key'}
      >
        <div className="transition-transform duration-200 group-hover/card:scale-110">
          {copiedKey === leak.id ? (
            <Check className="h-4 w-4 text-coral" />
          ) : (
            <Copy className="h-4 w-4 text-foreground/70 group-hover/card:text-coral transition-colors duration-200" />
          )}
        </div>
        <span className="text-sm font-medium transition-all duration-200 text-foreground/70 group-hover/card:text-coral">
          {copiedKey === leak.id ? 'Copied' : 'Copy'}
        </span>
      </Button>
    </>
  );
});

CopyButton.displayName = 'CopyButton';
*/

const formatTimeAgo = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true })
    .replace(/\babout\s+/gi, '')
    .replace(/\bhours?\b/gi, 'hrs')
    .replace(/\bminutes?\b/gi, 'mins');
};

// Memoized Leak Card component with optimized comparison
const LeakCard = React.memo(({ 
  leak, 
  index
}: { 
  leak: LeakedKey; 
  index: number; 
}) => {
  const safeRepoUrl = leak.repoUrl;
  const safeFilePath = leak.filePath;
  return (
    <div 
      className="group"
    >
      <Card className="group/card border-border/50 bg-card/50 transition-colors duration-200 sm:hover:border-border/80 sm:hover:bg-card/70">
      <CardContent className="p-2.5 sm:p-4 relative"> 
        <div className="flex flex-col h-full pr-8 sm:pr-0">
          <div className="flex-1 flex flex-col gap-2 sm:gap-2.5 w-full">
            {/* Provider & Key */}
            <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-3 min-w-0 w-full">
              <code className="text-xs sm:text-sm font-mono bg-muted/80 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-muted-foreground md:group-hover/card:text-foreground transition-all duration-200 inline-block w-fit max-w-full sm:max-w-full text-left break-all sm:break-normal border border-border/30 md:group-hover/card:border-border/50">
                <span className="sm:hidden truncate block">{leak.redactedKey.length > 20 ? `${leak.redactedKey.slice(0, 6)}${'*'.repeat(8)}${leak.redactedKey.slice(-6)}` : leak.redactedKey}</span>
                <span className="hidden sm:inline">{leak.redactedKey}</span>
              </code>
              <div
                className={cn(
                  "inline-flex items-center justify-center rounded-sm px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium border shadow-sm flex-shrink-0",
                  providerColors[leak.provider] || providerColors['github']
                )}
              >
                {leak.provider}
              </div>
            </div>

            {/* Repository Info */}
            <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm">
              {(() => {
                const parsed = safeRepoUrl ? parseGitHubRepoUrl(safeRepoUrl) : null;
                if (!parsed || !safeRepoUrl) return (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs sm:text-sm">Repository not available</span>
                  </div>
                );
                return (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GitBranch className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-coral" />
                      <span className="text-xs sm:text-sm text-coral font-medium whitespace-nowrap flex-shrink-0">Repo Name:</span>
                      <a
                        href={safeFilePath ? `${safeRepoUrl}/blob/HEAD/${safeFilePath}` : safeRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-coral sm:hover:text-coral/80 sm:hover:underline flex items-center gap-1 min-w-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 rounded"
                      >
                        <span className="truncate">{parsed.repo}</span>
                        <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-coral flex-shrink-0 transition-transform duration-200 md:group-hover/card:translate-x-0.5 md:group-hover/card:-translate-y-0.5" />
                      </a>
                    </div>
                    <span className="hidden sm:inline text-muted-foreground/70 text-sm">by</span>
                    <a
                      href={`https://github.com/${parsed.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex text-muted-foreground sm:hover:text-coral items-center gap-1.5 break-all sm:break-normal transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 rounded text-sm"
                    >
                      <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                      {parsed.owner}
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/60" />
                <span className="text-muted-foreground/70">Added:</span>
                <span className="text-foreground/90 font-medium">{formatTimeAgo(new Date(leak.leakIntroducedAt))}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/60" />
                <span className="text-muted-foreground/70">Detected:</span>
                <span className="text-foreground/90 font-medium">{formatTimeAgo(new Date(leak.leakDetectedAt))}</span>
              </div>
            </div>

            {/* File Path */}
            {safeFilePath && (
              <div className="flex items-start sm:items-center gap-1.5 sm:gap-2 min-w-0">
                <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-coral mt-0.5 sm:mt-0" />
                <span className="text-xs sm:text-sm text-coral font-medium whitespace-nowrap flex-shrink-0">Key path:</span>
                <code className="text-xs sm:text-sm break-all sm:break-words sm:whitespace-normal bg-muted/50 px-1.5 py-0.5 rounded border border-border/30 inline-block" title={safeFilePath}>{safeFilePath}</code>
              </div>
            )}
          </div>

          {/*
          <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-3">
            <CopyButton 
              leak={{...leak, fullKey: safeFullKey}} 
              copiedKey={copiedKey} 
              onCopy={onCopy} 
              plan={plan}
            />
          </div>
          */}
        </div>
      </CardContent>
    </Card>
  </div>
  );
});

LeakCard.displayName = 'LeakCard';

const LeakTableComponent = React.memo(({ leaks, isLoading, selectedProvider, plan, onSignIn }: LeakTableProps) => {
  // Filter and memoize valid leaks to prevent unnecessary re-renders
  const validLeaks = useMemo(() => leaks.filter(leak => leak !== null) as LeakedKey[], [leaks]);
  const isUnauthenticated = plan === 'free';
  const showGradient = isUnauthenticated && validLeaks.length === 4;

  // Seamless loading: Only show skeleton if we have NO data to show
  if (isLoading && validLeaks.length === 0) {
    return <LoadingSkeleton />;
  }

  if (validLeaks.length === 0) {
    return <EmptyState selectedProvider={selectedProvider} />;
  }

  // Render as a 2-column grid on desktop, 1 column on mobile
  // Use stable keys for better React reconciliation
  return (
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
        {validLeaks.map((leak, index) => (
          <div
            key={leak.id || `leak-${index}`}
            className={cn(
              "relative"
            )}
          >
            <LeakCard
              leak={leak}
              index={index}
            />

          </div>
        ))}
      </div>
      {showGradient && onSignIn && (
        <div className="mt-3 sm:mt-5 relative z-20 pointer-events-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <span className="text-xs sm:text-base font-medium text-foreground">Public Preview Limit Reached</span>
                  <div className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed">
                    You are seeing 4 of 19,000+ active leaks. Sign in for full access to the live feed and repository details.
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
                    <CircleCheck className="h-3 w-3 text-coral" aria-hidden="true" focusable="false" />
                    <span>100% Free. Instant Access.</span>
                  </div>
                </div>
                <div className="flex-shrink-0 sm:self-center">
                  <button
                    onClick={onSignIn}
                    className="text-xs sm:text-sm font-medium text-foreground bg-background border border-border rounded-md shadow-sm flex items-center justify-center gap-2 sm:gap-2.5 transition-all duration-200 ease-in-out sm:hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-4 py-3 sm:py-2 whitespace-nowrap w-full sm:w-auto active:scale-[0.98] min-h-[44px] sm:min-h-0"
                    aria-label="Sign in with Google"
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function - only re-render if actual data changes
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.selectedProvider !== nextProps.selectedProvider) return false;
  if (prevProps.plan !== nextProps.plan) return false;
  
  // Deep comparison for leaks array - only check length and IDs for performance
  if (prevProps.leaks.length !== nextProps.leaks.length) return false;
  
  // Quick ID comparison instead of deep equality
  const prevIds = new Set(prevProps.leaks.map(l => l?.id).filter((id): id is string => Boolean(id)));
  const nextIds = new Set(nextProps.leaks.map(l => l?.id).filter((id): id is string => Boolean(id)));
  if (prevIds.size !== nextIds.size) return false;
  
  for (const id of Array.from(prevIds)) {
    if (!nextIds.has(id)) return false;
  }
  
  return true; // Props are equal, skip re-render
});

LeakTableComponent.displayName = 'LeakTableComponent';

export const LeakTable = LeakTableComponent;