const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export async function fetchTotalReposScanned(): Promise<ApiResponse<{ totalReposScanned: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/total-repos-scanned`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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

export async function fetchTotalLeaksFound(): Promise<ApiResponse<{ totalLeaksFound: number }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/total-leaks-found`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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

export async function fetchTopProviders(): Promise<ApiResponse<{ topProviders: Array<{ provider: string; count: number }> }>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/top-providers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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