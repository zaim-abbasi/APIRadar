import { NextResponse } from 'next/server';
import { mockLeaderboard } from '@/lib/mock-data';

export async function GET() {
  try {
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    return NextResponse.json(mockLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}