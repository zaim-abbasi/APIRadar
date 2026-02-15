"use client";

import React, { Suspense } from 'react';
import { Calendar, ArrowUpDown, RefreshCw, LogIn, Rocket, Sparkles, Info, ChevronDown, Github, Linkedin, Check, Chrome } from 'lucide-react';
import { signIn } from "next-auth/react";
import { ProviderFilter } from '@/components/explore/provider-filter';
import { CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue } from '@/components/ui/custom-select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { Card, CardContent } from '@/components/ui/card';
import { TIME_RANGES, SORT_OPTIONS, PROVIDERS } from '@/lib/constants';
import { Provider } from '@/types';

const ExploreHeader = React.memo(() => (
  <div className="mb-6 text-center">
  </div>
));

ExploreHeader.displayName = 'ExploreHeader';

const InstructionsSection = React.memo(() => {
  return (
    <div className="mb-2 px-3 py-1.5 bg-coral/10 border border-coral/20 rounded-md flex flex-col gap-1">
      <div className="flex items-start sm:items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-coral flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-foreground/90 leading-relaxed">
          System Update: We've upgraded our dashboard. Please <span className="text-coral font-medium">Sign in</span> again to get full access to all leak cards.
        </p>
      </div>
      <div className="flex items-start sm:items-center gap-2.5">
        <Info className="h-4 w-4 text-coral flex-shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-foreground/90 leading-relaxed">
          To check provider details, click the <span className="text-coral font-medium">Repo Name</span> to directly open the leak location and code context.
        </p>
      </div>
    </div>
  );
});

InstructionsSection.displayName = 'InstructionsSection';

// Memoize ActionCard to prevent unnecessary re-renders
const ActionCard = React.memo(({ onSignIn }: { onSignIn: () => void }) => (
  <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `150ms` }}>
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
          {/* Left section: Content */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-row items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-coral/10">
                <LogIn className="h-5 w-5 sm:h-6 sm:w-6 text-coral flex-shrink-0" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-foreground">Sign in to unlock full access</span>
            </div>
            
            {/* Description */}
            <div className="text-sm text-muted-foreground/90 leading-relaxed">
              Sign in to view all API key leaks and access advanced features.
            </div>
            
            {/* Benefit text */}
            <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
              <Check className="h-3.5 w-3.5 text-coral" aria-hidden="true" focusable="false" />
              <span>No payment needed. Explore for free.</span>
            </div>
          </div>
          
          {/* Right section: Button - vertically centered */}
          <div className="flex-shrink-0 sm:self-center">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-primary-foreground bg-coral border-none rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2.5 whitespace-nowrap w-full sm:w-auto active:scale-[0.98]"
              aria-label="Sign in with Google"
            >
              <Chrome className="h-4 w-4" aria-hidden="true" focusable="false" />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
));
ActionCard.displayName = 'ActionCard';

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
    <div className="container mx-auto px-4 pt-3 pb-6">
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
                "name": "APIRadar"
              }
            }
          })
        }}
      />
      {/* Header */}
      <ExploreHeader />
      {/* Filters */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-md p-4 sm:p-5 mb-6 animate-fade-in-up opacity-0 animate-delay-10 shadow-sm transition-shadow duration-200">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
          <div className="flex-1 lg:w-[33.333%]">
            <ProviderFilter selectedProvider={selectedProvider} onProviderChange={onProviderChange} />
          </div>
          {/* Time Range */}
          <div className="flex-1 lg:w-[33.333%]">
            <CustomSelect value={timeRange} onValueChange={setTimeRange}>
              <CustomSelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border">
                <div className="flex items-center gap-2 w-full">
                  <Calendar className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                  <CustomSelectValue className="flex-1 text-center">
                    {TIME_RANGES.find(r => r.value === timeRange)?.label || 'All'}
                  </CustomSelectValue>
                </div>
              </CustomSelectTrigger>
              <CustomSelectContent>
                {TIME_RANGES.map((range) => {
                  return (
                    <CustomSelectItem key={range.value} value={range.value}>
                      {range.label}
                    </CustomSelectItem>
                  );
                })}
              </CustomSelectContent>
            </CustomSelect>
          </div>
          {/* Sort */}
          <div className="flex-1 lg:w-[33.333%]">
            <CustomSelect value={sortBy} onValueChange={setSortBy}>
              <CustomSelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border">
                <div className="flex items-center gap-2 w-full">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                  <CustomSelectValue className="flex-1 text-center">
                    {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Newest First'}
                  </CustomSelectValue>
                </div>
              </CustomSelectTrigger>
              <CustomSelectContent>
                {SORT_OPTIONS.map((option) => (
                  <CustomSelectItem key={option.value} value={option.value}>
                    {option.label}
                  </CustomSelectItem>
                ))}
              </CustomSelectContent>
            </CustomSelect>
          </div>
        </div>
        {/* Results Count and Refresh */}
        <div className="mt-3 pt-3 border-t border-border/40 animate-fade-in-up opacity-0 animate-delay-10">
          <InstructionsSection />
          <div className="flex flex-row items-center gap-2 flex-wrap">
            <div className="inline-flex items-center px-3 py-1 rounded-md bg-muted/40 border border-border/80 text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                <span className="font-bold mr-1">{total}</span> leak{total !== 1 ? 's' : ''} found
            </div>

            <div className="hidden xl:flex flex-1 justify-center items-center px-4">
              <span className="text-sm font-medium text-muted-foreground italic text-center animate-pulse-slow">
                "Found a bug or have a feature request?{" "}
                <a 
                  href="https://github.com/zaim-abbasi/apiradar-community/discussions" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-coral hover:underline underline-offset-4 pointer-events-auto"
                >
                  Join the GitHub Discussion.
                </a>
                "
              </span>
            </div>
            
            <div className="w-[120px] flex justify-end flex-shrink-0">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-9 px-4 text-sm font-medium text-foreground bg-background border border-border shadow-sm transition-all duration-200 ease-in-out hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                aria-label={isLoading ? 'Refreshing' : 'Refresh results'}
              >
                <RefreshCw className={`h-3.5 w-3.5 transition-transform duration-200 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
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
              onSignIn={isUnauthenticated ? () => signIn('google', { callbackUrl: window.location.href, redirect: true }) : undefined}
            />

          </div>
        </Suspense>
        {/* Infinite scroll sentinel for pro users */}
        {plan === 'pro' && hasMore && (
          <div ref={loadingRef} style={{ height: 1 }} />
        )}
      </div>
    </div>
  );
});

ExploreSectionDesktop.displayName = 'ExploreSectionDesktop';

export default ExploreSectionDesktop; 