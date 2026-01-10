"use client";

import React, { Suspense } from 'react';
import { Calendar, ArrowUpDown, RefreshCw, LogIn, Rocket, Info, ChevronDown, Github, Linkedin } from 'lucide-react';
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
  const [showInstructions, setShowInstructions] = React.useState(false);
  
  React.useEffect(() => {
    // Only auto-open on larger desktop screens
    if (window.innerWidth >= 1024) {
      setShowInstructions(true);
    }
  }, []);
  
  return (
    <div className="mb-2 px-3 py-2.5 bg-coral/10 border border-coral/20 rounded-md">
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="w-full flex items-center gap-2 text-sm text-foreground"
      >
        <Info className="h-4 w-4 text-coral flex-shrink-0" />
        <span className="font-medium flex-1 text-left">How to identify provider</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ${showInstructions ? 'rotate-180' : ''}`} />
      </button>
      {showInstructions && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The <span className="font-medium text-foreground">AI Key</span> category includes keys from OpenAI, Anthropic, DeepSeek, OpenRouter, and similar providers. To identify the specific provider and available models, click the <span className="text-coral font-medium">repository name</span> and open the <span className="text-coral font-medium">Key path</span> to view how the key is placed. The code context will reveal the provider name and model configurations.
        </p>
      )}
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
            <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No payment needed. Explore for free.</span>
            </div>
          </div>
          
          {/* Right section: Button - vertically centered */}
          <div className="flex-shrink-0 sm:self-center">
            <button
              onClick={onSignIn}
              className="text-sm font-medium text-white bg-coral border-none rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2.5 whitespace-nowrap w-full sm:w-auto active:scale-[0.98]"
              aria-label="Sign in with Google"
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
                "name": "API Radar"
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
            <div className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                <span className="font-bold">{total}</span> leak{total !== 1 ? 's' : ''} found
                {selectedProvider !== 'all' && ` for ${selectedProvider}`}
            </div>
            
            <div className="ml-auto flex items-center gap-1 flex-shrink-0">
              <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 rounded-full bg-muted/40 border border-border/80 flex-shrink-0">
                <span className="text-[12px] tracking-wide font-semibold text-foreground/70">Built by Zaim</span>
                <div className="flex items-center gap-2">
                  <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-coral transition-colors duration-200">
                    <Github className="h-4 w-4" />
                  </a>
                  <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="text-foreground/60 hover:text-coral transition-colors duration-200">
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="w-[140px] flex justify-end flex-shrink-0">
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-9 px-3.5 text-sm font-medium text-white bg-coral border border-coral/80 transition-all duration-200 ease-in-out hover:brightness-90 hover:border-coral/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed gap-1.5"
                  aria-label={isLoading ? 'Refreshing' : 'Refresh results'}
                >
                  <RefreshCw className={`h-3.5 w-3.5 transition-transform duration-200 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
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
              onSignIn={isUnauthenticated ? () => signIn('google', { callbackUrl: window.location.href }) : undefined}
            />
            
            {/* Fade-out blur effect for unauthenticated users - suggests more content */}
            {isUnauthenticated && total > 6 && (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10">
                  {/* Gradient fade that keeps last row visible - starts transparent at top */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--beige)) 0%, hsl(var(--beige) / 0.98) 20%, hsl(var(--beige) / 0.90) 40%, hsl(var(--beige) / 0.70) 60%, hsl(var(--beige) / 0.40) 75%, transparent 100%)' }} />
                  {/* Subtle blur overlay - lighter at top to keep last row visible */}
                  <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'linear-gradient(to top, hsl(var(--beige) / 0.90) 0%, hsl(var(--beige) / 0.75) 30%, hsl(var(--beige) / 0.50) 55%, hsl(var(--beige) / 0.25) 75%, transparent 100%)' }} />
                </div>
              </>
            )}
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