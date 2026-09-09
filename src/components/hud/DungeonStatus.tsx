'use client';
// A small HUD readout while inside the Sealed Crypt (Phase 17): rooms
// cleared out of the total. `dungeonState.layout` is a plain mutable object
// (not store/React state, see game/dungeon.ts), so this polls it on a
// requestAnimationFrame throttle the same way Minimap.tsx already does for
// its own non-Canvas, non-reactive reads.
import { useEffect, useRef, useState } from 'react';
import { dungeonState } from '@/game/dungeon';

export default function DungeonStatus() {
  const [text, setText] = useState<string | null>(null);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last.current < 250) return;
      last.current = now;
      const layout = dungeonState.layout;
      if (!layout) { setText(null); return; }
      const cleared = layout.rooms.filter((r) => r.cleared).length;
      let text = `Sealed Crypt — ${cleared}/${layout.rooms.length} chambers cleared`;
      // Wave 48 (B9) · small additions for the two new objectives, same
      // 250ms-throttled poll — generalizes for free once `cleared` is set
      // correctly by both (see dungeon.ts/Enemies.tsx), these two are just
      // the mid-attempt prompts the base line alone doesn't convey.
      for (const room of layout.rooms) {
        if (room.objective === 'survive' && room.surviveDeadline > 0 && !room.cleared) {
          const remaining = Math.max(0, Math.ceil((room.surviveDeadline - Date.now()) / 1000));
          text += ` — Hold the line! ${remaining}s`;
        } else if (room.objective === 'escort' && room.captiveFreed && !room.cleared) {
          text += ' — Lead the captive to the entrance!';
        }
      }
      setText(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!text) return null;
  return (
    <div className="rank-badge" style={{ minWidth: 0, padding: '7px 14px', display: 'inline-block' }}>
      <span style={{ fontSize: 14 }}>🗝️ {text}</span>
    </div>
  );
}
