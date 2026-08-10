'use client';
// Aerial build mode: top-down orthographic camera, grid-snapped ghost placement
// with per-piece snap pitch (2m structures, 0.35m stud bricks), vertical
// stacking, a move tool (click a piece with nothing selected), and undo (U).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, BUILD_REGION, GRID, labAssetId, sizeFor } from '@/game/data/buildables';
import { labIsCorner } from '@/game/data/labCapabilities';
import { wallSnap } from '@/game/walls';
import { WORLD_HALF } from '@/game/data/world';
import { buildCamState } from '@/game/buildCam';
import { playerState } from '@/game/playerState';

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

export default function BuildController() {
  const gl = useThree((s) => s.gl);
  const camRef = useRef<THREE.OrthographicCamera>(null);

  const destination = useGameStore((s) => s.destination);
  const buildings = useGameStore((s) => s.buildings);
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
  const keys = useRef<Record<string, boolean>>({});
  const [ghost, setGhost] = useState<{ x: number; z: number } | null>(null);
  const [rot, setRot] = useState<0 | 1 | 2 | 3>(0);
  const mouseDown = useRef(false);
  const holdCellKey = useRef<string | null>(null);
  const holdTime = useRef(0);
  const [placeFrac, setPlaceFrac] = useState(0);

  const selection = useGameStore((s) => s.buildSelection);
  const blueprintSelection = useGameStore((s) => s.blueprintSelection);
  const moving = useGameStore((s) => s.movingBuilding);
  const evalPlacement = useGameStore((s) => s.evalPlacement);
  const evalBlueprintPlacement = useGameStore((s) => s.evalBlueprintPlacement);
  const canAfford = useGameStore((s) => s.canAfford);
  const placeBuilding = useGameStore((s) => s.placeBuilding);
  const placeBlueprintAt = useGameStore((s) => s.placeBlueprintAt);
  const finishMove = useGameStore((s) => s.finishMove);
  const undoLast = useGameStore((s) => s.undoLast);

  // the "active" piece = selection or the one being moved
  const activeType = moving ? moving.type : selection;
  const def = activeType ? BUILDABLE_BY_ID[activeType] : null;

  // keyboard pan + rotate + undo
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'KeyR') setRot((r) => (((r + 1) % 4) as 0 | 1 | 2 | 3));
      if (e.code === 'KeyU') undoLast();
    };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [undoLast]);

  // adopt the rotation of a picked-up piece
  useEffect(() => {
    if (moving) setRot(moving.rot);
  }, [moving]);

  // release the hold from anywhere (even if the cursor left the pointer-
  // catcher mesh over a UI element) — a stuck "mouse still down" ref would
  // otherwise silently keep accumulating hold progress forever
  useEffect(() => {
    const up = (e: PointerEvent) => { if (e.button === 0) mouseDown.current = false; };
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

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const pan = 24 * dt * (14 / zoom);
    const c = center.current;
    if (keys.current['KeyW'] || keys.current['ArrowUp']) c.z -= pan;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) c.z += pan;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) c.x -= pan;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) c.x += pan;
    // pan is clamped around the active region (home, or a claimed template
    // plot far from world origin) rather than a fixed world-origin box, or
    // panning away from home would immediately snap back toward (0,0)
    const panMax = WORLD_HALF * 0.5;
    c.x = THREE.MathUtils.clamp(c.x, regionCX - panMax, regionCX + panMax);
    c.z = THREE.MathUtils.clamp(c.z, regionCZ - panMax, regionCZ + panMax);
    buildCamState.x = c.x;
    buildCamState.z = c.z;
    const cam = camRef.current;
    if (cam) {
      // raked, not top-down: pulled back along +Z and lifted, so the grid AND
      // each piece's front/side faces are both visible (see ELEV_DEG above).
      // `up` is world-up now — the old (0,0,-1) only made sense for a camera
      // staring straight down the Y axis.
      cam.position.set(c.x, CAM_H, c.z + CAM_BACK);
      cam.up.set(0, 1, 0);
      cam.lookAt(c.x, 0, c.z);
    }

    // hold-to-place: hold LMB over a valid spot to commit a fresh piece or
    // blueprint (the move tool stays an instant click — see onClick below).
    // Moving the cursor to a DIFFERENT snapped cell mid-hold restarts the
    // hold on the new cell instead of carrying progress over, the same
    // "target changed -> reset" rule the FPS hold-to-act system already uses.
    if (!moving && ghost) {
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
          if (blueprintSelection) placeBlueprintAt(blueprintSelection, ghost.x, ghost.z, rot);
          else if (activeType) placeBuilding(activeType, ghost.x, ghost.z, rot);
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
    // Wave 8 · wall-connect. A wall-family piece near a standing one latches
    // to its open END rather than to the bare 2m lattice: the family runs 8m
    // straights against 4m corners against a 2m door, and no single grid pitch
    // lines all of those up flush. Everything else — and a wall out in open
    // ground — keeps the original per-piece grid snap untouched.
    const link = wallSnap(activeType, rot, point.x, point.z, buildings, destination ?? null);
    if (link) return { x: link.x, z: link.z };
    const [sx, sz] = sizeFor(activeType, rot);
    const snap = def.snap;
    return {
      x: Math.round((point.x - sx / 2) / snap) * snap + sx / 2,
      z: Math.round((point.z - sz / 2) / snap) * snap + sz / 2,
    };
  }

  const placement =
    activeType && ghost ? evalPlacement(activeType, ghost.x, ghost.z, rot, moving?.id) : null;
  const affordable = moving ? true : def ? canAfford(def.cost) : false;
  const valid = !!placement?.valid && affordable;
  // sizeFor's swapped [sx,sz] is for grid-snap math only (snapPoint above) —
  // the ghost mesh itself must use the model's own unswapped footprint and a
  // real rotation-y, exactly like the real placed piece (Buildings.tsx +
  // PropModel.tsx), or a rotated-but-square-swap piece never visibly turns
  // and an asymmetric piece's ghost never matches its actual rotated shape.
  const gsx = def?.size[0] ?? 1;
  const gsz = def?.size[2] ?? 1;
  const gh = def?.size[1] ?? 1;
  const gy = placement?.y ?? 0;
  const gyaw = (rot * Math.PI) / 2;
  // a corner turns a run either way, so it has no meaningful "front" to
  // point at — see labIsCorner
  const isCorner = !!activeType && labIsCorner(labAssetId(activeType));
  // Wave 8 · is the ghost currently LATCHED to a neighbouring wall? Re-asking
  // wallSnap about the already-snapped point rather than threading a second
  // piece of state out of snapPoint: the answer is by construction the same
  // point when it latched, and null when it did not.
  const wallLink = activeType && ghost
    ? wallSnap(activeType, rot, ghost.x, ghost.z, buildings, destination ?? null)
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
    blueprintSelection && ghost ? evalBlueprintPlacement(blueprintSelection, ghost.x, ghost.z, rot) : null;
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
        onPointerMove={(e) => setGhost(snapPoint(e.point))}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          // relocating an already-built piece has no "pop into being" moment
          // to soften, so the move tool stays an instant click, not a hold
          if (moving) {
            if (ghost && valid) finishMove(ghost.x, ghost.z, rot);
            return;
          }
          // nothing selected: this press is a pickup-tool click on an
          // existing building (Buildings.tsx's own onClick handles it) — no
          // hold to start
          if (!activeType && !blueprintSelection) return;
          mouseDown.current = true;
        }}
        onPointerUp={(e) => { if (e.button === 0) mouseDown.current = false; }}
        onPointerLeave={() => { mouseDown.current = false; }}
      >
        <planeGeometry args={[WORLD_HALF * 2, WORLD_HALF * 2]} />
      </mesh>
      {/* single-piece placement ghost — rotation-y matches the real piece's
          own rotation-y (Buildings.tsx/PropModel.tsx), applied to the
          model's true unswapped footprint, so a rotated ghost actually
          turns instead of only ever showing gsx/gsz swapped on a fixed
          axis-aligned box */}
      {activeType && def && ghost && (
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
