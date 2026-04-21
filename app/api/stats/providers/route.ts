import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Get session from NextAuth
    // In Next.js 15 App Router, use cookies() helper to ensure proper session retrieval
    // This fixes the issue where session might not be available immediately after sign-in or refresh
    const cookieStore = await cookies();

    // Build cookie header string from cookie store
    const cookiePairs: string[] = [];
    cookieStore.getAll().forEach(cookie => {
      cookiePairs.push(`${cookie.name}=${cookie.value}`);
    });
    const cookieHeader = cookiePairs.join('; ');

    // Get session with proper cookie context
    // In Next.js 15 App Router, getServerSession should automatically use cookies()
    // However, there can be timing issues after sign-in or refresh where session
    // might not be immediately available. We'll handle this gracefully.
    let session = await getServerSession(authOptions);

    // Root fix: If session is null but we detect a session token cookie,
    // decode the JWT token directly to get user info
    // This handles the race condition where getServerSession returns null
    // immediately after sign-in or refresh, but the user IS authenticated
    if (!session) {
      const sessionToken = cookieStore.get('next-auth.session-token')?.value ||
        cookieStore.get('__Secure-next-auth.session-token')?.value;

      if (sessionToken) {
        try {
          // Decode JWT token directly to get actual user information
          const token = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
          });

          if (token && token.email) {
            // Create session object from decoded token
            session = {
              user: {
                email: token.email as string,
                id: (token.id || token.sub || token.email) as string,
                name: token.name as string | undefined,
                plan: token.plan as string | undefined,
              },
            } as any;
          }
        } catch (e) {
          // If token decoding fails, log but continue as unauthenticated
          console.warn('Failed to decode session token:', e);
        }
      }
    }

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let backendToken: string | undefined = session?.backendToken;
    if (!backendToken) {
      const token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token && process.env.NEXTAUTH_SECRET) {
        backendToken = jwt.sign(
          {
            id: token.id || token.sub,
            email: token.email,
          },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: '30d' }
        );
      }
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