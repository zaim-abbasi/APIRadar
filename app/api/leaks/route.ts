import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const timeRange = searchParams.get('timeRange');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    // Build query parameters for backend API
    const params = new URLSearchParams();
    if (provider && provider !== 'all') {
      params.append('provider', provider);
    }
    if (timeRange) {
      params.append('timeRange', timeRange);
    }
    params.append('limit', limit.toString());
    params.append('page', Math.floor(offset / limit + 1).toString());

    // Fetch data from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/leaks?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      leaks: data.leaks || [],
      total: data.total || 0,
      hasMore: data.hasMore || false
    });
  } catch (error) {
    console.error('Error fetching leaks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaks' },
      { status: 500 }
    );
  }
}