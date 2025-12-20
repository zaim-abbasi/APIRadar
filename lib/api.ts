const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Request deduplication cache to prevent duplicate API calls
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_DURATION = 500; // Reduced to 500ms to prevent stale filter results

// Helper to deduplicate requests
function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const cached = requestCache.get(key);
  const now = Date.now();
  
  // Clear expired cache entries periodically
  if (now % 10000 < 100) { // Cleanup every ~10 seconds
    for (const [k, v] of Array.from(requestCache.entries())) {
      if (now - v.timestamp > CACHE_DURATION * 2) {
        requestCache.delete(k);
      }
    }
  }
  
  // Root fix: Only use cache if very recent (within 500ms) to prevent stale filter results
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.promise;
  }
  
  const promise = requestFn().finally(() => {
    // Remove from cache immediately after completion to prevent stale data
    setTimeout(() => requestCache.delete(key), CACHE_DURATION);
  });
  
  requestCache.set(key, { promise, timestamp: now });
  return promise;
}

// Root fix: Function to clear cache for specific filter patterns
export function clearLeaksCache(pattern?: string) {
  if (pattern) {
    // Clear cache entries matching pattern (e.g., specific provider)
    for (const [key] of Array.from(requestCache.entries())) {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    requestCache.clear();
  }
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Helper function to create authenticated headers
function createAuthHeaders(session?: any) {
  let userId = 'anonymous';
  let userEmail = 'anonymous@example.com';
  let isAuthenticated = 'false';

  if (session?.user) {
    userId = session.user.id || session.user.email || 'authenticated';
    userEmail = session.user.email || 'authenticated@example.com';
    isAuthenticated = 'true';
  }

  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-email': userEmail,
    'x-user-authenticated': isAuthenticated,
  };
}

export async function fetchTotalReposScanned(session?: any): Promise<ApiResponse<{ totalReposScanned: number }>> {
  try {
    const headers = createAuthHeaders(session);
    const response = await fetch(`${API_BASE_URL}/api/total-repos-scanned`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch total repos scanned' };
  }
}

export async function fetchTotalLeaksFound(session?: any): Promise<ApiResponse<{ totalLeaksFound: number }>> {
  try {
    const headers = createAuthHeaders(session);
    const response = await fetch(`${API_BASE_URL}/api/total-leaks-found`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch total leaks found' };
  }
}

export async function fetchTopProviders(session?: any): Promise<ApiResponse<{ topProviders: Array<{ provider: string; count: number }> }>> {
  try {
    const headers = createAuthHeaders(session);
    const response = await fetch(`${API_BASE_URL}/api/top-providers`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch top providers' };
  }
}

// Server-side version of fetchLeaderboardData
export async function fetchLeaderboardDataServer(): Promise<{
  totalReposScanned: number;
  totalLeaksFound: number;
  repositoryAgeCutoff: string | null;
  topProviders: Array<{ provider: string; count: number; percentage: number }>;
  todayLeaks: number;
}> {
  try {
    // Use the Next.js API route instead of calling backend directly
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/leaderboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache control for better performance
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching leaderboard data server-side:', error);
    // Return fallback data on error
    return {
      totalReposScanned: 0,
      totalLeaksFound: 0,
      repositoryAgeCutoff: null,
      topProviders: [],
      todayLeaks: 0
    };
  }
}

// Client-side version of fetchLeaderboardData
export async function fetchLeaderboardData(session?: any): Promise<ApiResponse<{
  totalReposScanned: number;
  totalLeaksFound: number;
  repositoryAgeCutoff: string | null;
  topProviders: Array<{ provider: string; count: number; percentage: number }>;
  todayLeaks: number;
}>> {
  try {
    const headers = createAuthHeaders(session);
    const response = await fetch(`${API_BASE_URL}/api/leaderboard-data`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch leaderboard data' };
  }
}

export async function fetchLeaks({ 
  provider, 
  timeRange, 
  sortBy, 
  page = 1, 
  limit = 10,
  session,
  signal,
  bypassCache = false
}: {
  provider?: string;
  timeRange?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  session?: any;
  signal?: AbortSignal;
  bypassCache?: boolean;
}): Promise<ApiResponse<{ 
  leaks: any[]; 
  total: number; 
  hasMore: boolean;
  planLimits?: {
    maxLeaks: number;
    canInfiniteScroll: boolean;
    maxTimeRange: string;
  };
}>> {
  const normalizedProvider = provider ? String(provider).trim() : 'all';
  const normalizedTimeRange = timeRange || 'all';
  const normalizedSortBy = sortBy || 'newest';
  const userId = session?.user?.id || 'anonymous';
  const cacheKey = `leaks:${normalizedProvider}:${normalizedTimeRange}:${normalizedSortBy}:${page}:${limit}:${userId}`;
  
  const fetchFn = async () => {
    const headers = createAuthHeaders(session);
    const params = new URLSearchParams();
    if (provider && provider !== 'all') {
      params.append('provider', String(provider).trim());
    }
    if (timeRange) params.append('timeRange', timeRange);
    if (sortBy) params.append('sortBy', sortBy);
    params.append('page', String(page));
    params.append('limit', String(limit));
    
    const response = await fetch(`${API_BASE_URL}/api/leaks?${params.toString()}`, {
      method: 'GET',
      headers,
      signal,
      cache: 'no-store' as RequestCache
    });
  
    if (response.status === 401) {
      return { error: 'Authentication required' };
    }
    
    if (response.status === 429) {
      const data = await response.json();
      return { error: `Rate limit exceeded. Retry after ${data.retryAfter} seconds.` };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return { data };
  };
  
  if (bypassCache) {
    try {
      return await fetchFn();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch leaks' };
    }
  }
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      return await fetchFn();
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to fetch leaks' };
    }
  });
}

export async function fetchLeakFullKey(leakId: string, session?: any): Promise<ApiResponse<{ fullKey: string }>> {
  try {
    const headers = createAuthHeaders(session);
    const response = await fetch(`${API_BASE_URL}/api/leaks/${leakId}/fullkey`, {
      method: 'GET',
      headers,
    });
    
    if (response.status === 401) {
      return { error: 'Authentication required' };
    }
    
    if (response.status === 403) {
      return { error: 'Full key access requires login' };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch full key' };
  }
} 