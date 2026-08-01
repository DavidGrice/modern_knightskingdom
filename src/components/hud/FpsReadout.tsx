'use client';
// Requested 2026-07-31: wires up Settings.showFps, which existed with zero
// consumers anywhere. Polls the fpsMeter leaf module on an interval — same
// "written every frame by the R3F loop, read by DOM HUD code" convention
// Vitals.tsx already uses for combatState/playerState.
import { useEffect, useState } from 'react';
import { useAppStore } from '@/game/store/appStore';
import { fpsMeter } from '@/game/fpsMeter';

export default function FpsReadout() {
  const showFps = useAppStore((s) => s.settings.showFps);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!showFps) return;
    const t = setInterval(() => setFps(Math.round(fpsMeter.value)), 250);
    return () => clearInterval(t);
  }, [showFps]);

  if (!showFps) return null;
  return <div className="kk-fps-readout">{fps} FPS</div>;
}
