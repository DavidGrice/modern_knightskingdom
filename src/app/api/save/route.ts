import { NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/server/session';
import { loadSave, writeSave } from '@/lib/server/db';
import { MAX_SAVE_LENGTH, parseSave } from '@/lib/saveSchema';

// `{ save }` with the save, or null when there is none; `problem` instead when there is one that cannot be read
// (lib/save.ts's fetchSave tells the three apart), and `restored` when the one sent is the save before the latest.
// A save that could not be opened just now is a 503: the menu offers to try again.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const stored = loadSave(userId);
  if (stored.status === 'unavailable') return NextResponse.json({ error: stored.problem }, { status: 503 });
  if (stored.status === 'corrupt') return NextResponse.json({ save: null, problem: stored.problem });
  if (stored.status === 'none') return NextResponse.json({ save: null });
  return NextResponse.json(stored.restored ? { save: stored.save, restored: true } : { save: stored.save });
}

export async function PUT(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (Number(req.headers.get('content-length') ?? 0) > MAX_SAVE_LENGTH) {
    return NextResponse.json({ error: 'Save too large.' }, { status: 413 });
  }
  const checked = parseSave(await req.text().catch(() => ''));
  if (!checked.ok) return NextResponse.json({ error: `Bad save payload: ${checked.problem}.` }, { status: 400 });
  try {
    writeSave(userId, checked.save);
  } catch {
    return NextResponse.json({ error: 'The save could not be written.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
