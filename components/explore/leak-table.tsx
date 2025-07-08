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
  Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LeakedKey, Provider } from '@/types';
import { toast } from 'sonner';
import { cn, parseGitHubRepoUrl } from '@/lib/utils';

interface LeakTableProps {
  leaks: (LeakedKey | null)[];
  isLoading?: boolean;
  selectedProvider: Provider;
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
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 bg-muted rounded-full" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="flex gap-4">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
            <div className="h-9 w-9 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Memoized Empty State component
const EmptyState = React.memo(({ selectedProvider }: { selectedProvider: Provider }) => (
  <div className="text-center py-12 animate-fade-in-up opacity-0 animate-delay-10">
    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">No leaks found</h3>
    <p className="text-muted-foreground">
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
  onCopy 
}: { 
  leak: LeakedKey; 
  copiedKey: string | null; 
  onCopy: (text: string, keyId: string) => void; 
}) => (
  <>
    {/* Mobile: just the icon, always visible */}
    <Button
      variant="ghost"
      size="icon"
      onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
      className="h-9 w-9 md:hidden cursor-pointer focus:outline-none !bg-transparent !hover:bg-transparent group"
    >
      <div>
        {copiedKey === leak.id ? (
          <Check className="h-4 w-4 text-foreground" />
        ) : (
          <Copy className="h-4 w-4 text-foreground transition-colors duration-75" />
        )}
      </div>
    </Button>
    {/* Desktop: icon + text, visible on hover of card */}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onCopy(leak.fullKey || leak.redactedKey, leak.id)}
      className="hidden md:flex items-center gap-2 h-9 px-3 opacity-0 group-hover:opacity-100 !bg-transparent !hover:bg-transparent cursor-pointer focus:outline-none"
    >
      <div>
        {copiedKey === leak.id ? (
          <Check className="h-4 w-4 text-foreground" />
        ) : (
          <Copy className="h-4 w-4 text-foreground transition-colors duration-75" />
        )}
      </div>
      <span className="text-sm font-semibold transition-all duration-75 text-foreground">
        {copiedKey === leak.id ? 'Copied' : 'Copy'}
      </span>
    </Button>
  </>
));

CopyButton.displayName = 'CopyButton';

// Utility to normalize redacted key display to 20 chars (first 4 + 12 * + last 4)
function normalizeRedactedKey(key: string): string {
  if (!key || key.length <= 8) return key;
  const first = key.slice(0, 4);
  const last = key.slice(-4);
  const totalLength = 20;
  const asterisksCount = totalLength - first.length - last.length;
  return `${first}${'*'.repeat(asterisksCount)}${last}`;
}

// Memoized Leak Card component
const LeakCard = React.memo(({ 
  leak, 
  index, 
  copiedKey, 
  onCopy 
}: { 
  leak: LeakedKey; 
  index: number; 
  copiedKey: string | null; 
  onCopy: (text: string, keyId: string) => void; 
}) => (
  <div 
    className="group animate-fade-in-up opacity-0"
    style={{ animationDelay: `${index * 30}ms` }}
  >
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-[180px]">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
            {/* Provider & Key */}
            <div className="flex flex-row items-center gap-2 min-w-[180px]">
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground md:group-hover:text-foreground transition-colors duration-75 w-full sm:w-[180px] text-left break-all sm:break-normal">
                {normalizeRedactedKey(leak.redactedKey)}
              </code>
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono text-xs font-medium border",
                  (leak.provider === 'google_gemini' || leak.provider === 'google')
                    ? 'bg-blue-200/40 text-blue-700 dark:text-blue-300 border-blue-400/30'
                    : providerColors[leak.provider] || providerColors['github']
                )}
              >
                {(leak.provider === 'google_gemini' || leak.provider === 'google') ? 'google' : leak.provider}
              </div>
            </div>

            {/* Repository Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
              {(() => {
                const parsed = parseGitHubRepoUrl(leak.repoUrl);
                if (!parsed) return (
                  <a
                    href={leak.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline flex items-center gap-1 transition-colors duration-75 cursor-pointer break-all sm:break-normal"
                  >
                    {leak.repoUrl.split('/').slice(-2).join('/')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                );
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                    <a
                      href={leak.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1 break-all sm:break-normal"
                    >
                      {parsed.repo}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-muted-foreground">by</span>
                    <a
                      href={`https://github.com/${parsed.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary flex items-center gap-1 break-all sm:break-normal"
                    >
                      <User className="h-3 w-3" />
                      {parsed.owner}
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* Metadata - beautiful, compact, and readable on mobile */}
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                <Calendar className="h-3 w-3 flex-shrink-0 text-muted-foreground/70" />
                <span className="sm:truncate text-foreground/80 font-semibold">Key added in Repo:</span>
                <span className="sm:truncate text-foreground/80">{formatDistanceToNow(new Date(leak.leakIntroducedAt), { addSuffix: true })}</span>
                {leak.filePath && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3 flex-shrink-0" />
                    <code className="text-xs break-all sm:truncate sm:max-w-[200px]" title={leak.filePath}>{leak.filePath}</code>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground min-w-0">
                <Calendar className="h-3 w-3 flex-shrink-0 text-muted-foreground/70" />
                <span className="sm:truncate text-foreground/80 font-semibold">Leak Detected:</span>
                <span className="sm:truncate text-foreground/80">{formatDistanceToNow(new Date(leak.leakDetectedAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <CopyButton leak={leak} copiedKey={copiedKey} onCopy={onCopy} />
        </div>
      </CardContent>
    </Card>
  </div>
));

LeakCard.displayName = 'LeakCard';

const LeakTableComponent = React.memo(({ leaks, isLoading, selectedProvider }: LeakTableProps) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Memoized copy handler
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

  // Memoized leaks array to prevent unnecessary re-renders
  const memoizedLeaks = useMemo(() => leaks, [leaks]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (memoizedLeaks.length === 0) {
    return <EmptyState selectedProvider={selectedProvider} />;
  }

  return (
    <div className="space-y-4">
      {memoizedLeaks.map((leak, index) => (
        leak ? (
          <LeakCard
            key={leak.id}
            leak={leak}
            index={index}
            copiedKey={copiedKey}
            onCopy={handleCopy}
          />
        ) : (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-20 bg-muted rounded-full" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="flex gap-4">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-9 w-9 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        )
      ))}
    </div>
  );
});

LeakTableComponent.displayName = 'LeakTableComponent';

export const LeakTable = LeakTableComponent;