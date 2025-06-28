"use client";

import React, { useState, useMemo, Suspense, useCallback, useEffect } from 'react';
import { Filter, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProviderFilter } from '@/components/explore/provider-filter';
const LeakTable = React.lazy(() => import('@/components/explore/leak-table').then(m => ({ default: m.LeakTable })));
import { mockLeaks } from '@/lib/mock-data';
import { TIME_RANGES, SORT_OPTIONS } from '@/lib/constants';
import { Provider } from '@/types';

const PAGE_SIZE = 10;

// Memoized Header component
const ExploreHeader = React.memo(() => (
  <div className="mb-8 animate-fade-in-up opacity-0 animate-delay-100">
    <h1 className="text-3xl md:text-4xl font-bold mb-4">
      Explore Leaked Keys
    </h1>
    <p className="text-lg text-muted-foreground">
      Real-time feed of API key leaks discovered in public repositories.
    </p>
  </div>
));

ExploreHeader.displayName = 'ExploreHeader';

// Memoized Results Count component
const ResultsCount = React.memo(({ 
  filteredLeaks, 
  selectedProvider, 
  isClient, 
  isLoading, 
  onRefresh 
}: { 
  filteredLeaks: any[]; 
  selectedProvider: Provider; 
  isClient: boolean; 
  isLoading: boolean; 
  onRefresh: () => void; 
}) => (
  <div className="flex flex-row sm:flex-row items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 animate-fade-in-up opacity-0 animate-delay-200">
    <div className="flex-1 text-sm text-muted-foreground truncate">
      {isClient && (
        <>
          <span className="block sm:hidden">{filteredLeaks.length} leaks found</span>
          <span className="hidden sm:inline">
            {filteredLeaks.length} leak{filteredLeaks.length !== 1 ? 's' : ''} found
            {selectedProvider !== 'all' && ` for ${selectedProvider}`}
          </span>
        </>
      )}
    </div>
    <div className="flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 h-8 px-3 text-xs sm:h-10 sm:px-5 sm:text-sm"
      >
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </Button>
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
  onRefresh 
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
}) => (
  <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg p-6 mb-6 animate-fade-in-up opacity-0 animate-delay-150">
    <div className="flex flex-col lg:flex-row gap-4">
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

const ExplorePage = React.memo(() => {
  const [selectedProvider, setSelectedProvider] = useState<Provider>('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [sortBy, setSortBy] = useState('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedProvider, timeRange, sortBy]);

  const filteredLeaks = useMemo(() => {
    let filtered = [...mockLeaks];

    // Only show leaks from supported providers
    const allowedProviders = ['openai', 'anthropic', 'google'];
    filtered = filtered.filter(leak => allowedProviders.includes(leak.provider));

    // Filter by provider
    if (selectedProvider !== 'all') {
      filtered = filtered.filter(leak => leak.provider === selectedProvider);
    }

    // Filter by time range
    const now = new Date();
    const timeFilters: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    if (timeFilters[timeRange]) {
      const cutoff = new Date(now.getTime() - timeFilters[timeRange]);
      filtered = filtered.filter(leak => new Date(leak.timestamp) >= cutoff);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case 'provider':
        filtered = filtered.sort((a, b) => a.provider.localeCompare(b.provider));
        break;
    }

    return filtered;
  }, [selectedProvider, timeRange, sortBy]);

  // Paginated leaks for lazy loading
  const paginatedLeaks = useMemo(() => {
    return filteredLeaks.slice(0, page * PAGE_SIZE);
  }, [filteredLeaks, page]);

  const hasMore = paginatedLeaks.length < filteredLeaks.length;

  const handleProviderChange = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true);
    setTimeout(() => {
      setPage(p => p + 1);
      setLoadingMore(false);
    }, 700);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <ExploreHeader />

      {/* Filters */}
      <FiltersSection 
        selectedProvider={selectedProvider}
        onProviderChange={handleProviderChange}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filteredLeaks={filteredLeaks}
        isClient={isClient}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Results */}
      <ResultsSection 
        filteredLeaks={paginatedLeaks}
        isLoading={isLoading}
        selectedProvider={selectedProvider}
      />

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-muted/50 focus:ring-0 focus:ring-offset-0 h-8 px-3 text-xs sm:h-10 sm:px-5 sm:text-sm"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
});

ExplorePage.displayName = 'ExplorePage';

export default ExplorePage;