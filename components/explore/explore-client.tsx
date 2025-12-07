"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useIsMobile } from "@/components/home/use-is-mobile";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { usePlanCheck } from "@/hooks/use-plan-check";
import { PROVIDER_API_MAP } from '@/lib/constants';
import { fetchLeaks, clearLeaksCache } from '@/lib/api';
import { LeakedKey, Provider } from '@/types';

// Optimize dynamic imports with loading states and proper chunking
const ExploreSectionMobile = dynamic(
  () => import("@/components/explore/explore-section-mobile"),
  { 
    ssr: false,
    loading: () => <div className="min-h-[400px] animate-pulse bg-muted/20 rounded-lg" />
  }
);
const ExploreSectionDesktop = dynamic(
  () => import("@/components/explore/explore-section-desktop"),
  { 
    ssr: false,
    loading: () => <div className="min-h-[400px] animate-pulse bg-muted/20 rounded-lg" />
  }
);

const PAGE_SIZE = 10;
const INFINITE_SCROLL_MARGIN = '0px 0px 600px 0px';
const firstPageCache: { leaks: LeakedKey[]; timestamp: number } = { leaks: [], timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

export const ExploreClient = React.memo(function ExploreClient(props: any) {
  const isMobile = useIsMobile();
  const { data: session, status: sessionStatus } = useSession();
  const { isAuthenticated } = usePlanCheck();
  const plan: 'free' | 'pro' = isAuthenticated ? 'pro' : 'free';

  // State management
  const [filterState, setFilterState] = useState<{
    selectedProvider: Provider;
    timeRange: string;
    sortBy: string;
  }>({
    selectedProvider: 'all',
    timeRange: 'all',
    sortBy: 'newest'
  });
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    isLoadingMore: false,
    error: null as string | null
  });
  const [paginationState, setPaginationState] = useState({
    page: 1,
    hasMore: false,
    total: 0,
    refreshIndex: 0
  });
  // Memoize default filters check to prevent unnecessary recalculations
  const isDefaultFilters = useMemo(
    () =>
      filterState.selectedProvider === 'all' &&
      filterState.timeRange === 'all' &&
      filterState.sortBy === 'newest' &&
      paginationState.page === 1,
    [filterState.selectedProvider, filterState.timeRange, filterState.sortBy, paginationState.page]
  );

  // Initialize leaks from cache if available (client-only to prevent hydration mismatch)
  const [leaks, setLeaks] = useState<LeakedKey[]>([]);
  
  // Load from cache on client mount only
  useEffect(() => {
    if (isDefaultFilters && firstPageCache.leaks.length > 0 && typeof window !== 'undefined') {
      const now = Date.now();
      if (now - firstPageCache.timestamp < CACHE_TTL) {
        setLeaks(firstPageCache.leaks);
      }
    }
  }, [isDefaultFilters]);
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Add a ref to track if we've already fetched data to prevent unnecessary re-fetches
  const hasInitializedRef = useRef(false);
  const prevAuthenticatedRef = useRef(isAuthenticated);
  // Root fix: Track in-flight requests to cancel stale ones
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set up IntersectionObserver for infinite scroll
  useEffect(() => {
    // Only observe if user can scroll infinitely (authenticated) and hasMore is true
    if (!isAuthenticated || !paginationState.hasMore || loadingState.isLoading) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      return;
    }
    
    // Disconnect existing observer
    if (observerRef.current) observerRef.current.disconnect();
    
    // Create new observer
    observerRef.current = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingState.isLoading && !loadingState.isLoadingMore) {
        setPaginationState(prev => ({ ...prev, page: prev.page + 1 }));
      }
    }, { rootMargin: INFINITE_SCROLL_MARGIN });
    
    // Observe the loading element
    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [paginationState.hasMore, loadingState.isLoading, loadingState.isLoadingMore, isAuthenticated]);

  // Root fix: Clear state and cache immediately when filters change to prevent stale data display
  useEffect(() => {
    // Immediately clear leaks to prevent showing stale data
    setLeaks([]);
    setPaginationState(prev => ({ ...prev, page: 1, hasMore: false, total: 0 }));
    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
    // Clear request cache to force fresh API calls with new filters
    clearLeaksCache();
    // Clear firstPageCache when filters change (not default filters)
    if (!isDefaultFilters) {
      firstPageCache.leaks = [];
      firstPageCache.timestamp = 0;
    }
  }, [filterState.selectedProvider, filterState.timeRange, filterState.sortBy]);

  // Root fix: Use ref to track latest filter state to prevent stale closures
  const filterStateRef = useRef(filterState);
  const paginationStateRef = useRef(paginationState);
  
  // Keep refs in sync with state
  useEffect(() => {
    filterStateRef.current = filterState;
  }, [filterState]);
  
  useEffect(() => {
    paginationStateRef.current = paginationState;
  }, [paginationState]);

  const fetchAndSetLeaks = useCallback(async () => {
    // Root fix: Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      // Root fix: Always use latest state from refs to prevent stale closures
      const currentFilterState = filterStateRef.current;
      const currentPaginationState = paginationStateRef.current;
      
      if (currentPaginationState.page === 1) {
        setLoadingState(prev => ({ ...prev, isLoading: true, isLoadingMore: false, error: null }));
      } else {
        setLoadingState(prev => ({ ...prev, isLoadingMore: true }));
      }
      // Map frontend provider to backend provider value using latest state
      const backendProvider = currentFilterState.selectedProvider === 'all' 
        ? 'all' 
        : (PROVIDER_API_MAP[currentFilterState.selectedProvider] || currentFilterState.selectedProvider);
      
      const { data, error } = await fetchLeaks({
        provider: backendProvider,
        timeRange: currentFilterState.timeRange,
        sortBy: currentFilterState.sortBy,
        page: currentPaginationState.page,
        limit: PAGE_SIZE,
        session,
        signal: abortController.signal,
      });
      
      // Root fix: Ignore results if request was aborted
      if (abortController.signal.aborted) {
        return;
      }
      if (error) {
        throw new Error(error);
      }
      if (data) {
        // Root fix: Use functional updates and verify we're still on the same page/filter
        const latestFilterState = filterStateRef.current;
        const latestPaginationState = paginationStateRef.current;
        
        setLeaks((prev) => {
          // Only update if filters haven't changed during the request
          if (latestPaginationState.page === 1) {
            const isDefault = latestFilterState.selectedProvider === 'all' &&
              latestFilterState.timeRange === 'all' &&
              latestFilterState.sortBy === 'newest';
            if (isDefault) {
              firstPageCache.leaks = data.leaks;
              firstPageCache.timestamp = Date.now();
            }
            return data.leaks;
          }
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
    } catch (error: any) {
      // Root fix: Don't show error if request was aborted (expected behavior)
      if (error?.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      setLoadingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    } finally {
      // Only update loading state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoadingState(prev => ({ ...prev, isLoading: false, isLoadingMore: false }));
      }
    }
  }, [session]); // Root fix: Only depend on session, use refs for filter/pagination state

  // Root fix: Wait for session to load before initial fetch
  // This ensures authenticated users get proper auth headers on first load
  useEffect(() => {
    // Only fetch when session has finished loading (not 'loading' status)
    if (!hasInitializedRef.current && sessionStatus !== 'loading') {
      hasInitializedRef.current = true;
      fetchAndSetLeaks();
    }
  }, [sessionStatus, fetchAndSetLeaks]);

  // Root fix: Single useEffect to handle all filter changes with proper debouncing
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    
    // Small delay to batch rapid filter changes
    const timeoutId = setTimeout(() => {
      fetchAndSetLeaks();
    }, 50); // 50ms debounce to batch rapid changes
    
    return () => clearTimeout(timeoutId);
  }, [filterState.selectedProvider, filterState.timeRange, filterState.sortBy, paginationState.refreshIndex, fetchAndSetLeaks]);

  // Root fix: Fetch when page changes (for infinite scroll) - use ref to prevent stale state
  useEffect(() => {
    if (hasInitializedRef.current && paginationState.page > 1) {
      fetchAndSetLeaks();
    }
  }, [paginationState.page, fetchAndSetLeaks]);

  // Re-fetch when authentication status changes to update hasMore and enable infinite scroll
  useEffect(() => {
    const authChanged = prevAuthenticatedRef.current !== isAuthenticated;
    if (authChanged && hasInitializedRef.current) {
      prevAuthenticatedRef.current = isAuthenticated;
      // Clear cache when authentication changes
      firstPageCache.leaks = [];
      firstPageCache.timestamp = 0;
      // Reset to page 1 and trigger refresh to get updated hasMore value
      // This ensures infinite scroll is enabled immediately after sign-in
      // and works for all filter categories (15d, 30d, all providers, all sort options)
      setPaginationState(prev => ({ 
        ...prev, 
        page: 1, 
        refreshIndex: prev.refreshIndex + 1 
      }));
      // Clear leaks state to force fresh data fetch
      setLeaks([]);
      // Trigger immediate refetch
      fetchAndSetLeaks();
    } else {
      prevAuthenticatedRef.current = isAuthenticated;
    }
  }, [isAuthenticated, session, fetchAndSetLeaks]);

  // Handlers
  const handleProviderChange = useCallback((provider: Provider) => {
    setFilterState(prev => ({ ...prev, selectedProvider: provider }));
  }, []);
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    setFilterState(prev => ({ ...prev, timeRange }));
  }, []);
  const handleSortByChange = useCallback((sortBy: string) => {
    setFilterState(prev => ({ ...prev, sortBy }));
  }, []);
  const handleRefresh = useCallback(() => {
    setPaginationState(prev => ({ ...prev, page: 1, refreshIndex: prev.refreshIndex + 1 }));
    setLoadingState(prev => ({ ...prev, error: null }));
  }, []);

  // Memoize shared props to prevent unnecessary re-renders of child components
  const sharedProps = useMemo(
    () => ({
      leaks,
      isLoading: loadingState.isLoading,
      selectedProvider: filterState.selectedProvider,
      plan,
      session,
      onProviderChange: handleProviderChange,
      timeRange: filterState.timeRange,
      setTimeRange: handleTimeRangeChange,
      sortBy: filterState.sortBy,
      setSortBy: handleSortByChange,
      onRefresh: handleRefresh,
      total: paginationState.total,
      error: loadingState.error,
    }),
    [
      leaks,
      loadingState.isLoading,
      filterState.selectedProvider,
      filterState.timeRange,
      filterState.sortBy,
      plan,
      session,
      paginationState.total,
      loadingState.error,
      handleProviderChange,
      handleTimeRangeChange,
      handleSortByChange,
      handleRefresh,
    ]
  );

  if (isMobile) {
    return <ExploreSectionMobile {...sharedProps} loadingRef={loadingRef} hasMore={paginationState.hasMore} />;
  }
  return <ExploreSectionDesktop {...sharedProps} loadingRef={loadingRef} hasMore={paginationState.hasMore} />;
}); 