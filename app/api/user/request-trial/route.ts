import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const client = await clientPromise;
  const db = client.db();
  const user = await db.collection('users').findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (user.requestedTrial) {
    return NextResponse.json({ error: 'Trial already requested' }, { status: 409 });
  }

  // Update requestedTrial status in DB first
  await db.collection('users').updateOne(
    { email: session.user.email },
    { $set: { requestedTrial: true } }
  );

  // Prepare a beautiful message for Formspree
  const message = `A user has requested a Pro trial.\n\n---\nName: ${user.name || 'N/A'}\nEmail: ${user.email || 'N/A'}\n---`;

  // Send to Formspree
  const formspreeRes = await fetch('https://formspree.io/f/movwbonq', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      message,
    }),
  });

  if (!formspreeRes.ok) {
    return NextResponse.json({ error: 'Failed to send request to Formspree' }, { status: 500 });
  }

  return NextResponse.json({ success: true, requestedTrial: true });
} 