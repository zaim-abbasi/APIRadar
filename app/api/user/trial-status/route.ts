import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ requestedTrial: false });
  }
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection('users').findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ requestedTrial: false });
  }
  return NextResponse.json({ requestedTrial: !!user.requestedTrial });
} 