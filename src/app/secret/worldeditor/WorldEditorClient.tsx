'use client';
// Wave 6 · the actual editor UI. Fetches the live on-disk tables from
// /api/worldeditor/data, lets you edit GROUNDS/LAND_TIERS/CULTIVATED_PLOTS as
// plain forms, and previews every ground+plot on one live top-down map —
// running the SAME three checks (rectangle overlap, homestead clearance,
// road crossing) that today only fire as a console.warn at dev-server-start,
// against whatever you've typed, before you ever hit Save. This is the
// direct fix for a real failure class this project hit twice already: a
// hand-picked count/position that silently didn't fit, caught only by a
// human replaying the scatter by hand (see cultivatedPlots.ts's own history).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RectSection } from '@/game/data/grounds';
import { distanceToRoad, ROAD_REACH, ROAD_TILE, roadGateFor, routeCells } from '@/game/data/road';
import { POND, BROOK, STARTER_VILLAGE_CLEAR, WORLD_HALF } from '@/game/data/world';
import type { TerrainRegion } from '@/game/data/terrainRegions';
import { DOWNS_MAX_GRADIENT, DOWNS_SINK, regionSurfaceY } from '@/game/data/terrainRegions';
import { DIG_OUTSKIRT } from '@/game/waterworks';

type Kind = 'tree' | 'rock' | 'herb';

interface GroundRow extends RectSection {
  id: string;
  name: string;
  tier: number;
  lockedHint: string;
}
interface LandTierRow {
  walls: number;
  half: number;
  // Wave 17 #4 · the south fence no longer grows with the rest — `half`
  // stays shared by north/east/west (see buildables.ts's LAND_TIERS note),
  // `southHalf` is this table's own separate, normally-constant south bound.
  southHalf: number;
  cost: number;
  name: string;
}
interface PlotRow extends RectSection {
  id: string;
  name: string;
  plantHint: string;
  stage: number;
  plantedAt: number;
  lastWateredAt: number | null;
  world?: string | null;
}

interface Tables {
  grounds: GroundRow[];
  landTiers: LandTierRow[];
  cultivatedPlots: PlotRow[];
  terrainRegions: TerrainRegion[];
}

type TableName = keyof Tables;
const TABLE_LABEL: Record<TableName, string> = {
  grounds: 'Grounds',
  landTiers: 'Land Tiers',
  cultivatedPlots: 'Cultivated Plots',
  terrainRegions: 'Terrain Regions',
};

// Mirrors grounds.ts's own HOMESTEAD_CLEARANCE constant exactly. Not
// imported from there: that file's clearsHomestead() reads the STATIC,
// already-saved LAND_TIERS, not whatever half-values are sitting unsaved in
// this page's own form state — the whole point of a live preview is
// checking the edit in progress, before it's written to disk.
const HOMESTEAD_CLEARANCE = 8;

// Wave 60 · the structural shape every one of these live checks actually
// needs (a box's own centre and half-extents) — narrowed down from
// `RectSection` so a TerrainRegion (which has `half`, not `halfX`/`halfZ`)
// can be checked by the SAME functions via a `{ x: r.x, z: r.z, halfX:
// r.half, halfZ: r.half }` view, instead of forking duplicate copies of this
// math for regions. Every existing call site already passes a variable that
// structurally satisfies this — TypeScript's excess-property check only
// applies to object LITERALS, not variables — so this is a safe, local
// widening, not a behaviour change.
interface Box { x: number; z: number; halfX: number; halfZ: number }

function sectionsOverlapLive(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) < a.halfX + b.halfX && Math.abs(a.z - b.z) < a.halfZ + b.halfZ;
}
// Shared by clearsHomesteadLive and terrainRegionProblems's own fence check —
// was recomputed separately in each place before Wave 60.
function maxHalfOf(landTiers: LandTierRow[]): number {
  return landTiers.reduce((m, t) => Math.max(m, t.half), 0);
}
function clearsHomesteadLive(s: RectSection, landTiers: LandTierRow[]): boolean {
  const maxHalf = maxHalfOf(landTiers);
  // Wave 17 #4 · mirrors grounds.ts's own clearsHomestead(): the X bound is
  // still the shared `half` (north/east/west), but the Z bound depends on
  // which side of the homestead the section is actually on — `southHalf`
  // south of it, `half` north of it — now that those two numbers can differ.
  const maxSouthHalf = landTiers.reduce((m, t) => Math.max(m, t.southHalf), 0);
  const xHalf = maxHalf + HOMESTEAD_CLEARANCE;
  const zHalf = (s.z >= 0 ? maxSouthHalf : maxHalf) + HOMESTEAD_CLEARANCE;
  return Math.abs(s.x) - s.halfX >= xHalf || Math.abs(s.z) - s.halfZ >= zHalf;
}
function crossesRoad(s: Box): boolean {
  const half = ROAD_TILE / 2;
  return routeCells().some(([cx, cz]) => {
    const rx = cx * ROAD_TILE, rz = cz * ROAD_TILE;
    return Math.abs(s.x - rx) < s.halfX + half && Math.abs(s.z - rz) < s.halfZ + half;
  });
}
// Wave 12 · how far the ground you are dragging has ended up from the leg of
// road that was laid to serve it. `crossesRoad` above only says the road
// misses it — a ground dragged clean away from its own spur passes that check
// happily, leaving the leg pointing at empty grass. Returns the distance so
// the warning can say how far, since "move it back a bit" is the fix.
function offRoad(s: Box): number {
  const gate = roadGateFor(s);
  return distanceToRoad(gate.x, gate.z);
}

// Wave 60 · ports terrainRegions.ts's own five dev-mode assertion checks
// (region overlap, field gradient/rim-buried, homestead fence, dig reach,
// road/grounds clash) into a LIVE, unsaved-form-state version — the same
// "check the edit in progress, not what's on disk" reasoning
// clearsHomesteadLive/crossesRoad above already apply to grounds/plots.
// `regionSurfaceY`/DOWNS_MAX_GRADIENT/DOWNS_SINK/DIG_OUTSKIRT are imported,
// not re-derived, so the surface math and every threshold stay the single
// copy terrainRegions.ts/waterworks.ts already own. Returns both the
// human-readable messages (for the warnings list) and the offending ids (for
// problemIds) from one pass, since the per-region sweep below is the one
// genuinely non-trivial cost in this file's live checks (see this wave's own
// report: ~18.7k grid points x 4 regionSurfaceY calls per region today).
function terrainRegionProblems(
  regions: TerrainRegion[],
  landTiers: LandTierRow[],
  grounds: GroundRow[],
): { messages: string[]; ids: Set<string> } {
  const messages: string[] = [];
  const ids = new Set<string>();
  const boxes = regions.map((r) => ({ r, box: { x: r.x, z: r.z, halfX: r.half, halfZ: r.half } }));

  // 0. no two regions overlap each other
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (sectionsOverlapLive(boxes[i].box, boxes[j].box)) {
        messages.push(`${boxes[i].r.name} and ${boxes[j].r.name} overlap — two regions can never share ground`);
        ids.add(boxes[i].r.id);
        ids.add(boxes[j].r.id);
      }
    }
  }

  const fence = maxHalfOf(landTiers);
  // Mirrors terrainRegions.ts's own `outside()`: a "keep OUT of the square
  // ±n" test, not a distance — the SYMMETRIC test that file actually uses,
  // not clearsHomesteadLive's asymmetric north/south homestead test (a region
  // is a hillside a build fence must stay clear of on every side, not a
  // section the homestead's own south/north split applies to).
  const outside = (box: Box, n: number) =>
    box.z + box.halfZ < -n || box.z - box.halfZ > n || box.x + box.halfX < -n || box.x - box.halfX > n;

  for (const { r, box } of boxes) {
    // 1. the field itself: walkable everywhere, and back to fully buried
    //    before the rim — identical 0.5m sweep/central-difference gradient/
    //    thresholds to terrainRegions.ts's own dev check, run here against
    //    live (unsaved) field values instead of the file on disk.
    let maxGrad = 0;
    let rimHigh = -Infinity;
    for (let x = r.x - r.half; x <= r.x + r.half; x += 0.5) {
      for (let z = r.z - r.half; z <= r.z + r.half; z += 0.5) {
        const gx = (regionSurfaceY(r, x + 0.05, z) - regionSurfaceY(r, x - 0.05, z)) / 0.1;
        const gz = (regionSurfaceY(r, x, z + 0.05) - regionSurfaceY(r, x, z - 0.05)) / 0.1;
        maxGrad = Math.max(maxGrad, Math.hypot(gx, gz));
        if (Math.abs(Math.abs(x - r.x) - r.half) < 2 || Math.abs(Math.abs(z - r.z) - r.half) < 2) {
          rimHigh = Math.max(rimHigh, regionSurfaceY(r, x, z));
        }
      }
    }
    if (maxGrad > DOWNS_MAX_GRADIENT) {
      messages.push(`${r.name}'s field reaches a gradient of ${maxGrad.toFixed(3)} — over ${DOWNS_MAX_GRADIENT}, `
        + 'the player falls rather than runs down it');
      ids.add(r.id);
    }
    if (rimHigh > -DOWNS_SINK + 1e-6) {
      messages.push(`${r.name} has a bump reaching ${rimHigh.toFixed(2)} within 2m of the box edge — it will `
        + 'end in a cliff instead of sinking away under the meadow');
      ids.add(r.id);
    }

    // 2. the two bounds every region's box must be chosen against
    if (!outside(box, fence)) {
      messages.push(`${r.name} overlaps the widest fence (±${fence}) — buildings would be placed on it`);
      ids.add(r.id);
    }
    if (!outside(box, fence + DIG_OUTSKIRT)) {
      messages.push(`${r.name} is within digging reach (±${fence + DIG_OUTSKIRT}) of the homestead`);
      ids.add(r.id);
    }

    // 3. …and clear of everything already standing in the world
    if (crossesRoad(box)) {
      messages.push(`the road runs over ${r.name} — check the tile actually belongs on this hillside`);
      ids.add(r.id);
    }
    for (const g of grounds) {
      if (sectionsOverlapLive(box, g)) {
        messages.push(`${g.name} now lies on ${r.name} — its fence, boundary stone and scattered nodes assume `
          + 'flat ground');
        ids.add(r.id);
        ids.add(g.id);
      }
    }
  }

  return { messages, ids };
}

const KIND_COLOR: Record<Kind, string> = { tree: '#3f8f5b', rock: '#8b8378', herb: '#8b5fa8' };
const WARN_COLOR = '#c0392b';
// Wave 60 · terrain regions' own colour — visually distinct earth tone, not
// reused from KIND_COLOR (a region is elevation, not a resource ground).
const REGION_COLOR = '#a67c3d';

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function WorldEditorClient() {
  const [tables, setTables] = useState<Tables | null>(null);
  const [editorName, setEditorName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<TableName>('grounds');
  const [saving, setSaving] = useState<TableName | null>(null);
  const [status, setStatus] = useState<Partial<Record<TableName, { ok: boolean; text: string }>>>({});

  const load = useCallback(() => {
    setLoadError(null);
    fetch('/api/worldeditor/data')
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/worldeditor/data -> ${r.status}`);
        return r.json();
      })
      .then((body) => {
        setTables(body.tables);
        setEditorName(body.editor ?? null);
      })
      .catch((e) => setLoadError(String(e)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const warnings = useMemo(() => {
    if (!tables) return [] as string[];
    const sections: (RectSection & { id: string; name: string })[] = [...tables.grounds, ...tables.cultivatedPlots];
    const out: string[] = [];
    for (const s of sections) {
      if (!clearsHomesteadLive(s, tables.landTiers)) out.push(`${s.name} overlaps the fully-bought homestead`);
      if (crossesRoad(s)) out.push(`${s.name} lies across the road`);
      if (Math.abs(s.x) > WORLD_HALF - 20 || Math.abs(s.z) > WORLD_HALF - 20) {
        out.push(`${s.name} sits within 20m of the world edge — node seeding will silently starve here`);
      }
    }
    // grounds only: a cultivated plot is ground you broke yourself, not
    // somewhere the kingdom built a road to
    for (const g of tables.grounds) {
      const d = offRoad(g);
      if (d > ROAD_REACH) {
        out.push(`${g.name} is ${d.toFixed(0)}m off the carriageway — no leg of the road reaches its gate (road.ts's LEGS)`);
      }
    }
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        if (sectionsOverlapLive(sections[i], sections[j])) {
          out.push(`${sections[i].name} overlaps ${sections[j].name}`);
        }
      }
    }
    const idCount = new Map<string, number>();
    for (const s of sections) idCount.set(s.id, (idCount.get(s.id) ?? 0) + 1);
    for (const [id, n] of idCount) if (n > 1) out.push(`id "${id}" is used by ${n} entries — ids must be unique`);
    out.push(...terrainRegionProblems(tables.terrainRegions, tables.landTiers, tables.grounds).messages);
    return out;
  }, [tables]);

  const problemIds = useMemo(() => {
    const set = new Set<string>();
    if (!tables) return set;
    const sections: (RectSection & { id: string })[] = [...tables.grounds, ...tables.cultivatedPlots];
    for (const s of sections) {
      if (!clearsHomesteadLive(s, tables.landTiers) || crossesRoad(s)) set.add(s.id);
    }
    for (const g of tables.grounds) if (offRoad(g) > ROAD_REACH) set.add(g.id);
    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        if (sectionsOverlapLive(sections[i], sections[j])) { set.add(sections[i].id); set.add(sections[j].id); }
      }
    }
    for (const id of terrainRegionProblems(tables.terrainRegions, tables.landTiers, tables.grounds).ids) set.add(id);
    return set;
  }, [tables]);

  const save = useCallback((table: TableName) => {
    if (!tables) return;
    setSaving(table);
    setStatus((s) => ({ ...s, [table]: undefined }));
    fetch('/api/worldeditor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data: tables[table] }),
    })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error ?? `save -> ${r.status}`);
        setStatus((s) => ({ ...s, [table]: { ok: true, text: 'Saved.' } }));
      })
      .catch((e) => setStatus((s) => ({ ...s, [table]: { ok: false, text: String(e.message ?? e) } })))
      .finally(() => setSaving(null));
  }, [tables]);

  if (loadError) {
    return <div style={{ padding: 24, fontFamily: 'monospace', color: '#c0392b' }}>Failed to load: {loadError}</div>;
  }
  if (!tables) {
    return <div style={{ padding: 24, fontFamily: 'monospace' }}>Loading…</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#1b1d22', color: '#e8e6df', minHeight: '100vh', padding: 20 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>World Editor <span style={{ opacity: 0.5, fontWeight: 'normal' }}>— dev only, never available in production</span></h1>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
        Editing as: {editorName ?? 'not signed in (display only — not required to use this page)'}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <MapPreview tables={tables} problemIds={problemIds} />

        <div style={{ flex: '1 1 420px', minWidth: 360 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(Object.keys(TABLE_LABEL) as TableName[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '6px 12px', borderRadius: 4, border: '1px solid #444',
                  background: tab === t ? '#3a3f4b' : '#26282e', color: '#e8e6df', cursor: 'pointer',
                }}
              >
                {TABLE_LABEL[t]} ({tables[t].length})
              </button>
            ))}
            <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}>
              Reload from disk
            </button>
          </div>

          {tab === 'grounds' && (
            <GroundsForm
              rows={tables.grounds}
              onChange={(rows) => setTables({ ...tables, grounds: rows })}
              problemIds={problemIds}
            />
          )}
          {tab === 'cultivatedPlots' && (
            <PlotsForm
              rows={tables.cultivatedPlots}
              onChange={(rows) => setTables({ ...tables, cultivatedPlots: rows })}
              problemIds={problemIds}
            />
          )}
          {tab === 'landTiers' && (
            <LandTiersForm
              rows={tables.landTiers}
              onChange={(rows) => setTables({ ...tables, landTiers: rows })}
            />
          )}
          {tab === 'terrainRegions' && (
            <TerrainRegionsForm
              rows={tables.terrainRegions}
              onChange={(rows) => setTables({ ...tables, terrainRegions: rows })}
              problemIds={problemIds}
            />
          )}

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => save(tab)}
              disabled={saving === tab}
              style={{ padding: '8px 16px', borderRadius: 4, border: 'none', background: '#4a7c59', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {saving === tab ? 'Saving…' : `Save ${TABLE_LABEL[tab]}`}
            </button>
            {status[tab] && (
              <span style={{ color: status[tab]!.ok ? '#7fbf7f' : WARN_COLOR, fontSize: 13 }}>{status[tab]!.text}</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 6 }}>Live warnings {warnings.length === 0 && <span style={{ color: '#7fbf7f' }}>— none</span>}</h2>
        {warnings.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 20, color: WARN_COLOR, fontSize: 13 }}>
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---- live top-down preview -------------------------------------------------

function MapPreview({ tables, problemIds }: { tables: Tables; problemIds: Set<string> }) {
  const HALF = 220; // world content lives well inside ±200 (WORLD_HALF)
  const cells = routeCells();
  return (
    <div style={{ flex: '0 0 auto' }}>
      <svg viewBox={`${-HALF} ${-HALF} ${HALF * 2} ${HALF * 2}`} width={560} height={560} style={{ background: '#232922', border: '1px solid #444', borderRadius: 4 }}>
        {/* homestead tiers, nested, largest first. Wave 17 #4: the rect is no
            longer a square — `half` still bounds north/east/west, but the
            south edge sits at `southHalf` instead of mirroring `half`. */}
        {[...tables.landTiers].sort((a, b) => b.half - a.half).map((t, i) => (
          <rect key={i} x={-t.half} y={-t.half} width={t.half * 2} height={t.half + t.southHalf} fill="none" stroke="#5a5f6a" strokeWidth={0.6} />
        ))}
        {/* road tiles */}
        {cells.map(([cx, cz], i) => (
          <rect key={i} x={cx * ROAD_TILE - ROAD_TILE / 2} y={cz * ROAD_TILE - ROAD_TILE / 2} width={ROAD_TILE} height={ROAD_TILE} fill="#5a4a34" opacity={0.55} />
        ))}
        {/* pond + brook */}
        <circle cx={POND.x} cy={POND.z} r={POND.radius} fill="#2f6f8f" opacity={0.7} />
        <line x1={BROOK.startX} y1={BROOK.startZ} x2={BROOK.endX} y2={BROOK.endZ} stroke="#2f6f8f" strokeWidth={2} opacity={0.7} />
        {/* starter village clear zones */}
        {STARTER_VILLAGE_CLEAR.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.z} r={c.r} fill="none" stroke="#9a8f6a" strokeDasharray="2,2" strokeWidth={0.5} />
        ))}
        {/* grounds — solid border */}
        {tables.grounds.map((g) => (
          <SectionRect key={g.id} s={g} dashed={false} problem={problemIds.has(g.id)} />
        ))}
        {/* cultivated plots — dashed border, same fill language */}
        {tables.cultivatedPlots.map((p) => (
          <SectionRect key={p.id} s={p} dashed problem={problemIds.has(p.id)} />
        ))}
        {/* terrain regions — solid earth-tone box (real placed elevation,
            same "solid = real content" convention as grounds above), one
            dashed unfilled circle per bump keyed to its own radius (reusing
            STARTER_VILLAGE_CLEAR's own dashed-circle idiom above for a
            soft/secondary overlay, not a new convention) */}
        {tables.terrainRegions.map((r) => {
          const color = problemIds.has(r.id) ? WARN_COLOR : REGION_COLOR;
          return (
            <g key={r.id}>
              <rect
                x={r.x - r.half} y={r.z - r.half} width={r.half * 2} height={r.half * 2}
                fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.2}
              />
              {r.bumps.map((b, bi) => (
                <circle
                  key={bi} cx={r.x + b.ox} cy={r.z + b.oz} r={b.r}
                  fill="none" stroke={color} strokeDasharray="2,2" strokeWidth={0.6}
                />
              ))}
            </g>
          );
        })}
        {/* origin marker */}
        <circle cx={0} cy={0} r={1.5} fill="#e8e6df" />
      </svg>
      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, maxWidth: 560 }}>
        Solid = grounds, dashed = cultivated plots. Tan = road, blue = pond/brook, dotted = starter-village
        clearance, earth-brown = terrain regions (solid box = the region&apos;s own field, dashed circles =
        its bumps). Red = fails a check below (overlap, homestead clearance, road crossing, too close to the
        world edge, or — for a region — too steep, not fully buried at its rim, inside the build fence/dig
        reach, or crossing the road/a ground).
      </div>
    </div>
  );
}

function SectionRect({ s, dashed, problem }: { s: RectSection; dashed: boolean; problem: boolean }) {
  const color = problem ? WARN_COLOR : KIND_COLOR[s.kind];
  return (
    <g>
      <rect
        x={s.x - s.halfX} y={s.z - s.halfZ} width={s.halfX * 2} height={s.halfZ * 2}
        fill={color} fillOpacity={0.28} stroke={color} strokeWidth={1} strokeDasharray={dashed ? '3,2' : undefined}
      />
    </g>
  );
}

// ---- forms ------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, gap: 2 }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#26282e', color: '#e8e6df', border: '1px solid #444', borderRadius: 3, padding: '4px 6px', fontSize: 12, width: '100%',
};

function RowCard({ problem, children }: { problem: boolean; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${problem ? WARN_COLOR : '#3a3f4b'}`, borderRadius: 6, padding: 10, marginBottom: 8, background: '#20222a' }}>
      {children}
    </div>
  );
}

function GroundsForm({ rows, onChange, problemIds }: { rows: GroundRow[]; onChange: (r: GroundRow[]) => void; problemIds: Set<string> }) {
  const update = (i: number, patch: Partial<GroundRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, {
    id: `ground_${rows.length + 1}`, name: 'New Ground', kind: 'tree', x: 0, z: 0, halfX: 10, halfZ: 10,
    tier: 0, count: 6, lockedHint: 'Yours from the first day',
  }]);
  return (
    <div>
      {rows.map((g, i) => (
        <RowCard key={i} problem={problemIds.has(g.id)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <Field label="id"><input style={inputStyle} value={g.id} onChange={(e) => update(i, { id: e.target.value })} /></Field>
            <Field label="name"><input style={inputStyle} value={g.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
            <Field label="kind">
              <select style={inputStyle} value={g.kind} onChange={(e) => update(i, { kind: e.target.value as Kind })}>
                <option value="tree">tree</option><option value="rock">rock</option><option value="herb">herb</option>
              </select>
            </Field>
            <Field label="variant">
              <select style={inputStyle} value={g.variant ?? ''} onChange={(e) => update(i, { variant: e.target.value === 'iron' ? 'iron' : undefined })}>
                <option value="">—</option><option value="iron">iron</option>
              </select>
            </Field>
            <Field label="x"><input style={inputStyle} type="number" value={g.x} onChange={(e) => update(i, { x: num(e.target.value) })} /></Field>
            <Field label="z"><input style={inputStyle} type="number" value={g.z} onChange={(e) => update(i, { z: num(e.target.value) })} /></Field>
            <Field label="halfX"><input style={inputStyle} type="number" value={g.halfX} onChange={(e) => update(i, { halfX: num(e.target.value) })} /></Field>
            <Field label="halfZ"><input style={inputStyle} type="number" value={g.halfZ} onChange={(e) => update(i, { halfZ: num(e.target.value) })} /></Field>
            <Field label="tier"><input style={inputStyle} type="number" value={g.tier} onChange={(e) => update(i, { tier: num(e.target.value) })} /></Field>
            <Field label="count"><input style={inputStyle} type="number" value={g.count} onChange={(e) => update(i, { count: num(e.target.value) })} /></Field>
            <Field label="pondShore">
              <input type="checkbox" checked={g.pondShore ?? false} onChange={(e) => update(i, { pondShore: e.target.checked || undefined })} />
            </Field>
            <Field label="lockedHint"><input style={inputStyle} value={g.lockedHint} onChange={(e) => update(i, { lockedHint: e.target.value })} /></Field>
          </div>
          <button onClick={() => remove(i)} style={{ marginTop: 8, fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>Remove</button>
        </RowCard>
      ))}
      <button onClick={add} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}>+ Add Ground</button>
    </div>
  );
}

function PlotsForm({ rows, onChange, problemIds }: { rows: PlotRow[]; onChange: (r: PlotRow[]) => void; problemIds: Set<string> }) {
  const update = (i: number, patch: Partial<PlotRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, {
    id: `plot_${rows.length + 1}`, name: 'New Plot', kind: 'herb', x: 0, z: 0, halfX: 8, halfZ: 8,
    count: 6, plantHint: 'Break the ground and plant', stage: 0, plantedAt: 0, lastWateredAt: null,
  }]);
  return (
    <div>
      {rows.map((p, i) => (
        <RowCard key={i} problem={problemIds.has(p.id)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <Field label="id"><input style={inputStyle} value={p.id} onChange={(e) => update(i, { id: e.target.value })} /></Field>
            <Field label="name"><input style={inputStyle} value={p.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
            <Field label="kind">
              <select style={inputStyle} value={p.kind} onChange={(e) => update(i, { kind: e.target.value as Kind })}>
                <option value="tree">tree</option><option value="rock">rock</option><option value="herb">herb</option>
              </select>
            </Field>
            <Field label="x"><input style={inputStyle} type="number" value={p.x} onChange={(e) => update(i, { x: num(e.target.value) })} /></Field>
            <Field label="z"><input style={inputStyle} type="number" value={p.z} onChange={(e) => update(i, { z: num(e.target.value) })} /></Field>
            <Field label="halfX"><input style={inputStyle} type="number" value={p.halfX} onChange={(e) => update(i, { halfX: num(e.target.value) })} /></Field>
            <Field label="halfZ"><input style={inputStyle} type="number" value={p.halfZ} onChange={(e) => update(i, { halfZ: num(e.target.value) })} /></Field>
            <Field label="count (full stage)"><input style={inputStyle} type="number" value={p.count} onChange={(e) => update(i, { count: num(e.target.value) })} /></Field>
            <Field label="plantHint"><input style={inputStyle} value={p.plantHint} onChange={(e) => update(i, { plantHint: e.target.value })} /></Field>
          </div>
          <button onClick={() => remove(i)} style={{ marginTop: 8, fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>Remove</button>
        </RowCard>
      ))}
      <button onClick={add} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}>+ Add Plot</button>
    </div>
  );
}

function LandTiersForm({ rows, onChange }: { rows: LandTierRow[]; onChange: (r: LandTierRow[]) => void }) {
  const update = (i: number, patch: Partial<LandTierRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, { walls: 3, half: 16, southHalf: 12, cost: 0, name: 'New Tier' }]);
  return (
    <div>
      {rows.map((t, i) => (
        <RowCard key={i} problem={false}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            <Field label="name"><input style={inputStyle} value={t.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
            <Field label="walls"><input style={inputStyle} type="number" value={t.walls} onChange={(e) => update(i, { walls: num(e.target.value) })} /></Field>
            <Field label="half (N/E/W)"><input style={inputStyle} type="number" value={t.half} onChange={(e) => update(i, { half: num(e.target.value) })} /></Field>
            <Field label="southHalf"><input style={inputStyle} type="number" value={t.southHalf} onChange={(e) => update(i, { southHalf: num(e.target.value) })} /></Field>
            <Field label="cost"><input style={inputStyle} type="number" value={t.cost} onChange={(e) => update(i, { cost: num(e.target.value) })} /></Field>
          </div>
          <button onClick={() => remove(i)} style={{ marginTop: 8, fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>Remove</button>
        </RowCard>
      ))}
      <button onClick={add} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}>+ Add Tier</button>
      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
        Tiers must stay sorted smallest-to-largest `half` for the deed ladder to make sense — this isn&apos;t
        enforced live yet, double-check order before saving. `southHalf` (Wave 17 #4) is the separate south
        fence bound — it is meant to stay constant across every tier (12, today) so the south side never grows
        back toward the real east road (Road.tsx's plates start at z=19.2); raising it for one tier without
        checking the road's own position live here is how that bug comes back.
      </div>
    </div>
  );
}

// Wave 60 · a region's own box (id/name/x/z/half) plus a repeatable
// sub-editor for its `bumps` array — the same Field/inputStyle/RowCard
// idiom every other form on this page already uses, no new UI dependency.
function TerrainRegionsForm({ rows, onChange, problemIds }: { rows: TerrainRegion[]; onChange: (r: TerrainRegion[]) => void; problemIds: Set<string> }) {
  const update = (i: number, patch: Partial<TerrainRegion>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));
  const add = () => onChange([...rows, {
    id: `region_${rows.length + 1}`, name: 'New Region', x: 0, z: -94, half: 30,
    bumps: [{ ox: 0, oz: 0, r: 20, h: 3 }],
  }]);

  const updateBump = (i: number, bi: number, patch: Partial<TerrainRegion['bumps'][number]>) => {
    const bumps = rows[i].bumps.slice();
    bumps[bi] = { ...bumps[bi], ...patch };
    update(i, { bumps });
  };
  const removeBump = (i: number, bi: number) => update(i, { bumps: rows[i].bumps.filter((_, idx) => idx !== bi) });
  const addBump = (i: number) => update(i, { bumps: [...rows[i].bumps, { ox: 0, oz: 0, r: 20, h: 3 }] });

  return (
    <div>
      {rows.map((r, i) => (
        <RowCard key={i} problem={problemIds.has(r.id)}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            <Field label="id"><input style={inputStyle} value={r.id} onChange={(e) => update(i, { id: e.target.value })} /></Field>
            <Field label="name"><input style={inputStyle} value={r.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
            <Field label="x"><input style={inputStyle} type="number" value={r.x} onChange={(e) => update(i, { x: num(e.target.value) })} /></Field>
            <Field label="z"><input style={inputStyle} type="number" value={r.z} onChange={(e) => update(i, { z: num(e.target.value) })} /></Field>
            <Field label="half"><input style={inputStyle} type="number" value={r.half} onChange={(e) => update(i, { half: num(e.target.value) })} /></Field>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
              Bumps — raised-cosine hills, offsets from the region&apos;s own centre
            </div>
            {r.bumps.map((b, bi) => (
              <div key={bi} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                <Field label="ox"><input style={inputStyle} type="number" value={b.ox} onChange={(e) => updateBump(i, bi, { ox: num(e.target.value) })} /></Field>
                <Field label="oz"><input style={inputStyle} type="number" value={b.oz} onChange={(e) => updateBump(i, bi, { oz: num(e.target.value) })} /></Field>
                <Field label="r"><input style={inputStyle} type="number" value={b.r} onChange={(e) => updateBump(i, bi, { r: num(e.target.value) })} /></Field>
                <Field label="h"><input style={inputStyle} type="number" value={b.h} onChange={(e) => updateBump(i, bi, { h: num(e.target.value) })} /></Field>
                <button
                  onClick={() => removeBump(i, bi)}
                  style={{ fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', height: 28 }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => addBump(i)}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}
            >
              + Add bump
            </button>
          </div>

          <button onClick={() => remove(i)} style={{ marginTop: 10, fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>Remove region</button>
        </RowCard>
      ))}
      <button onClick={add} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}>+ Add Region</button>
    </div>
  );
}
