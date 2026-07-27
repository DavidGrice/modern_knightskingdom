'use client';
// Day/night cycle: advances the world clock, drives the sun arc, moonlight,
// ambient light, fog and (via worldEnv) the sky tint, stars, wildlife and
// ambience mood. Rain from the weather system dims everything.
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { worldEnv, nightFactor, sampleEnv, seasonOf } from '@/game/env';
import { audio } from '@/lib/audio';

export default function DayNight() {
  const shadows = useAppStore((s) => s.settings.shadows);
  const scene = useThree((s) => s.scene);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const amb = useRef<THREE.AmbientLight>(null);
  const syncTimer = useRef(0);

  useFrame((_, dt) => {
    const st = useGameStore.getState();
    worldEnv.dayLength = Math.max(120, (useAppStore.getState().settings.dayLengthMin || 12) * 60);
    if (!st.paused && worldEnv.running) {
      const next = (worldEnv.time + dt / worldEnv.dayLength) % 1;
      if (next < worldEnv.time) worldEnv.dayCount += 1; // wrapped past midnight
      worldEnv.time = next;
    }
    const season = seasonOf(worldEnv.dayCount);
    worldEnv.night = nightFactor(worldEnv.time, season === 3 ? 0.12 : 0);
    worldEnv.flash = Math.max(0, worldEnv.flash - dt * 3.2);

    const env = sampleEnv(worldEnv.time);
    const rainDim = 1 - worldEnv.rain * 0.45;
    const flash = worldEnv.flash;

    if (sun.current) {
      const ang = (worldEnv.time - 0.25) * Math.PI * 2; // 0 at dawn, π at dusk
      const elev = Math.sin(ang);
      const az = Math.cos(ang);
      sun.current.position.set(az * 70, Math.max(elev, 0.03) * 80 + 4, 28);
      sun.current.intensity = env.sunI * rainDim + flash * 2.5;
      sun.current.color.setRGB(env.sun[0], env.sun[1], env.sun[2]);
      sun.current.castShadow = shadows && elev > 0.03;
    }
    if (moon.current) {
      moon.current.intensity = worldEnv.night * 0.4 * rainDim;
      moon.current.position.set(-40, 55, -35);
    }
    if (amb.current) {
      const nightVision = worldEnv.nightVisionUntil > performance.now() ? 0.5 : 0;
      amb.current.intensity = env.ambI * rainDim + flash * 1.4 + nightVision;
      amb.current.color.setRGB(env.amb[0], env.amb[1], env.amb[2]);
    }
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.color.setRGB(env.fog[0] * rainDim + flash * 0.4, env.fog[1] * rainDim + flash * 0.4, env.fog[2] * rainDim + flash * 0.4);
      // a mist spell pulls visibility in much closer than rain does — a
      // proper low-visibility weather state, not just rain's light haze
      fog.near = 150 - worldEnv.rain * 90 - worldEnv.mist * 110;
      fog.far = 460 - worldEnv.rain * 220 - worldEnv.mist * 340;
    }

    audio.nightMode = worldEnv.night > 0.6;

    // low-frequency sync of the clock + season into the store (HUD + saves)
    syncTimer.current -= dt;
    if (syncTimer.current <= 0) {
      syncTimer.current = 2;
      if (Math.abs(st.timeOfDay - worldEnv.time) > 0.002) st.setTimeOfDay(worldEnv.time);
      if (st.dayCount !== worldEnv.dayCount) st.setDayCount(worldEnv.dayCount);
      if (st.season !== season) st.setSeason(season);
    }
  });

  return (
    <>
      <fog attach="fog" args={['#bcd6e8', 150, 460]} />
      <ambientLight ref={amb} intensity={0.75} color="#dfe8ff" />
      <directionalLight
        ref={sun}
        position={[45, 70, 25]}
        intensity={2.1}
        color="#fff2d8"
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-far={440}
        shadow-bias={-0.0004}
      />
      <directionalLight ref={moon} position={[-40, 55, -35]} intensity={0} color="#8fa8d8" />
    </>
  );
}
