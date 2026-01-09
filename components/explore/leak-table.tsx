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
  GitBranch,
  LogIn
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
  onSignIn?: () => void;
}

const providerColors: Record<string, string> = {
  'ai-key':
    "bg-beige text-coral"
}

// Memoized Loading Skeleton component
const LoadingSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
    {Array.from({ length: 6 }).map((_, i) => (
      <div 
        key={`skeleton-${i}`}
        className="group animate-fade-in-up opacity-0"
        style={{ animationDelay: `${i * 30}ms` }}
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

// Memoized Copy Button component
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
      {/* Mobile: just the icon, always visible */}
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
      {/* Desktop: icon + text, visible on hover of card */}
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
  const safeRepoUrl = leak.repoUrl;
  const safeFilePath = leak.filePath;
  const safeFullKey = leak.fullKey;
  return (
    <div 
      className="group animate-fade-in-up opacity-0"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <Card className="group/card border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200 hover:border-border/80 hover:bg-card/70">
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
                        href={safeRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-coral hover:text-coral/80 hover:underline flex items-center gap-1 min-w-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 rounded"
                      >
                        <span className="truncate">{parsed.repo}</span>
                        <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-coral flex-shrink-0 transition-transform duration-200 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5" />
                      </a>
                    </div>
                    <span className="hidden sm:inline text-muted-foreground/70 text-sm">by</span>
                    <a
                      href={`https://github.com/${parsed.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden sm:flex text-muted-foreground hover:text-coral items-center gap-1.5 break-all sm:break-normal transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 rounded text-sm"
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
                <span className="text-xs sm:text-sm text-coral font-medium">Key path:</span>
                <code className="text-xs sm:text-sm break-all sm:break-words sm:whitespace-normal bg-muted/50 px-1.5 py-0.5 rounded border border-border/30 inline-block" title={safeFilePath}>{safeFilePath}</code>
              </div>
            )}
          </div>

          {/* Copy Button - Absolutely positioned */}
          <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-3">
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

const LeakTableComponent = React.memo(({ leaks, isLoading, selectedProvider, plan, onSignIn }: LeakTableProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Memoized copy handler with optimized error handling
  const handleCopy = useCallback(async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      toast.success('API key copied to clipboard!', {
        icon: <Check className="h-4 w-4 text-coral" />,
      });
      // Reset copied state after 1 second
      setTimeout(() => {
        setCopiedKey(null);
      }, 1000);
    } catch (err) {
      toast.error('Failed to copy API key', {
        className: 'rounded-md',
      });
    }
  }, []);

  // Filter and memoize valid leaks to prevent unnecessary re-renders
  const validLeaks = useMemo(() => leaks.filter(leak => leak !== null) as LeakedKey[], [leaks]);
  const isUnauthenticated = plan === 'free';
  const showGradient = isUnauthenticated && validLeaks.length === 6;

  if (isLoading) {
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
              "relative",
              showGradient && index >= 4 && "overflow-hidden"
            )}
          >
            <LeakCard
              leak={leak}
              index={index}
              copiedKey={copiedKey}
              onCopy={handleCopy}
              plan={plan}
            />
            {showGradient && index >= 4 && (
              <div className="absolute inset-0 pointer-events-none z-10 rounded-md overflow-hidden">
                <div 
                  className="absolute inset-0 backdrop-blur-[4px]"
                  style={{
                    background: index === 4 
                      ? 'linear-gradient(to bottom, transparent 0%, transparent 40%, hsl(var(--beige) / 0.2) 60%, hsl(var(--beige) / 0.45) 75%, hsl(var(--beige) / 0.7) 87%, hsl(var(--beige) / 0.88) 94%, hsl(var(--beige) / 0.96) 98%, hsl(var(--beige)) 100%)'
                      : 'linear-gradient(to bottom, transparent 0%, transparent 30%, hsl(var(--beige) / 0.25) 50%, hsl(var(--beige) / 0.55) 70%, hsl(var(--beige) / 0.8) 85%, hsl(var(--beige) / 0.93) 93%, hsl(var(--beige) / 0.98) 97%, hsl(var(--beige)) 100%)'
                  }}
                />
                <div 
                  className="absolute inset-0"
                  style={{
                    background: index === 4
                      ? 'linear-gradient(to bottom, transparent 0%, transparent 50%, hsl(var(--beige) / 0.12) 70%, hsl(var(--beige) / 0.35) 82%, hsl(var(--beige) / 0.6) 91%, hsl(var(--beige) / 0.82) 96%, hsl(var(--beige) / 0.94) 99%, hsl(var(--beige)) 100%)'
                      : 'linear-gradient(to bottom, transparent 0%, transparent 40%, hsl(var(--beige) / 0.18) 60%, hsl(var(--beige) / 0.45) 75%, hsl(var(--beige) / 0.72) 87%, hsl(var(--beige) / 0.9) 94%, hsl(var(--beige) / 0.97) 98%, hsl(var(--beige)) 100%)'
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {showGradient && onSignIn && (
        <div className="mt-3 sm:mt-5 relative z-20 pointer-events-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-3 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
                <div className="flex-1 space-y-1.5 sm:space-y-2 min-w-0">
                  <div className="flex flex-row items-center gap-1.5 sm:gap-2">
                    <div className="p-1 sm:p-1.5 rounded-md bg-coral/10">
                      <LogIn className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-coral flex-shrink-0" />
                    </div>
                    <span className="text-xs sm:text-base font-medium text-foreground">Don't miss out on thousands of leaks</span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground/90 leading-relaxed">
                    You're only seeing 6 leaks. Sign in now to access <span className="font-semibold text-foreground">3,000+ leaked API keys</span> with full details, repository links, and unlimited access.
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>100% free. No credit card required. Instant access.</span>
                  </div>
                </div>
                <div className="flex-shrink-0 sm:self-center">
                  <button
                    onClick={onSignIn}
                    className="text-xs sm:text-sm font-medium text-white bg-coral border-none rounded-md flex items-center justify-center gap-2 sm:gap-2.5 transition-all duration-200 ease-in-out hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-4 py-3 sm:py-2 whitespace-nowrap w-full sm:w-auto active:scale-[0.98] min-h-[44px] sm:min-h-0"
                    aria-label="Sign in with Google"
                  >
                    <div className="bg-white rounded-full p-0.5 flex-shrink-0">
                      <svg className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <span>Continue with Google</span>
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