import React, { Suspense, memo } from "react";
import dynamic from "next/dynamic";
import { Github, Linkedin, Mail, Calendar, ArrowUpDown, RefreshCw, LogIn, Rocket, Info, ChevronDown, Check, Chrome } from "lucide-react";
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

const InstructionsSection = memo(() => {
  const [showInstructions, setShowInstructions] = React.useState(false);
  
  return (
    <div className="mb-2 px-2.5 sm:px-3 py-2 sm:py-2.5 bg-coral/10 border border-coral/20 rounded-md">
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="w-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-foreground"
      >
        <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-coral flex-shrink-0" />
        <span className="font-medium flex-1 text-left">How to identify provider</span>
        <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 flex-shrink-0 ${showInstructions ? 'rotate-180' : ''}`} />
      </button>
      {showInstructions && (
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          The <span className="font-medium text-foreground">AI Key</span> category includes keys from OpenAI, Anthropic, DeepSeek, OpenRouter, and similar providers. To identify the specific provider and available models, click the <span className="text-coral font-medium">repository name</span> and open the <span className="text-coral font-medium">Key path</span> to view how the key is placed. The code context will reveal the provider name and model configurations.
        </p>
      )}
    </div>
  );
});

InstructionsSection.displayName = 'InstructionsSection';

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
              className="text-sm font-medium text-primary-foreground bg-coral border-none rounded-md flex items-center justify-center gap-2 transition-all duration-200 ease-in-out hover:brightness-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 sm:px-5 py-3 sm:py-2.5 whitespace-nowrap w-full sm:w-auto active:scale-[0.98] min-h-[44px] sm:min-h-0"
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
    <section className="relative min-h-screen flex flex-col px-3 pt-3 pb-5 bg-background">
      {/* Header */}
      <div className="flex flex-col items-center mb-4 mt-1 z-10 w-full">
        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-center mb-2 text-foreground tracking-tight z-10">
          Explore Leaked API Keys
        </h1>
        <div className="w-10 sm:w-12 h-0.5 bg-gradient-to-r from-coral to-foreground mx-auto mb-1 rounded-full opacity-60" />
      </div>
      {/* Filters */}
      <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-md p-2 sm:p-5 mb-3 w-full max-w-md mx-auto animate-fade-in-up opacity-0 animate-delay-10 shadow-sm transition-shadow duration-200">
        <div className="flex flex-col gap-1.5 sm:gap-4">
          <ProviderFilter selectedProvider={selectedProvider} onProviderChange={onProviderChange} triggerClassName="h-9 sm:h-10 min-h-0 py-1" />
          <CustomSelect value={timeRange} onValueChange={setTimeRange}>
            <CustomSelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border h-9 sm:h-10 min-h-0 py-1" aria-label="Select time range" tabIndex={0}>
              <div className="flex items-center gap-2 w-full">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/70 flex-shrink-0" />
                <CustomSelectValue className="flex-1 text-center text-sm sm:text-base">
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
            <CustomSelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border h-9 sm:h-10 min-h-0 py-1" aria-label="Select sort order" tabIndex={0}>
              <div className="flex items-center gap-2 w-full">
                <ArrowUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/70 flex-shrink-0" />
                <CustomSelectValue className="flex-1 text-center text-sm sm:text-base">
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
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-border/40 animate-fade-in-up opacity-0 animate-delay-10">
          <InstructionsSection />
          <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 mt-1.5 w-full">
            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/40 border border-border/80 min-w-0 text-xs sm:text-sm text-muted-foreground/80 whitespace-nowrap font-medium truncate">
              <span className="font-bold">{total}</span> leak{total !== 1 ? 's' : ''} found
              {selectedProvider !== 'all' && ` for ${selectedProvider}`}
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={isLoading ? 'Refreshing' : 'Refresh results'}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-9 px-3 text-xs sm:text-sm font-medium text-primary-foreground bg-coral border border-coral/80 transition-all duration-200 ease-in-out hover:brightness-90 hover:border-coral/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed gap-1.5 min-h-0 flex-shrink-0"
              tabIndex={0}
            >
              <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-transform duration-200 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>
      {/* Leak Table */}
      <div className="w-full max-w-md mx-auto mb-6 z-10">
        <Suspense fallback={<div className="h-32 w-full flex items-center justify-center text-muted-foreground animate-pulse" aria-busy="true" aria-live="polite">Loading…</div>}>
          {/* Wrap in relative container for fade effect */}
          <div className="relative">
            <LeakTable 
              leaks={leaks} 
              isLoading={isLoading} 
              selectedProvider={selectedProvider} 
              plan={plan}
              onSignIn={isUnauthenticated ? () => signIn('google', { callbackUrl: window.location.href, redirect: true }) : undefined}
            />
            
            {/* Fade-out blur effect for unauthenticated users - suggests more content */}
            {isUnauthenticated && total > 6 && (
              <>
                <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none z-10">
                  {/* Gradient fade that keeps last row visible - starts transparent at top */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--background)) 0%, hsl(var(--background) / 0.98) 20%, hsl(var(--background) / 0.90) 40%, hsl(var(--background) / 0.70) 60%, hsl(var(--background) / 0.40) 75%, transparent 100%)' }} />
                  {/* Subtle blur overlay - lighter at top to keep last row visible */}
                  <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'linear-gradient(to top, hsl(var(--background) / 0.90) 0%, hsl(var(--background) / 0.75) 30%, hsl(var(--background) / 0.50) 55%, hsl(var(--background) / 0.25) 75%, transparent 100%)' }} />
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
      {/* Social/Contact Icons (mobile only, above footer) */}
      <footer role="contentinfo" aria-labelledby="footer-label-mobile" className="w-full text-center mt-auto pt-4 pb-3 text-xs text-muted-foreground/80 z-10 tracking-wide">
        <div className="flex items-center justify-center gap-3">
          <span id="footer-label-mobile" className="font-semibold">API Radar</span>
          <a href="mailto:zaim.k.abbasi@gmail.com" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="Email" tabIndex={0}>
            <Mail className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://github.com/zaim-abbasi" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="GitHub" tabIndex={0}>
            <Github className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
          <a href="https://www.linkedin.com/in/zaim-abbasi/" target="_blank" rel="noopener noreferrer" className="p-2.5 sm:p-1.5 rounded-md bg-muted/40 hover:bg-muted/60 text-muted-foreground/80 hover:text-coral transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/50 focus-visible:ring-offset-1 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center" aria-label="LinkedIn" tabIndex={0}>
            <Linkedin className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </a>
        </div>
      </footer>
    </section>
  );
});

export default ExploreSectionMobile; 