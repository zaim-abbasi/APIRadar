import React, { Suspense, memo } from "react";
import dynamic from "next/dynamic";
import { Github, Linkedin, Mail, Filter, SortAsc, RefreshCw, LogIn, Rocket } from "lucide-react";
import { signIn } from "next-auth/react";
import { Github as GithubIcon } from "lucide-react";
import { ProviderFilter } from '@/components/explore/provider-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TIME_RANGES, SORT_OPTIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const LeakTable = dynamic(() => import("@/components/explore/leak-table").then(m => m.LeakTable), {
  ssr: false,
  loading: () => <div className="h-32 w-full flex items-center justify-center text-muted-foreground animate-pulse">Loading…</div>
});

const ActionCard = memo(({ onSignIn }: { onSignIn: () => void }) => (
  <div className="mt-4 w-full max-w-xs mx-auto">
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm rounded-xl shadow-md flex flex-col items-center justify-center">
      <CardContent className="p-4 flex flex-col items-center gap-3 min-h-0 w-full">
        <LogIn className="h-7 w-7 text-primary mb-1" />
        <span className="font-semibold text-base text-foreground text-center leading-tight">Sign in to unlock full access</span>
        <span className="text-xs text-muted-foreground text-center leading-snug">Sign in to view all API key leaks, copy full keys, and access advanced features.</span>
        {/* Sign-in buttons */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <button
            onClick={() => signIn('google', { callbackUrl: window.location.href })}
            className="w-full text-sm font-medium text-foreground bg-background border border-border hover:bg-muted rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-75 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-0 py-2 min-h-[36px]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          <button
            onClick={() => signIn('github', { callbackUrl: window.location.href })}
            className="w-full text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center justify-center gap-2 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-0 py-2 min-h-[36px]"
          >
            <GithubIcon className="h-4 w-4" />
            Continue with GitHub
          </button>
        </div>
        <span className="block text-xs text-green-700 dark:text-green-400 mt-2 font-medium text-center">No payment needed.<br />Explore for free.</span>
      </CardContent>
    </Card>
  </div>
));

// Import the pro trial card button from the main Explore page
import UpgradeToProCardWithTrialButton from '@/components/explore/UpgradeToProCardWithTrialButton';

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
  const isBasic = plan === 'basic';
  const isPro = plan === 'pro';
  const isLoggedIn = !!session?.user;

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-3 py-7 bg-gradient-to-b from-background via-white/90 to-muted/60 dark:from-background dark:via-zinc-900/80 dark:to-muted/60">
      {/* Header */}
      <div className="flex flex-col items-center mb-7 mt-2 z-10 w-full">
        <h1 className="text-4xl font-extrabold leading-tight text-center mb-3 text-primary tracking-tight z-10 drop-shadow-md">
          Explore Leaked API Keys
        </h1>
        <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-2 rounded-full opacity-60" />
      </div>
      {/* Filters */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4 mb-6 w-full max-w-md animate-fade-in-up opacity-0 animate-delay-10">
        <div className="flex flex-col gap-3">
          <ProviderFilter selectedProvider={selectedProvider} onProviderChange={onProviderChange} />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0" aria-label="Select time range" tabIndex={0}>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TooltipProvider>
                {TIME_RANGES.map((range) => {
                  const is30d = range.value === '30d';
                  const isDisabled = !isPro && is30d;
                  let badge = null;
                  if (isDisabled && is30d) {
                    if (!isLoggedIn) {
                      badge = <Badge variant="secondary" className="ml-2 text-xs">Sign in</Badge>;
                    } else if (isBasic) {
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
                    <SelectItem key={range.value} value={range.value} aria-label={range.label}>
                      {range.label}
                    </SelectItem>
                  );
                })}
              </TooltipProvider>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0" aria-label="Select sort order" tabIndex={0}>
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} aria-label={option.label}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Results Count and Refresh */}
        <div className="flex flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-10">
          <div className="flex-1 text-sm text-muted-foreground truncate" style={{ fontSize: '1.08rem' }}>
            {total} leak{total !== 1 ? 's' : ''} found
            {selectedProvider !== 'all' && ` for ${selectedProvider}`}
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh results"
              className="h-8 pl-2 pr-2 py-1 text-xs font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center gap-1 transition-all duration-75 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              tabIndex={0}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      {/* Leak Table */}
      <div className="w-full max-w-md mx-auto mb-10 z-10">
        <Suspense fallback={<div className="h-32 w-full flex items-center justify-center text-muted-foreground animate-pulse" aria-busy="true" aria-live="polite">Loading…</div>}>
          <LeakTable leaks={leaks} isLoading={isLoading} selectedProvider={selectedProvider} plan={plan} />
        </Suspense>
        {/* Infinite scroll sentinel for pro users */}
        {plan === 'pro' && hasMore && (
          <div ref={loadingRef} style={{ height: 1 }} />
        )}
      </div>
      {/* Action Card for unauthenticated users */}
      {isUnauthenticated && (
        <ActionCard onSignIn={() => signIn('github', { callbackUrl: window.location.href })} />
      )}
      {/* Pro Trial Card for basic users */}
      {isBasic && !isUnauthenticated && (
        <div className="mt-4 w-full max-w-xs mx-auto">
          <UpgradeToProCardWithTrialButton session={session} />
        </div>
      )}
      {/* Social/Contact Icons (mobile only, above footer) */}
      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-7 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2" aria-label="Email" tabIndex={0}>
            <Mail className="h-4 w-4" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2" aria-label="GitHub" tabIndex={0}>
            <Github className="h-4 w-4" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-primary transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </section>
  );
});

export default ExploreSectionMobile; 