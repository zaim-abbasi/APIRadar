import React, { Suspense, memo } from "react";
import dynamic from "next/dynamic";
import { Github, Linkedin, Mail, Filter, SortAsc, RefreshCw, LogIn, Rocket } from "lucide-react";
import { signIn } from "next-auth/react";
import { ProviderFilter } from '@/components/explore/provider-filter';
import { CustomSelect, CustomSelectContent, CustomSelectItem, CustomSelectTrigger, CustomSelectValue } from '@/components/ui/custom-select';
import { Card, CardContent } from '@/components/ui/card';
import { TIME_RANGES, SORT_OPTIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const LeakTable = dynamic(() => import("@/components/explore/leak-table").then(m => m.LeakTable), {
  ssr: false,
  loading: () => <div className="h-32 w-full flex items-center justify-center text-muted-foreground animate-pulse">Loading…</div>
});

// Memoized Action Card component
const ActionCard = memo(({ onSignIn }: { onSignIn: () => void }) => (
  <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `150ms` }}>
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-5">
          {/* Left section: Content */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {/* Icon and Title */}
            <div className="flex flex-row items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <LogIn className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              </div>
              <span className="text-base sm:text-lg font-semibold text-foreground">Sign in to unlock full access</span>
            </div>
            
            {/* Description */}
            <div className="text-sm text-muted-foreground/90 leading-relaxed">
              Sign in to view all API key leaks, copy full keys, and access advanced features.
            </div>
            
            {/* Benefit text */}
            <div className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 font-medium">
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
              className="text-sm font-medium text-primary-foreground bg-primary border-none rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-2.5 whitespace-nowrap w-full sm:w-auto active:scale-[0.98]"
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

// Import the pro trial card button from the main Explore page

const ExploreSectionMobile = memo(function ExploreSectionMobile(props: any) {
  const {
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
  } = props;
  const isUnauthenticated = !session || !session.user;
  const isPro = plan === 'pro';
  const isLoggedIn = !!session?.user;

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-3 py-7 bg-background">
      {/* Header */}
      <div className="flex flex-col items-center mb-7 mt-2 z-10 w-full">
        <h1 className="text-4xl font-extrabold leading-tight text-center mb-3 text-primary tracking-tight z-10 drop-shadow-md">
          Explore Leaked API Keys
        </h1>
        <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-2 rounded-full opacity-60" />
      </div>
      {/* Filters */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-4 sm:p-5 mb-6 w-full max-w-md animate-fade-in-up opacity-0 animate-delay-10 shadow-sm transition-shadow duration-200">
        <div className="flex flex-col gap-3 sm:gap-4">
          <ProviderFilter selectedProvider={selectedProvider} onProviderChange={onProviderChange} />
          <CustomSelect value={timeRange} onValueChange={setTimeRange}>
            <CustomSelectTrigger className="min-w-[150px] bg-card/60 backdrop-blur-sm border-border/60 shadow-sm" aria-label="Select time range" tabIndex={0}>
              <div className="flex items-center gap-2 w-full">
                <Filter className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                <CustomSelectValue className="flex-1 text-center">
                  {TIME_RANGES.find(r => r.value === timeRange)?.label || 'All'}
                </CustomSelectValue>
              </div>
            </CustomSelectTrigger>
            <CustomSelectContent>
              {TIME_RANGES.map((range) => {
                return (
                  <CustomSelectItem key={range.value} value={range.value} aria-label={range.label}>
                    {range.label}
                  </CustomSelectItem>
                );
              })}
            </CustomSelectContent>
          </CustomSelect>
          <CustomSelect value={sortBy} onValueChange={setSortBy}>
            <CustomSelectTrigger className="min-w-[150px] bg-card/60 backdrop-blur-sm border-border/60 shadow-sm" aria-label="Select sort order" tabIndex={0}>
              <div className="flex items-center gap-2 w-full">
                <SortAsc className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                <CustomSelectValue className="flex-1 text-center">
                  {SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Newest First'}
                </CustomSelectValue>
              </div>
            </CustomSelectTrigger>
            <CustomSelectContent>
              {SORT_OPTIONS.map((option) => (
                <CustomSelectItem key={option.value} value={option.value} aria-label={option.label}>
                  {option.label}
                </CustomSelectItem>
              ))}
            </CustomSelectContent>
          </CustomSelect>
        </div>
        {/* Results Count and Refresh */}
        <div className="flex flex-row items-center justify-between gap-2 mt-3 pt-3 border-t border-border/40 animate-fade-in-up opacity-0 animate-delay-10">
          <div className="flex-1 text-sm text-muted-foreground/80 truncate font-medium">
            <span className="font-bold">{total}</span> leak{total !== 1 ? 's' : ''} found
            {selectedProvider !== 'all' && ` for ${selectedProvider}`}
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={isLoading ? 'Refreshing' : 'Refresh results'}
              className="h-8 pl-2.5 pr-2.5 py-1 text-xs font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm hover:shadow-md flex items-center gap-1.5 transition-all duration-200 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm active:scale-[0.98]"
              tabIndex={0}
            >
              <RefreshCw className={`h-3.5 w-3.5 transition-transform duration-200 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      {/* Leak Table */}
      <div className="w-full max-w-md mx-auto mb-10 z-10">
        <Suspense fallback={<div className="h-32 w-full flex items-center justify-center text-muted-foreground animate-pulse" aria-busy="true" aria-live="polite">Loading…</div>}>
          {/* Wrap in relative container for fade effect */}
          <div className="relative">
            <LeakTable leaks={leaks} isLoading={isLoading} selectedProvider={selectedProvider} plan={plan} />
            
            {/* Fade-out blur effect for unauthenticated users - suggests more content */}
            {isUnauthenticated && total > 6 && (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10">
                  {/* Gradient fade that keeps last row visible - starts transparent at top */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.98) 20%, hsl(var(--background) / 0.90) 40%, hsl(var(--background) / 0.70) 60%, hsl(var(--background) / 0.40) 75%, transparent 100%)' }} />
                  {/* Subtle blur overlay - lighter at top to keep last row visible */}
                  <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'linear-gradient(to top, hsl(var(--background) / 0.90) 0%, hsl(var(--background) / 0.75) 30%, hsl(var(--background) / 0.50) 55%, hsl(var(--background) / 0.25) 75%, transparent 100%)' }} />
                </div>
                {/* Sign in hint - outside pointer-events-none container */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 z-20">
                  <button
                    onClick={() => signIn('google', { callbackUrl: window.location.href })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-secondary border border-border rounded-md shadow-sm hover:bg-secondary/80 hover:text-foreground transition-all duration-200 focus:outline-none"
                    aria-label="Sign in to view all leaks"
                  >
                    <span>Sign in to View all</span>
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </button>
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
      {/* Action Card for unauthenticated users */}
      {isUnauthenticated && (
        <ActionCard onSignIn={() => signIn('google', { callbackUrl: window.location.href })} />
      )}
      {/* Social/Contact Icons (mobile only, above footer) */}
      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-7 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="Email" tabIndex={0}>
            <Mail className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="GitHub" tabIndex={0}>
            <Github className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
    </section>
  );
});

export default ExploreSectionMobile; 