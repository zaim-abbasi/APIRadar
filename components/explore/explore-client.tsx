"use client";
import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useIsMobile } from "@/components/home/use-is-mobile";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { usePlanCheck } from "@/hooks/use-plan-check";
import { PROVIDER_API_MAP } from '@/lib/constants';
import { fetchLeaks } from '@/lib/api';
import { LeakedKey, Provider } from '@/types';

const ExploreSectionMobile = dynamic(() => import("@/components/explore/explore-section-mobile"), { ssr: false });
const ExploreSectionDesktop = dynamic(() => import("@/components/explore/explore-section-desktop"), { ssr: false });

const PAGE_SIZE = 10;
const INFINITE_SCROLL_MARGIN = '0px 0px 600px 0px';
const firstPageCache: { leaks: LeakedKey[]; timestamp: number } = { leaks: [], timestamp: 0 };
const CACHE_TTL = 60 * 1000; // 1 minute

export const ExploreClient = React.memo(function ExploreClient(props: any) {
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const { plan: userPlan, isPro, isBasic, isAuthenticated } = usePlanCheck();
  const plan: 'free' | 'basic' | 'pro' = isAuthenticated && (userPlan === 'pro' || userPlan === 'basic') ? userPlan : 'free';

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
  const isDefaultFilters =
    filterState.selectedProvider === 'all' &&
    filterState.timeRange === '15d' &&
    filterState.sortBy === 'newest' &&
    paginationState.page === 1;
  const [leaks, setLeaks] = useState<LeakedKey[]>(
    isDefaultFilters && firstPageCache.leaks.length > 0 && Date.now() - firstPageCache.timestamp < CACHE_TTL
      ? firstPageCache.leaks
      : []
  );
  const loadingRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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
        planOverride: plan,
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
  }, [filterState, paginationState.page, paginationState.refreshIndex, session, isDefaultFilters, plan]);

  // Track plan to refresh leaks if plan changes (e.g., upgrade to pro)
  const lastPlanRef = useRef(plan);
  useEffect(() => {
    if (lastPlanRef.current !== plan) {
      // Plan changed (e.g., basic -> pro), refresh leaks
      handleRefresh();
      lastPlanRef.current = plan;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  useEffect(() => {
    fetchAndSetLeaks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAndSetLeaks]);

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

  // Props for children
  const sharedProps = {
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
  };

  if (isMobile) {
    return <ExploreSectionMobile {...sharedProps} loadingRef={loadingRef} hasMore={paginationState.hasMore} />;
  }
  return <ExploreSectionDesktop {...sharedProps} loadingRef={loadingRef} hasMore={paginationState.hasMore} />;
}); 