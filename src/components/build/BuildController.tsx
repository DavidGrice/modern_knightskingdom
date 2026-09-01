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
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, BUILD_REGION, GRID, buildingsInRect, labAssetId, sizeFor } from '@/game/data/buildables';
import { labIsCorner } from '@/game/data/labCapabilities';
import { snapsAsWall, wallSnap } from '@/game/walls';
import { WATER_BANK, snapDigRect } from '@/game/waterworks';
import { WORLD_HALF } from '@/game/data/world';
import { buildCamState } from '@/game/buildCam';
import { playerState } from '@/game/playerState';
import { destinationGroundY, homeGroundY } from '@/components/world/TemplateWorld';
import type { ItemId } from '@/game/types';

const REGION_CX = (BUILD_REGION.minX + BUILD_REGION.maxX) / 2;
const REGION_CZ = (BUILD_REGION.minZ + BUILD_REGION.maxZ) / 2;
// hold-to-place (2026-07-20): a fresh piece/blueprint now needs a deliberate
// hold, mirroring the mining/chopping feel instead of an instant single
// click "popping" a building into being. Relocating an ALREADY-BUILT piece
// (the move tool) has no such "pop" moment and stays a quick click.
const PLACE_HOLD_SECONDS = 0.4;
// Raked build view (2026-07-20): the camera used to sit straight overhead
// (`position(c.x, 90, c.z)`, `up = -Z`), which flattened every piece into a
// 2D plan — you could see the grid but not the SIDES of what you were
// placing, so height and facing were both guesswork. It's still orthographic
// (no perspective distortion across the grid, which is what makes a build
// view readable) but now tilted down at ELEV_DEG instead of straight down,
// looking from the +Z side, so pieces show a face and a flank.
const ELEV_DEG = 52;                       // 90 would be the old flat top-down
const CAM_DIST = 92;                       // along the view ray from the focus point
const CAM_H = CAM_DIST * Math.sin((ELEV_DEG * Math.PI) / 180);
const CAM_BACK = CAM_DIST * Math.cos((ELEV_DEG * Math.PI) / 180);
// how much of the vertical screen a metre of GROUND covers at this rake — a
// raked camera foreshortens the ground, so a middle-mouse drag that ignored it
// would haul the view further sideways than forward for the same wrist motion
const GROUND_FORESHORTEN = Math.sin((ELEV_DEG * Math.PI) / 180);

// Wave 9 · Q/E swing the view a QUARTER TURN, not a free angle. Everything the
// build grid is made of turns in quarter turns (PlacedBuilding.rot, sizeFor's
// width/depth swap, walls.ts's four cardinal attach points), so a view that
// could stop at 37° would be the only thing in the system that did not line up
// with the ground it is looking at. It eases between stops rather than
// snapping, which is what makes it read as the camera swinging round the site
// instead of the site teleporting.
const ROT_EASE = 9;                        // per second, toward the target quarter
// Wave 9 · freeform's fine rotation step. 24 taps of R walks a full circle,
// which is enough to angle a bench toward a fire without becoming a job.
const FINE_YAW_STEP = Math.PI / 12;        // 15°
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
  const camRef = useRef<THREE.OrthographicCamera>(null);

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

  // open the build view WHERE THE PLAYER IS STANDING (2026-07-20) rather than
  // always snapping to the region centre — entering build mode used to yank
  // the view across the homestead every time, which read as the character
  // being teleported. Clamped into the buildable region so standing well
  // outside it still opens somewhere useful.
  const center = useRef(new THREE.Vector3(
    THREE.MathUtils.clamp(playerState.x, regionCX - 26, regionCX + 26),
    0,
    THREE.MathUtils.clamp(playerState.z, regionCZ - 26, regionCZ + 26),
  ));
  const [zoom, setZoom] = useState(11);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const keys = useRef<Record<string, boolean>>({});
  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null);
  const [rot, setRot] = useState<0 | 1 | 2 | 3>(0);
  // freeform's true facing in radians (see PlacedBuilding.yaw) — kept in step
  // with `rot` whenever the mode is switched, so turning freeform on and off
  // never silently spins the piece you were holding
  const [freeYaw, setFreeYaw] = useState(0);
  const mouseDown = useRef(false);
  const holdCellKey = useRef<string | null>(null);
  const holdTime = useRef(0);
  const [placeFrac, setPlaceFrac] = useState(0);

  // Wave 9 · the camera's own quarter turn around the focus point. The integer
  // is the authority (it can run past ±4 freely, no wrap needed); `azRef` is
  // the eased angle the camera is actually at this frame.
  const [azQuarter, setAzQuarter] = useState(0);
  const azRef = useRef(0);
  const azQuarterRef = useRef(0);
  azQuarterRef.current = azQuarter;

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

  // keyboard: pan + rotate piece + undo, plus Wave 9's view rotation and mode
  // toggles. Hardcoded key codes, matching this file's own convention (the
  // remappable keybinds.ts table covers the on-foot player, whose controller is
  // fully unmounted while this one exists — GameWorld.tsx picks one or the
  // other — so Q/E/F/X cannot collide with anything it binds).
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      // the build rail carries text fields (blueprint name, piece search) —
      // typing "undo" into one must not undo four placements. Only the
      // one-shot actions below are guarded; the held pan keys above are
      // recorded regardless so releasing one always clears it.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      // every action below is a one-shot: auto-repeat from a leaned-on key
      // would spin the ghost, the view, or the undo stack
      if (e.repeat) return;
      if (e.code === 'KeyR') {
        // in freeform R turns the piece by the mode's own granularity; hold
        // shift for the honest quarter turn when you want to get back square
        if (useGameStore.getState().freeformBuild) {
          // wrapped at a full turn so a piece spun right round records no
          // `yaw` at all rather than a cosmetically-identical 6.283
          setFreeYaw((y) => (y + (e.shiftKey ? Math.PI / 2 : FINE_YAW_STEP)) % (Math.PI * 2));
        } else {
          setRot((r) => (((r + 1) % 4) as 0 | 1 | 2 | 3));
        }
      }
      if (e.code === 'KeyU') undoLast();
      if (e.code === 'KeyQ') setAzQuarter((q) => q - 1);
      if (e.code === 'KeyE') setAzQuarter((q) => q + 1);
      if (e.code === 'KeyF') {
        const st = useGameStore.getState();
        const on = !st.freeformBuild;
        // carry the facing across the switch in both directions, so the ghost
        // you are looking at never jumps when the mode changes
        if (on) setFreeYaw((rotRef.current * Math.PI) / 2);
        else setRot(((((Math.round(freeYawRef.current / (Math.PI / 2)) % 4) + 4) % 4)) as 0 | 1 | 2 | 3);
        st.setFreeformBuild(on);
        st.notify(on ? 'Freeform placement — off the grid. R turns in small steps.' : 'Back on the grid.');
      }
      if (e.code === 'KeyX') {
        const st = useGameStore.getState();
        st.setBuildTool(st.buildTool === 'demolish' ? 'build' : 'demolish');
      }
      // Wave 12 · the spade. Its own key rather than a third stop on X's
      // cycle: X has meant "wrecking tool on/off" since Wave 9, and turning it
      // into a three-way rotation would make the muscle memory for putting the
      // wrecking tool away start digging instead.
      if (e.code === 'KeyG') {
        const st = useGameStore.getState();
        st.setBuildTool(st.buildTool === 'dig' ? 'build' : 'dig');
      }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [undoLast]);

  // adopt the rotation of a picked-up piece — including a freeform one's true
  // facing, so a piece you angled by hand comes back at exactly that angle the
  // moment freeform is switched on again. Setting it down in GRID mode squares
  // it up, which is the honest reading of the mode you are holding it in.
  useEffect(() => {
    if (moving) {
      setRot(moving.rot);
      setFreeYaw(moving.yaw ?? (moving.rot * Math.PI) / 2);
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

  // wheel zoom
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => THREE.MathUtils.clamp(z * Math.exp(-e.deltaY * 0.0012), 5, 60));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl]);

  // Wave 9 · middle-mouse drag-pan. Attached to the canvas rather than the
  // ground-plane mesh so the grab survives the cursor crossing a building (or
  // leaving the canvas entirely, via pointer capture) mid-drag — the whole
  // point of a drag-pan is that it does not care what is under it.
  //
  // The delta is converted through the camera's CURRENT basis, not world X/Z:
  // once Q/E has swung the view a quarter turn, "drag right" still has to mean
  // right on screen. Orthographic + R3F's pixel-sized frustum makes the scale
  // exact — one world metre is `zoom` pixels — and the vertical axis is
  // additionally un-foreshortened so the ground stays glued to the cursor.
  useEffect(() => {
    const el = gl.domElement;
    let panning = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 1) return;
      e.preventDefault();           // middle click is a browser autoscroll otherwise
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!panning) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const az = azRef.current;
      const perPx = 1 / zoomRef.current;
      // screen-right and screen-up, expressed on the ground plane
      const rx = Math.cos(az); const rz = -Math.sin(az);
      const fx = -Math.sin(az); const fz = -Math.cos(az);
      const c = center.current;
      // grab-the-ground: the camera moves AGAINST the drag, so the point under
      // the cursor stays under the cursor
      c.x -= rx * dx * perPx + fx * (-dy) * perPx / GROUND_FORESHORTEN;
      c.z -= rz * dx * perPx + fz * (-dy) * perPx / GROUND_FORESHORTEN;
    };
    const onUp = (e: PointerEvent) => {
      if (e.button !== 1 || !panning) return;
      panning = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    const onAux = (e: MouseEvent) => { if (e.button === 1) e.preventDefault(); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('auxclick', onAux);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('auxclick', onAux);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // ease toward the quarter turn Q/E asked for (see ROT_EASE)
    const azTarget = (azQuarterRef.current * Math.PI) / 2;
    azRef.current += (azTarget - azRef.current) * Math.min(1, dt * ROT_EASE);
    const az = azRef.current;
    const pan = 24 * dt * (14 / zoom);
    const c = center.current;
    // WASD pans in SCREEN space, not world space: after a quarter turn of the
    // view, W still has to mean "further up the screen" or the keys and the
    // picture disagree about which way is forward.
    const fx = -Math.sin(az); const fz = -Math.cos(az);
    const rx = Math.cos(az); const rz = -Math.sin(az);
    if (keys.current['KeyW'] || keys.current['ArrowUp']) { c.x += fx * pan; c.z += fz * pan; }
    if (keys.current['KeyS'] || keys.current['ArrowDown']) { c.x -= fx * pan; c.z -= fz * pan; }
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) { c.x -= rx * pan; c.z -= rz * pan; }
    if (keys.current['KeyD'] || keys.current['ArrowRight']) { c.x += rx * pan; c.z += rz * pan; }
    // pan is clamped around the active region (home, or a claimed template
    // plot far from world origin) rather than a fixed world-origin box, or
    // panning away from home would immediately snap back toward (0,0)
    const panMax = WORLD_HALF * 0.5;
    c.x = THREE.MathUtils.clamp(c.x, regionCX - panMax, regionCX + panMax);
    c.z = THREE.MathUtils.clamp(c.z, regionCZ - panMax, regionCZ + panMax);
    buildCamState.x = c.x;
    buildCamState.z = c.z;
    buildCamState.azimuth = az;
    const cam = camRef.current;
    if (cam) {
      // raked, not top-down: pulled back along the view azimuth and lifted, so
      // the grid AND each piece's front/side faces are both visible (see
      // ELEV_DEG above). `up` is world-up now — the old (0,0,-1) only made
      // sense for a camera staring straight down the Y axis.
      cam.position.set(c.x + Math.sin(az) * CAM_BACK, CAM_H, c.z + Math.cos(az) * CAM_BACK);
      cam.up.set(0, 1, 0);
      // Wave 31 · was a fixed y=0 lookAt target — panning far enough to bring
      // an elevated terrain region (home) or a sloped bake (a claimed
      // destination plot) into view kept the camera aimed at the old flat
      // ground plane instead of the terrain actually under the cursor.
      const lookY = destination ? destinationGroundY(c.x, c.z) : homeGroundY(c.x, c.z);
      cam.lookAt(c.x, lookY, c.z);
    }

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
          else if (activeType) placeBuilding(activeType, ghost.x, ghost.z, useRot, useYaw);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            if (ghost && valid) finishMove(ghost.x, ghost.z, useRot, useYaw);
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
      {/* single-piece placement ghost — rotation-y matches the real piece's
          own rotation-y (Buildings.tsx/PropModel.tsx), applied to the
          model's true unswapped footprint, so a rotated ghost actually
          turns instead of only ever showing gsx/gsz swapped on a fixed
          axis-aligned box. Hidden while a run is being drawn: the run's own
          per-cell ghosts below already include the anchor cell. */}
      {activeType && def && ghost && rowCells.length === 0 && (
        <group position={[ghost.x, 0, ghost.z]}>
          <group rotation-y={gyaw}>
            {/* while hold-to-place is in progress, the box itself rises from
                the ground toward full height — the footprint plane below
                stays full-size the whole time so the landing spot is always
                clear, only the "it's coming into being" cue animates */}
            <mesh position-y={gy + (gh * (!moving && placeFrac > 0 ? 0.12 + 0.88 * placeFrac : 1)) / 2}>
              <boxGeometry args={[gsx, gh * (!moving && placeFrac > 0 ? 0.12 + 0.88 * placeFrac : 1), gsz]} />
              <meshBasicMaterial color={valid ? '#42d95e' : '#e04434'} transparent opacity={0.42 + 0.28 * placeFrac} depthWrite={false} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={gy + 0.07}>
              <planeGeometry args={[gsx, gsz]} />
              <meshBasicMaterial color={valid ? '#42d95e' : '#e04434'} transparent opacity={0.55} depthWrite={false} />
            </mesh>
            {/* crisp wireframe of the FULL final volume — the translucent box
                above animates its height while a hold is in progress, so on
                its own it never shows the finished silhouette. Drawn at full
                size regardless, so you always see exactly what you're
                committing to. */}
            <lineSegments position-y={gy + gh / 2} geometry={ghostEdges}>
              <lineBasicMaterial color={valid ? '#d8ffe2' : '#ffd8d2'} transparent opacity={0.9} depthTest={false} />
            </lineSegments>
            {/* Facing arrow: which way the piece actually points, so rotating
                with R is no longer guesswork.
                It sits on local **−Z**, not +Z. Every model is normalised by
                PropModel with `rotation.x = Math.PI` to stand it upright,
                and that flip MIRRORS Z — so a piece whose front faces +Z in
                the source file renders facing −Z in the world. The arrow used
                to be drawn at +Z and therefore pointed at the back of every
                wall, a consistent 180° disagreement. */}
            {!isCorner && (
              <mesh position={[0, gy + 0.12, -(gsz / 2 + 1.1)]} rotation-x={-Math.PI / 2}>
                <coneGeometry args={[0.55, 1.5, 4]} />
                <meshBasicMaterial color={valid ? '#eaffc9' : '#ffc9c9'} transparent opacity={0.95} depthTest={false} />
              </mesh>
            )}
            {/* a matching tick ON the piece's own front face, so the facing
                still reads when the arrow is off-screen or behind geometry */}
            {!isCorner && (
            <mesh position={[0, gy + gh / 2, -(gsz / 2 + 0.02)]}>
              <planeGeometry args={[Math.min(gsx * 0.5, 1.2), 0.14]} />
              <meshBasicMaterial color={valid ? '#eaffc9' : '#ffc9c9'} transparent opacity={0.95} depthTest={false} side={THREE.DoubleSide} />
            </mesh>
            )}
          </group>
          {/* Wave 9 · freeform marker: a piece off the lattice looks exactly
              like one on it from above, so the mode says so on the ghost
              itself rather than only on the rail. */}
          {freeform && (
            <mesh rotation-x={-Math.PI / 2} position-y={gy + 0.1}>
              <ringGeometry args={[Math.max(gsx, gsz) / 2 + 0.25, Math.max(gsx, gsz) / 2 + 0.45, 24]} />
              <meshBasicMaterial color="#7fd4ff" transparent opacity={0.85} depthTest={false} />
            </mesh>
          )}
          {/* wall-connect joint: a gold seam drawn ON the shared edge, so
              "this piece is joined to that one" is something you can see
              before you commit rather than something you infer afterwards.
              Outside the rotated group — the seam is a world-space mark
              between two centres, not a feature of the piece. */}
          {linkedTo && (
            <mesh
              position={[(linkedTo.x - ghost.x) / 2, gy + 0.14, (linkedTo.z - ghost.z) / 2]}
              rotation-x={-Math.PI / 2}
            >
              <planeGeometry args={[0.7, 0.7]} />
              <meshBasicMaterial color="#e8c141" transparent opacity={0.95} depthTest={false} />
            </mesh>
          )}
          {/* stack elevation marker */}
          {gy > 0.05 && (
            <mesh position-y={gy / 2}>
              <boxGeometry args={[0.06, gy, 0.06]} />
              <meshBasicMaterial color="#e8c141" transparent opacity={0.8} depthWrite={false} />
            </mesh>
          )}
        </group>
      )}
      {/* Wave 9 · the run being drawn. One footprint + wireframe per segment,
          each answering for itself, so a run that outgrows the materials or
          walks into a tree shows exactly where it will stop BEFORE the button
          comes up. */}
      {activeType && def && rowPreview.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation-y={gyaw}>
          <mesh rotation-x={-Math.PI / 2} position-y={p.y + 0.07}>
            <planeGeometry args={[gsx, gsz]} />
            <meshBasicMaterial color={p.ok ? '#42d95e' : '#e04434'} transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <lineSegments position-y={p.y + gh / 2} geometry={ghostEdges}>
            <lineBasicMaterial color={p.ok ? '#d8ffe2' : '#ffd8d2'} transparent opacity={0.85} depthTest={false} />
          </lineSegments>
        </group>
      ))}
      {/* Wave 9 · the demolish marquee: the patch itself, plus a red cage
          around every piece it would take. The cage is the real feedback —
          a rectangle on the ground says nothing about the wall whose far end
          happens to poke into it. */}
      {marquee && (
        <group>
          <mesh
            position={[(marquee.minX + marquee.maxX) / 2, 0.05, (marquee.minZ + marquee.maxZ) / 2]}
            rotation-x={-Math.PI / 2}
          >
            <planeGeometry args={[marquee.maxX - marquee.minX, marquee.maxZ - marquee.minZ]} />
            <meshBasicMaterial color="#e04434" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          {marqueeHits.map((b) => {
            const bdef = BUILDABLE_BY_ID[b.type];
            if (!bdef) return null;
            return (
              <mesh
                key={b.id}
                position={[b.x, (b.y ?? 0) + bdef.size[1] / 2, b.z]}
                rotation-y={b.yaw ?? (b.rot * Math.PI) / 2}
              >
                <boxGeometry args={[bdef.size[0], bdef.size[1], bdef.size[2]]} />
                <meshBasicMaterial color="#ff5a44" transparent opacity={0.34} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}
      {/* Wave 12 · the dig patch: the bank it would throw up (the outer, sandy
          rectangle) and the water itself inside it, so what you are dragging
          out is the shape that will actually be there — and red the moment the
          patch is refused, with the rail carrying the reason. A `fill` patch
          reads sandy throughout: it is ground coming back, not water. */}
      {waterRect && (
        <group position={[(waterRect.minX + waterRect.maxX) / 2, 0, (waterRect.minZ + waterRect.maxZ) / 2]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
            <planeGeometry args={[
              waterRect.maxX - waterRect.minX + WATER_BANK * 2,
              waterRect.maxZ - waterRect.minZ + WATER_BANK * 2,
            ]} />
            <meshBasicMaterial
              color={waterEval.problem ? '#e04434' : '#c9b878'}
              transparent opacity={0.42} depthWrite={false}
            />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.09}>
            <planeGeometry args={[waterRect.maxX - waterRect.minX, waterRect.maxZ - waterRect.minZ]} />
            <meshBasicMaterial
              color={waterEval.problem ? '#8a2a20' : waterEval.mode === 'fill' ? '#a08a50' : '#3fa8d8'}
              transparent opacity={0.6} depthWrite={false}
            />
          </mesh>
        </group>
      )}
      {/* blueprint ghost — one box+footprint per piece, each individually
          colored so an out-of-region or unlocked-elsewhere piece reads as
          red without failing the whole stamp silently */}
      {blueprintEval && blueprintEval.pieces.map((p, i) => {
        const pdef = BUILDABLE_BY_ID[p.type];
        const pyaw = (p.rot * Math.PI) / 2;
        const psx = pdef?.size[0] ?? 1;
        const psz = pdef?.size[2] ?? 1;
        const ph = pdef?.size[1] ?? 1;
        const pieceOk = p.valid && blueprintAffordable;
        const riseFrac = placeFrac > 0 ? 0.12 + 0.88 * placeFrac : 1;
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            <group rotation-y={pyaw}>
              <mesh position-y={p.y + (ph * riseFrac) / 2}>
                <boxGeometry args={[psx, ph * riseFrac, psz]} />
                <meshBasicMaterial color={pieceOk ? '#42d95e' : '#e04434'} transparent opacity={0.42 + 0.28 * placeFrac} depthWrite={false} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} position-y={p.y + 0.07}>
                <planeGeometry args={[psx, psz]} />
                <meshBasicMaterial color={pieceOk ? '#42d95e' : '#e04434'} transparent opacity={0.55} depthWrite={false} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}
