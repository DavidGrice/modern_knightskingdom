'use client';
// Canvas minimap (top-right): player arrow, resources, buildings, pond, NPC
// and the build region. M toggles between compact and large.
// Phase 23: instance-aware — every destination is its OWN map, centered on
// its own origin at its own scale, with its own landmarks. The homestead
// frame (pond/build region/nodes/merchant) never bleeds onto another realm.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { BUILD_REGION } from '@/game/data/buildables';
import { TERRAIN_REGIONS, REGION_PEAK, regionSurfaceY } from '@/game/data/terrainRegions';
import { BATTLE_DOME, CEDRIC_CAMP, CEDRIC_WORLD, KEEP_INTERIOR, POND, STORM_WORLD, WORLD_HALF } from '@/game/data/world';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { resolveWorldWalkableRects } from '@/game/data/templateWalkableFootprint';
import { GUILD_BY_WORLD } from '@/game/data/guilds';
import { NPCS } from '@/game/data/npcs';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import { worldEnv } from '@/game/env';
import { playerState } from '../fps/PlayerController';
import { getBakeOffset, getMountedRegion, getMountedRoot, sampleTemplateGroundY, TEMPLATE_WORLD_SCALE } from '../world/TemplateWorld';
import { useEnemyStore } from '@/game/combat';
import { villagerMobs } from '@/game/villagerMobs';

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Requested 2026-07-31: a real Options setting for which size the map
  // STARTS at each session — a plain imperative read (not a subscribed hook
  // value), since this only ever seeds the initial state; the M-key toggle
  // below stays a live, session-only quick-toggle, unchanged.
  const [large, setLarge] = useState(() => useAppStore.getState().settings.minimapDefaultSize === 'large');
  const colorblind = useAppStore((s) => s.settings.colorblindMode);
  const colorblindRef = useRef(colorblind);
  colorblindRef.current = colorblind;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const st = useGameStore.getState();
        if (!st.paused && !st.buildMode) setLarge((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const size = large ? 380 : 170;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    // destination elevation raster cache: sampleTemplateGroundY raycasts the
    // real mounted mesh with no BVH acceleration, so recomputing all ~380
    // surviving cells of the 22x22 grid below on EVERY throttled draw tick
    // (rather than once, the way the Downs' own DOWNS_PEAK is a precomputed
    // figure, not a per-tick scan) measured 75-500ms of synchronous
    // main-thread work per pass on the heavier destination bakes — a severe,
    // continuous stutter the analytic Downs technique never had. The bake is
    // static per destination (the same .glb scene every visit), so it is
    // computed once per NEWLY MOUNTED destination and reused every tick
    // after, keyed on id alone — cheap to invalidate, since only the id
    // changing (a real new mount) should ever trigger a recompute.
    let rasterDestId: string | null = null;
    let rasterHeights: Float32Array | null = null;
    let rasterLo = 0;
    let rasterHi = 1;
    // Real terrain boundaries (2026-08-21): alongside the elevation grid
    // above, this same once-per-mount cache now also holds a measured
    // world-space bbox of the actually mounted bake (TemplateWorld.tsx's
    // getMountedRoot(); Box3.setFromObject walks node bounding boxes, not
    // triangles — negligible next to the raycast sampling this cache exists
    // to gate) and a resolution that scales the grid's CELL COUNT to the
    // bbox's own aspect ratio while holding the total cell budget roughly
    // constant (~484, matching the fixed 22x22 grid's own proven-cheap cost
    // — see this cache's original doc comment) rather than scaling cell
    // density unboundedly with area, so a much larger or more elongated
    // destination's one-time post-travel sampling pass never turns back
    // into the stutter that fix hunted down.
    let rasterMinX = 0, rasterMaxX = 1, rasterMinZ = 0, rasterMaxZ = 1;
    let rasterCellsX = 22, rasterCellsZ = 22;
    let rasterViewHalf = 1;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 180) return; // ~5 fps is plenty
      last = now;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const S = canvas.width;
      const st = useGameStore.getState();
      // every destination is its own map: center on its own origin at its
      // own scale — never the homestead frame with a dot smeared off-edge
      const dest = st.destination ? WORLD_DESTINATION_BY_ID[st.destination] : null;
      const cx = dest ? dest.origin.x : 0;
      const cz = dest ? dest.origin.z : 0;
      // Real terrain boundaries (2026-08-21): measure the mounted bake's
      // real extent ONCE per newly-mounted destination (same guard/timing
      // as the elevation raster's own recompute below — it has to run
      // BEFORE half/k/px/pz are derived here, since the view window itself
      // now comes from this measurement instead of a fixed dest.radius
      // multiple). Only the currently MOUNTED destination's own root is
      // safe to read (getMountedRegion's own rationale) — an unmounted or
      // just-switched-destination frame leaves the cache alone rather than
      // force a bogus read; `half` below falls back to the old
      // radius-derived formula for exactly that (bounded, self-correcting
      // within one mount) window.
      if (dest && rasterDestId !== dest.id && getMountedRegion() === dest.id) {
        const root = getMountedRoot();
        if (root) {
          const box = new THREE.Box3().setFromObject(root);
          // half-extent NEEDED to keep the whole measured box inside a
          // square view centered on dest.origin — not just the box's own
          // half-width/-depth — so an off-center bake (recentring targets
          // the WHOLE bake's bbox center, not the walkable footprint's)
          // still never gets cropped on its far side.
          const halfNeeded = Math.max(
            Math.abs(box.min.x - dest.origin.x), Math.abs(box.max.x - dest.origin.x),
            Math.abs(box.min.z - dest.origin.z), Math.abs(box.max.z - dest.origin.z),
            1,
          );
          rasterViewHalf = halfNeeded * 1.08;
          rasterMinX = box.min.x; rasterMaxX = box.max.x;
          rasterMinZ = box.min.z; rasterMaxZ = box.max.z;
          const boxWidth = Math.max(box.max.x - box.min.x, 0.001);
          const boxDepth = Math.max(box.max.z - box.min.z, 0.001);
          const CELL_BUDGET = 484; // ~22x22 — see this cache's own header
          const aspect = boxWidth / boxDepth;
          rasterCellsX = THREE.MathUtils.clamp(Math.round(Math.sqrt(CELL_BUDGET * aspect)), 12, 40);
          rasterCellsZ = THREE.MathUtils.clamp(Math.round(Math.sqrt(CELL_BUDGET / aspect)), 12, 40);
          const stepX = boxWidth / rasterCellsX;
          const stepZ = boxDepth / rasterCellsZ;
          const heights = new Float32Array(rasterCellsX * rasterCellsZ);
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < rasterCellsX; i++) {
            for (let j = 0; j < rasterCellsZ; j++) {
              const wx = rasterMinX + (i + 0.5) * stepX;
              const wz = rasterMinZ + (j + 0.5) * stepZ;
              const h = sampleTemplateGroundY(wx, wz);
              heights[i * rasterCellsZ + j] = h;
              if (h < lo) lo = h;
              if (h > hi) hi = h;
            }
          }
          rasterDestId = dest.id;
          rasterHeights = heights;
          rasterLo = lo;
          rasterHi = hi;
        }
      }
      const half = dest ? (rasterDestId === dest.id ? rasterViewHalf : dest.radius * 1.12) : WORLD_HALF;
      const k = S / (half * 2); // world meters -> px
      const px = (x: number) => (x - cx + half) * k;
      const pz = (z: number) => (z - cz + half) * k;

      ctx.clearRect(0, 0, S, S);
      // ground — visiting realms read colder than the home meadow
      ctx.fillStyle = dest ? 'rgba(34, 40, 32, 0.9)' : 'rgba(30, 48, 24, 0.88)';
      ctx.beginPath();
      ctx.roundRect(0, 0, S, S, 10);
      ctx.fill();

      const cb = colorblindRef.current;
      if (!dest) {
        // Wave 12 · the North Downs, shaded by height — drawn FIRST, because
        // it is ground and everything else stands on it. Bands rather than an
        // outline: every other thing on this map is a rectangle or a ring, and
        // a hill drawn as one more outline reads as another fenced rectangle
        // instead of as one of the places on the homestead that goes up.
        // Sampled from the field rather than handed the shape, so
        // re-authoring a hill never leaves a stale drawing of the old one
        // here. Wave 31 · looped over every TERRAIN_REGIONS entry (West Fell
        // joins the Downs) instead of one hardcoded box — this is also the
        // only reason either prototype is findable at all: nothing else in
        // the game points north.
        for (const region of TERRAIN_REGIONS) {
          const cells = 22;
          const step = (region.half * 2) / cells;
          for (let i = 0; i < cells; i++) {
            for (let j = 0; j < cells; j++) {
              const wx = region.x - region.half + (i + 0.5) * step;
              const wz = region.z - region.half + (j + 0.5) * step;
              const h = regionSurfaceY(region, wx, wz);
              if (h <= 0) continue; // still buried under the meadow — not ground you can see
              ctx.fillStyle = `rgba(122, 98, 56, ${(0.22 + (h / REGION_PEAK[region.id]) * 0.5).toFixed(3)})`;
              ctx.fillRect(px(wx - step / 2), pz(wz - step / 2), step * k + 1, step * k + 1);
            }
          }
        }
        // homestead dressing only ever draws on the homestead's own map
        ctx.strokeStyle = 'rgba(232, 193, 65, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          px(BUILD_REGION.minX), pz(BUILD_REGION.minZ),
          (BUILD_REGION.maxX - BUILD_REGION.minX) * k,
          (BUILD_REGION.maxZ - BUILD_REGION.minZ) * k,
        );
        ctx.fillStyle = '#2d6bb0';
        ctx.beginPath();
        ctx.arc(px(POND.x), pz(POND.z), POND.radius * k, 0, Math.PI * 2);
        ctx.fill();
        // Wave 12 · the player's own waterways, in the pond's own blue — a
        // moat you cannot see on the map is a moat you will walk into. Read
        // from the store copy rather than the leaf module because this whole
        // draw already runs off one `getState()`.
        for (const w of st.waterworks) {
          ctx.fillRect(px(w.x - w.halfX), pz(w.z - w.halfZ), w.halfX * 2 * k, w.halfZ * 2 * k);
        }
        // resources — colorblind palette swaps green/green-ish pairs (tree vs
        // herb) for tones that stay distinct under deuteranopia/protanopia
        for (const n of st.nodes) {
          if (n.respawnAt) continue;
          if (n.kind === 'tree') ctx.fillStyle = cb ? '#009E73' : '#3f9a3f';
          else if (n.kind === 'fishing') ctx.fillStyle = '#7fd4ff';
          else if (n.kind === 'herb') ctx.fillStyle = cb ? '#F0E442' : '#a8e05f';
          else ctx.fillStyle = n.variant === 'iron' ? '#c97434' : '#9a9aa0';
          ctx.beginPath();
          ctx.arc(px(n.x), pz(n.z), n.kind === 'tree' ? 2.2 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // this destination's real measured extent, shaded by real sampled
        // elevation — the home regions' own sampled-grid technique above,
        // extended to a real destination bake: regionSurfaceY (an authored
        // analytic field with a known REGION_PEAK) swapped for
        // sampleTemplateGroundY (a live raycast against the actual mounted
        // mesh — TemplateWorld.tsx). Real terrain boundaries (2026-08-21): the
        // circular crop this replaced only ever matched the OLD artificial
        // wander bound — the raster now fills the destination's entire
        // measured bounding box (rasterMinX/Z..rasterMaxX/Z, cached above
        // alongside this same height data), full stop, so backdrop terrain
        // the player can never reach — a mountain rim, a distant hillside —
        // is shown too, not hidden. Drawn only once real cached data exists
        // FOR THIS destination (rasterDestId === dest.id, set by the cache
        // block above): a fresh mount that hasn't measured yet just skips
        // the shading for a tick rather than drawing another destination's
        // stale terrain under this one's frame.
        if (rasterDestId === dest.id && rasterHeights) {
          const stepX = (rasterMaxX - rasterMinX) / rasterCellsX;
          const stepZ = (rasterMaxZ - rasterMinZ) / rasterCellsZ;
          const span = rasterHi - rasterLo || 1;
          for (let i = 0; i < rasterCellsX; i++) {
            for (let j = 0; j < rasterCellsZ; j++) {
              const h = rasterHeights[i * rasterCellsZ + j];
              const wx = rasterMinX + (i + 0.5) * stepX;
              const wz = rasterMinZ + (j + 0.5) * stepZ;
              ctx.fillStyle = `rgba(122, 98, 56, ${(0.22 + ((h - rasterLo) / span) * 0.5).toFixed(3)})`;
              ctx.fillRect(px(wx - stepX / 2), pz(wz - stepZ / 2), stepX * k + 1, stepZ * k + 1);
            }
          }
        }
        // the walkable footprint — real classified rects (templateWalkable-
        // Footprint.ts) when this destination has any, one strokeRect per
        // rect (same gold the old single circle used); falls back to the
        // original stroked circle, byte-for-byte, for any destination
        // without classified data yet (challenges, dungeon, arena, a future
        // template) OR — same guard as PlayerController.tsx's own clamp,
        // see its comment for the live-caught race this avoids — for the
        // first few frames after travelTo() before this destination's async
        // GLB (and thus its real getBakeOffset()) has actually resolved;
        // drawing rects against a stale/zero offset would flash a
        // misplaced overlay before snapping correct a few frames later. The
        // view above no longer doubles as "where you can walk" (that was
        // the old circle's whole job) now that it shows the full real bake
        // extent instead, so this is the ONLY remaining walkable-bound
        // indicator on the map.
        {
          const scaleCompensation = (dest.worldScale ?? TEMPLATE_WORLD_SCALE) / TEMPLATE_WORLD_SCALE;
          const rects = getMountedRegion() === dest.id ? resolveWorldWalkableRects(dest, getBakeOffset(), scaleCompensation) : null;
          ctx.strokeStyle = 'rgba(232, 193, 65, 0.35)';
          ctx.lineWidth = 1;
          if (rects && rects.length) {
            for (const r of rects) {
              ctx.strokeRect(px(r.minX), pz(r.minZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k);
            }
          } else {
            ctx.beginPath();
            ctx.arc(px(cx), pz(cz), dest.radius * k, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        // …plus its own landmarks
        if (st.destination === STORM_WORLD) {
          ctx.strokeStyle = '#dfe4f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px(BATTLE_DOME.x), pz(BATTLE_DOME.z), Math.max(3, BATTLE_DOME.radius * k), 0, Math.PI * 2);
          ctx.stroke();
        }
        if (st.destination === CEDRIC_WORLD) {
          ctx.fillStyle = '#a02318';
          ctx.save();
          ctx.translate(px(CEDRIC_CAMP.x), pz(CEDRIC_CAMP.z));
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
        const guild = GUILD_BY_WORLD[st.destination ?? ''];
        if (guild) {
          ctx.strokeStyle = '#e8c141';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px(guild.hallX), pz(guild.hallZ), 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // buildings — this realm's own only (instance-separation doctrine: a
      // remote claimed plot's structures belong to that map, not this one)
      ctx.fillStyle = '#d8b878';
      for (const b of st.buildings) {
        if ((b.world ?? null) !== (st.destination ?? null)) continue;
        ctx.fillRect(px(b.x) - 2, pz(b.z) - 2, 4, 4);
      }
      // enemies — colorblind mode uses vermillion + a square marker so they
      // stay shape-distinct from the (also reddish-to-some-eyes) NPC dots
      for (const e of useEnemyStore.getState().enemies) {
        if (e.mob.state === 'dying') continue;
        ctx.fillStyle = cb ? '#D55E00' : '#e04434';
        if (cb) {
          ctx.fillRect(px(e.mob.x) - 3, pz(e.mob.z) - 3, 6, 6);
        } else {
          ctx.beginPath();
          ctx.arc(px(e.mob.x), pz(e.mob.z), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // NPCs of the current place only — instance residents (Phase 20) live
      // a thousand units away and would just smear dots off the map edge
      ctx.fillStyle = '#e8c141';
      for (const n of NPCS) {
        if ((n.world ?? null) !== (st.destination ?? null)) continue;
        ctx.beginPath();
        ctx.arc(px(n.x), pz(n.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // recruited villagers
      ctx.fillStyle = '#8fc9e8';
      for (const v of st.villagers) {
        const m = villagerMobs[v.id];
        if (!m) continue;
        ctx.beginPath();
        ctx.arc(px(m.x), pz(m.z), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // traveling merchant (diamond, daylight only — a homestead visitor)
      if (!dest && merchantPresent(worldEnv.time)) {
        ctx.fillStyle = cb ? '#F0E442' : '#7fd48a';
        ctx.save();
        ctx.translate(px(MERCHANT_SPOT.x), pz(MERCHANT_SPOT.z));
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
        ctx.restore();
      }
      // the keep's great hall (once a Grand Keep has been raised at HOME —
      // a keep built on some remote claimed plot doesn't light this up)
      if (!dest && st.buildings.some((b) => b.type === 'keep' && (b.world ?? null) === null)) {
        ctx.strokeStyle = '#e8c141';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px(KEEP_INTERIOR.x), pz(KEEP_INTERIOR.z), 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // player arrow (yaw 0 faces -Z = up on the map)
      ctx.save();
      ctx.translate(px(playerState.x), pz(playerState.z));
      ctx.rotate(-playerState.yaw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // north marker
      ctx.fillStyle = 'rgba(232, 217, 176, 0.9)';
      ctx.font = 'bold 11px Georgia';
      ctx.fillText('N', S / 2 - 4, 13);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // the frame carries the lane treatment (HANDOFF §7.5: one minimap shape
  // per lane); the canvas just fills it
  return (
    <div className="kk-minimap-frame kk-glass">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
