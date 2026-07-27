'use client';
// I41 · The order radial. Held open with the tactics key, steered by the
// mouse WITHOUT releasing pointer lock, committed on release.
//
// The panel it replaces had two problems: its text ran outside the fixed
// 180px tiles, and every open/close cycle released and re-acquired the
// pointer, which punched a hole in mouse-look twice for a routine order.
// A radial fixes both — each sector sizes to its own copy, and the pointer
// is never handed back to the browser.
import { useEffect, useState } from 'react';
import { commandWheel } from '@/game/commandWheel';
import { DEFENDER_ORDERS } from '@/game/data/defenderOrders';
import { useGameStore } from '@/game/store/gameStore';
import Ico from '../ui/Ico';

const RADIUS = 128;

export default function OrderRadial() {
  const defenders = useGameStore((s) => s.villagers).filter((v) => v.job === 'defender');
  const [state, setState] = useState({ open: false, choice: -1 });

  useEffect(() => {
    // the wheel is a mutable leaf module written by the mouse handler, so
    // poll it rather than trying to make the input path re-render React
    const t = setInterval(() => {
      setState((prev) => (prev.open === commandWheel.open && prev.choice === commandWheel.choice
        ? prev
        : { open: commandWheel.open, choice: commandWheel.choice }));
    }, 40);
    return () => clearInterval(t);
  }, []);

  if (!state.open) return null;
  const n = DEFENDER_ORDERS.length;

  return (
    <div className="kk-radial">
      <div className="kk-radial-hub">
        <div className="kk-radial-hub-title">
          {state.choice >= 0 ? DEFENDER_ORDERS[state.choice].label : 'Orders'}
        </div>
        <div className="kk-radial-hub-desc">
          {state.choice >= 0
            ? DEFENDER_ORDERS[state.choice].desc
            : defenders.length
              ? `Flick toward an order · ${defenders.length} defender${defenders.length === 1 ? '' : 's'}`
              : 'No defenders sworn — assign one in the Roster (N)'}
        </div>
      </div>
      {DEFENDER_ORDERS.map((o, i) => {
        // sector 0 at the top, running clockwise — matches steerWheel
        const a = (i / n) * Math.PI * 2;
        const x = Math.sin(a) * RADIUS;
        const y = -Math.cos(a) * RADIUS;
        return (
          <div
            key={o.id}
            className={`kk-radial-slice ${state.choice === i ? 'on' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
          >
            <Ico e={o.icon} size={26} />
            <span>{o.label}</span>
          </div>
        );
      })}
    </div>
  );
}
