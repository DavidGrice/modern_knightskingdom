'use client';
// A small HUD readout while inside the Endless Arena (requested 2026-08-03):
// active environment, live kill count, next reward threshold. arenaState is
// a plain mutable object (game/arena.ts), not store/React state, so this
// polls it on a requestAnimationFrame throttle — the same pattern
// DungeonStatus.tsx already uses for its own non-Canvas, non-reactive read.
import { useEffect, useRef, useState } from 'react';
import { arenaState, ARENA_ENV_BY_ID, ARENA_MILESTONES } from '@/game/arena';

export default function ArenaHud() {
  const [text, setText] = useState<string | null>(null);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last.current < 250) return;
      last.current = now;
      if (!arenaState.active || !arenaState.env) { setText(null); return; }
      const env = ARENA_ENV_BY_ID[arenaState.env];
      const next = ARENA_MILESTONES.find((m) => m > arenaState.kills);
      setText(`${env.name} — ${arenaState.kills} kills${next ? ` (next reward at ${next})` : ''}`);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!text) return null;
  return (
    <div className="rank-badge" style={{ minWidth: 0, padding: '7px 14px', display: 'inline-block' }}>
      <span style={{ fontSize: 14 }}>⚔️ {text}</span>
    </div>
  );
}
