import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Decrypt the session token directly in one pass (extremely fast & secure)
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let backendToken: string | undefined = token?.backendToken as string | undefined;
    if (!backendToken && token && process.env.NEXTAUTH_SECRET) {
      backendToken = jwt.sign(
        {
          id: token.id || token.sub,
          email: token.email,
        },
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '30d' }
      );
    }
    if (backendToken) {
      authHeaders['Authorization'] = `Bearer ${backendToken}`;
    }

    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

    if (!backendUrl) {
      backendUrl = 'http://127.0.0.1:3001';
    }

    if (backendUrl.includes('localhost')) {
      backendUrl = backendUrl.replace('localhost', '127.0.0.1');
    }

    const url = new URL(request.url);
    const backendUrlWithParams = `${backendUrl}/api/stats/providers${url.search}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(backendUrlWithParams, {
        method: 'GET',
        headers: authHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
        return NextResponse.json(errorData, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout: Backend did not respond within 10 seconds' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in provider stats API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider stats' },
      { status: 500 }
    );
  }
}