import React, { Suspense, memo } from "react";
import dynamic from "next/dynamic";
import { Github, Linkedin, Mail, Filter, SortAsc, RefreshCw, LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { ProviderFilter } from '@/components/explore/provider-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TIME_RANGES, SORT_OPTIONS } from '@/lib/constants';

const LeakTable = dynamic(() => import("@/components/explore/leak-table").then(m => m.LeakTable), {
  ssr: false,
  loading: () => <div className="h-32 w-full flex items-center justify-center text-muted-foreground animate-pulse">Loading…</div>
});

const ActionCard = memo(({ onSignIn }: { onSignIn: () => void }) => (
  <div className="mt-4 w-full max-w-xs mx-auto">
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm rounded-xl shadow-md flex flex-col items-center justify-center">
      <CardContent className="p-4 flex flex-col items-center gap-2 min-h-0 w-full">
        <LogIn className="h-7 w-7 text-primary mb-1" />
        <span className="font-semibold text-base text-foreground text-center leading-tight">Sign in to unlock full access</span>
        <span className="text-xs text-muted-foreground text-center leading-snug">Sign in to view all API key leaks, copy full keys, and access advanced features.</span>
        <button
          onClick={onSignIn}
          className="mt-2 w-full text-sm font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center justify-center gap-1 transition-all duration-75 hover:bg-primary/90 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed px-0 py-2 min-h-[36px]"
        >
          Sign in with GitHub
        </button>
        <span className="block text-xs text-green-700 dark:text-green-400 mt-2 font-medium text-center">No payment needed.<br />Explore for free.</span>
      </CardContent>
    </Card>
  </div>
));

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
    error
  } = props;
  const isUnauthenticated = !session || !session.user;
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
              {TIME_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value} aria-label={range.label}>
                  {range.label}
                </SelectItem>
              ))}
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
      </div>
      {/* Action Card for unauthenticated users */}
      {isUnauthenticated && (
        <ActionCard onSignIn={() => signIn('github', { callbackUrl: window.location.href })} />
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