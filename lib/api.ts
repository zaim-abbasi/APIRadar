const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

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