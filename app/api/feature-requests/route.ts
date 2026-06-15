import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Decrypt the session token directly in one pass (extremely fast & secure)
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If we're fully unauthenticated, deny the request here before hitting backend
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let backendToken: string | undefined = token?.backendToken as string | undefined;
    if (!backendToken && process.env.NEXTAUTH_SECRET) {
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

    const body = await request.json();
    const backendUrlWithParams = `${backendUrl}/api/feature-requests`;

    const response = await fetch(backendUrlWithParams, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in feature requests API route:', error);
    return NextResponse.json(
      { error: 'Failed to submit feature request' },
      { status: 500 }
    );
  }
}
