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

const PAGE_SIZE = 15;
const INFINITE_SCROLL_MARGIN = "0px 0px 600px 0px";
const firstPageCache: Record<string, { leaks: LeakedKey[]; total: number; hasMore: boolean; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for stale-while-revalidate

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
  const [loadingState, setLoadingState] = useState(() => {
    const isClient = typeof window !== "undefined";
    if (!isClient) return { isLoading: true, isLoadingMore: false, error: null };
    
    const provider = "all";
    const cached = firstPageCache[provider];
    const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_TTL);
    
    return {
      isLoading: !isCacheValid,
      isLoadingMore: false,
      error: null as string | null,
    };
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
  const [leaks, setLeaks] = useState<LeakedKey[]>(() => {
    const isClient = typeof window !== "undefined";
    if (!isClient) return [];
    
    const provider = "all"; // Default initial provider
    const cached = firstPageCache[provider];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.leaks;
    }
    return [];
  });

  const [globalLeaks, setGlobalLeaks] = useState<LeakedKey[]>(() => {
    const cachedAll = firstPageCache["all"];
    if (cachedAll) return cachedAll.leaks.slice(0, 20);
    return [];
  });

  const [latestGlobalLeakAt, setLatestGlobalLeakAt] = useState<string | Date | undefined>(() => {
    const cachedAll = firstPageCache["all"];
    if (cachedAll && cachedAll.leaks.length > 0) return cachedAll.leaks[0].leakDetectedAt;
    return undefined;
  });

  // Initial mount effect to load cache (sync only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const provider = filterState.selectedProvider;
      const cached = firstPageCache[provider];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setLeaks(cached.leaks);
        setPaginationState((prev) => ({
          ...prev,
          total: cached.total,
          hasMore: cached.hasMore,
          page: 1
        }));
      }
    }
  }, []);
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
  const fetchAndSetLeaksRef = useRef<(forcePage?: number, forceProvider?: Provider) => Promise<void>>();

  // Keep refs in sync with state
  useEffect(() => {
    filterStateRef.current = filterState;
  }, [filterState]);

  useEffect(() => {
    paginationStateRef.current = paginationState;
  }, [paginationState]);

  const fetchAndSetLeaks = useCallback(async (forcePage?: number, forceProvider?: Provider) => {
    // Root fix: Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const pageToFetch = forcePage ?? paginationStateRef.current.page;
      const providerToFetch = forceProvider ?? filterStateRef.current.selectedProvider;

      // Root fix: Set loading state (leaks already cleared by filter change useEffect)
      if (pageToFetch === 1) {
        setLoadingState((prev) => ({
          ...prev,
          isLoading: true,
          isLoadingMore: false,
          error: null,
        }));
      } else {
        setLoadingState((prev) => ({ ...prev, isLoadingMore: true }));
      }

      const { data, error } = await fetchLeaks({
        provider: providerToFetch,
        page: pageToFetch,
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
        setLeaks((prev) => {
          // Only update if filters haven't changed during the request
          if (pageToFetch === 1) {
            // Update per-provider cache for every successful first-page fetch
            firstPageCache[providerToFetch] = {
              leaks: data.leaks,
              total: data.total,
              hasMore: data.hasMore,
              timestamp: Date.now()
            };

            if (providerToFetch === "all") {
              setGlobalLeaks(data.leaks.slice(0, 20));
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

    const provider = filterState.selectedProvider;
    const cached = firstPageCache[provider];
    const isCacheValid = cached && (Date.now() - cached.timestamp < CACHE_TTL);

    if (isCacheValid) {
      // Hot-swap from cache immediately
      setLeaks(cached.leaks);
      setPaginationState((prev) => ({
        ...prev,
        page: 1,
        total: cached.total,
        hasMore: cached.hasMore
      }));
      setLoadingState((prev) => ({ ...prev, isLoading: false, error: null }));
    } else {
      // No valid cache, show skeleton
      setLeaks([]);
      setPaginationState((prev) => ({
        ...prev,
        page: 1,
        hasMore: false,
      }));
      setLoadingState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

    fetchAndSetLeaksRef.current?.(1, provider);
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

      // Restoration logic: If coming back from a sign-in redirect
      const shouldRestore = sessionStorage.getItem("radar_restore_flag") === "true";
      const savedProvider = sessionStorage.getItem("radar_last_provider") as Provider;
      
      let effectiveProvider = filterStateRef.current.selectedProvider;
      if (shouldRestore && savedProvider) {
        effectiveProvider = savedProvider;
        // Update state to match restoration
        setFilterState({ selectedProvider: savedProvider });
        // Flag is cleared below after everyone had a chance to see it in this pass
      }

      fetchAndSetLeaksRef.current?.();

      // Fetch global leaks separately if current view is not 'all'
      if (effectiveProvider !== "all") {
        fetchLeaks({
          provider: "all",
          page: 1,
          limit: 20,
          session,
        }).then((res) => {
          if (res.data) setGlobalLeaks(res.data.leaks);
        });
      }

      // Clear restoration flag after a short delay to allow children to also read it
      if (shouldRestore) {
        setTimeout(() => sessionStorage.removeItem("radar_restore_flag"), 100);
      }
      return;
    }

    // Case 2: Authentication State Changed (e.g. Sign In / Sign Out)
    if (authChanged) {
      prevAuthenticatedRef.current = isAuthenticated;
      // Clear cache when authentication changes
      Object.keys(firstPageCache).forEach(key => delete firstPageCache[key]);
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
    if (provider !== "all") {
      sessionStorage.setItem("radar_last_provider", provider);
    }
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
      globalLeaks,
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
      globalLeaks,
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
