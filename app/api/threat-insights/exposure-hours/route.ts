import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    if (backendUrl.includes('localhost')) backendUrl = backendUrl.replace('localhost', '127.0.0.1');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${backendUrl}/api/threat-insights/exposure-hours`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
        return NextResponse.json(errorData, { status: response.status });
      }

      return NextResponse.json(await response.json());
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch exposure hours' },
      { status: 500 },
    );
  }
}
