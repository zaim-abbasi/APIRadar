"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Copy, 
  ExternalLink, 
  Calendar, 
  User, 
  FileText, 
  GitCommit,
  Check,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeakedKey, Provider } from '@/types';
import { toast } from 'sonner';
import { cn, parseGitHubRepoUrl } from '@/lib/utils';

interface LeakTableProps {
  leaks: (LeakedKey | null)[];
  isLoading?: boolean;
  selectedProvider: Provider;
  plan: 'free' | 'pro';
}

const providerColors: Record<string, string> = {
  'openai': 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'anthropic': 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  'google': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'aws': 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  'stripe': 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  'github': 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  'google-cloud': 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  'discord': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  'twilio': 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  'sendgrid': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20',
};

// Memoized Loading Skeleton component
const LoadingSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
    {Array.from({ length: 6 }).map((_, i) => (
      <div 
        key={`skeleton-${i}`}
        className="group animate-fade-in-up opacity-0"
        style={{ animationDelay: `${i * 30}ms` }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-[180px] animate-pulse">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2.5 sm:space-y-3 flex-1 min-w-0">
              {/* Provider & Key skeleton */}
              <div className="flex flex-row items-center gap-2.5 min-w-[180px]">
                <div className="h-6 w-[180px] bg-muted/60 rounded-md skeleton" />
                <div className="h-6 w-16 bg-muted/60 rounded-full skeleton" />
              </div>

              {/* Repository Info skeleton */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                <div className="h-4 w-32 bg-muted/60 rounded skeleton" />
                <div className="h-4 w-24 bg-muted/60 rounded skeleton" />
              </div>

              {/* Metadata skeleton */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <div className="h-3 w-3 bg-muted/60 rounded skeleton" />
                  <div className="h-3 w-20 bg-muted/60 rounded skeleton" />
                  <div className="h-3 w-16 bg-muted/60 rounded skeleton" />
                  <div className="h-3 w-24 bg-muted/60 rounded skeleton" />
                </div>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <div className="h-3 w-3 bg-muted/60 rounded skeleton" />
                  <div className="h-3 w-20 bg-muted/60 rounded skeleton" />
                  <div className="h-3 w-16 bg-muted/60 rounded skeleton" />
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
  <div className="text-center py-16 animate-fade-in-up opacity-0 animate-delay-10">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
      <FileText className="h-8 w-8 text-muted-foreground/70" />
    </div>
    <h3 className="text-lg font-semibold mb-2 text-foreground">No leaks found</h3>
    <p className="text-muted-foreground/80 max-w-md mx-auto">
      {selectedProvider === 'all' 
        ? "No leaked keys match your current filters."
        : `No leaked keys found for ${selectedProvider}.`
      }
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Memoized Copy Button component - BULLETPROOF SECURITY
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
  // Override isLocked if user is authenticated (pro plan)
  const isLocked = plan === 'pro' ? false : (leak.isLocked === true);
  const hasSensitiveData = leak.fullKey && !isLocked;

  // If user is authenticated (pro), always show copy button
  // Only show lock message for unauthenticated users
  if (plan === 'pro') {
    // Authenticated users: show copy button if we have data, otherwise show nothing
    if (!hasSensitiveData && !leak.fullKey && !leak.redactedKey) {
      return null; // No data to copy
    }
    // Show copy button for authenticated users
    return (
      <>
        {/* Mobile: just the icon, always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
          className="h-9 w-9 md:hidden cursor-pointer focus:outline-none !bg-transparent !hover:bg-muted/50 transition-all duration-200 rounded-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
          aria-label={copiedKey === leak.id ? 'Copied' : 'Copy API key'}
        >
          <div className="transition-transform duration-200 active:scale-95">
            {copiedKey === leak.id ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-foreground/70 hover:text-foreground transition-colors duration-200" />
            )}
          </div>
        </Button>
        {/* Desktop: icon + text, visible on hover of card */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
          className="hidden md:flex items-center gap-2 h-9 px-3 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !bg-transparent !hover:bg-muted/50 cursor-pointer focus:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
          aria-label={copiedKey === leak.id ? 'Copied' : 'Copy API key'}
        >
          <div className="transition-transform duration-200 group-hover/card:scale-110">
            {copiedKey === leak.id ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-4 w-4 text-foreground/70 group-hover/card:text-foreground transition-colors duration-200" />
            )}
          </div>
          <span className="text-sm font-medium transition-all duration-200 text-foreground/70 group-hover/card:text-foreground">
            {copiedKey === leak.id ? 'Copied' : 'Copy'}
          </span>
        </Button>
      </>
    );
  }

  // Unauthenticated users: show lock message
  if (plan === 'free' || isLocked || !hasSensitiveData) {
    return (
      <>
        {/* Mobile: Lock icon only */}
        <Button
          variant="ghost"
          size="icon"
          disabled
          className="h-9 w-9 md:hidden cursor-default focus:outline-none !bg-transparent !hover:bg-transparent opacity-60 transition-opacity duration-200 pointer-events-none"
          aria-label="Sign in required to copy full key"
        >
          <Lock className="h-4 w-4 text-muted-foreground" />
        </Button>
        {/* Desktop: Lock icon + text on hover */}
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="hidden md:flex items-center gap-2 h-9 px-3 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !bg-transparent !hover:bg-muted/50 cursor-default focus:outline-none rounded-md pointer-events-none"
          aria-label="Sign in required to copy full key"
        >
          <Lock className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover/card:scale-110" />
          <span className="text-sm font-medium transition-all duration-200 text-foreground/70">
            Sign in to copy full key
          </span>
        </Button>
      </>
    );
  }

  // Basic and Pro users: show copy button
  return (
    <>
      {/* Mobile: just the icon, always visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
        className="h-9 w-9 md:hidden cursor-pointer focus:outline-none !bg-transparent !hover:bg-muted/50 transition-all duration-200 rounded-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
        aria-label={copiedKey === leak.id ? 'Copied' : 'Copy API key'}
      >
        <div className="transition-transform duration-200 active:scale-95">
          {copiedKey === leak.id ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-foreground/70 hover:text-foreground transition-colors duration-200" />
          )}
        </div>
      </Button>
      {/* Desktop: icon + text, visible on hover of card */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
        className="hidden md:flex items-center gap-2 h-9 px-3 opacity-0 group-hover/card:opacity-100 transition-all duration-200 !bg-transparent !hover:bg-muted/50 cursor-pointer focus:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1"
        aria-label={copiedKey === leak.id ? 'Copied' : 'Copy API key'}
      >
        <div className="transition-transform duration-200 group-hover/card:scale-110">
          {copiedKey === leak.id ? (
            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="h-4 w-4 text-foreground/70 group-hover/card:text-foreground transition-colors duration-200" />
          )}
        </div>
        <span className="text-sm font-medium transition-all duration-200 text-foreground/70 group-hover/card:text-foreground">
          {copiedKey === leak.id ? 'Copied' : 'Copy'}
        </span>
      </Button>
    </>
  );
});

CopyButton.displayName = 'CopyButton';

// Optimize: Pre-compute normalized keys for better performance
// Using a simple function instead of memo to avoid React overhead for pure computation
const normalizeRedactedKeyFn = (key: string): string => {
  if (!key || key.length <= 8) return key;
  const first = key.slice(0, 4);
  const last = key.slice(-4);
  const totalLength = 20;
  const asterisksCount = totalLength - first.length - last.length;
  return `${first}${'*'.repeat(asterisksCount)}${last}`;
};

const formatTimeAgo = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true })
    .replace(/\babout\s+/gi, '')
    .replace(/\bhours?\b/gi, 'hrs')
    .replace(/\bminutes?\b/gi, 'mins');
};

// Memoized Leak Card component with optimized comparison
const LeakCard = React.memo(({ 
  leak, 
  index, 
  copiedKey, 
  onCopy,
  plan
}: { 
  leak: LeakedKey; 
  index: number; 
  copiedKey: string | null; 
  onCopy: (text: string, keyId: string) => void; 
  plan: 'free' | 'pro';
}) => {
  // Override isLocked if user is authenticated (pro plan)
  const isLocked = plan === 'pro' ? false : (leak.isLocked === true);
  const safeRepoUrl = isLocked ? null : leak.repoUrl;
  const safeFilePath = isLocked ? null : leak.filePath;
  const safeFullKey = isLocked ? null : leak.fullKey;
  return (
    <div 
      className="group animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <Card className="group/card border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200 hover:border-border/80 hover:shadow-md hover:shadow-primary/5 hover:bg-card/70">
      <CardContent className={`p-3 sm:p-4 ${isLocked ? 'locked-content' : ''} relative`}> 
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col gap-2.5 w-full">
            {/* Provider & Key */}
            <div className="flex flex-row items-center justify-between gap-2.5 min-w-0 w-full">
              <code className="text-sm font-mono bg-muted/80 px-2 py-1 rounded-md text-muted-foreground md:group-hover/card:text-foreground transition-all duration-200 inline-block text-left break-all sm:break-normal border border-border/30 md:group-hover/card:border-border/50">
                {normalizeRedactedKeyFn(leak.redactedKey)}
              </code>
              <div
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono text-xs font-medium border shadow-sm flex-shrink-0",
                  leak.provider === 'google'
                    ? 'bg-blue-200/40 text-blue-700 dark:text-blue-300 border-blue-400/30 hover:bg-blue-200/50'
                    : providerColors[leak.provider] || providerColors['github']
                )}
              >
                {leak.provider === 'google' ? 'google' : leak.provider}
              </div>
            </div>

            {/* Repository Info - BULLETPROOF SECURITY */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
              {isLocked ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Sign in to view repository</span>
                </div>
              ) : (() => {
                const parsed = safeRepoUrl ? parseGitHubRepoUrl(safeRepoUrl) : null;
                if (!parsed || !safeRepoUrl) return (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Repository not available</span>
                  </div>
                );
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <a
                      href={safeRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:text-primary/80 hover:underline flex items-center gap-1.5 break-all sm:break-normal transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 rounded"
                    >
                      {parsed.repo}
                      <ExternalLink className="h-3.5 w-3.5 transition-transform duration-200 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
                    </a>
                    <span className="hidden sm:inline text-muted-foreground/70">by</span>
                    <a
                      href={`https://github.com/${parsed.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex text-muted-foreground hover:text-primary items-center gap-1.5 break-all sm:break-normal transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 rounded"
                    >
                      <User className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                      {parsed.owner}
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Metadata - BULLETPROOF SECURITY */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 w-full overflow-hidden">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
              <span className="text-foreground/75 font-medium whitespace-nowrap flex-shrink-0">Key added in Repo:</span>
              <span className="text-foreground/80 font-semibold whitespace-nowrap flex-shrink-0">{formatTimeAgo(new Date(leak.leakIntroducedAt))}</span>
              <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60 ml-2.5" />
              <span className="text-foreground/75 font-medium whitespace-nowrap flex-shrink-0">Leak Detected:</span>
              <span className="text-foreground/80 font-semibold whitespace-nowrap flex-shrink-0 truncate">{formatTimeAgo(new Date(leak.leakDetectedAt))}</span>
            </div>

            {/* File Path */}
            {!isLocked && safeFilePath && (
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                <span className="text-sm text-foreground/75 font-medium">Key path:</span>
                <code className="text-sm break-all sm:break-words sm:whitespace-normal bg-muted/50 px-1.5 py-0.5 rounded border border-border/30 inline-block" title={safeFilePath}>{safeFilePath}</code>
              </div>
            )}
            {isLocked && (
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/60" />
                <span className="text-sm text-muted-foreground/80">Sign in to view file path</span>
              </div>
            )}
          </div>

          {/* Copy Button - BULLETPROOF SECURITY - Absolutely positioned */}
          <div className="absolute top-10 right-4 sm:top-12 sm:right-6">
            <CopyButton 
              leak={{...leak, fullKey: safeFullKey}} 
              copiedKey={copiedKey} 
              onCopy={onCopy} 
              plan={plan}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  );
});

LeakCard.displayName = 'LeakCard';

const LeakTableComponent = React.memo(({ leaks, isLoading, selectedProvider, plan }: LeakTableProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Memoized copy handler with optimized error handling
  const handleCopy = useCallback(async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast.success('API key copied to clipboard!');
      // Reset copied state after 1 second
      setTimeout(() => {
        setCopiedKey(null);
      }, 1000);
    } catch (err) {
      toast.error('Failed to copy API key');
    }
  }, []);

  // Filter and memoize valid leaks to prevent unnecessary re-renders
  const validLeaks = useMemo(() => leaks.filter(leak => leak !== null) as LeakedKey[], [leaks]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (validLeaks.length === 0) {
    return <EmptyState selectedProvider={selectedProvider} />;
  }

  // Render as a 2-column grid on desktop, 1 column on mobile
  // Use stable keys for better React reconciliation
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
      {validLeaks.map((leak, index) => (
        <LeakCard
          key={leak.id || `leak-${index}`}
          leak={leak}
          index={index}
          copiedKey={copiedKey}
          onCopy={handleCopy}
          plan={plan}
        />
      ))}
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