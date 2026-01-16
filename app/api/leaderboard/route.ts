import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': 'anonymous',
      'x-user-email': 'anonymous@example.com',
      'x-user-authenticated': 'false',
    };

    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

    if (!backendUrl) {
      backendUrl = 'http://127.0.0.1:3001';
    }

    if (backendUrl.includes('localhost')) {
      backendUrl = backendUrl.replace('localhost', '127.0.0.1');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const searchParams = request.nextUrl.search;

    try {
      const response = await fetch(`${backendUrl}/api/leaderboard-data${searchParams}`, {
        method: 'GET',
        headers: authHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: await response.text().catch(() => 'Unable to read error') };
        }

        console.error('Backend leaderboard API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          backendUrl
        });

        return NextResponse.json(
          {
            error: errorData.error || `Backend error: ${response.status} ${response.statusText}`,
            details: errorData.details
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout: Backend did not respond within 10 seconds');
      }
      throw fetchError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (!backendUrl) {
      backendUrl = 'http://127.0.0.1:3001';
    }
    if (backendUrl.includes('localhost')) {
      backendUrl = backendUrl.replace('localhost', '127.0.0.1');
    }

    console.error('Error in leaderboard API route:', {
      error: errorMessage,
      stack: errorStack,
      errorObject: error,
      backendUrl
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

