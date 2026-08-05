import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { worldEditorEnabled } from '@/lib/server/worldEditorGate';
import { getSessionUserId } from '@/lib/server/session';
import { getUserById } from '@/lib/server/db';

const DATA_DIR = path.join(process.cwd(), 'src/game/data');
const FILES = {
  grounds: 'grounds.generated.json',
  landTiers: 'landTiers.generated.json',
  cultivatedPlots: 'cultivatedPlots.generated.json',
} as const;

// Reads straight off disk rather than importing the .generated.json modules
// — a save from this same editor must show up on the next load with no dev
// server restart, and re-`import`ing a module Node has already cached isn't
// guaranteed to pick up a file that changed underneath it.
export async function GET() {
  if (!worldEditorEnabled()) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const userId = await getSessionUserId();
  const user = userId ? getUserById(userId) : undefined;
  const tables: Record<string, unknown> = {};
  for (const [key, file] of Object.entries(FILES)) {
    tables[key] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  }
  // `editor` is display-only (see worldEditorGate.ts) — never used to decide
  // whether this request is allowed to happen.
  return NextResponse.json({ tables, editor: user ? user.username : null });
}
