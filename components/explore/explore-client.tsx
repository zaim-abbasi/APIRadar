"use client";
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { usePlanCheck } from "@/hooks/use-plan-check";
import { fetchLeaks, clearLeaksCache } from "@/lib/api";
import { LeakedKey, Provider } from "@/types";

// Optimize dynamic imports with loading states and proper chunking
const ExploreSectionDesktop = dynamic(
  () => import("@/components/explore/explore-section-desktop"),
  {
    ssr: false,
    loading: () => <div className="min-h-[400px]" />,
  },
);

const PAGE_SIZE = 8;
const INFINITE_SCROLL_MARGIN = "0px 0px 600px 0px";
const firstPageCache: { leaks: LeakedKey[]; timestamp: number } = {
  leaks: [],
  timestamp: 0,
};
const CACHE_TTL = 60 * 1000; // 1 minute

export const ExploreClient = React.memo(function ExploreClient(props: any) {
  const { data: session, status: sessionStatus } = useSession();
  const { isAuthenticated } = usePlanCheck();
  const plan: "free" | "pro" = isAuthenticated ? "pro" : "free";

  // State management
  const [filterState, setFilterState] = useState<{
    selectedProvider: Provider;
  }>({
    selectedProvider: "all",
  });
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    isLoadingMore: false,
    error: null as string | null,
  });
  const [paginationState, setPaginationState] = useState({
    page: 1,
    hasMore: false,
    total: 0,
  });
  // Memoize default filters check to prevent unnecessary recalculations
  const isDefaultFilters = useMemo(
    () => filterState.selectedProvider === "all" && paginationState.page === 1,
    [filterState.selectedProvider, paginationState.page],
  );

  // Initialize leaks from cache if available (client-only to prevent hydration mismatch)
  const [leaks, setLeaks] = useState<LeakedKey[]>([]);
  const [latestGlobalLeakAt, setLatestGlobalLeakAt] = useState<string | Date | undefined>(undefined);

  // Load from cache on client mount only
  useEffect(() => {
    if (
      isDefaultFilters &&
      firstPageCache.leaks.length > 0 &&
      typeof window !== "undefined"
    ) {
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
    if (
      !isAuthenticated ||
      !paginationState.hasMore ||
      loadingState.isLoading
    ) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      return;
    }

    // Disconnect existing observer
    if (observerRef.current) observerRef.current.disconnect();

    // Create new observer
    observerRef.current = new window.IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loadingState.isLoading &&
          !loadingState.isLoadingMore
        ) {
          setPaginationState((prev) => ({ ...prev, page: prev.page + 1 }));
        }
      },
      { rootMargin: INFINITE_SCROLL_MARGIN },
    );

    // Observe the loading element
    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [
    paginationState.hasMore,
    loadingState.isLoading,
    loadingState.isLoadingMore,
    isAuthenticated,
  ]);

  // Root fix: Use ref to track latest filter state to prevent stale closures
  const filterStateRef = useRef(filterState);
  const paginationStateRef = useRef(paginationState);
  const fetchAndSetLeaksRef = useRef<() => Promise<void>>();

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

      // Root fix: Set loading state (leaks already cleared by filter change useEffect)
      if (currentPaginationState.page === 1) {
        setLoadingState((prev) => ({
          ...prev,
          isLoading: true,
          isLoadingMore: false,
          error: null,
        }));
      } else {
        setLoadingState((prev) => ({ ...prev, isLoadingMore: true }));
      }
      const backendProvider = currentFilterState.selectedProvider;

      const { data, error } = await fetchLeaks({
        provider: backendProvider,
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
            const isDefault = latestFilterState.selectedProvider === "all";
            if (isDefault) {
              firstPageCache.leaks = data.leaks;
              firstPageCache.timestamp = Date.now();
              // Store global latest leak time for consistent LiveStats
              if (data.leaks.length > 0) {
                setLatestGlobalLeakAt(data.leaks[0].leakDetectedAt);
              }
            }
            return data.leaks;
          }
          const existingIds = new Set(prev.map((l) => l.id));
          const newLeaks = data.leaks.filter((l) => !existingIds.has(l.id));
          return [...prev, ...newLeaks];
        });
        setPaginationState((prev) => ({
          ...prev,
          total: data.total,
          hasMore: data.hasMore,
        }));
      }
    } catch (error: any) {
      // Root fix: Don't show error if request was aborted (expected behavior)
      if (error?.name === "AbortError" || abortController.signal.aborted) {
        return;
      }
      setLoadingState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load data",
      }));
    } finally {
      // Only update loading state if this request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          isLoadingMore: false,
        }));
      }
    }
  }, [session]); // Root fix: Only depend on session, use refs for filter/pagination state

  // Keep fetchAndSetLeaks ref in sync
  useEffect(() => {
    fetchAndSetLeaksRef.current = fetchAndSetLeaks;
  }, [fetchAndSetLeaks]);

  // Root fix: Merged initialization and auth change logic to prevent double-fetch race condition
  // where the first request is aborted but cached, causing the second request to fail.
  // This single effect handles both initial load and subsequent auth changes.

  // Root fix: Handle filter changes - separate from refresh to prevent loops
  useEffect(() => {
    if (!hasInitializedRef.current) return;

    // setLeaks([]); // Removed to prevent layout shift (seamless transition)
    setPaginationState((prev) => ({
      ...prev,
      page: 1,
      hasMore: false,
      // total: 0, // Keep total to prevent jump
    }));
    setLoadingState((prev) => ({ ...prev, isLoading: true, error: null }));
    clearLeaksCache();

    const isDefault = filterState.selectedProvider === "all";
    if (!isDefault) {
      firstPageCache.leaks = [];
      firstPageCache.timestamp = 0;
    }

    const timeoutId = setTimeout(() => {
      fetchAndSetLeaksRef.current?.();
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [filterState.selectedProvider]);

  // Root fix: Fetch when page changes (for infinite scroll) - use ref to prevent stale state
  useEffect(() => {
    if (hasInitializedRef.current && paginationState.page > 1) {
      fetchAndSetLeaksRef.current?.();
    }
  }, [paginationState.page]);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    const authChanged = prevAuthenticatedRef.current !== isAuthenticated;

    // Case 1: Initial Load
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevAuthenticatedRef.current = isAuthenticated;
      fetchAndSetLeaksRef.current?.();
      return;
    }

    // Case 2: Authentication State Changed (e.g. Sign In / Sign Out)
    if (authChanged) {
      prevAuthenticatedRef.current = isAuthenticated;
      // Clear cache when authentication changes
      firstPageCache.leaks = [];
      firstPageCache.timestamp = 0;
      // Reset to page 1
      setPaginationState((prev) => ({
        ...prev,
        page: 1,
      }));
      // Trigger refetch (no timeout needed as we aren't racing anymore)
      fetchAndSetLeaksRef.current?.();
    }
  }, [sessionStatus, isAuthenticated]);

  // Handlers
  const handleProviderChange = useCallback((provider: Provider) => {
    setFilterState((prev) => ({ ...prev, selectedProvider: provider }));
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
      total: paginationState.total,
      error: loadingState.error,
      latestGlobalLeakAt,
    }),
    [
      leaks,
      loadingState.isLoading,
      filterState.selectedProvider,
      plan,
      session,
      paginationState.total,
      loadingState.error,
      handleProviderChange,
      latestGlobalLeakAt,
    ],
  );

  return (
    <ExploreSectionDesktop
      {...sharedProps}
      loadingRef={loadingRef}
      hasMore={paginationState.hasMore}
    />
  );
});
