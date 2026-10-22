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
    // one that cannot be read counts: the menu shows it as such, and asks before a new game is written over it
    hasSave: loadSave(userId).status !== 'none',
  });
}
