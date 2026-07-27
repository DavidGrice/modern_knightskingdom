import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import { loadSave, writeSave } from '@/lib/server/db';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  return NextResponse.json({ save: loadSave(userId) });
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Bad save payload.' }, { status: 400 });
  }
  writeSave(userId, body);
  return NextResponse.json({ ok: true });
}
