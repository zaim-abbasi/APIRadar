"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useIsMobile } from "@/components/home/use-is-mobile";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { usePlanCheck } from "@/hooks/use-plan-check";
import { PROVIDER_API_MAP } from '@/lib/constants';
import { fetchLeaks } from '@/lib/api';
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
  const { data: session } = useSession();
  const { isAuthenticated } = usePlanCheck();
  const plan: 'free' | 'pro' = isAuthenticated ? 'pro' : 'free';

  // State management
  const [filterState, setFilterState] = useState<{
    selectedProvider: Provider;
    timeRange: string;
    sortBy: string;
  }>({
    selectedProvider: 'all',
    timeRange: '15d',
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
      filterState.timeRange === '15d' &&
      filterState.sortBy === 'newest' &&
      paginationState.page === 1,
    [filterState.selectedProvider, filterState.timeRange, filterState.sortBy, paginationState.page]
  );

  // Initialize leaks from cache if available
  const [leaks, setLeaks] = useState<LeakedKey[]>(() => {
    if (isDefaultFilters && firstPageCache.leaks.length > 0 && Date.now() - firstPageCache.timestamp < CACHE_TTL) {
      return firstPageCache.leaks;
    }
    return [];
  });
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Add a ref to track if we've already fetched data to prevent unnecessary re-fetches
  const hasInitializedRef = useRef(false);
  const prevAuthenticatedRef = useRef(isAuthenticated);

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

  useEffect(() => {
    setPaginationState(prev => ({ ...prev, page: 1 }));
    setLoadingState(prev => ({ ...prev, isLoading: true, error: null }));
  }, [filterState.selectedProvider, filterState.timeRange, filterState.sortBy]);

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
        session,
      });
      if (error) {
        throw new Error(error);
      }
      if (data) {
        setLeaks((prev) => {
          if (paginationState.page === 1) {
            if (isDefaultFilters) {
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
      setLoadingState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    } finally {
      setLoadingState(prev => ({ ...prev, isLoading: false, isLoadingMore: false }));
    }
  }, [filterState.selectedProvider, filterState.timeRange, filterState.sortBy, paginationState.page, paginationState.refreshIndex, session]);

  // Only fetch on mount and when filters change, not on every re-render
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchAndSetLeaks();
    }
  }, []);

  // Fetch when filters change
  useEffect(() => {
    if (hasInitializedRef.current) {
      fetchAndSetLeaks();
    }
  }, [filterState.selectedProvider, filterState.timeRange, filterState.sortBy, paginationState.refreshIndex]);

  // Fetch when page changes (for infinite scroll)
  useEffect(() => {
    if (hasInitializedRef.current && paginationState.page > 1) {
      fetchAndSetLeaks();
    }
  }, [paginationState.page]);

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