'use client';
// Requested 2026-07-31: samples every frame, written into the fpsMeter leaf
// module (game/fpsMeter.ts) — HUD.tsx (a DOM overlay, not inside the Canvas)
// polls it on an interval, same convention Vitals.tsx already uses for
// combatState/playerState. A normal (priority-0) useFrame subscriber — does
// not participate in PostProcessing.tsx's manual-render takeover, just reads
// `dt` alongside whatever else already runs that frame.
import { useFrame } from '@react-three/fiber';
import { sampleFrame } from '@/game/fpsMeter';

export default function FpsMeter() {
  useFrame((_, dt) => {
    sampleFrame(dt);
  });
  return null;
}
