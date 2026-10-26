'use client';
// Aerial build mode: top-down orthographic camera, grid-snapped ghost placement
// with per-piece snap pitch (2m structures, 0.35m stud bricks), vertical
// stacking, a move tool (click a piece with nothing selected), and undo (U).
//
// Wave 9 added four things to the same view, all of them input-only — none of
// them touches what a placement IS, only how many you make in one gesture and
// from what angle you look at them:
//   · Shift+drag along a wall lays the whole run (row-fill, see rowCellsFrom)
//   · the wrecking tool drags a marquee and arms it for confirmation
//   · middle-mouse drags the view, Q/E swing it a quarter turn
//   · F drops the grid entirely (freeform), for dressing a scene
//
// CLN-27 · the camera rig is useBuildCamera.ts, the keyboard useBuildHotkeys.ts, and what is drawn over the ground
// BuildGhost.tsx; this file keeps the piece in hand, the gestures, hold-to-place and the verdicts they all read.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, BUILD_REGION, GRID, buildingsInRect, labAssetId, sizeFor } from '@/game/data/buildables';
import { labIsCorner } from '@/game/data/labCapabilities';
import { snapsAsWall, wallSnap } from '@/game/walls';
import { snapDigRect } from '@/game/waterworks';
import { WORLD_HALF } from '@/game/data/world';
import type { ItemId } from '@/game/types';
import { CAM_BACK, CAM_H, useBuildCamera } from './useBuildCamera';
import { useBuildHotkeys } from './useBuildHotkeys';
import BuildGhost from './BuildGhost';

const REGION_CX = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
const REGION_CZ = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;
// hold-to-place (2026-07-20): a fresh piece/blueprint now needs a deliberate
// hold, mirroring the mining/chopping feel instead of an instant single
// click "popping" a building into being. Relocating an ALREADY-BUILT piece
// (the move tool) has no such "pop" moment and stays a quick click.
const PLACE_HOLD_SECONDS = 0.4;
// Wave 9 · the most pieces one row-fill drag will ever try to lay. A flick of
// the wrist across an orthographic view is a very long way in world metres,
// and "I meant six, it laid four hundred" is not a mistake undo should have to
// clean up.
const MAX_ROW = 24;
// how far a demolish drag has to travel before it counts as a marquee rather
// than a stray click — a zero-area rectangle would arm a confirmation for
// nothing and read as the tool being broken
const MIN_MARQUEE = 0.6;

export default function BuildController() {
  const gl = useThree((s) => s.gl);

  const destination = useGameStore((s) => s.destination);
  const buildings = useGameStore((s) => s.buildings);
  const inventory = useGameStore((s) => s.inventory);
  const claimedWorlds = useGameStore((s) => s.claimedWorlds);
  const claim = destination ? claimedWorlds[destination] : null;
  // a claimed template plot builds around wherever it was planted; home
  // always builds around the keep site — computed once per mount (this
  // component only exists while buildMode is on, so a fresh claim/home
  // center is picked up correctly every time build mode is re-entered)
  const regionCX = claim ? claim.x : REGION_CX;
  const regionCZ = claim ? claim.z : REGION_CZ;

  const keys = useRef<Record<string, boolean>>({});
  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null);
  const [rot, setRot] = useState<0 | 1 | 2 | 3>(0);
  // freeform's true facing in radians (see PlacedBuilding.yaw) — kept in step
  // with `rot` whenever the mode is switched, so turning freeform on and off
  // never silently spins the piece you were holding
  const [freeYaw, setFreeYaw] = useState(0);
  // Wave 51 (C6) · freeform's true per-instance scale (see PlacedBuilding.scale)
  // — kept in step the same way freeYaw is: it carries across a piece switch,
  // and a pickup adopts whatever the picked-up piece already had (below).
  const [freeScale, setFreeScale] = useState(1);
  const mouseDown = useRef(false);
  const holdCellKey = useRef<string | null>(null);
  const holdTime = useRef(0);
  const [placeFrac, setPlaceFrac] = useState(0);

  // Wave 9 · drag gestures. The raw (un-snapped) world point the left button
  // went down on drives both row-fill's direction and the demolish marquee;
  // refs rather than state because the window-level pointerup that cancels a
  // drag released off the ground plane must see the CURRENT value, not the one
  // captured when the listener was attached.
  const dragRaw = useRef<{ x: number; z: number } | null>(null);
  const rowAnchor = useRef<{ x: number; z: number } | null>(null);
  const [rowCells, setRowCells] = useState<{ x: number; z: number }[]>([]);
  const [dragRect, setDragRect] = useState<{ minX: number; maxX: number; minZ: number; maxZ: number } | null>(null);

  const selection = useGameStore((s) => s.buildSelection);
  const blueprintSelection = useGameStore((s) => s.blueprintSelection);
  const moving = useGameStore((s) => s.movingBuilding);
  const buildTool = useGameStore((s) => s.buildTool);
  const freeform = useGameStore((s) => s.freeformBuild);
  const demolishRect = useGameStore((s) => s.demolishRect);
  const setDemolishRect = useGameStore((s) => s.setDemolishRect);
  const digRect = useGameStore((s) => s.digRect);
  const setDigRect = useGameStore((s) => s.setDigRect);
  const digPreview = useGameStore((s) => s.digPreview);
  // Wave 12 · both marquee tools drag the same way, so everything below asks
  // "is a rectangle tool in hand" rather than naming one of them twice
  const marqueeTool = buildTool === 'demolish' || buildTool === 'dig';
  const evalPlacement = useGameStore((s) => s.evalPlacement);
  const evalBlueprintPlacement = useGameStore((s) => s.evalBlueprintPlacement);
  const canAfford = useGameStore((s) => s.canAfford);
  const placeBuilding = useGameStore((s) => s.placeBuilding);
  const placeRow = useGameStore((s) => s.placeRow);
  const placeBlueprintAt = useGameStore((s) => s.placeBlueprintAt);
  const finishMove = useGameStore((s) => s.finishMove);
  const undoLast = useGameStore((s) => s.undoLast);

  // the "active" piece = selection or the one being moved
  const activeType = moving ? moving.type : selection;
  const def = activeType ? BUILDABLE_BY_ID[activeType] : null;

  // Wave 9 · in freeform the FACING is the authority and the quarter turn is
  // derived from it (rounded to the nearest), because `rot` is still what every
  // footprint/overlap/collision test in the game reads — see PlacedBuilding.yaw
  // for why the two are separate fields rather than one loosened one.
  const freeRot = ((((Math.round(freeYaw / (Math.PI / 2)) % 4) + 4) % 4)) as 0 | 1 | 2 | 3;
  const useRot = freeform ? freeRot : rot;
  const useYaw = freeform ? freeYaw : (rot * Math.PI) / 2;
  // Wave 51 (C6) · same on/off-freeform gate as useYaw above — a scale only
  // ever reaches placeBuilding/finishMove while freeform is actually on, so
  // every grid-snapped placement stays exactly 1x regardless of whatever
  // freeScale happens to be holding from a previous freeform session.
  const useScale = freeform ? freeScale : 1;

  // row-fill only offers itself for the pieces a run is actually made of —
  // the same set walls.ts already magnets together, and for the same reason
  // (a 0.35m brick laid sixty at a time is a wall you painted). Freeform is
  // excluded by definition: a stepped run IS the lattice.
  const rowCapable = !!activeType && !blueprintSelection && !moving && !freeform && snapsAsWall(activeType);

  // the keydown handler below is attached once for the life of the view; these
  // mirror the two rotation values it has to read at the moment a key lands
  const rotRef = useRef(rot);
  rotRef.current = rot;
  const freeYawRef = useRef(freeYaw);
  freeYawRef.current = freeYaw;

  // the camera rig and the keyboard (CLN-27: useBuildCamera.ts, useBuildHotkeys.ts) — the camera first, so that its
  // frame loop still runs before hold-to-place below, as the two halves of one loop did
  const { camRef, center, zoom, setAzQuarter } = useBuildCamera({ gl, regionCX, regionCZ, destination, keys });
  useBuildHotkeys({ keys, rotRef, freeYawRef, setRot, setFreeYaw, setFreeScale, setAzQuarter, undoLast });

  // adopt the rotation of a picked-up piece — including a freeform one's true
  // facing, so a piece you angled by hand comes back at exactly that angle the
  // moment freeform is switched on again. Setting it down in GRID mode squares
  // it up, which is the honest reading of the mode you are holding it in.
  useEffect(() => {
    if (moving) {
      setRot(moving.rot);
      setFreeYaw(moving.yaw ?? (moving.rot * Math.PI) / 2);
      setFreeScale(moving.scale ?? 1);
    }
  }, [moving]);

  // release the hold from anywhere (even if the cursor left the pointer-
  // catcher mesh over a UI element) — a stuck "mouse still down" ref would
  // otherwise silently keep accumulating hold progress forever. Wave 9's drags
  // ride along: one released over the build rail is abandoned, not committed,
  // because the ground point under the cursor at that moment is meaningless.
  useEffect(() => {
    const up = (e: PointerEvent) => {
      if (e.button !== 0) return;
      mouseDown.current = false;
      dragRaw.current = null;
      rowAnchor.current = null;
      setRowCells([]);
      setDragRect(null);
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  // switching pieces/blueprints or leaving the move tool cancels any
  // in-progress hold outright, rather than letting it carry over onto a
  // newly-selected piece at the old cell
  useEffect(() => {
    holdCellKey.current = null;
    holdTime.current = 0;
    setPlaceFrac(0);
  }, [selection, blueprintSelection, moving]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // hold-to-place: hold LMB over a valid spot to commit a fresh piece or
    // blueprint (the move tool stays an instant click — see onClick below).
    // Moving the cursor to a DIFFERENT snapped cell mid-hold restarts the
    // hold on the new cell instead of carrying progress over, the same
    // "target changed -> reset" rule the FPS hold-to-act system already uses.
    // A row-fill or marquee drag owns the button outright while it lasts —
    // that is exactly the gesture this anti-misclick guard would otherwise
    // fight, since a row IS "the cursor moved to a different cell".
    if (!moving && ghost && !rowAnchor.current && buildTool === 'build') {
      const cellOk = blueprintSelection ? blueprintValid : valid;
      const cellKey = `${ghost.x},${ghost.z}`;
      if (mouseDown.current && cellOk) {
        if (holdCellKey.current !== cellKey) {
          holdCellKey.current = cellKey;
          holdTime.current = 0;
        }
        holdTime.current += dt;
        const frac = Math.min(1, holdTime.current / PLACE_HOLD_SECONDS);
        setPlaceFrac(frac);
        if (frac >= 1) {
          if (blueprintSelection) placeBlueprintAt(blueprintSelection, ghost.x, ghost.z, useRot);
          else if (activeType) placeBuilding(activeType, ghost.x, ghost.z, useRot, useYaw, useScale);
          holdCellKey.current = null;
          holdTime.current = 0;
          setPlaceFrac(0);
        }
      } else if (holdCellKey.current !== null) {
        holdCellKey.current = null;
        holdTime.current = 0;
        setPlaceFrac(0);
      }
    }
  });

  function snapPoint(point: THREE.Vector3): { x: number; z: number } | null {
    if (blueprintSelection) {
      // a blueprint's own anchor snaps to the coarse structure grid — the
      // pieces inside it keep their captured relative offsets regardless
      return { x: Math.round(point.x / GRID) * GRID, z: Math.round(point.z / GRID) * GRID };
    }
    if (!activeType || !def) return null;
    // Wave 9 · freeform: the cursor IS the answer. No rounding, and no wall
    // magnet either — a piece that latched to a neighbour's open end would be
    // back on the lattice, which is the one thing this mode exists to leave.
    // Everything else about the placement is unchanged: evalPlacement still
    // rules on region bounds, stacking, overlap and node clearance below, and
    // the piece still costs exactly what it costs.
    if (freeform) return { x: point.x, z: point.z };
    // Wave 8 · wall-connect. A wall-family piece near a standing one latches
    // to its open END rather than to the bare 2m lattice: the family runs 8m
    // straights against 4m corners against a 2m door, and no single grid pitch
    // lines all of those up flush. Everything else — and a wall out in open
    // ground — keeps the original per-piece grid snap untouched.
    const link = wallSnap(activeType, useRot, point.x, point.z, buildings, destination ?? null);
    if (link) return { x: link.x, z: link.z };
    const [sx, sz] = sizeFor(activeType, useRot);
    const snap = def.snap;
    return {
      x: Math.round((point.x - sx / 2) / snap) * snap + sx / 2,
      z: Math.round((point.z - sz / 2) / snap) * snap + sz / 2,
    };
  }

  // Wave 17 #1 · ghost used to stay null (and with it the ENTIRE preview —
  // box, footprint, wireframe, arrow, tick, all gated on `ghost` together at
  // the render below) from the moment a piece was selected/move-armed until
  // the mouse happened to cross the canvas and the ground-plane's
  // onPointerMove wrote a value in. Seed it synchronously off the build
  // camera's own current focus point the instant activeType goes truthy, so
  // the preview is already there before the player has moved the mouse at
  // all; the real onPointerMove still takes over the moment they do.
  useEffect(() => {
    if (!activeType || ghost) return;
    setGhost(snapPoint(new THREE.Vector3(center.current.x, 0, center.current.z)));
  }, [activeType]);

  /**
   * Wave 9 · row-fill. From the anchor cell (already wall-snapped exactly as a
   * single placement would have been), the drag picks the cardinal direction it
   * best matches and steps along it by the piece's OWN footprint — which is
   * what makes the run come out flush, and what makes consecutive segments
   * `touching()` each other, so the fort ring check in game/fort.ts reads a
   * dragged run and a hand-laid one identically.
   *
   * Deliberately world-space, from two ground-plane raycast hits: that makes it
   * automatically correct at any camera azimuth, with no need to ask which way
   * the view happens to be facing.
   */
  function rowCellsFrom(anchor: { x: number; z: number }, raw: { x: number; z: number }) {
    if (!activeType) return [anchor];
    const [sx, sz] = sizeFor(activeType, useRot);
    const dx = raw.x - anchor.x;
    const dz = raw.z - anchor.z;
    const alongX = Math.abs(dx) >= Math.abs(dz);
    const step = Math.max(0.35, alongX ? sx : sz);
    const dist = alongX ? dx : dz;
    const n = Math.min(MAX_ROW, Math.max(0, Math.round(Math.abs(dist) / step)));
    const sign = dist < 0 ? -1 : 1;
    const cells = [{ x: anchor.x, z: anchor.z }];
    for (let i = 1; i <= n; i++) {
      cells.push(alongX
        ? { x: anchor.x + sign * step * i, z: anchor.z }
        : { x: anchor.x, z: anchor.z + sign * step * i });
    }
    return cells;
  }

  const placement =
    activeType && ghost ? evalPlacement(activeType, ghost.x, ghost.z, useRot, moving?.id) : null;
  const affordable = moving ? true : def ? canAfford(def.cost) : false;
  const valid = !!placement?.valid && affordable;

  // Wave 9 · how far down the previewed run the materials actually reach. The
  // ghost greys out past that point rather than letting the drag promise
  // twelve walls and the commit deliver five.
  const rowAfford = useMemo(() => {
    if (!def) return 0;
    const entries = Object.entries(def.cost);
    if (entries.length === 0) return MAX_ROW;
    return entries.reduce(
      (n, [id, need]) => Math.min(n, Math.floor((inventory[id as ItemId] ?? 0) / (need as number))),
      MAX_ROW,
    );
  }, [def, inventory]);
  // each previewed cell's own verdict, in run order — the same three questions
  // placeRow will ask when it commits (paid for, standable, not on top of the
  // segment before it)
  const rowPreview = useMemo(() => {
    if (!activeType || rowCells.length === 0) return [];
    const [sx, sz] = sizeFor(activeType, useRot);
    const taken: { x: number; z: number }[] = [];
    let stopped = false;
    return rowCells.map((c, i) => {
      const ev = evalPlacement(activeType, c.x, c.z, useRot);
      const clash = taken.some((t) => Math.abs(t.x - c.x) < sx - 0.02 && Math.abs(t.z - c.z) < sz - 0.02);
      const ok = !stopped && i < rowAfford && ev.valid && !clash;
      if (!ok) stopped = true; else taken.push(c);
      return { x: c.x, z: c.z, y: ev.y, ok };
    });
  }, [activeType, rowCells, useRot, rowAfford, evalPlacement, buildings]);

  // Wave 9 · what the marquee currently covers, live while dragging and again
  // once armed. Same shared footprint test the store's demolishPreview uses, so
  // the outline and the confirmation can never disagree about what is inside.
  // The two tools never both have a rectangle (setBuildTool clears both on any
  // switch), so which one the live `dragRect` belongs to is decided by which
  // tool is in hand, and each armed rect is simply drawn by its own tool.
  const marquee = buildTool === 'dig' ? demolishRect : (dragRect ?? demolishRect);
  const marqueeHits = useMemo(
    () => (marquee ? buildingsInRect(buildings, destination ?? null, marquee) : []),
    [marquee, buildings, destination],
  );

  // Wave 12 · the dig patch, and the SAME verdict the rail and the confirm
  // button will give it — a drag that cannot be cut has to say so while the
  // button is still down, not after.
  const waterRect = buildTool === 'dig' ? (dragRect ?? digRect) : digRect;
  const waterEval = useMemo(
    () => digPreview(waterRect),
    [waterRect, digPreview, buildings],
  );

  // sizeFor's swapped [sx,sz] is for grid-snap math only (snapPoint above) —
  // the ghost mesh itself must use the model's own unswapped footprint and a
  // real rotation-y, exactly like the real placed piece (Buildings.tsx +
  // PropModel.tsx), or a rotated-but-square-swap piece never visibly turns
  // and an asymmetric piece's ghost never matches its actual rotated shape.
  const gsx = def?.size[0] ?? 1;
  const gsz = def?.size[2] ?? 1;
  const gh = def?.size[1] ?? 1;
  const gy = placement?.y ?? 0;
  const gyaw = useYaw;
  // a corner turns a run either way, so it has no meaningful "front" to
  // point at — see labIsCorner
  const isCorner = !!activeType && labIsCorner(labAssetId(activeType));
  // Wave 8 · is the ghost currently LATCHED to a neighbouring wall? Re-asking
  // wallSnap about the already-snapped point rather than threading a second
  // piece of state out of snapPoint: the answer is by construction the same
  // point when it latched, and null when it did not.
  const wallLink = activeType && ghost && !freeform
    ? wallSnap(activeType, useRot, ghost.x, ghost.z, buildings, destination ?? null)
    : null;
  const linkedTo = wallLink && Math.abs(wallLink.x - ghost!.x) < 0.01 && Math.abs(wallLink.z - ghost!.z) < 0.01
    ? buildings.find((b) => b.id === wallLink.toId) ?? null
    : null;

  // rebuilt only when the piece's footprint actually changes, not per frame
  const ghostEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(gsx, gh, gsz)),
    [gsx, gh, gsz],
  );

  const blueprintEval =
    blueprintSelection && ghost ? evalBlueprintPlacement(blueprintSelection, ghost.x, ghost.z, useRot) : null;
  const blueprintAffordable = blueprintEval ? canAfford(blueprintEval.cost) : false;
  const blueprintValid = !!blueprintEval?.valid && blueprintAffordable;

  return (
    <group>
      <OrthographicCamera
        ref={camRef}
        makeDefault
        zoom={zoom}
        near={1}
        far={400}
        position={[center.current.x, CAM_H, center.current.z + CAM_BACK]}
      />
      {/* pointer catcher — recentered on the active region (home keep site,
          or wherever a claimed template plot was planted) so clicks still
          land correctly when that's far from the world origin */}
      <mesh
        position={[regionCX, 0.001, regionCZ]}
        rotation-x={-Math.PI / 2}
        visible={false}
        onPointerMove={(e) => {
          const raw = { x: e.point.x, z: e.point.z };
          if (rowAnchor.current) {
            // the ghost stays parked on the anchor while a run is being drawn;
            // the drag is now steering the LENGTH, not the position
            setRowCells(rowCellsFrom(rowAnchor.current, raw));
            return;
          }
          if (dragRaw.current && marqueeTool) {
            const s = dragRaw.current;
            const swept = {
              minX: Math.min(s.x, raw.x), maxX: Math.max(s.x, raw.x),
              minZ: Math.min(s.z, raw.z), maxZ: Math.max(s.z, raw.z),
            };
            // the spade's patch shows GRID-SNAPPED while you drag, because that
            // is the rectangle it will actually cut — a preview that grew by a
            // metre at the moment you let go would be the one thing you cannot
            // check before committing. The wrecking tool stays raw: it selects
            // pieces, it does not lay ground.
            setDragRect(buildTool === 'dig' ? snapDigRect(swept) : swept);
            return;
          }
          setGhost(snapPoint(e.point));
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          const raw = { x: e.point.x, z: e.point.z };
          // the wrecking tool owns the left button outright: drag out a patch,
          // release to arm it, confirm on the rail (see BuildBar). Nothing is
          // torn down by the drag itself — one gesture can cover an entire
          // wall run, and this is the game's only action that can.
          if (marqueeTool) {
            dragRaw.current = raw;
            setDragRect(null);
            setDemolishRect(null);
            setDigRect(null);
            return;
          }
          // relocating an already-built piece has no "pop into being" moment
          // to soften, so the move tool stays an instant click, not a hold
          if (moving) {
            if (ghost && valid) finishMove(ghost.x, ghost.z, useRot, useYaw, useScale);
            return;
          }
          // nothing selected: this press is a pickup-tool click on an
          // existing building (Buildings.tsx's own onClick handles it) — no
          // hold to start
          if (!activeType && !blueprintSelection) return;
          // Wave 9 · shift starts a run instead of a single piece. Gated behind
          // a modifier on purpose: an unmodified drag has to keep meaning
          // "I moved off the cell, don't place" (the hold-to-place misclick
          // guard), and those two readings of the same motion are opposites.
          if (e.shiftKey && rowCapable && ghost) {
            dragRaw.current = raw;
            rowAnchor.current = { x: ghost.x, z: ghost.z };
            setRowCells([{ x: ghost.x, z: ghost.z }]);
            return;
          }
          mouseDown.current = true;
        }}
        onPointerUp={(e) => {
          if (e.button !== 0) return;
          mouseDown.current = false;
          if (rowAnchor.current) {
            const cells = rowCells;
            rowAnchor.current = null;
            dragRaw.current = null;
            setRowCells([]);
            // a run of one is just a placement, and placeRow reports it as a
            // run — send the single-piece path instead so the feedback matches
            // what the hand actually did
            if (activeType && cells.length > 1) placeRow(activeType, cells, useRot);
            else if (activeType && cells.length === 1) placeBuilding(activeType, cells[0].x, cells[0].z, useRot, useYaw);
            return;
          }
          if (dragRaw.current && marqueeTool) {
            const r = dragRect;
            dragRaw.current = null;
            setDragRect(null);
            // a click with no travel is not a marquee — leaving it unarmed
            // keeps a stray click from parking a confirmation on the rail.
            // EITHER axis is enough: sweeping a thin line down a wall run is
            // the most natural way to ask for exactly that wall run.
            if (r && (r.maxX - r.minX >= MIN_MARQUEE || r.maxZ - r.minZ >= MIN_MARQUEE)) {
              if (buildTool === 'dig') setDigRect(r);
              else setDemolishRect(r);
            }
          }
        }}
        onPointerLeave={() => { mouseDown.current = false; }}
      >
        <planeGeometry args={[WORLD_HALF * 2, WORLD_HALF * 2]} />
      </mesh>
      <BuildGhost
        activeType={activeType} def={def} ghost={ghost} rowCells={rowCells} gyaw={gyaw} gy={gy} gsx={gsx} gsz={gsz} gh={gh}
        valid={valid} useScale={useScale} moving={moving} placeFrac={placeFrac} ghostEdges={ghostEdges} isCorner={isCorner}
        freeform={freeform} linkedTo={linkedTo} rowPreview={rowPreview} marquee={marquee} marqueeHits={marqueeHits}
        waterRect={waterRect} waterEval={waterEval} blueprintEval={blueprintEval} blueprintAffordable={blueprintAffordable}
      />
    </group>
  );
}
