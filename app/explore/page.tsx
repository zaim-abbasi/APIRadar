"use client";

import React, { useState, useMemo, Suspense, useCallback, useEffect, useRef } from 'react';
import { Filter, SortAsc, RefreshCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderFilter } from '@/components/explore/provider-filter';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { TIME_RANGES, SORT_OPTIONS, PROVIDERS, PROVIDER_API_MAP } from '@/lib/constants';
import { Provider } from '@/types';
import { fetchLeaks } from '@/lib/api';
import { useSession, signIn } from 'next-auth/react';
import { usePlanCheck } from '@/hooks/use-plan-check';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';

// Production constants
const PAGE_SIZE = 10;
const INFINITE_SCROLL_MARGIN = '0px 0px 600px 0px';

// Types for better type safety
interface LeakData {
  id: string;
  provider: string;
  repository: string;
  file: string;
  line: number;
  createdAt: string;
  [key: string]: any;
}

interface LeaksResponse {
  leaks: LeakData[];
  total: number;
  hasMore: boolean;
}

interface FilterState {
  selectedProvider: Provider;
  timeRange: string;
  sortBy: string;
}

interface LoadingState {
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
}

interface PaginationState {
  page: number;
  hasMore: boolean;
  total: number;
  refreshIndex: number;
}

// Production-grade error handling
class ExplorePageError extends Error {
  constructor(message: string, public code: string, public context?: any) {
    super(message);
    this.name = 'ExplorePageError';
  }
}

// Memoized Header component
const ExploreHeader = React.memo(() => (
  <div className="mb-6 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-2 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight">
      Explore Leaked Keys
    </h1>
    <div className="w-16 h-0.5 bg-gradient-to-r from-primary to-foreground mx-auto mb-3 rounded-full opacity-60" />
    <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
      Real-time feed of API key leaks discovered in public repositories. 
      Track security incidents as they happen with detailed insights.
    </p>
  </div>
));

ExploreHeader.displayName = 'ExploreHeader';

// Helper to get provider label from value
function getProviderLabel(value: string): string {
  const found = PROVIDERS.find((p) => p.value === value);
  return found ? found.label : value;
}

// Memoized Results Count component with improved error handling
const ResultsCount = React.memo(({ 
  filteredLeaks, 
  selectedProvider, 
  isClient, 
  isLoading, 
  onRefresh, 
  total,
  error
}: { 
  filteredLeaks: LeakData[]; 
  selectedProvider: Provider; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
  total: number;
  error: string | null;
}) => (
  <div className="flex flex-row sm:flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-10">
    <div className="flex flex-1 items-center gap-2">
      <div className="flex-1 text-sm text-muted-foreground truncate">
        {isClient && !error && (
          <>
            <span className="block sm:hidden">{total} leaks found</span>
            <span className="hidden sm:inline">
              {total} leak{total !== 1 ? 's' : ''} found
              {selectedProvider !== 'all' && ` for ${getProviderLabel(selectedProvider)}`}
            </span>
          </>
        )}
        {error && (
          <span className="text-destructive text-sm">
            Error loading data. Please try refreshing.
          </span>
        )}
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
));

ResultsCount.displayName = 'ResultsCount';

// Memoized Filters component with improved error handling
const FiltersSection = React.memo(({ 
  selectedProvider, 
  onProviderChange, 
  timeRange, 
  setTimeRange, 
  sortBy, 
  setSortBy, 
  filteredLeaks, 
  isClient, 
  isLoading, 
  onRefresh, 
  total,
  session,
  plan,
  error
}: { 
  selectedProvider: Provider; 
  onProviderChange: (provider: Provider) => void; 
  timeRange: string; 
  setTimeRange: (range: string) => void; 
  sortBy: string; 
  setSortBy: (sort: string) => void; 
  filteredLeaks: LeakData[]; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
  total: number;
  session: any;
  plan: string;
  error: string | null;
}) => {
  // Time filter gating logic
  const isPro = plan === 'pro';
  const isBasic = plan === 'basic';
  const isLoggedIn = !!session?.user;
  const requestedTrial = session?.user?.requestedTrial;
  const [open, setOpen] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [message, setMessage] = useState('');

  return (
    <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4 mb-6 animate-fade-in-up opacity-0 animate-delay-10">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Provider Filter */}
        <ProviderFilter
          selectedProvider={selectedProvider}
          onProviderChange={onProviderChange}
        />

        {/* Time Range */}
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-75 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TooltipProvider>
              {TIME_RANGES.map((range) => {
                const isDisabled = !isPro && range.value !== '7d';
                return isDisabled ? (
                  <Tooltip key={range.value} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <SelectItem value={range.value} disabled className="opacity-50 cursor-not-allowed flex items-center">
                          {range.label}
                          <Badge variant="secondary" className="ml-2 text-xs">Pro</Badge>
                        </SelectItem>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-background text-foreground rounded px-3 py-2 text-xs shadow-lg">
                      Upgrade to Pro to access this range
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

      {/* Results Count */}
      <ResultsCount 
        filteredLeaks={filteredLeaks}
        selectedProvider={selectedProvider}
        isClient={isClient}
        isLoading={isLoading}
        onRefresh={onRefresh}
        total={total}
        error={error}
      />
    </div>
  );
});

FiltersSection.displayName = 'FiltersSection';

// Memoized Results component with improved error handling
const ResultsSection = React.memo(({ 
  filteredLeaks, 
  isLoading, 
  selectedProvider, 
  session, 
  plan,
  error
}: { 
  filteredLeaks: LeakData[]; 
  isLoading: boolean; 
  selectedProvider: Provider; 
  session: any;
  plan: string;
  error: string | null;
}) => {
  let visibleLeaks: (LeakData | null)[] = [];
  let tileLimit = 2;
  const isUnauthenticated = !session || !session.user;
  
  if (plan === 'pro') {
    visibleLeaks = filteredLeaks;
    tileLimit = filteredLeaks.length;
  } else if (plan === 'basic') {
    visibleLeaks = filteredLeaks.slice(0, 5);
    tileLimit = 5;
  } else {
    // Always show exactly 3 tiles (fill with nulls if needed)
    visibleLeaks = filteredLeaks.slice(0, 3);
    while (visibleLeaks.length < 3) {
      visibleLeaks.push(null);
    }
    tileLimit = 3;
  }

  // Show error state
  if (error) {
    return (
      <div className="animate-fade-in-up opacity-0 animate-delay-10">
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-destructive text-lg font-semibold mb-2">
              Failed to load data
            </div>
            <div className="text-muted-foreground text-sm">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up opacity-0 animate-delay-10">
      <Suspense fallback={
        <div className="min-h-[200px] flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading results…</span>
        </div>
      }>
        {/* Leak tiles (with skeletons for nulls) */}
        <LeakTable 
          leaks={visibleLeaks} 
          isLoading={isLoading}
          selectedProvider={selectedProvider}
        />
        {/* Gating tile for unauthenticated users: always show as 4th tile */}
        {isUnauthenticated && (
          <div className="mt-4 flex justify-center">
            <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `100ms` }}>
              <div className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg">
                <div className="p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4 min-h-[80px]">
                  <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-base sm:text-lg">Sign in to see more leaks</span>
                    </div>
                    <span className="text-muted-foreground text-xs sm:text-sm">Sign in to unlock more API key leaks and advanced features.</span>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end">
                    <button
                      onClick={() => signIn('github', { callbackUrl: window.location.href })}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 transition focus:outline-none text-xs sm:text-sm"
                    >
                      Sign in with GitHub
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Gating tile for authenticated non-pro users (if more leaks exist) */}
        {!isUnauthenticated && filteredLeaks.length > tileLimit && plan !== 'pro' && (
          <div className="mt-4 flex justify-center">
            <UpgradeToProCardWithTrialButton session={session} />
          </div>
        )}
      </Suspense>
    </div>
  );
});

ResultsSection.displayName = 'ResultsSection';

// Memoized Loading Indicator component for infinite scroll
const LoadingIndicator = React.memo(() => (
  <div className="h-1" />
));

LoadingIndicator.displayName = 'LoadingIndicator';

// Production-grade trial request component
function UpgradeToProCardWithTrialButton({ session }: { session: any }) {
  const { plan, requestedTrial: hookRequestedTrial } = usePlanCheck();
  const [requestedTrial, setRequestedTrial] = React.useState<boolean>(!!session?.user?.requestedTrial);
  const isBasic = plan === 'basic';
  const [status, setStatus] = React.useState<'idle'|'submitting'|'success'|'error'>('idle');

  React.useEffect(() => {
    setRequestedTrial(!!hookRequestedTrial);
  }, [hookRequestedTrial]);

  async function handleRequest() {
    try {
      setStatus('submitting');
      const res = await fetch('/api/user/request-trial', { method: 'POST' });
      
      if (res.ok) {
        setStatus('success');
        setRequestedTrial(true);
        // Immediately refresh status from API to ensure UI is up to date
        const statusRes = await fetch('/api/user/trial-status');
        if (statusRes.ok) {
          const data = await statusRes.json();
          setRequestedTrial(!!data.requestedTrial);
        }
      } else {
        throw new Error(`Request failed: ${res.status}`);
      }
    } catch (error) {
      console.error('Trial request failed:', error);
      setStatus('error');
    }
  }

  return (
    <div className="group animate-fade-in-up opacity-0" style={{ animationDelay: `100ms` }}>
      <div className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg">
        <div className="p-4 sm:p-6 flex items-center justify-between gap-3 sm:gap-4 min-h-[80px]">
          <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-base sm:text-lg">Request a Free Pro Trial</span>
            </div>
            <span className="text-muted-foreground text-xs sm:text-sm">Get Full Access to All API Key Leaks and Advanced Features for a Limited Time.</span>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end">
            {isBasic && !requestedTrial ? (
              <button
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-semibold shadow hover:bg-primary/90 transition focus:outline-none text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleRequest}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Requesting...' : 'Request Pro Trial'}
              </button>
            ) : requestedTrial || status === 'success' ? (
              <span className="inline-block px-3 py-1 rounded bg-muted text-muted-foreground font-medium text-xs sm:text-sm">Pro trial request sent</span>
            ) : null}
            {status === 'error' && <span className="inline-block mt-2 px-3 py-1 rounded bg-destructive text-destructive-foreground font-medium text-xs sm:text-sm">Error sending request. Please try again.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main ExplorePage component with production-grade features
const ExplorePage = React.memo(() => {
  const { data: session } = useSession();
  const { plan, isPro, isBasic, isAuthenticated } = usePlanCheck();
  
  // State management with proper typing
  const [filterState, setFilterState] = useState<FilterState>({
    selectedProvider: 'all',
    timeRange: '7d',
    sortBy: 'newest'
  });
  
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isLoadingMore: false,
    error: null
  });
  
  const [paginationState, setPaginationState] = useState<PaginationState>({
    page: 1,
    hasMore: false,
    total: 0,
    refreshIndex: 0
  });
  
  const [leaks, setLeaks] = useState<LeakData[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  // Refs for intersection observer
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Memoized time filters to prevent recalculation
  const timeFilters = useMemo(() => ({
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  } as Record<string, number>), []);

  // Memoized allowed providers
  const allowedProviders = useMemo(() => ['openai', 'anthropic', 'google'], []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Infinite scroll: observe loadingRef and increment page when visible
  useEffect(() => {
    if (!paginationState.hasMore || loadingState.isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPaginationState(prev => ({ ...prev, page: prev.page + 1 }));
      }
    }, { rootMargin: INFINITE_SCROLL_MARGIN });

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [paginationState.hasMore, loadingState.isLoading]);

  // Reset page to 1 and set loading true when filters change
  useEffect(() => {
    setPaginationState(prev => ({ ...prev, page: 1 }));
    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
  }, [filterState.selectedProvider, filterState.timeRange, filterState.sortBy]);

  // Production-grade data fetching with error handling
  const fetchAndSetLeaks = useCallback(async () => {
    try {
      if (paginationState.page === 1) {
        setLoadingState(prev => ({ ...prev, isLoading: true, isLoadingMore: false, error: null }));
      } else {
        setLoadingState(prev => ({ ...prev, isLoadingMore: true }));
      }
      
      const backendProvider = PROVIDER_API_MAP[filterState.selectedProvider] || filterState.selectedProvider;
      const { data, error } = await fetchLeaks({
        provider: backendProvider,
        timeRange: filterState.timeRange,
        sortBy: filterState.sortBy,
        page: paginationState.page,
        limit: PAGE_SIZE,
      });
      
      if (error) {
        throw new ExplorePageError(error, 'FETCH_ERROR', { 
          provider: backendProvider, 
          timeRange: filterState.timeRange, 
          sortBy: filterState.sortBy,
          page: paginationState.page 
        });
      }
      
      if (data) {
        setLeaks((prev) => {
          if (paginationState.page === 1) return data.leaks;
          const existingIds = new Set(prev.map((l) => l.id));
          const newLeaks = data.leaks.filter((l) => !existingIds.has(l.id));
          return [...prev, ...newLeaks];
        });
        setPaginationState(prev => ({ 
          ...prev, 
          total: data.total, 
          hasMore: data.hasMore 
        }));
      }
    } catch (error) {
      console.error('ExplorePage data fetch failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        filterState,
        paginationState
      });
      
      setLoadingState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load data' 
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, isLoading: false, isLoadingMore: false }));
    }
  }, [filterState, paginationState.page, paginationState.refreshIndex]);

  useEffect(() => {
    fetchAndSetLeaks();
  }, [fetchAndSetLeaks]);

  const handleRefresh = useCallback(() => {
    setPaginationState(prev => ({ ...prev, page: 1, refreshIndex: prev.refreshIndex + 1 }));
    setLoadingState(prev => ({ ...prev, error: null }));
  }, []);

  const handleProviderChange = useCallback((provider: Provider) => {
    setFilterState(prev => ({ ...prev, selectedProvider: provider }));
  }, []);

  const handleTimeRangeChange = useCallback((timeRange: string) => {
    setFilterState(prev => ({ ...prev, timeRange }));
  }, []);

  const handleSortByChange = useCallback((sortBy: string) => {
    setFilterState(prev => ({ ...prev, sortBy }));
  }, []);

  // Memoized filter props to prevent unnecessary re-renders
  const filterProps = useMemo(() => ({
    selectedProvider: filterState.selectedProvider,
    onProviderChange: handleProviderChange,
    timeRange: filterState.timeRange,
    setTimeRange: handleTimeRangeChange,
    sortBy: filterState.sortBy,
    setSortBy: handleSortByChange,
    filteredLeaks: leaks,
    isClient,
    isLoading: loadingState.isLoading,
    onRefresh: handleRefresh,
    total: paginationState.total,
    session,
    plan: plan,
    error: loadingState.error
  }), [filterState, leaks, isClient, loadingState.isLoading, loadingState.error, handleRefresh, paginationState.total, session, plan, handleProviderChange, handleTimeRangeChange, handleSortByChange]);

  // Memoized results props
  const resultsProps = useMemo(() => ({
    filteredLeaks: leaks,
    isLoading: loadingState.isLoading,
    selectedProvider: filterState.selectedProvider,
    session,
    plan: plan,
    error: loadingState.error
  }), [leaks, loadingState.isLoading, filterState.selectedProvider, session, plan, loadingState.error]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <ExploreHeader />

      {/* Filters */}
      <FiltersSection {...filterProps} />

      {/* Results */}
      {/* Only show full-table skeleton if initial load */}
      {loadingState.isLoading && paginationState.page === 1 ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted/40 rounded-lg h-20 mb-4" />
          ))}
        </div>
      ) : (
        <ResultsSection {...resultsProps} />
      )}

      {/* Invisible trigger for infinite scroll */}
      {paginationState.hasMore && (
        <div ref={loadingRef}>
          <LoadingIndicator />
          {loadingState.isLoadingMore && (
            <div className="py-6">
              {/* Skeleton cards for loading more */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-muted/40 rounded-lg h-20 mb-4" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ExplorePage.displayName = 'ExplorePage';

export default ExplorePage;