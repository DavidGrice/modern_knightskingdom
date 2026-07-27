import { NextResponse } from 'next/server';
import { createUser } from '@/lib/server/db';
import { setSessionCookie } from '@/lib/server/session';

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 });
  }
  const result = createUser(username, password);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });
  await setSessionCookie(result.id);
  return NextResponse.json({ user: { id: result.id, username: result.username } });
}
