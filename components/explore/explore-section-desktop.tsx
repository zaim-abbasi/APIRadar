"use client";

import React, { Suspense } from 'react';
import { Filter, SortAsc, RefreshCw, LogIn, Rocket } from 'lucide-react';
import { signIn } from "next-auth/react";
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
  <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `150ms` }}>
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left section: Content */}
          <div className="flex-1 space-y-2 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-row items-center gap-2">
              <LogIn className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <span className="text-base sm:text-lg font-semibold text-foreground">Sign in to unlock full access</span>
            </div>
            
            {/* Description */}
            <div className="text-sm text-muted-foreground leading-relaxed">
              Sign in to view all API key leaks, copy full keys, and access advanced features.
            </div>
            
            {/* Benefit text */}
            <div className="text-xs text-green-700 dark:text-green-400 font-medium">
              No payment needed. Explore for free.
            </div>
          </div>
          
          {/* Right section: Button - vertically centered */}
          <div className="flex-shrink-0 sm:self-center">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2 whitespace-nowrap w-full sm:w-auto"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
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
  error,
  loadingRef,
  hasMore
}: {
  leaks: any[];
  isLoading: boolean;
  selectedProvider: Provider;
  plan: 'free' | 'pro';
  session: any;
  onProviderChange: (provider: Provider) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  onRefresh: () => void;
  total: number;
  error: string | null;
  loadingRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
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
                  const isLoggedIn = !!session?.user;
                  const isDisabled = !isPro && is30d;
                  let badge = null;
                  if (isDisabled && is30d) {
                    if (!isLoggedIn) {
                      badge = <Badge variant="secondary" className="ml-2 text-xs">Sign in</Badge>;
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
                        Sign in to access this range
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
          {/* Wrap in relative container for fade effect */}
          <div className="relative">
            <LeakTable
              leaks={leaks}
              isLoading={isLoading}
              selectedProvider={selectedProvider}
              plan={plan}
            />
            
            {/* Fade-out blur effect for unauthenticated users - suggests more content */}
            {isUnauthenticated && total > 6 && (
              <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10">
                {/* Gradient fade */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />
                {/* Blur overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/60 to-transparent backdrop-blur-sm" />
                 {/* Subtle pulsing animation hint */}
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse">
                   <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                     <span>Sign in to View all</span>
                     <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                     </svg>
                   </div>
                 </div>
              </div>
            )}
          </div>
        </Suspense>
        {/* Infinite scroll sentinel for pro users */}
        {plan === 'pro' && hasMore && (
          <div ref={loadingRef} style={{ height: 1 }} />
        )}
      </div>
      {/* Action Card for unauthenticated users */}
      {isUnauthenticated && (
        <ActionCard onSignIn={() => signIn('google', { callbackUrl: window.location.href })} />
      )}
    </div>
  );
});

ExploreSectionDesktop.displayName = 'ExploreSectionDesktop';

export default ExploreSectionDesktop; 