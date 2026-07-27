import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import { getUserById, loadSave } from '@/lib/server/db';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null });
  const user = getUserById(userId);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: { id: user.id, username: user.username },
    hasSave: loadSave(userId) !== null,
  });
}
