import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    let session = await getServerSession(authOptions);

    if (!session) {
      const sessionToken = cookieStore.get('next-auth.session-token')?.value ||
        cookieStore.get('__Secure-next-auth.session-token')?.value;

      if (sessionToken) {
        try {
          const token = await getToken({
            req: request as any,
            secret: process.env.NEXTAUTH_SECRET,
          });

          if (token && token.email) {
            session = {
              user: {
                email: token.email as string,
                id: (token.id || token.sub || token.email) as string,
              },
            } as any;
          }
        } catch (e) {
          console.warn('Failed to decode session token:', e);
        }
      }
    }

    // If we're fully unauthenticated, deny the request here before hitting backend
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
