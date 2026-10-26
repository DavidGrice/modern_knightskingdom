// CLN-27 · the build view's camera rig, out of BuildController.tsx: the raked orthographic camera, where it looks
// (`center`), how close (`zoom`, the wheel), which quarter it faces (`azQuarter`, eased into `azRef`), the middle-mouse
// drag-pan and the WASD pan, and the per-frame placing of the camera itself. `keys` is the held-keys map the build
// view's keyboard (useBuildHotkeys.ts) writes; `setAzQuarter` is how Q/E turn the view.
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORLD_HALF } from '@/game/data/world';
import { buildCamState } from '@/game/buildCam';
import { playerState } from '@/game/playerState';
import { destinationGroundY, homeGroundY } from '@/components/world/TemplateWorld';

// Raked build view (2026-07-20): the camera used to sit straight overhead
// (`position(c.x, 90, c.z)`, `up = -Z`), which flattened every piece into a
// 2D plan — you could see the grid but not the SIDES of what you were
// placing, so height and facing were both guesswork. It's still orthographic
// (no perspective distortion across the grid, which is what makes a build
// view readable) but now tilted down at ELEV_DEG instead of straight down,
// looking from the +Z side, so pieces show a face and a flank.
const ELEV_DEG = 52;                       // 90 would be the old flat top-down
const CAM_DIST = 92;                       // along the view ray from the focus point
export const CAM_H = CAM_DIST * Math.sin((ELEV_DEG * Math.PI) / 180);
export const CAM_BACK = CAM_DIST * Math.cos((ELEV_DEG * Math.PI) / 180);
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

export function useBuildCamera({ gl, regionCX, regionCZ, destination, keys }: {
  gl: THREE.WebGLRenderer;
  regionCX: number;
  regionCZ: number;
  destination: string | null;
  keys: MutableRefObject<Record<string, boolean>>;
}) {
  const camRef = useRef<THREE.OrthographicCamera>(null);

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

  // Wave 9 · the camera's own quarter turn around the focus point. The integer
  // is the authority (it can run past ±4 freely, no wrap needed); `azRef` is
  // the eased angle the camera is actually at this frame.
  const [azQuarter, setAzQuarter] = useState(0);
  const azRef = useRef(0);
  const azQuarterRef = useRef(0);
  azQuarterRef.current = azQuarter;

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
  });

  return { camRef, center, zoom, setAzQuarter };
}
