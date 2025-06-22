import { NextRequest, NextResponse } from 'next/server';
import { mockLeaks } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider');
  const timeRange = searchParams.get('timeRange');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    let filteredLeaks = [...mockLeaks];

    // Filter by provider
    if (provider && provider !== 'all') {
      filteredLeaks = filteredLeaks.filter(leak => leak.provider === provider);
    }

    // Filter by time range
    if (timeRange) {
      const now = new Date();
      const timeFilters: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      if (timeFilters[timeRange]) {
        const cutoff = new Date(now.getTime() - timeFilters[timeRange]);
        filteredLeaks = filteredLeaks.filter(leak => new Date(leak.timestamp) >= cutoff);
      }
    }

    // Sort by newest first
    filteredLeaks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const paginatedLeaks = filteredLeaks.slice(offset, offset + limit);

    return NextResponse.json({
      leaks: paginatedLeaks,
      total: filteredLeaks.length,
      hasMore: offset + limit < filteredLeaks.length
    });
  } catch (error) {
    console.error('Error fetching leaks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaks' },
      { status: 500 }
    );
  }
}