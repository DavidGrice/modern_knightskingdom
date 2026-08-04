'use client';
// Weather: occasional rain spells with a particle field around the camera,
// the original rain loop, and lightning flashes with the storm sound. Rain
// also makes the fish bite (see PlayerController). In winter the same spell
// and particle system renders as snow instead (recolored, larger, slower
// fall, no lightning) — a separate, independent "mist" spell (Phase 15)
// pulls in `scene.fog`'s near/far distance (see DayNight.tsx) for a proper
// low-visibility weather state, with no particles of its own.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { worldEnv, seasonOf } from '@/game/env';
import { audio } from '@/lib/audio';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { GRAPHICS_PROFILES } from '@/game/graphicsProfiles';

const COUNT = 900;
const AREA = 44;
const HEIGHT = 26;

/** A soft vertical streak (rain) or soft round disc (snow) drawn once to a
 *  canvas and cached as a texture — requested 2026-08-04, replacing
 *  THREE.PointsMaterial's plain default square/round sprite with something
 *  that actually reads as a raindrop. THREE.Points always billboards to
 *  face the camera, so a streak looks right from most normal play angles
 *  without needing per-particle stretching along the real fall direction —
 *  a deliberately cheap approximation, not a physically exact one. */
function makeStreakTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(8, 32, 3, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
function makeDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 32;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export default function Weather() {
  const camera = useThree((s) => s.camera);
  const destination = useGameStore((s) => s.destination);
  const points = useRef<THREE.Points>(null);
  const mat = useRef<THREE.PointsMaterial>(null);
  const changeTimer = useRef(45 + Math.random() * 90);
  const boltTimer = useRef(10);
  const lastSnowing = useRef(false);
  const rainTexture = useMemo(makeStreakTexture, []);
  const snowTexture = useMemo(makeDiscTexture, []);

  // every instance is its own weather entity — arriving anywhere (including
  // back home) snaps to clear skies and re-rolls fresh, so a homestead storm
  // never rides along to another realm
  useEffect(() => {
    worldEnv.raining = false;
    worldEnv.misting = false;
    worldEnv.rain = 0;
    worldEnv.mist = 0;
    audio.setLoop('rain', 0);
    changeTimer.current = 50 + Math.random() * 100;
  }, [destination]);

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * AREA;
      arr[i * 3 + 1] = Math.random() * HEIGHT;
      arr[i * 3 + 2] = (Math.random() - 0.5) * AREA;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    const paused = useGameStore.getState().paused;
    const snowing = seasonOf(worldEnv.dayCount) === 3; // winter reskins the same precip spell as snow
    if (!paused) {
      // weather spell state machine: clear, precip (rain/snow), or mist —
      // one at a time, kept simple rather than letting them overlap
      changeTimer.current -= dt;
      if (changeTimer.current <= 0) {
        if (worldEnv.raining) {
          worldEnv.raining = false;
          changeTimer.current = 140 + Math.random() * 220; // clear spell
        } else if (worldEnv.misting) {
          worldEnv.misting = false;
          changeTimer.current = 140 + Math.random() * 220;
        } else {
          const roll = Math.random();
          if (roll < 0.45) {
            worldEnv.raining = true;
            changeTimer.current = 45 + Math.random() * 75; // precip spell
          } else if (roll < 0.65) {
            worldEnv.misting = true;
            changeTimer.current = 50 + Math.random() * 70; // mist spell
          } else {
            changeTimer.current = 60 + Math.random() * 90;
          }
        }
      }
      const rainTarget = worldEnv.raining ? 1 : 0;
      worldEnv.rain += (rainTarget - worldEnv.rain) * Math.min(1, dt * 0.35);
      if (Math.abs(worldEnv.rain - rainTarget) < 0.01) worldEnv.rain = rainTarget;
      const mistTarget = worldEnv.misting ? 1 : 0;
      worldEnv.mist += (mistTarget - worldEnv.mist) * Math.min(1, dt * 0.25);
      if (Math.abs(worldEnv.mist - mistTarget) < 0.01) worldEnv.mist = mistTarget;

      audio.setLoop('rain', snowing ? 0 : worldEnv.rain * 0.45); // snowfall is silent

      // lightning during heavy rain only — not a snowstorm
      if (!snowing && worldEnv.rain > 0.65) {
        boltTimer.current -= dt;
        if (boltTimer.current <= 0) {
          worldEnv.flash = 1;
          audio.play('lightning', 0.85);
          boltTimer.current = 7 + Math.random() * 16;
        }
      }
    }

    // particle update — reskinned as snow in winter (paler, bigger, slower)
    const p = points.current;
    const m = mat.current;
    if (!p || !m) return;
    if (snowing !== lastSnowing.current) {
      lastSnowing.current = snowing;
      m.map = snowing ? snowTexture : rainTexture;
      m.needsUpdate = true;
    }
    m.opacity = worldEnv.rain * (snowing ? 0.85 : 0.55);
    m.color.set(snowing ? '#f4f8ff' : '#a8c0d8');
    m.size = snowing ? 0.16 : 0.22;
    p.visible = worldEnv.rain > 0.02;
    if (!p.visible) return;
    // Requested 2026-08-04 ("streamline for all devices"): this system ran
    // the same fixed 900-particle field at every quality tier, the one
    // real per-frame render cost Weather.tsx had that graphicsProfiles.ts
    // didn't already scale. setDrawRange, not a buffer reallocation — so
    // switching tiers mid-session (Options) takes effect immediately with
    // no re-mount/re-generate cost.
    const profile = GRAPHICS_PROFILES[useAppStore.getState().settings.graphicsQuality];
    const activeCount = Math.max(1, Math.round(COUNT * profile.particleDensity));
    p.geometry.setDrawRange(0, activeCount);
    p.position.set(camera.position.x, 0, camera.position.z);
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const fall = (snowing ? 5 : 21) * dt;
    for (let i = 0; i < activeCount; i++) {
      let y = arr[i * 3 + 1] - fall;
      if (y < 0) y += HEIGHT;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={mat}
        map={rainTexture}
        color="#a8c0d8"
        size={0.22}
        transparent
        opacity={0}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
