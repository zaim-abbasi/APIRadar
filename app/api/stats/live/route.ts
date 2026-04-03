import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
          console.warn('Failed to decode session token in live stats:', e);
        }
      }
    }

    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let backendToken: any = (session as any)?.backendToken;
    if (!backendToken) {
      const token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (token && process.env.NEXTAUTH_SECRET) {
        backendToken = jwt.sign(
          { id: token.id || token.sub, email: token.email },
          process.env.NEXTAUTH_SECRET,
          { expiresIn: '30d' }
        );
      }
    }

    if (backendToken) {
      authHeaders['Authorization'] = `Bearer ${backendToken}`;
    }

    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://127.0.0.1:3001';
    if (backendUrl.includes('localhost')) {
      backendUrl = backendUrl.replace('localhost', '127.0.0.1');
    }

    const response = await fetch(`${backendUrl}/api/stats/live`, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in live stats proxy:', error);
    return NextResponse.json({ error: 'Failed to fetch live stats' }, { status: 500 });
  }
}
