"use client";

import React, { Suspense } from 'react';
import { Filter, SortAsc, RefreshCw, LogIn, Rocket } from 'lucide-react';
import { signIn } from "next-auth/react";
import { Github as GithubIcon } from "lucide-react";
import { ProviderFilter } from '@/components/explore/provider-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { Card, CardContent } from '@/components/ui/card';
import { TIME_RANGES, SORT_OPTIONS, PROVIDERS } from '@/lib/constants';
import { Provider } from '@/types';

const ExploreHeader = React.memo(() => (
  <div className="mb-6 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-2 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight">
      Explore Leaked API Keys
    </h1>
    <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-3 rounded-full opacity-60" />
    <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
      Real-time database of API key leaks from public repositories. View detailed leak information and repository context to stay informed about the latest exposures.
    </p>
  </div>
));

ExploreHeader.displayName = 'ExploreHeader';

const ActionCard = ({ onSignIn }: { onSignIn: () => void }) => (
  <div className="mt-4 w-full sm:w-[calc(50%-0.5rem)] mx-auto">
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-[100px] flex flex-col justify-center">
      <CardContent className="p-3 flex items-center gap-3 min-h-0 h-full">
        <div className="flex flex-col items-center justify-center flex-shrink-0">
          <LogIn className="h-8 w-8 text-primary" />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
          <span className="font-semibold text-base text-foreground truncate">Sign in to unlock full access</span>
          <span className="text-muted-foreground text-xs leading-tight whitespace-normal">Sign in to view all API key leaks, copy full keys, and access advanced features.</span>
          <span className="block text-xs text-green-700 dark:text-green-400 mt-1 font-medium">No payment needed. Explore for free.</span>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-2 w-36 sm:w-44 md:w-52">
          <button
            onClick={() => signIn('github', { callbackUrl: window.location.href })}
            className="text-sm font-semibold text-primary-foreground bg-primary border-none rounded-md shadow-sm flex justify-center items-center gap-2 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full px-4 py-2 min-w-[140px] whitespace-nowrap"
          >
            <GithubIcon className="h-4 w-4" />
            <span className="truncate">Continue with GitHub</span>
          </button>
          <button
            onClick={() => signIn('google', { callbackUrl: window.location.href })}
            className="text-sm font-semibold text-foreground bg-background border border-border hover:bg-muted rounded-md shadow-sm flex justify-center items-center gap-2 transition-all duration-75 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full px-4 py-2 min-w-[140px] whitespace-nowrap"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="truncate">Continue with Google</span>
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ExploreSectionDesktop = React.memo(function ExploreSectionDesktop({
  leaks,
  isLoading,
  selectedProvider,
  plan,
  session,
  onProviderChange,
  timeRange,
  setTimeRange,
  sortBy,
  setSortBy,
  onRefresh,
  total,
  error
}: {
  leaks: any[];
  isLoading: boolean;
  selectedProvider: Provider;
  plan: 'free' | 'basic' | 'pro';
  session: any;
  onProviderChange: (provider: Provider) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  onRefresh: () => void;
  total: number;
  error: string | null;
}) {
  const isUnauthenticated = !session || !session.user;
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Structured Data for Explore Page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Explore Leaked Keys",
            "description": "Real-time feed of API key leaks discovered in public repositories. Track security incidents as they happen with detailed insights.",
            "url": "https://apiradar.live/explore",
            "mainEntity": {
              "@type": "CollectionPage",
              "name": "API Key Leak Database",
              "description": "Comprehensive database of API key leaks from public repositories",
              "provider": {
                "@type": "Organization",
                "name": "API Radar"
              }
            }
          })
        }}
      />
      {/* Header */}
      <ExploreHeader />
      {/* Filters */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4 mb-6 animate-fade-in-up opacity-0 animate-delay-10">
        <div className="flex flex-col lg:flex-row gap-3">
          <ProviderFilter selectedProvider={selectedProvider} onProviderChange={onProviderChange} />
          {/* Time Range */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TooltipProvider>
                {TIME_RANGES.map((range) => {
                  const is30d = range.value === '30d';
                  const isPro = plan === 'pro';
                  const isBasic = plan === 'basic';
                  const isLoggedIn = !!session?.user;
                  const isDisabled = !isPro && is30d;
                  let badge = null;
                  if (isDisabled && is30d) {
                    if (!isLoggedIn) {
                      badge = <Badge variant="secondary" className="ml-2 text-xs">Sign in</Badge>;
                    } else if (isBasic || plan === 'free') {
                      badge = <Badge variant="secondary" className="ml-2 text-xs">Pro</Badge>;
                    }
                  }
                  return isDisabled ? (
                    <Tooltip key={range.value} delayDuration={100}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <SelectItem value={range.value} disabled className="opacity-50 cursor-not-allowed flex items-center">
                            {range.label}
                            {badge}
                          </SelectItem>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-background text-foreground rounded px-3 py-2 text-xs shadow-lg">
                        {(!isLoggedIn) ? 'Sign in to access this range' : 'Upgrade to Pro to access this range'}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  );
                })}
              </TooltipProvider>
            </SelectContent>
          </Select>
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Results Count and Refresh */}
        <div className="flex flex-row sm:flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-10">
          <div className="flex flex-1 items-center gap-2">
            <div className="flex-1 text-sm text-muted-foreground truncate">
              <span className="hidden sm:inline">
                {total} leak{total !== 1 ? 's' : ''} found
                {selectedProvider !== 'all' && ` for ${selectedProvider}`}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 pl-2 pr-2 py-1 text-xs font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center gap-1 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      {/* Results */}
      <div className="animate-fade-in-up opacity-0 animate-delay-10">
        <Suspense fallback={
          <div className="min-h-[200px] flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Loading results…</span>
          </div>
        }>
          <LeakTable
            leaks={leaks}
            isLoading={isLoading}
            selectedProvider={selectedProvider}
            plan={plan}
          />
        </Suspense>
      </div>
      {/* Action Card for unauthenticated users */}
      {isUnauthenticated && (
        <ActionCard onSignIn={() => signIn('github', { callbackUrl: window.location.href })} />
      )}
    </div>
  );
});

ExploreSectionDesktop.displayName = 'ExploreSectionDesktop';

export default ExploreSectionDesktop; 