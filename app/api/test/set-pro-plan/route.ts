import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Update user to pro plan with 30 days remaining
    await db.collection('users').updateOne(
      { email: session.user.email },
      { 
        $set: { 
          plan: 'pro',
          days_remaining_in_premium: 30,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'User set to pro plan with 30 days remaining' 
    });
  } catch (error) {
    console.error('Error setting pro plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 