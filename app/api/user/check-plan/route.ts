import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ plan: 'basic', pro_days_remaining: 0 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Find user by email
    const user = await db.collection('users').findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ plan: 'basic', pro_days_remaining: 0 });
    }

    // Check if user is pro and reduce days daily
    let plan = user.plan || 'basic';
    let daysRemaining = user.pro_days_remaining || 0;
    let lastUpdated = user.lastProDayUpdate || null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Check if we need to reduce days (once per day)
    if (daysRemaining > 0 && lastUpdated) {
      const lastUpdateDate = new Date(lastUpdated);
      lastUpdateDate.setHours(0, 0, 0, 0);
      
      // If last update was before today, reduce days
      if (lastUpdateDate < today) {
        const daysDiff = Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, daysRemaining - daysDiff);
      }
    }

    // If user has days remaining in premium, they are pro
    if (daysRemaining > 0) {
      plan = 'pro';
    } else {
      plan = 'basic';
    }

    // Update the user's plan and days in the database
    await db.collection('users').updateOne(
      { email: session.user.email },
      { 
        $set: { 
          plan: plan,
          pro_days_remaining: daysRemaining,
          lastProDayUpdate: today,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ 
      plan: plan, 
      pro_days_remaining: daysRemaining,
      requestedTrial: !!user.requestedTrial
    });
  } catch (error) {
    console.error('Error checking user plan:', error);
    return NextResponse.json({ plan: 'basic', pro_days_remaining: 0 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    // Find user by email
    const user = await db.collection('users').findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is pro and reduce days daily
    let plan = user.plan || 'basic';
    let daysRemaining = user.pro_days_remaining || 0;
    let lastUpdated = user.lastProDayUpdate || null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Check if we need to reduce days (once per day)
    if (daysRemaining > 0 && lastUpdated) {
      const lastUpdateDate = new Date(lastUpdated);
      lastUpdateDate.setHours(0, 0, 0, 0);
      
      // If last update was before today, reduce days
      if (lastUpdateDate < today) {
        const daysDiff = Math.floor((today.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, daysRemaining - daysDiff);
      }
    }

    // If user has days remaining in premium, they are pro
    if (daysRemaining > 0) {
      plan = 'pro';
    } else {
      plan = 'basic';
    }

    // Update the user's plan and days in the database
    await db.collection('users').updateOne(
      { email: session.user.email },
      { 
        $set: { 
          plan: plan,
          pro_days_remaining: daysRemaining,
          lastProDayUpdate: today,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({ 
      plan: plan, 
      pro_days_remaining: daysRemaining,
      requestedTrial: !!user.requestedTrial
    });
  } catch (error) {
    console.error('Error updating user plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 