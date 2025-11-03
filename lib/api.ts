const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// Request deduplication cache to prevent duplicate API calls
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();
const CACHE_DURATION = 1000; // 1 second deduplication window

// Helper to deduplicate requests
function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  const cached = requestCache.get(key);
  const now = Date.now();
  
  // Clear expired cache entries periodically
  if (now % 10000 < 100) { // Cleanup every ~10 seconds
    for (const [k, v] of requestCache.entries()) {
      if (now - v.timestamp > CACHE_DURATION * 2) {
        requestCache.delete(k);
      }
    }
  }
  
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.promise;
  }
  
  const promise = requestFn().finally(() => {
    // Remove from cache after completion
    setTimeout(() => requestCache.delete(key), CACHE_DURATION);
  });
  
  requestCache.set(key, { promise, timestamp: now });
  return promise;
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
  session
}: {
  provider?: string;
  timeRange?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  session?: any;
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
  // Create cache key for request deduplication
  const cacheKey = `leaks:${provider || 'all'}:${timeRange || '15d'}:${sortBy || 'newest'}:${page}:${limit}:${session?.user?.id || 'anonymous'}`;
  
  return deduplicateRequest(cacheKey, async () => {
    try {
      const headers = createAuthHeaders(session);
      const params = new URLSearchParams();
      if (provider) params.append('provider', provider);
      if (timeRange) params.append('timeRange', timeRange);
      if (sortBy) params.append('sortBy', sortBy);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const response = await fetch(`${API_BASE_URL}/api/leaks?${params.toString()}`, {
        method: 'GET',
        headers,
        // Add cache control for better performance
        cache: page === 1 ? 'default' : 'no-store' as RequestCache
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