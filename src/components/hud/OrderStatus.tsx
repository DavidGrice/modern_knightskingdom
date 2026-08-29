'use client';
// Wave 23 · a small, always-on reminder of the standing defender order(s) —
// until now the only feedback a player got was giveDefenderOrder()'s one-shot
// toast, gone the moment it faded. Mirrors FortStatus's own shape exactly
// (a `kk-clock kk-glass` chip in the top-right cluster, polled at a 500ms
// throttle against a mutable leaf module, hidden via early-return when it
// has nothing worth saying).
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { defenderOrders, orderFor } from '@/game/defenders';
import { DEFENDER_ORDERS } from '@/game/data/defenderOrders';
import Ico from '../ui/Ico';

export default function OrderStatus() {
  const destination = useGameStore((s) => s.destination);
  const villagers = useGameStore((s) => s.villagers);
  const [, setTick] = useState(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last.current < 500) return;
      last.current = now;
      setTick((n) => n + 1);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const defenders = villagers.filter((v) => v.job === 'defender');
  // away from the homestead, or nobody sworn to defend it — nothing to report
  if (destination || defenders.length === 0) return null;

  const fleetDef = DEFENDER_ORDERS.find((o) => o.id === defenderOrders.order)!;
  const strays = defenders.filter((v) => orderFor(v.id) !== defenderOrders.order);

  return (
    <div
      className="kk-clock kk-glass"
      title={strays.length
        ? `Fleet order: ${fleetDef.label}. On their own: ${strays.map((v) => `${v.name} (${DEFENDER_ORDERS.find((o) => o.id === orderFor(v.id))?.label})`).join(', ')}`
        : `All ${defenders.length} defender${defenders.length === 1 ? '' : 's'} standing this order.`}
    >
      <Ico e={fleetDef.icon} size={13} />
      {fleetDef.label}{strays.length ? ` · ${strays.length} on own orders` : ''}
    </div>
  );
}
