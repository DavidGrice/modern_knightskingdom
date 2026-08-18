'use client';
// Wave 16 phase 1 — Canvas-side sampler for the frame-profiling overlay.
// Mirrors FpsMeter.tsx exactly: a normal (priority-0) useFrame subscriber,
// runs before PostProcessing.tsx's priority-1 callback each frame (see
// perfMeter.ts's header for why that ordering matters), writes into the
// perfMeter leaf module, renders nothing.
import { useFrame, useThree } from '@react-three/fiber';
import { samplePerfFrame } from '@/game/perfMeter';

export default function PerfMeter() {
  const { gl } = useThree();
  useFrame(() => {
    samplePerfFrame(gl);
  });
  return null;
}
