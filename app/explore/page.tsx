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

const PAGE_SIZE = 10;

// Memoized Header component
const ExploreHeader = React.memo(() => (
  <div className="mb-3 animate-fade-in-up opacity-0 animate-delay-100 text-center">
    <h1 className="text-3xl md:text-4xl font-semibold mb-1 bg-gradient-to-r from-primary to-foreground bg-clip-text text-transparent tracking-tight inline-block relative">
      Explore Leaked Keys
      <span className="block mx-auto mt-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-primary to-foreground opacity-60" />
    </h1>
    <p className="text-base text-muted-foreground max-w-xl mx-auto leading-snug mt-1">
      Real-time feed of API key leaks discovered in public repositories.
    </p>
  </div>
));

ExploreHeader.displayName = 'ExploreHeader';

// Helper to get provider label from value
function getProviderLabel(value: string) {
  const found = PROVIDERS.find((p) => p.value === value);
  return found ? found.label : value;
}

// Memoized Results Count component
const ResultsCount = React.memo(({ 
  filteredLeaks, 
  selectedProvider, 
  isClient, 
  isLoading, 
  onRefresh, 
  total
}: { 
  filteredLeaks: any[]; 
  selectedProvider: Provider; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
  total: number;
}) => (
  <div className="flex flex-row sm:flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-200">
    <div className="flex-1 text-sm text-muted-foreground truncate">
      {isClient && (
        <>
          <span className="block sm:hidden">{total} leaks found</span>
          <span className="hidden sm:inline">
            {total} leak{total !== 1 ? 's' : ''} found
            {selectedProvider !== 'all' && ` for ${getProviderLabel(selectedProvider)}`}
          </span>
        </>
      )}
    </div>
    <div className="flex-shrink-0">
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="h-8 pl-2 pr-2 py-1 text-xs font-medium text-primary-foreground bg-primary border-none rounded-md shadow-sm flex items-center gap-1 transition-all duration-150 hover:bg-primary/90 focus:outline-none"
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  </div>
));

ResultsCount.displayName = 'ResultsCount';

// Memoized Filters component
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
  total
}: { 
  selectedProvider: Provider; 
  onProviderChange: (provider: Provider) => void; 
  timeRange: string; 
  setTimeRange: (range: string) => void; 
  sortBy: string; 
  setSortBy: (sort: string) => void; 
  filteredLeaks: any[]; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
  total: number;
}) => (
  <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-4 mb-4 animate-fade-in-up opacity-0 animate-delay-150">
    <div className="flex flex-col lg:flex-row gap-3">
      {/* Provider Filter */}
      <ProviderFilter
        selectedProvider={selectedProvider}
        onProviderChange={onProviderChange}
      />

      {/* Time Range */}
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-150 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGES.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select value={sortBy} onValueChange={setSortBy}>
        <SelectTrigger className="min-w-[150px] bg-card/50 backdrop-blur-sm transition-all duration-150 hover:bg-card/70 focus:ring-0 focus:ring-offset-0">
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
    />
  </div>
));

FiltersSection.displayName = 'FiltersSection';

// Memoized Results component
const ResultsSection = React.memo(({ 
  filteredLeaks, 
  isLoading, 
  selectedProvider 
}: { 
  filteredLeaks: any[]; 
  isLoading: boolean; 
  selectedProvider: Provider; 
}) => (
  <div className="animate-fade-in-up opacity-0 animate-delay-300">
    <Suspense fallback={
      <div className="min-h-[200px] flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading results…</span>
      </div>
    }>
      <LeakTable 
        leaks={filteredLeaks} 
        isLoading={isLoading}
        selectedProvider={selectedProvider}
      />
    </Suspense>
  </div>
));

ResultsSection.displayName = 'ResultsSection';

// Memoized Loading Indicator component for infinite scroll
const LoadingIndicator = React.memo(() => (
  <div className="h-1" />
));

LoadingIndicator.displayName = 'LoadingIndicator';

const ExplorePage = React.memo(() => {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false); // for initial/full reload
  const [isLoadingMore, setIsLoadingMore] = useState(false); // for infinite scroll
  const [isClient, setIsClient] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [leaks, setLeaks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Ref for intersection observer
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
    if (!hasMore || isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage((prev) => prev + 1);
      }
    }, { rootMargin: '0px 0px 600px 0px' });

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedProvider, timeRange, sortBy]);

  // Update fetchAndSetLeaks to append leaks if page > 1
  const fetchAndSetLeaks = useCallback(async () => {
    if (page === 1) {
      setIsLoading(true);
      setIsLoadingMore(false);
    } else {
      setIsLoadingMore(true);
    }
    const backendProvider = PROVIDER_API_MAP[selectedProvider] || selectedProvider;
    const { data, error } = await fetchLeaks({
      provider: backendProvider,
      timeRange,
      sortBy,
      page,
      limit: PAGE_SIZE,
    });
    if (data) {
      setLeaks((prev) => {
        if (page === 1) return data.leaks;
        const existingIds = new Set(prev.map((l) => l.id));
        const newLeaks = data.leaks.filter((l) => !existingIds.has(l.id));
        return [...prev, ...newLeaks];
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
    }
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [selectedProvider, timeRange, sortBy, page, refreshIndex]);

  useEffect(() => {
    fetchAndSetLeaks();
  }, [fetchAndSetLeaks]);

  const handleRefresh = () => {
    setPage(1);
    setRefreshIndex((i) => i + 1);
  };

  // Memoized filter props to prevent unnecessary re-renders
  const filterProps = useMemo(() => ({
    selectedProvider,
    onProviderChange: setSelectedProvider,
    timeRange,
    setTimeRange,
    sortBy,
    setSortBy,
    filteredLeaks: leaks,
    isClient,
    isLoading,
    onRefresh: handleRefresh,
    total
  }), [selectedProvider, setSelectedProvider, timeRange, setTimeRange, sortBy, setSortBy, leaks, isClient, isLoading, handleRefresh, total]);

  // Memoized results props
  const resultsProps = useMemo(() => ({
    filteredLeaks: leaks,
    isLoading,
    selectedProvider
  }), [leaks, isLoading, selectedProvider]);

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Header */}
      <ExploreHeader />

      {/* Filters */}
      <FiltersSection {...filterProps} />

      {/* Results */}
      {/* Only show full-table skeleton if initial load */}
      {isLoading && page === 1 ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted/40 rounded-lg h-20 mb-4" />
          ))}
        </div>
      ) : (
        <ResultsSection {...resultsProps} />
      )}

      {/* Invisible trigger for infinite scroll */}
      {hasMore && (
        <div ref={loadingRef}>
          <LoadingIndicator />
          {isLoadingMore && (
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