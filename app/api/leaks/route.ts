import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    // Create authentication headers
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (session?.user) {
      authHeaders['x-user-id'] = session.user.id || session.user.email || '';
      authHeaders['x-user-email'] = session.user.email || '';
      authHeaders['x-user-plan'] = session.user.plan || 'basic';
      authHeaders['x-user-authenticated'] = 'true';
    } else {
      authHeaders['x-user-id'] = '';
      authHeaders['x-user-email'] = '';
      authHeaders['x-user-plan'] = 'free';
      authHeaders['x-user-authenticated'] = 'false';
    }

    // Forward the request to backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    const url = new URL(request.url);
    const backendUrlWithParams = `${backendUrl}/api/leaks${url.search}`;
    
    const response = await fetch(backendUrlWithParams, {
      method: 'GET',
      headers: authHeaders,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in leaks API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaks' },
      { status: 500 }
    );
  }
}