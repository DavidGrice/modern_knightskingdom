'use client';
// Wildlife from the original animal models: grazing horses that wander the
// west meadow, a falcon circling high overhead by day, and bats at night.
import { Suspense, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNormalizedProp } from './PropModel';
import RiggedProp from './RiggedProp';
import { worldEnv } from '@/game/env';
import { audio } from '@/lib/audio';
import { playerState } from '../fps/PlayerController';
import { riddenByAlly, registerHorse } from '@/game/riding';
import { falconPos, falconSpotLabel, FALCON_SPOT_RANGE } from '@/game/falcon';
import { useGameStore } from '@/game/store/gameStore';
import { GROUND_BY_ID, groundOpen } from '@/game/data/grounds';
import { sampleTemplateGroundY } from './TemplateWorld';

const C = '/assets/props/creatures';
const L = '/assets/props/lab';

function distVol(x: number, z: number, max = 34): number {
  const d = Math.hypot(playerState.x - x, playerState.z - z);
  return Math.max(0, 1 - d / max);
}

/**
 * The flying creatures ship a PURE BLACK, untextured material straight from
 * the extraction (falcon `l254600` baseColorFactor [0,0,0]; the bat the same).
 * On the ground that reads as shadow, but silhouetted against a bright sky it
 * reads as a hole punched through the skybox — which is exactly what it was
 * reported as. Lift any such material to a plausible dark plumage tone; only
 * near-black, map-less materials are touched, so genuine dark detail elsewhere
 * on the model is left alone. Materials are cloned first: `Object3D.clone()`
 * SHARES materials, and `useNormalizedProp` hands out a cached model, so
 * mutating in place would leak into every other user of that model.
 */
function liftBlackMaterials(root: THREE.Object3D, tone = 0x4a4038) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const next = list.map((m) => {
      const mm = m as THREE.MeshStandardMaterial;
      if (!mm.color || mm.map) return m;
      const { r, g, b } = mm.color;
      if (r > 0.03 || g > 0.03 || b > 0.03) return m;
      const c = mm.clone();
      c.color.setHex(tone);
      return c;
    });
    mesh.material = Array.isArray(mesh.material) ? next : next[0];
  });
}

function Horse({ id, url, home, world }: { id: string; url: string; home: [number, number]; world?: string }) {
  const group = useRef<THREE.Group>(null);
  // how fast this horse is actually moving, fed to the rigged walk cycle —
  // 0 reads as grazing (head down, tail swishing) rather than frozen
  const [gaitSpeed, setGaitSpeed] = useState(0);
  // the lab verified a full four-leg rig on every horse, but only the OBJ
  // carries the per-part names it keys on (the GLB merges by material), so
  // the animated path loads from props/objrig — see lib/propRig
  const gaitRef = useRef(-1);
  const assetId = useMemo(() => url.split('/').pop()!.replace(/\.glb$/i, ''), [url]);
  const mob = useMemo(() => registerHorse(id, url, home[0], home[1]), [id, url, home]);
  // Phase 20: a horse can be stabled at a destination (Richard's jousting
  // steed at the Tourney Grounds) — it renders only while visiting there,
  // standing on the bake's real terrain
  const destination = useGameStore((s) => s.destination);

  useFrame((_, dt) => {
    const s = mob;
    const g = group.current;
    if (!g) return;
    // ridden by the player, or (K54) assigned out from the stable to a
    // defender — either way this instance stops wandering the meadow,
    // because the horse is now being drawn under whoever rides it
    if (s.mounted || riddenByAlly(s.id)) {
      g.visible = false;
      return;
    }
    g.visible = true;
    if (s.pause > 0) {
      s.pause -= dt;
      if (gaitRef.current !== 0) { gaitRef.current = 0; setGaitSpeed(0); }
    } else {
      const dx = s.tx - s.x;
      const dz = s.tz - s.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) {
        s.pause = 6 + Math.random() * 10; // graze a while
        const a = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * 9;
        s.tx = s.homeX + Math.cos(a) * r;
        s.tz = s.homeZ + Math.sin(a) * r;
      } else {
        const speed = 0.9;
        if (gaitRef.current !== speed) { gaitRef.current = speed; setGaitSpeed(speed); }
        s.x += (dx / d) * speed * dt;
        s.z += (dz / d) * speed * dt;
        const desired = Math.atan2(dx, dz);
        let diff = desired - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * Math.min(1, dt * 3);
      }
    }
    s.soundIn -= dt;
    if (s.soundIn <= 0) {
      s.soundIn = 14 + Math.random() * 22;
      const v = distVol(s.x, s.z);
      if (v > 0.05) audio.play(Math.random() < 0.4 ? 'whinny' : 'graze', v * 0.7);
    }
    g.position.set(s.x, world ? sampleTemplateGroundY(s.x, s.z) : 0, s.z);
    g.rotation.y = s.yaw;
  });

  if ((world ?? null) !== (destination ?? null)) return null;
  return (
    <group ref={group}>
      <Suspense fallback={null}>
        <RiggedProp assetId={assetId} height={1.7} gaitSpeed={gaitSpeed} />
      </Suspense>
    </group>
  );
}

function Falcon() {
  const model = useNormalizedProp(`${C}/l254600.glb`, 0.9);
  const instance = useMemo(() => {
    const c = model.clone(true);
    liftBlackMaterials(c, 0x5a4a38); // warm raptor brown
    return c;
  }, [model]);
  const group = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 100);
  const soundIn = useRef(15);
  // Wave 13 · once tamed (PlayerController's 'call_falcon' interact, in range
  // of game/falcon.ts's own live position and offered only while untamed)
  // the bird stops circling the world origin and circles the PLAYER instead
  // — the only behavior change taming makes. See game/falcon.ts's header for
  // why the tamed flag itself is read straight from the store rather than
  // mirrored into a leaf module the way ridingState.active is.
  const tamed = useGameStore((s) => s.falconTamed);
  const pingIn = useRef(30 + Math.random() * 20);
  const lastPinged = useRef<string | null>(null);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // day bird: fades out at night by dropping below the horizon... simpler:
    // hide. A tamed companion stays with you regardless of the hour — beyond
    // the flight path itself, the one other visible sign this is no longer
    // the ambient bird.
    g.visible = tamed || worldEnv.night < 0.6;
    if (!g.visible) return;
    if (tamed) {
      // a tight, quick orbit a couple of metres over your head, distinct
      // from the wild bird's slow wide loop
      t.current += dt * 0.55;
      const r = 4.4;
      const x = playerState.x + Math.cos(t.current) * r;
      const z = playerState.z + Math.sin(t.current) * r;
      const y = playerState.y + 3.4 + Math.sin(t.current * 2.1) * 0.5;
      g.position.set(x, y, z);
      g.rotation.y = -t.current - Math.PI / 2;
      g.rotation.z = 0.22;
      falconPos.x = x; falconPos.y = y; falconPos.z = z;
    } else {
      t.current += dt * 0.14;
      const r = 34;
      const x = Math.cos(t.current) * r;
      const z = Math.sin(t.current) * r + 8;
      const y = 24 + Math.sin(t.current * 2.3) * 3;
      g.position.set(x, y, z);
      g.rotation.y = -t.current - Math.PI / 2;
      g.rotation.z = 0.25; // bank into the circle
      falconPos.x = x; falconPos.y = y; falconPos.z = z;
    }
    soundIn.current -= dt;
    if (soundIn.current <= 0) {
      soundIn.current = 18 + Math.random() * 25;
      audio.play('falcon', 0.3);
    }
    // Wave 13 · the one real benefit of taming: every 45-75s it calls out
    // over the nearest un-worked resource node within range that it hasn't
    // just pointed at — genuinely useful away from home, where Minimap.tsx
    // draws no resource nodes at all, and ambient flavor at the homestead,
    // where it already does. A one-off imperative getState() read, not a
    // subscription — this runs every frame and st.nodes changes on every
    // respawn, which would otherwise re-render the whole component for
    // nothing (the same reason PlayerController's own frame loop reads the
    // store this way instead of via a hook).
    if (tamed) {
      pingIn.current -= dt;
      if (pingIn.current <= 0) {
        pingIn.current = 45 + Math.random() * 30;
        const st = useGameStore.getState();
        const world = st.destination ?? null;
        let best: (typeof st.nodes)[number] | null = null;
        let bestD = FALCON_SPOT_RANGE;
        for (const n of st.nodes) {
          if (n.respawnAt !== null) continue;
          if ((n.world ?? null) !== world) continue;
          if (n.id === lastPinged.current) continue;
          // don't point at a ground beyond the player's own deed — a find
          // they can look at but not touch reads as a tease, not a gift
          const gr = n.ground ? GROUND_BY_ID[n.ground] : null;
          if (gr && !groundOpen(gr, st.landTier)) continue;
          const d = Math.hypot(n.x - playerState.x, n.z - playerState.z);
          if (d < bestD) { bestD = d; best = n; }
        }
        if (best) {
          lastPinged.current = best.id;
          st.notify(`Your falcon circles over ${falconSpotLabel(best)}, ${Math.round(bestD)}m off.`);
        }
      }
    }
  });

  return (
    <group ref={group}>
      <primitive object={instance} />
    </group>
  );
}

function Bat({ seed }: { seed: number }) {
  const model = useNormalizedProp(`${C}/l3010300.glb`, 0.5);
  const instance = useMemo(() => {
    const c = model.clone(true);
    liftBlackMaterials(c, 0x2e2a33); // cool near-black, still reads at night
    return c;
  }, [model]);
  const group = useRef<THREE.Group>(null);
  const t = useRef(seed * 17.3);
  const soundIn = useRef(8 + seed * 6);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.visible = worldEnv.night > 0.62;
    if (!g.visible) return;
    t.current += dt * (0.9 + seed * 0.25);
    const cx = -12 + seed * 14;
    const cz = -18 + seed * 9;
    const r = 7 + seed * 4;
    g.position.set(
      cx + Math.cos(t.current) * r,
      5.5 + Math.sin(t.current * 3.1) * 1.6 + seed,
      cz + Math.sin(t.current) * r,
    );
    g.rotation.y = -t.current;
    soundIn.current -= dt;
    if (soundIn.current <= 0) {
      soundIn.current = 10 + Math.random() * 18;
      const v = distVol(g.position.x, g.position.z, 26);
      if (v > 0.05) audio.play('bat', v * 0.5);
    }
  });

  return (
    <group ref={group}>
      <primitive object={instance} />
    </group>
  );
}

export default function Wildlife() {
  return (
    <Suspense fallback={null}>
      {/* the west meadow herd. The rig lab charted six rideable horses
          (`traits.mount.mountFamily: 'horse'`, all `canSeat`) where the game
          only ever shipped two — the saddled/barded variants below were
          sitting unused in the extraction. Cedric's two red-masked chargers
          are deliberately NOT here: the lab tags them `faction: 'cedric'`,
          so they belong at his camp, not grazing outside your homestead. */}
      <Horse id="horse0" url={`${C}/l7339200.glb`} home={[-50, 8]} />
      <Horse id="horse1" url={`${C}/l7339211.glb`} home={[-42, 20]} />
      <Horse id="horse3" url={`${L}/l7339212.glb`} home={[-58, 18]} />
      <Horse id="horse4" url={`${L}/l7339221.glb`} home={[-46, -4]} />
      {/* Richard's jousting steed, stabled at the Tourney Grounds (Phase 20) */}
      <Horse id="horse2" url={`${C}/l7339200.glb`} home={[1285, 915]} world="template-02" />
      <Falcon />
      <Bat seed={0} />
      <Bat seed={1} />
      <Bat seed={2} />
    </Suspense>
  );
}
