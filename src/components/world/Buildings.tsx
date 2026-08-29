'use client';
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PositionalAudio } from '@react-three/drei';
import { quintainSpins } from '@/game/siege';
import { cartLivePos } from '@/game/carts';
import { GROW_TIME } from '@/game/store/gameStore';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, labAssetId, solidOffsetRotated } from '@/game/data/buildables';
import RiggedProp from './RiggedProp';
import { hasAnimatedRig } from '@/lib/propRig';
import ConstructionSiteModel from './ConstructionSite';
import LabFlame from './LabFlame';
import PropModel from './PropModel';
import { isBuilt } from '@/game/types';
import type { Buildable, PlacedBuilding } from '@/game/types';
import { SCOPED_DESTINATIONS, type WorldDestination } from '@/game/data/worlds';

// origin-offset for a piece rendered inside DestinationScope.tsx's own
// group (already translated by dest.origin) — every OTHER call site (home,
// dungeon, arena — the SCOPED_DESTINATIONS non-members, worlds.ts) passes
// nothing and keeps today's absolute-position behavior byte-for-byte.
const ZERO_OFFSET = { x: 0, z: 0 };

function Campfire({ lit = true }: { lit?: boolean }) {
  return (
    <group>
      {/* stone ring */}
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.55, 0.12, Math.sin(a) * 0.55]} castShadow>
            <dodecahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#8b8b90" roughness={1} flatShading />
          </mesh>
        );
      })}
      {/* crossed logs */}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0.6, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
        <meshStandardMaterial color="#5d3d20" roughness={1} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, -0.9, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
        <meshStandardMaterial color="#5d3d20" roughness={1} />
      </mesh>
      {lit && (
        <>
          {/* J50 · the game's own 32-frame fire, not a pair of cones */}
          <Suspense fallback={null}>
            <LabFlame height={0.7} position={[0, 0.24, 0]} intensity={9} distance={9} />
          </Suspense>
          <Suspense fallback={null}>
            <PositionalAudio url="/assets/sounds/flame.wav" distance={3} loop autoplay />
          </Suspense>
        </>
      )}
    </group>
  );
}

function Forge() {
  return (
    <group>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 1.2, 2.2]} />
        <meshStandardMaterial color="#75757c" roughness={0.95} />
      </mesh>
      <mesh position={[-0.8, 1.6, -0.5]} castShadow>
        <boxGeometry args={[0.7, 1.4, 0.7]} />
        <meshStandardMaterial color="#5d5d64" roughness={0.95} />
      </mesh>
      {/* hearth: the coal bed still glows, but the fire in it is the real
          flame element (J50) rather than a lit box */}
      <mesh position={[0.5, 0.75, 0.85]}>
        <boxGeometry args={[1.0, 0.5, 0.35]} />
        <meshBasicMaterial color="#ff6a1e" />
      </mesh>
      <Suspense fallback={null}>
        <LabFlame height={0.45} position={[0.5, 0.95, 0.85]} intensity={7} distance={7} />
      </Suspense>
      <Suspense fallback={null}>
        <PositionalAudio url="/assets/sounds/flame.wav" distance={4} loop autoplay />
      </Suspense>
      {/* anvil */}
      <mesh position={[1.6, 0.35, -0.3]} castShadow>
        <boxGeometry args={[0.7, 0.3, 0.35]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[1.6, 0.12, -0.3]} castShadow>
        <boxGeometry args={[0.4, 0.24, 0.4]} />
        <meshStandardMaterial color="#5d3d20" roughness={1} />
      </mesh>
    </group>
  );
}

export function Torch() {
  // original standard-pole model (l395700) with a flame effect on top
  return (
    <group>
      <Suspense
        fallback={
          <mesh position-y={0.55} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 1.1, 7]} />
            <meshStandardMaterial color="#5d3d20" roughness={1} />
          </mesh>
        }
      >
        <PropModel url="/assets/props/castle_accessories/04_l395700.glb" height={1.3} />
      </Suspense>
      <Suspense fallback={null}>
        <LabFlame height={0.42} position={[0, 1.3, 0]} intensity={7} distance={11} />
      </Suspense>
    </group>
  );
}

function Quintain({ id }: { id: string }) {
  // original rotating-axes training device (oc6095-2); the whole machine
  // spins about its pedestal when struck
  const arm = useRef<THREE.Group>(null);
  const spin = useRef(0);
  useFrame((_, dt) => {
    const target = quintainSpins[id] ?? 0;
    if (arm.current && spin.current < target) {
      spin.current = Math.min(target, spin.current + dt * 9);
      arm.current.rotation.y = spin.current;
    }
  });
  return (
    <group ref={arm}>
      <Suspense
        fallback={
          <mesh position-y={0.9} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 1.8, 8]} />
            <meshStandardMaterial color="#6b4a2a" roughness={1} />
          </mesh>
        }
      >
        <PropModel url="/assets/props/oc6095-2.glb" height={2.2} />
      </Suspense>
    </group>
  );
}

function FarmPlot({ id }: { id: string }) {
  const growth = useGameStore((s) => s.plots[id]);
  // undefined = untilled soil · >0 growing · 0 ready
  const planted = growth !== undefined;
  const progress = planted ? 1 - Math.min(1, Math.max(0, growth / GROW_TIME)) : 0;
  const stalks: React.ReactElement[] = [];
  if (planted) {
    const h = 0.12 + progress * 0.55;
    const ripe = growth === 0;
    for (let ix = 0; ix < 3; ix++) {
      for (let iz = 0; iz < 3; iz++) {
        stalks.push(
          <mesh key={`${ix}-${iz}`} position={[(ix - 1) * 0.55, 0.22 + h / 2, (iz - 1) * 0.55]} castShadow>
            <cylinderGeometry args={[0.035, 0.05, h, 5]} />
            <meshStandardMaterial color={ripe ? '#d8b23c' : '#5d9a3f'} roughness={0.9} />
          </mesh>,
        );
      }
    }
  }
  return (
    <group>
      <mesh position-y={0.11} receiveShadow castShadow>
        <boxGeometry args={[1.9, 0.22, 1.9]} />
        <meshStandardMaterial color="#5d4426" roughness={1} />
      </mesh>
      {stalks}
    </group>
  );
}

function GateFixture({ id }: { id: string }) {
  // the original portcullis lattice (l318500) slides up into its housing,
  // and a procedural wooden drawbridge (no standalone model exists in the
  // extraction) hinges down flat from the archway lintel — together, the
  // gate's "open" state
  const open = useGameStore((s) => s.gateOpen[id] ?? true);
  const portcullis = useRef<THREE.Group>(null);
  const bridge = useRef<THREE.Group>(null);
  const portY = useRef(0);
  const bridgeAngle = useRef(0);
  const HINGE_H = 2.6;
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 2.2);
    const targetY = open ? HINGE_H : 0;
    portY.current += (targetY - portY.current) * k;
    if (portcullis.current) portcullis.current.position.y = portY.current;
    // hinged at ground level: closed = standing vertical (sealing the gate),
    // open = swung flat onto the ground, forming a ramp outward
    const targetAngle = open ? Math.PI / 2 : 0;
    bridgeAngle.current += (targetAngle - bridgeAngle.current) * k;
    if (bridge.current) bridge.current.rotation.x = bridgeAngle.current;
  });
  return (
    <group>
      <group ref={portcullis}>
        <Suspense fallback={null}>
          <PropModel url="/assets/props/windows_doors/06_l318500.glb" height={3.2} />
        </Suspense>
      </group>
      <group ref={bridge} position={[0, 0, 1]}>
        <mesh position-y={HINGE_H / 2} castShadow receiveShadow>
          <boxGeometry args={[3.4, HINGE_H, 0.12]} />
          <meshStandardMaterial color="#6b4526" roughness={0.9} />
        </mesh>
        {[-1.4, -0.7, 0, 0.7, 1.4].map((ox) => (
          <mesh key={ox} position={[ox, HINGE_H / 2, 0.065]} castShadow>
            <boxGeometry args={[0.08, HINGE_H, 0.03]} />
            <meshStandardMaterial color="#4a2f1b" roughness={0.95} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Wave 8 fix (2026-08-06) · live verification screenshotted this as a
 *  procedurally-hinged leaf behind the l407100 mold, and the mold itself is
 *  NOT a hollow frame — it is a barred lattice (see its own thumbnail: a
 *  criss-cross grille filling the whole opening). A swinging leaf behind bars
 *  that stay put either way was wrong on both states: shut, the leaf's flat
 *  panel didn't fill the lintel and sky showed through the gap; open, the
 *  bars were still standing in the doorway you'd just "opened."
 *
 *  Reframed as a **Portcullis** instead of an Oak Door — the mold already
 *  looks like one, so this is a naming/motion fix, not a new asset. No
 *  procedural leaf at all: the real mesh IS the gate, and it raises straight
 *  up into the gatehouse above when open, the way an actual portcullis does,
 *  instead of swinging on a hinge it was never modelled with. `isDoorLike`/
 *  `gateOpen` (types.ts) don't care what a door looks like, only whether it's
 *  open — this is a pure render change. */
function DoorFixture({ id }: { id: string }) {
  const open = useGameStore((s) => s.gateOpen[id] ?? true);
  const lift = useRef<THREE.Group>(null);
  const liftY = useRef(0);
  // raised clear of head height (declared 2.8m tall) but not the WHOLE
  // height — a real portcullis still shows a sliver in its slot at the top
  // of the gate, which reads better than the mesh vanishing outright.
  // Mutated on the group's own transform (not a React prop) the same way
  // GateFixture's bridge/leaf groups above already animate — a ref written
  // inside useFrame doesn't re-render, so the position has to be set on the
  // real Object3D, not re-passed as a prop each frame.
  const RAISED = 2.3;
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3.4);
    const target = open ? RAISED : 0;
    liftY.current += (target - liftY.current) * k;
    if (lift.current) lift.current.position.y = liftY.current;
  });
  return (
    <group ref={lift}>
      <Suspense fallback={null}>
        <PropModel url="/assets/props/windows_doors/12_l407100.glb" height={2.8} />
      </Suspense>
    </group>
  );
}

// Wave 24 · unlike GateFixture/DoorFixture above, this doesn't animate a
// single mesh — it swaps between the two REAL meshes the mold pair already
// is (14_l453201 closed / 16_l453202 open), which is simpler than a lift or
// hinge lerp and shows the state directly: a sealed pane you can't see or
// shoot through, or a hollow frame you can. `isDoorLike`/`gateOpen`
// (types.ts) don't care what a piece looks like, only whether it's open —
// same rule DoorFixture's own header already states, this is just a
// different honest way to draw it.
function WindowFixture({ id }: { id: string }) {
  const open = useGameStore((s) => s.gateOpen[id] ?? true);
  return (
    <Suspense fallback={null}>
      <PropModel
        url={`/assets/props/windows_doors/${open ? '16_l453202' : '14_l453201'}.glb`}
        height={0.84}
      />
    </Suspense>
  );
}

function Bed() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.44, 3.1]} />
        <meshStandardMaterial color="#6b4526" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0.15]} castShadow>
        <boxGeometry args={[1.25, 0.22, 2.6]} />
        <meshStandardMaterial color="#b03a2e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.56, -1.05]} castShadow>
        <boxGeometry args={[1.0, 0.18, 0.55]} />
        <meshStandardMaterial color="#e8e2d2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.62, -1.5]} castShadow>
        <boxGeometry args={[1.4, 0.9, 0.12]} />
        <meshStandardMaterial color="#57371f" roughness={0.9} />
      </mesh>
    </group>
  );
}

// a pushed/hitched cart tracks a live position override (see game/carts.ts)
// instead of its last-committed b.x/b.z, until the player lets go. cartLivePos
// (game/carts.ts) is absolute, same space as b.x/b.z — the originOffset
// subtraction has to happen at this useFrame write too, not just the initial
// JSX position, or a scoped destination's cart would snap back to its
// unscoped (double-offset) spot the instant the player nudges it.
function CartMesh({ b, def, yaw, originOffset = ZERO_OFFSET }: { b: PlacedBuilding; def: Buildable; yaw: number; originOffset?: { x: number; z: number } }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const live = cartLivePos[b.id];
    g.position.set((live?.x ?? b.x) - originOffset.x, b.y ?? 0, (live?.z ?? b.z) - originOffset.z);
  });
  return (
    <group ref={group} position={[b.x - originOffset.x, b.y ?? 0, b.z - originOffset.z]} rotation-y={yaw}>
      <Suspense fallback={null}>
        <PropModel url={def.model!} height={def.size[1]} />
      </Suspense>
    </group>
  );
}

// no dedicated "market stall" model exists in the extraction, so the frame
// and awning are procedural (same rule the campfire/forge/bed already
// follow) — dressed with two real extracted props: the barrel (l248900,
// already used elsewhere) and a wooden crate (l473800, copied but unused
// until now) standing in for stock on the counter.
function MarketStall() {
  return (
    <group>
      {/* counter */}
      <mesh position={[0, 0.45, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.9, 0.5]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      {/* corner posts */}
      {[[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 1.1, pz]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 2.2, 6]} />
          <meshStandardMaterial color="#5d3d20" roughness={1} />
        </mesh>
      ))}
      {/* peaked canvas awning */}
      <mesh position={[0, 2.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.7, 0.7, 4]} />
        <meshStandardMaterial color="#a4392f" roughness={0.85} />
      </mesh>
      <Suspense fallback={null}>
        <PropModel url="/assets/props/scenery/l248900.glb" height={0.9} position={[-0.85, 0, -0.55]} />
        <PropModel url="/assets/props/scenery/l473800.glb" height={0.55} position={[0.7, 0.9, 0.6]} yaw={0.3} />
      </Suspense>
    </group>
  );
}

// Phase 19 build-then-construct: the real BuildingMesh (with its
// lights/audio/behaviors) only appears once done, so a half-built campfire
// doesn't crackle and a half-built forge doesn't glow.
//
// J47/J48 · A site with a real model shows THAT model — wireframe plan plus
// the solid piece rising out of the ground (ConstructionSite.tsx). The box
// pair below is the fallback for the handful of buildables that are built
// from primitives (bed, torch, campfire) and so have no model to outline.
function ConstructionSite({ b, originOffset = ZERO_OFFSET }: { b: PlacedBuilding; originOffset?: { x: number; z: number } }) {
  const def = BUILDABLE_BY_ID[b.type];
  if (!def) return null;
  const progress = b.built ?? 0;
  const y = b.y ?? 0;
  const [w, h, d] = def.size;
  const yaw = b.yaw ?? (b.rot * Math.PI) / 2;
  const stakes: [number, number][] = [
    [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2],
  ];
  if (def.model) {
    return (
      <group position={[b.x - originOffset.x, y, b.z - originOffset.z]} rotation-y={yaw}>
        <Suspense fallback={null}>
          <ConstructionSiteModel url={def.model} size={def.size} progress={progress} worldY={y} />
        </Suspense>
      </group>
    );
  }
  return (
    <group position={[b.x - originOffset.x, y, b.z - originOffset.z]} rotation-y={yaw}>
      {/* the finished silhouette, ghost-faint */}
      <mesh position-y={h / 2}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color="#e8c141" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      {/* surveyor's stakes at each corner */}
      {stakes.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.3, pz]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 0.6, 5]} />
          <meshStandardMaterial color="#8a6234" roughness={1} />
        </mesh>
      ))}
      {/* the solid work-in-progress, rising from the ground with each swing */}
      {progress > 0.01 && (
        <mesh position-y={(h * progress) / 2} castShadow receiveShadow>
          <boxGeometry args={[w * 0.92, h * progress, d * 0.92]} />
          <meshStandardMaterial color="#9a8a6a" roughness={0.95} />
        </mesh>
      )}
    </group>
  );
}

export function BuildingMesh({ b, originOffset = ZERO_OFFSET }: { b: PlacedBuilding; originOffset?: { x: number; z: number } }) {
  const def = BUILDABLE_BY_ID[b.type];
  if (!def) return null;
  // Wave 9 · a freeform piece renders at its TRUE facing; everything else (and
  // every save before Wave 9) has no `yaw` and keeps the quarter turn exactly.
  // `solidOffsetRotated` deliberately stays on `rot`: that shift exists to line
  // a piece's solid mass up with the collision box, and the collision box is
  // still the axis-aligned quarter-turn one (see PlacedBuilding.yaw).
  const yaw = b.yaw ?? (b.rot * Math.PI) / 2;
  const y = b.y ?? 0;
  const solidWorld = solidOffsetRotated(b.type, b.rot);
  const px = b.x - originOffset.x;
  const pz = b.z - originOffset.z;
  if (b.type === 'campfire') {
    return <group position={[px, y, pz]} rotation-y={yaw}><Campfire /></group>;
  }
  if (b.type === 'forge') {
    return <group position={[px, y, pz]} rotation-y={yaw}><Forge /></group>;
  }
  if (b.type === 'torch') {
    return <group position={[px, y, pz]} rotation-y={yaw}><Torch /></group>;
  }
  if (b.type === 'bed') {
    return <group position={[px, y, pz]} rotation-y={yaw}><Bed /></group>;
  }
  if (b.type === 'quintain') {
    return <group position={[px, y, pz]} rotation-y={yaw}><Quintain id={b.id} /></group>;
  }
  if (b.type === 'farmplot') {
    return <group position={[px, y, pz]} rotation-y={yaw}><FarmPlot id={b.id} /></group>;
  }
  if (b.type === 'gate') {
    return <group position={[px, y, pz]} rotation-y={yaw}><GateFixture id={b.id} /></group>;
  }
  if (b.type === 'door') {
    return <group position={[px, y, pz]} rotation-y={yaw}><DoorFixture id={b.id} /></group>;
  }
  if (b.type === 'window') {
    return <group position={[px, y, pz]} rotation-y={yaw}><WindowFixture id={b.id} /></group>;
  }
  if (b.type === 'warcart' || b.type === 'bladecart') {
    return <CartMesh b={b} def={def} yaw={yaw} originOffset={originOffset} />;
  }
  if (b.type === 'market_stall') {
    return <group position={[px, y, pz]} rotation-y={yaw}><MarketStall /></group>;
  }
  // pieces the rig lab charted moving parts for (catapult arms, flag cloth,
  // flames) render through the OBJ-based rig so those parts actually move;
  // everything else stays on the cheaper static GLB path
  const labId = labAssetId(b.type);
  if (hasAnimatedRig(labId)) {
    return (
      <Suspense fallback={null}>
        <RiggedProp
          assetId={labId}
          height={def.size[1]}
          position={[px, y, pz]}
          yaw={yaw}
          buildingId={b.id}
        />
      </Suspense>
    );
  }
  return (
    <Suspense
      fallback={
        <mesh position={[px, y + def.size[1] / 2, pz]} rotation-y={yaw}>
          <boxGeometry args={[def.size[0] * 0.9, def.size[1], def.size[2] * 0.9]} />
          <meshStandardMaterial color="#9a8a6a" transparent opacity={0.4} />
        </mesh>
      }
    >
      {/* L65 · shifted so the piece's SOLID mass is centred on its cell —
          otherwise a wall's stone sits at the back of the cell one way round
          and at the front the other, and a rotated run no longer meets its
          neighbour on the grid line. collisionBoxesFor applies the same
          shift, so what stops you is still exactly what is drawn. */}
      <PropModel
        url={def.model!}
        height={def.size[1]}
        position={[px - solidWorld[0], y, pz - solidWorld[1]]}
        yaw={yaw}
      />
    </Suspense>
  );
}

export default function Buildings() {
  const allBuildings = useGameStore((s) => s.buildings);
  const destination = useGameStore((s) => s.destination);
  const buildMode = useGameStore((s) => s.buildMode);
  const removeBuilding = useGameStore((s) => s.removeBuilding);
  const pickupBuilding = useGameStore((s) => s.pickupBuilding);
  // instance-separation doctrine (Phase 23): a building belongs to wherever
  // it was placed (PlacedBuilding.world, absent/null = home) — rendering
  // every building regardless of world put remote claimed-plot structures
  // in view (and, from certain angles, floating over the homestead) no
  // matter where the player actually stood.
  // the Grand Keep's own PlacedBuilding entry (added 2026-07-30 so its
  // interior can be entered — see gameStore's foundKeep) exists purely for
  // interact-detection; KeepAssembly.tsx already owns 100% of its actual
  // visual (foundation plate + sockets), so it's excluded here to avoid
  // double-rendering a "Castle Foundation" mesh on top of that.
  // Stage 1 (2026-08-20): SCOPED_DESTINATIONS' own buildings now render
  // through DestinationBuildings below instead, so this stops double-
  // rendering them — every other world (including "no destination" = home)
  // is completely unaffected, since SCOPED_DESTINATIONS never contains null.
  const buildings = allBuildings.filter(
    (b) => (b.world ?? null) === (destination ?? null) && b.type !== 'keep' && !SCOPED_DESTINATIONS.has(b.world ?? ''),
  );
  return (
    <group>
      {buildings.map((b) => (
        <group
          key={b.id}
          onClick={(e: any) => {
            const st = useGameStore.getState();
            if (!st.buildMode || st.buildSelection || st.movingBuilding) return;
            // Wave 9 · while the wrecking tool is out the left button belongs
            // to the area marquee — opening a piece's action menu underneath
            // a drag that started on it would fight the gesture
            if (st.buildTool === 'demolish') return;
            e.stopPropagation();
            // L72 · a click asks what you want to do with the piece rather
            // than picking it up unasked — moving is one of the answers
            st.openBuildingMenu(b.id);
          }}
          onContextMenu={(e: any) => {
            if (!buildMode) return;
            e.stopPropagation();
            (e as { nativeEvent?: Event }).nativeEvent?.preventDefault?.();
            removeBuilding(b.id);
          }}
        >
          {isBuilt(b) ? <BuildingMesh b={b} /> : <ConstructionSite b={b} />}
        </group>
      ))}
    </group>
  );
}

/** Stage 1 (scene-isolation rearchitecture, 2026-08-20) · same building list
 *  as the default export above, restricted to one SCOPED_DESTINATIONS member
 *  and rendered with `dest.origin` subtracted at the final position write —
 *  meant to be mounted inside DestinationScope.tsx's own origin-offset
 *  <group>, so the same absolute stored `b.x`/`b.z` lands in the right local
 *  spot. Interaction wiring (openBuildingMenu/removeBuilding) is identical
 *  to the default export's — a claimed plot at a scoped destination
 *  (claimWorld/foundSettlement, keyed per destId same as everywhere else)
 *  builds and demolishes the same way home does. */
export function DestinationBuildings({ dest }: { dest: WorldDestination }) {
  const allBuildings = useGameStore((s) => s.buildings);
  const buildMode = useGameStore((s) => s.buildMode);
  const removeBuilding = useGameStore((s) => s.removeBuilding);
  const buildings = allBuildings.filter((b) => b.world === dest.id && b.type !== 'keep');
  return (
    <group>
      {buildings.map((b) => (
        <group
          key={b.id}
          onClick={(e: any) => {
            const st = useGameStore.getState();
            if (!st.buildMode || st.buildSelection || st.movingBuilding) return;
            if (st.buildTool === 'demolish') return;
            e.stopPropagation();
            st.openBuildingMenu(b.id);
          }}
          onContextMenu={(e: any) => {
            if (!buildMode) return;
            e.stopPropagation();
            (e as { nativeEvent?: Event }).nativeEvent?.preventDefault?.();
            removeBuilding(b.id);
          }}
        >
          {isBuilt(b)
            ? <BuildingMesh b={b} originOffset={dest.origin} />
            : <ConstructionSite b={b} originOffset={dest.origin} />}
        </group>
      ))}
    </group>
  );
}
