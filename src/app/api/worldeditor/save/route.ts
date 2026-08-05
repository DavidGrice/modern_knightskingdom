import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { worldEditorEnabled } from '@/lib/server/worldEditorGate';

const DATA_DIR = path.join(process.cwd(), 'src/game/data');
const FILES = {
  grounds: 'grounds.generated.json',
  landTiers: 'landTiers.generated.json',
  cultivatedPlots: 'cultivatedPlots.generated.json',
} as const;
type TableName = keyof typeof FILES;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// Shape-checks one row well enough to stop the editor from writing something
// that would crash the game the next time it loads (a missing x, a kind
// outside the union grounds.ts's own type expects) — not a schema library,
// matching how api/save/route.ts's own validation is a handful of plain
// typeof checks, not zod.
function validateRow(table: TableName, row: unknown): string | null {
  if (!isPlainObject(row)) return 'each entry must be an object';
  const num = (k: string) => typeof row[k] === 'number' && Number.isFinite(row[k] as number);
  const str = (k: string) => typeof row[k] === 'string';

  if (table === 'landTiers') {
    if (!num('walls') || !num('half') || !num('cost') || !str('name')) {
      return 'a land tier needs numeric walls/half/cost and a string name';
    }
    return null;
  }

  // grounds and cultivatedPlots are both RectSection-shaped (grounds.ts)
  if (!str('id') || !str('name')) return 'an entry needs a string id and name';
  if (row.kind !== 'tree' && row.kind !== 'rock' && row.kind !== 'herb') {
    return 'kind must be tree, rock or herb';
  }
  if (row.variant !== undefined && row.variant !== 'iron') return 'variant must be "iron" or absent';
  if (!num('x') || !num('z') || !num('halfX') || !num('halfZ') || !num('count')) {
    return 'x/z/halfX/halfZ/count must all be numbers';
  }
  if ((row.halfX as number) <= 0 || (row.halfZ as number) <= 0) return 'halfX/halfZ must be positive';
  if ((row.count as number) <= 0) return 'count must be positive';
  if (row.pondShore !== undefined && typeof row.pondShore !== 'boolean') return 'pondShore must be a boolean';

  if (table === 'grounds') {
    if (!num('tier') || !str('lockedHint')) return 'a ground needs a numeric tier and a string lockedHint';
  } else {
    if (!str('plantHint')) return 'a plot needs a string plantHint';
    if (!num('stage')) return 'a plot needs a numeric stage';
    if (typeof row.plantedAt !== 'number') return 'a plot needs a numeric plantedAt';
    if (row.lastWateredAt !== null && typeof row.lastWateredAt !== 'number') {
      return 'lastWateredAt must be a number or null';
    }
  }
  return null;
}

// Gated on worldEditorEnabled() alone (see worldEditorGate.ts's own reasoning
// — this is a build-time/local-only tool, not a real multi-user endpoint),
// and re-checked HERE independently of the page's own gate: a route that
// writes to disk never trusts the caller reached it through the "right" UI.
export async function POST(req: Request) {
  if (!worldEditorEnabled()) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!isPlainObject(body) || typeof body.table !== 'string' || !Array.isArray(body.data)) {
    return NextResponse.json({ error: 'Bad payload — expected { table, data: [] }.' }, { status: 400 });
  }
  const table = body.table;
  if (!(table in FILES)) return NextResponse.json({ error: `Unknown table "${table}".` }, { status: 400 });

  const rows = body.data as unknown[];
  for (let i = 0; i < rows.length; i++) {
    const problem = validateRow(table as TableName, rows[i]);
    if (problem) return NextResponse.json({ error: `Row ${i}: ${problem}` }, { status: 400 });
  }
  if (table !== 'landTiers') {
    const ids = (rows as Record<string, unknown>[]).map((r) => r.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: 'Two entries share the same id.' }, { status: 400 });
    }
  }

  // `null, 1` matches prepare-assets.mjs's own indent for every other
  // *.generated.json this project writes, so a live edit here diffs the same
  // way a real prepare-assets run would.
  const file = path.join(DATA_DIR, FILES[table as TableName]);
  fs.writeFileSync(file, `${JSON.stringify(rows, null, 1)}\n`);
  return NextResponse.json({ ok: true });
}
