import { NextResponse } from 'next/server';
import { verifyUser } from '@/lib/server/db';
import { setSessionCookie } from '@/lib/server/session';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
  }
  const user = verifyUser(username, password);
  if (!user) return NextResponse.json({ error: 'Wrong name or password.' }, { status: 401 });
  await setSessionCookie(user.id);
  return NextResponse.json({ user: { id: user.id, username: user.username } });
}
