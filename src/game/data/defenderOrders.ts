// The four standing orders, and the one place that gives them.
//
// Split out of the old CommandWheel panel so the radial (a DOM overlay), the
// keybind handler (GameScreen) and anything else can all agree on the list
// and the effect without importing a React component.
import { defenderOrders, scoutReported, type DefenderOrder } from '../defenders';
import { useGameStore } from '../store/gameStore';
import { audio } from '@/lib/audio';

export interface OrderDef {
  id: DefenderOrder;
  icon: string;
  label: string;
  desc: string;
}

export const DEFENDER_ORDERS: OrderDef[] = [
  { id: 'patrol', icon: '🛡️', label: 'Patrol', desc: 'Walk the rounds; engage hostiles on sight.' },
  { id: 'attack', icon: '⚔️', label: 'Attack!', desc: 'Converge on the nearest threat to you.' },
  { id: 'scout', icon: '👁️', label: 'Scout', desc: 'Sweep the homestead wide and call out hostiles.' },
  { id: 'follow', icon: '🚩', label: 'Follow Me', desc: 'Form up behind you and guard your back.' },
];

export const DEFENDER_ORDER_COUNT = DEFENDER_ORDERS.length;

/** give the order in slot `index` — the radial's sector, clockwise from top */
export function giveDefenderOrder(index: number) {
  const def = DEFENDER_ORDERS[index];
  if (!def) return;
  const st = useGameStore.getState();
  defenderOrders.order = def.id;
  defenderOrders.targetId = null;
  if (def.id === 'scout') scoutReported.clear();
  audio.play('horn', 0.5);
  const n = st.villagers.filter((v) => v.job === 'defender').length;
  st.notify(n
    ? `Order given: ${def.label}`
    : 'You have no defenders to command — assign one in the Roster (N).');
}
