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
import { ROAD_TILE, routeCells } from '@/game/data/road';
import { POND, BROOK, STARTER_VILLAGE_CLEAR } from '@/game/data/world';
import type { TerrainRegion } from '@/game/data/terrainRegions';
import { liveChecks, type GroundRow, type Kind, type LandTierRow, type PlotRow, type Tables } from './liveChecks';
import {
  AddButton, Field, FieldGrid, inputStyle, KindSelect, NumField, RemoveButton, RowCard, rowEdits, TextField, WARN_COLOR,
} from './formPrimitives';

type TableName = keyof Tables;
const TABLE_LABEL: Record<TableName, string> = {
  grounds: 'Grounds',
  landTiers: 'Land Tiers',
  cultivatedPlots: 'Cultivated Plots',
  terrainRegions: 'Terrain Regions',
};

const KIND_COLOR: Record<Kind, string> = { tree: '#3f8f5b', rock: '#8b8378', herb: '#8b5fa8' };
// Wave 60 · terrain regions' own colour — visually distinct earth tone, not
// reused from KIND_COLOR (a region is elevation, not a resource ground).
const REGION_COLOR = '#a67c3d';

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

  // CLN-09 · one pass for both — it used to run every check twice, the terrain sweep with them
  const checks = useMemo(() => (tables ? liveChecks(tables) : { messages: [] as string[], ids: new Set<string>() }), [tables]);
  const warnings = checks.messages;
  const problemIds = checks.ids;

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
// built from formPrimitives.tsx's pieces (CLN-09); each renders what it did when it wrote them out itself

function GroundsForm({ rows, onChange, problemIds }: { rows: GroundRow[]; onChange: (r: GroundRow[]) => void; problemIds: Set<string> }) {
  const { update, remove, add } = rowEdits(rows, onChange);
  return (
    <div>
      {rows.map((g, i) => (
        <RowCard key={i} problem={problemIds.has(g.id)}>
          <FieldGrid cols={4}>
            <TextField label="id" value={g.id} onChange={(id) => update(i, { id })} />
            <TextField label="name" value={g.name} onChange={(name) => update(i, { name })} />
            <KindSelect value={g.kind} onChange={(kind) => update(i, { kind })} />
            <Field label="variant">
              <select style={inputStyle} value={g.variant ?? ''} onChange={(e) => update(i, { variant: e.target.value === 'iron' ? 'iron' : undefined })}>
                <option value="">—</option><option value="iron">iron</option>
              </select>
            </Field>
            <NumField label="x" value={g.x} onChange={(x) => update(i, { x })} />
            <NumField label="z" value={g.z} onChange={(z) => update(i, { z })} />
            <NumField label="halfX" value={g.halfX} onChange={(halfX) => update(i, { halfX })} />
            <NumField label="halfZ" value={g.halfZ} onChange={(halfZ) => update(i, { halfZ })} />
            <NumField label="tier" value={g.tier} onChange={(tier) => update(i, { tier })} />
            <NumField label="count" value={g.count} onChange={(count) => update(i, { count })} />
            <Field label="pondShore">
              <input type="checkbox" checked={g.pondShore ?? false} onChange={(e) => update(i, { pondShore: e.target.checked || undefined })} />
            </Field>
            <TextField label="lockedHint" value={g.lockedHint} onChange={(lockedHint) => update(i, { lockedHint })} />
          </FieldGrid>
          <RemoveButton onClick={() => remove(i)} />
        </RowCard>
      ))}
      <AddButton onClick={() => add({
        id: `ground_${rows.length + 1}`, name: 'New Ground', kind: 'tree', x: 0, z: 0, halfX: 10, halfZ: 10,
        tier: 0, count: 6, lockedHint: 'Yours from the first day',
      })}>+ Add Ground</AddButton>
    </div>
  );
}

function PlotsForm({ rows, onChange, problemIds }: { rows: PlotRow[]; onChange: (r: PlotRow[]) => void; problemIds: Set<string> }) {
  const { update, remove, add } = rowEdits(rows, onChange);
  return (
    <div>
      {rows.map((p, i) => (
        <RowCard key={i} problem={problemIds.has(p.id)}>
          <FieldGrid cols={4}>
            <TextField label="id" value={p.id} onChange={(id) => update(i, { id })} />
            <TextField label="name" value={p.name} onChange={(name) => update(i, { name })} />
            <KindSelect value={p.kind} onChange={(kind) => update(i, { kind })} />
            <NumField label="x" value={p.x} onChange={(x) => update(i, { x })} />
            <NumField label="z" value={p.z} onChange={(z) => update(i, { z })} />
            <NumField label="halfX" value={p.halfX} onChange={(halfX) => update(i, { halfX })} />
            <NumField label="halfZ" value={p.halfZ} onChange={(halfZ) => update(i, { halfZ })} />
            <NumField label="count (full stage)" value={p.count} onChange={(count) => update(i, { count })} />
            <TextField label="plantHint" value={p.plantHint} onChange={(plantHint) => update(i, { plantHint })} />
          </FieldGrid>
          <RemoveButton onClick={() => remove(i)} />
        </RowCard>
      ))}
      <AddButton onClick={() => add({
        id: `plot_${rows.length + 1}`, name: 'New Plot', kind: 'herb', x: 0, z: 0, halfX: 8, halfZ: 8,
        count: 6, plantHint: 'Break the ground and plant', stage: 0, plantedAt: 0, lastWateredAt: null,
      })}>+ Add Plot</AddButton>
    </div>
  );
}

function LandTiersForm({ rows, onChange }: { rows: LandTierRow[]; onChange: (r: LandTierRow[]) => void }) {
  const { update, remove, add } = rowEdits(rows, onChange);
  return (
    <div>
      {rows.map((t, i) => (
        <RowCard key={i} problem={false}>
          <FieldGrid cols={5}>
            <TextField label="name" value={t.name} onChange={(name) => update(i, { name })} />
            <NumField label="walls" value={t.walls} onChange={(walls) => update(i, { walls })} />
            <NumField label="half (N/E/W)" value={t.half} onChange={(half) => update(i, { half })} />
            <NumField label="southHalf" value={t.southHalf} onChange={(southHalf) => update(i, { southHalf })} />
            <NumField label="cost" value={t.cost} onChange={(cost) => update(i, { cost })} />
          </FieldGrid>
          <RemoveButton onClick={() => remove(i)} />
        </RowCard>
      ))}
      <AddButton onClick={() => add({ walls: 3, half: 16, southHalf: 12, cost: 0, name: 'New Tier' })}>+ Add Tier</AddButton>
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
  const { update, remove, add } = rowEdits(rows, onChange);
  const bumpsOf = (i: number) => rowEdits(rows[i].bumps, (bumps) => update(i, { bumps }));

  return (
    <div>
      {rows.map((r, i) => (
        <RowCard key={i} problem={problemIds.has(r.id)}>
          <FieldGrid cols={5}>
            <TextField label="id" value={r.id} onChange={(id) => update(i, { id })} />
            <TextField label="name" value={r.name} onChange={(name) => update(i, { name })} />
            <NumField label="x" value={r.x} onChange={(x) => update(i, { x })} />
            <NumField label="z" value={r.z} onChange={(z) => update(i, { z })} />
            <NumField label="half" value={r.half} onChange={(half) => update(i, { half })} />
          </FieldGrid>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
              Bumps — raised-cosine hills, offsets from the region&apos;s own centre
            </div>
            {r.bumps.map((b, bi) => (
              <div key={bi} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                <NumField label="ox" value={b.ox} onChange={(ox) => bumpsOf(i).update(bi, { ox })} />
                <NumField label="oz" value={b.oz} onChange={(oz) => bumpsOf(i).update(bi, { oz })} />
                <NumField label="r" value={b.r} onChange={(radius) => bumpsOf(i).update(bi, { r: radius })} />
                <NumField label="h" value={b.h} onChange={(h) => bumpsOf(i).update(bi, { h })} />
                <button
                  onClick={() => bumpsOf(i).remove(bi)}
                  style={{ fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '4px 8px', cursor: 'pointer', height: 28 }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={() => bumpsOf(i).add({ ox: 0, oz: 0, r: 20, h: 3 })}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}
            >
              + Add bump
            </button>
          </div>

          <RemoveButton onClick={() => remove(i)} gap={10}>Remove region</RemoveButton>
        </RowCard>
      ))}
      <AddButton onClick={() => add({
        id: `region_${rows.length + 1}`, name: 'New Region', x: 0, z: -94, half: 30,
        bumps: [{ ox: 0, oz: 0, r: 20, h: 3 }],
      })}>+ Add Region</AddButton>
    </div>
  );
}
