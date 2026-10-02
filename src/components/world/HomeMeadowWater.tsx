'use client';
// CLN-24 · the homestead's ground bake and its water, moved out of Terrain.tsx unchanged: the Far Meadow bake with
// the shader hole it cuts under every dug waterway, the brook, and the waterways themselves. Terrain.tsx composes
// them (and still draws the natural pond).
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useKtx2ExtendLoader } from '@/game/gltfKtx2';
import { BROOK } from '@/game/data/world';
import {
  BANK_Y, MAX_WATERWORKS, PIT_DEPTH, WATER_BANK, WATER_Y,
} from '@/game/waterworks';
import { PLAYER_RADIUS } from '@/components/fps/PlayerController';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { worldEnv, seasonOf } from '@/game/env';
import { homeGroundY } from '@/game/homeGround';
import { normalizeTemplateBake, TEMPLATE_WORLD_SCALE } from '@/game/templateBake';
import { SEASON_GRASS } from './seasonGrass';
import { useRippleTexture } from './useRippleTexture';

// Wave 59 (H3) · HomeMeadow needs a REAL hole wherever a dug waterway sits —
// not just a lower plane. A live rendering spike proved the original H3
// proposal (sink DugWater's bank/water planes below y=0, leave the meadow
// alone) is a complete dead end: HomeMeadow is one continuous, un-carved GLB
// mesh present at y≈0 across the entire footprint of every dug rectangle, so
// standard depth testing means it always wins against anything placed below
// it, from every camera angle tested — the sunk planes were 100% invisible,
// including at a shallow near-grazing angle and looking straight down at the
// dig's own boundary line. A `depthTest:false`/high-`renderOrder` trick was
// tried next and rejected too: confirmed live to paint the (sunk) water
// straight through a solid wall standing between the camera and it — real
// play hits this constantly, since a moat is explicitly meant to run along a
// fence (see waterworks.ts's own DIG_SNAP note).
//
// The fix that actually works: `MeshStandardMaterial.onBeforeCompile`
// injects a per-fragment world-space rectangle test into HomeMeadow's own
// cloned materials — `discard` wherever (x,z) falls inside any live
// `waterworks` rectangle — AND into a matching custom shadow-depth material
// (`normalizeTemplateBake` sets `castShadow`/`receiveShadow` on every mesh
// here; without this second patch the invisible-but-still-shadow-casting
// meadow surface would leave every pit permanently, incorrectly shadowed
// regardless of the sun's real position). This is real geometry removal at
// the source, not a depth-buffer workaround, so it interacts correctly with
// any other real object's own depth from every angle — confirmed live
// against exactly the wall case that broke the depthTest trick.
const MAX_WATER_HOLES = MAX_WATERWORKS;

/** How far inside the water rectangle's own edge the meadow's real hole
 *  starts, relative to the SAME zero-margin rect `waterAt`/`pushOutOfWater`
 *  already treat as "inside the water" — 0, so the hole exactly matches
 *  that rect with no separate inset. Dev-asserted smaller than the real,
 *  live `PLAYER_RADIUS` import (not a remembered copy of the number) so a
 *  future author can't widen it into unsafe territory without the assertion
 *  firing: the player's own real closest approach to that same rectangle is
 *  bounded below by `PLAYER_RADIUS` — the smaller, binding one of the two
 *  push-out margins (mobs/defenders use the more generous 0.6) — so as long
 *  as the hole never reaches farther out than that, nobody can ever end up
 *  standing over open air with nothing solid underfoot. */
const WATER_HOLE_MARGIN = 0;
if (process.env.NODE_ENV !== 'production' && WATER_HOLE_MARGIN >= PLAYER_RADIUS) {
  console.warn(
    `[Terrain] WATER_HOLE_MARGIN (${WATER_HOLE_MARGIN}) is not smaller than the real PLAYER_RADIUS `
    + `(${PLAYER_RADIUS}) — a player could stand directly over HomeMeadow's real cut hole with `
    + 'nothing solid underfoot.',
  );
}

/** One shared, mutated-in-place uniform pair every patched material reads —
 *  built once and refreshed whenever `waterworks` changes, so every meadow
 *  material/mesh (and the shared shadow-depth material) stays in lockstep
 *  without its own copy or its own shader recompile. */
function makeWaterHoleUniforms() {
  return {
    uWaterRects: { value: Array.from({ length: MAX_WATER_HOLES }, () => new THREE.Vector4()) },
    uWaterRectCount: { value: 0 },
  };
}

type WaterHoleUniforms = ReturnType<typeof makeWaterHoleUniforms>;

/** Injected into both HomeMeadow's real material and its shadow-depth
 *  material — identical GLSL, different `shader` objects. Three's own
 *  `MeshStandardMaterial`/`MeshDepthMaterial` templates both carry exactly
 *  one `#include <common>` (top-level, before `main`) and one `void main() {`
 *  in each of their vertex/fragment stages — checked directly against the
 *  installed three version rather than assumed (`node_modules/three/src/
 *  renderers/shaders/ShaderLib/{meshphysical,depth}.glsl.js`). */
function patchMeadowShaderForWaterHoles(
  shader: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string },
  uniforms: WaterHoleUniforms,
) {
  shader.uniforms.uWaterRects = uniforms.uWaterRects;
  shader.uniforms.uWaterRectCount = uniforms.uWaterRectCount;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPosKk;')
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvWorldPosKk = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vWorldPosKk;\nuniform vec4 uWaterRects[${MAX_WATER_HOLES}];\n`
      + 'uniform int uWaterRectCount;',
    )
    .replace(
      'void main() {',
      `void main() {\n  for (int kkI = 0; kkI < ${MAX_WATER_HOLES}; kkI++) {\n`
      + '    if (kkI >= uWaterRectCount) break;\n'
      + '    vec4 kkR = uWaterRects[kkI];\n'
      + '    if (vWorldPosKk.x > kkR.x && vWorldPosKk.x < kkR.y && vWorldPosKk.z > kkR.z '
      + '&& vWorldPosKk.z < kkR.w) discard;\n'
      + '  }\n',
    );
}

// Phase 20 step 1: the home terrain IS template-09 ("The Far Meadow") — the
// one genuinely empty, flat template bake — mounted at the world origin so
// every existing coordinate (SPAWN, BUILD_REGION, POND, NPCs, saved
// buildings) stays valid. The mesh comes to the world, not the world to the
// mesh. Its ground sits at y=0 after normalizeTemplateBake, and the field is
// flat (near-zero vertical extent, per TemplateWorld's own notes), so the
// flat-ground movement/collision assumptions hold unchanged. Seasonal grass
// tinting carries over by multiplying each baked material's own color by the
// current season's ratio-to-spring, so the meadow pales in winter the same
// way the old procedural plane did.
export function HomeMeadow() {
  const extendKtx2 = useKtx2ExtendLoader();
  const { scene } = useGLTF('/assets/worlds/template-09.glb', true, true, extendKtx2);
  const { gl } = useThree();
  const waterworksList = useGameStore((s) => s.waterworks);

  // Wave 59 (H3) · see this function's own header above.
  const waterHoleUniforms = useMemo(() => makeWaterHoleUniforms(), []);
  const meadowDepthMaterial = useMemo(() => {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (shader) => patchMeadowShaderForWaterHoles(shader, waterHoleUniforms);
    return m;
  }, []);

  useEffect(() => {
    const arr = waterHoleUniforms.uWaterRects.value;
    const n = Math.min(waterworksList.length, MAX_WATER_HOLES);
    for (let i = 0; i < n; i++) {
      const w = waterworksList[i];
      const hx = w.halfX - WATER_HOLE_MARGIN;
      const hz = w.halfZ - WATER_HOLE_MARGIN;
      arr[i].set(w.x - hx, w.x + hx, w.z - hz, w.z + hz);
    }
    waterHoleUniforms.uWaterRectCount.value = n;
  }, [waterworksList, waterHoleUniforms]);

  const { group, tintables } = useMemo(() => {
    // 'origin' anchor, not the shared default — see normalizeTemplateBake's
    // own doc comment for why the home meadow specifically needs this
    const { group: g } = normalizeTemplateBake(scene, TEMPLATE_WORLD_SCALE, 'origin');
    // Requested 2026-07-31: a real Options setting (Settings.anisotropy,
    // default 8 — this file's own original hardcoded value, so a Balanced-
    // equivalent player sees no change) instead of a bare literal. A plain
    // imperative read, not a subscribed hook value — like AA mode and the
    // quality tiers' own antialias/powerPreference, this takes effect on
    // already-loaded textures only at next load, not live mid-session.
    const anisotropy = Math.min(useAppStore.getState().settings.anisotropy, gl.capabilities.getMaxAnisotropy());
    // clone materials so seasonal tinting never mutates drei's shared GLTF
    // cache (a destination visit to another bake must not inherit our tint)
    const tintables: { mat: THREE.MeshStandardMaterial; orig: THREE.Color }[] = [];
    g.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const clone = (m as THREE.Material).clone() as THREE.MeshStandardMaterial;
          // the baked stud-plate texture bands badly at the grazing angles a
          // ground plane is always seen from — anisotropy keeps it legible
          if (clone.map) clone.map.anisotropy = anisotropy;
          if (clone.color) tintables.push({ mat: clone, orig: clone.color.clone() });
          // Wave 59 (H3) · cut a real hole wherever a dug waterway sits
          clone.onBeforeCompile = (shader) => patchMeadowShaderForWaterHoles(shader, waterHoleUniforms);
          return clone;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
        // same discard, so the meadow's own shadow can't blot out the sun
        // for a pit that's supposed to be open to the sky
        mesh.customDepthMaterial = meadowDepthMaterial;
      }
    });
    return { group: g, tintables };
  }, [scene, gl]);

  useFrame((_, dt) => {
    const s = seasonOf(worldEnv.dayCount);
    const base = SEASON_GRASS[0];
    const target = SEASON_GRASS[s];
    const k = Math.min(1, dt * 0.15);
    for (const { mat, orig } of tintables) {
      mat.color.r += (Math.min(1, orig.r * (target[0] / base[0])) - mat.color.r) * k;
      mat.color.g += (Math.min(1, orig.g * (target[1] / base[1])) - mat.color.g) * k;
      mat.color.b += (Math.min(1, orig.b * (target[2] / base[2])) - mat.color.b) * k;
    }
  });

  return <primitive object={group} />;
}

// A brook running from a rocky spring northeast of the pond down into it.
// The brook surface reuses the pond's spr199 ripple (it reads as flat water);
// spr203 — the cascade strip copied for exactly this in the water-texture
// pass — dresses the spring itself as a small waterfall face pouring out of
// the rocks, which is what that sprite actually depicts. Purely cosmetic:
// shallow enough to splash through, no collision. Routed pond-edge →
// (140, 68), clear of the Keep's footprint, the fishing dock (southwest
// bank) and the build region.
export function Stream() {
  const brookTexture = useRippleTexture();
  const fallTexture = useRippleTexture('/assets/textures/water/spr203_64x128.png');
  // from the pond's northeast edge out to the spring mound (data/world.ts's
  // BROOK — shared with the pail-filling interact since Wave 5)
  const ax = BROOK.startX, az = BROOK.startZ;
  const bx = BROOK.endX, bz = BROOK.endZ;
  const dx = bx - ax, dz = bz - az;
  const len = Math.hypot(dx, dz);
  // plane length runs along local -Z once laid flat; the group yaw that
  // points -Z along (dx,dz) is this codebase's usual atan2(-dx,-dz)
  const yawAngle = Math.atan2(-dx, -dz);
  brookTexture.repeat.set(1, Math.round(len / 4));
  useFrame((_, dt) => {
    // visible pattern motion is OPPOSITE the offset drift: increasing
    // offset.y slides the sampled window up, so the image appears to move
    // down (-V). Brook -V points at the pond; the cascade face's +V is up.
    brookTexture.offset.y += dt * 0.12; // pattern drifts toward the pond
    fallTexture.offset.y += dt * 0.55;  // pattern pours DOWN the face
  });
  return (
    <group>
      <group position={[(ax + bx) / 2, 0.045, (az + bz) / 2]} rotation-y={yawAngle}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[2.4, len]} />
          <meshStandardMaterial
            map={brookTexture} color="#7fd0dd" roughness={0.35} metalness={0.1} transparent opacity={0.85}
          />
        </mesh>
      </group>
      {/* the spring: a rock cluster with a small spr203 cascade face */}
      <group position={[bx, 0, bz]} rotation-y={yawAngle}>
        {[[0, 0.45, -0.6], [0.9, 0.3, 0.1], [-0.85, 0.32, 0], [0.15, 0.28, 0.7]].map(([px, s, pz], i) => (
          <mesh key={i} position={[px as number, (s as number) * 0.7, pz as number]} castShadow>
            <dodecahedronGeometry args={[(s as number) * 2, 0]} />
            <meshStandardMaterial color="#8b8b90" roughness={1} flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.42, 0.55]} rotation-x={-0.35}>
          <planeGeometry args={[1.3, 0.9]} />
          <meshStandardMaterial
            map={fallTexture} color="#9fdce8" roughness={0.3} transparent opacity={0.9} side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Wave 12 · the waterways the player has cut (game/waterworks.ts).
 *
 * Drawn exactly the way the natural POND (Terrain.tsx) is drawn — a sandy bank plate
 * with a rippling water plate a few centimetres above it, both lying ON the
 * meadow — because the home ground is one GLB bake and nothing in this
 * project performs runtime geometry surgery on it. What is genuinely real
 * about a dug waterway is everything except the hole: it blocks pathing, it
 * stops the player and the raiders, it refuses buildings, it costs gold and it
 * saves. Wave 31 · the group itself now sits at `homeGroundY(w.x, w.z)`
 * rather than always y=0, so a cut anywhere near a terrain region's rim reads
 * as lying ON that slope instead of floating at the meadow's own height — an
 * elevation-FOLLOWING overlay, still not a true excavated hole in the mesh
 * (see terrainRegions.ts's own header for why that stays out of scope).
 *
 * The ripple is loaded ONCE and cloned per cut, rather than shared outright:
 * `repeat` lives on the texture, so one shared instance would stretch a single
 * 256px tile the length of a 60m canal — a painted stripe, not water. A clone
 * carries its own repeat/offset over the same decoded image, and all of them
 * are drifted from the one `useFrame` here, at the pond's own rate, so a
 * four-sided moat reads as one body of water rather than four independently
 * flowing ones.
 */
const WATER_TILE = 4; // metres of surface per ripple tile — matches the brook's

export function DugWater() {
  const waterworks = useGameStore((s) => s.waterworks);
  const base = useRippleTexture();
  // rebuilt only when the LIST changes (a cut, a fill, a load), which is also
  // where the previous clones are released — a moat dug and filled twenty times
  // over a long session would otherwise leave every one of its textures on the
  // GPU
  const patches = useMemo(() => {
    const made = waterworks.map((w) => {
      const t = base.clone();
      t.needsUpdate = true;
      t.repeat.set(Math.max(1, Math.round(w.halfX * 2 / WATER_TILE)), Math.max(1, Math.round(w.halfZ * 2 / WATER_TILE)));
      return { w, tex: t };
    });
    return made;
  }, [waterworks, base]);
  useEffect(() => () => { for (const p of patches) p.tex.dispose(); }, [patches]);
  useFrame((_, dt) => {
    for (const p of patches) {
      p.tex.offset.x += dt * 0.012;
      p.tex.offset.y += dt * 0.005;
    }
  });
  if (patches.length === 0) return null;
  return (
    <group>
      {patches.map(({ w, tex }) => {
        // Wave 59 (H3) · the SAME zero-margin rectangle HomeMeadow's own
        // shader hole uses (WATER_HOLE_MARGIN, this file), so the wall/water
        // never drifts out of step with where the meadow is actually cut.
        const hx = w.halfX - WATER_HOLE_MARGIN;
        const hz = w.halfZ - WATER_HOLE_MARGIN;
        const outerX = w.halfX + WATER_BANK;
        const outerZ = w.halfZ + WATER_BANK;
        return (
          // Wave 31 · sampled once per cut rather than assumed flat — a
          // single point per rectangle, the same accepted simplification a
          // claimed destination plot's own ground level already uses.
          // BANK_Y/WATER_Y stay relative offsets laid on top of this,
          // unchanged.
          <group key={w.id} position={[w.x, homeGroundY(w.x, w.z), w.z]}>
            {/* the dug earth thrown up round the cut, exactly the pond's own
                sand ring generalised from a circle to a rectangle. Wave 59
                (H3) · a real RING now (4 strips, picture-frame tiled with no
                gap/overlap) rather than one solid plate — a solid plate here
                would sit right above the new hole below and hide it all over
                again, the exact same occlusion failure one layer up. */}
            {[
              // north/south: full outer width, from the hole's own edge out
              // to the bank's outer edge (covers the corners)
              { pos: [0, BANK_Y, -(outerZ + hz) / 2] as const, w: outerX * 2, d: outerZ - hz },
              { pos: [0, BANK_Y, (outerZ + hz) / 2] as const, w: outerX * 2, d: outerZ - hz },
              // east/west: just the middle band between north/south (no
              // corner overlap)
              { pos: [(outerX + hx) / 2, BANK_Y, 0] as const, w: outerX - hx, d: hz * 2 },
              { pos: [-(outerX + hx) / 2, BANK_Y, 0] as const, w: outerX - hx, d: hz * 2 },
            ].map((strip, i) => (
              <mesh key={i} rotation-x={-Math.PI / 2} position={strip.pos} receiveShadow>
                <planeGeometry args={[strip.w, strip.d]} />
                <meshStandardMaterial color="#c9b878" roughness={1} />
              </mesh>
            ))}
            {/* the pit itself: four vertical walls from grade down to
                PIT_DEPTH at the hole's own edge, doubleSided since both the
                inward (seen from above/across) and — at a real dig's own
                shallow rim angles — occasionally outward face can be in
                view */}
            {[
              { pos: [0, -PIT_DEPTH / 2, -hz] as const, width: hx * 2, rotY: 0 },
              { pos: [0, -PIT_DEPTH / 2, hz] as const, width: hx * 2, rotY: 0 },
              { pos: [hx, -PIT_DEPTH / 2, 0] as const, width: hz * 2, rotY: Math.PI / 2 },
              { pos: [-hx, -PIT_DEPTH / 2, 0] as const, width: hz * 2, rotY: Math.PI / 2 },
            ].map((wall, i) => (
              <mesh key={i} position={wall.pos} rotation-y={wall.rotY} receiveShadow>
                <planeGeometry args={[wall.width, PIT_DEPTH]} />
                <meshStandardMaterial color="#7a6142" roughness={1} side={THREE.DoubleSide} />
              </mesh>
            ))}
            {/* Wave 59 (H3) addendum · water sits near the pit's own RIM
                (grade, y=0), not near its floor — WATER_Y is still "how far
                the water sits from the true ground plane" (y=0), the same
                small offset it always was above flat grade; only the visible
                walls/floor moved to PIT_DEPTH below, not the water's own
                natural resting level relative to grade. This reads as
                brim-full, per this const's own doc comment in waterworks.ts,
                rather than a dry pit with water pooled at the bottom. */}
            <mesh rotation-x={-Math.PI / 2} position-y={-WATER_Y}>
              <planeGeometry args={[hx * 2, hz * 2]} />
              <meshStandardMaterial
                map={tex} color="#7fd0dd" roughness={0.3} metalness={0.1} transparent opacity={0.92}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
