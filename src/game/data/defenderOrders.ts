// The standing orders, and the one place that gives them.
//
// Split out of the old CommandWheel panel so the radial (a DOM overlay), the
// keybind handler (GameScreen) and anything else can all agree on the list
// and the effect without importing a React component.
import { defenderOrders, defenderState, scoutReported, type DefenderOrder } from '../defenders';
import { useGameStore, type GameState } from '../store/gameStore';
import { playerState } from '../playerState';
import { homeGroundY } from '../homeGround';
import { lookPoint } from '../rally';
import { navBlocked, navReachable } from '../navgrid';
import { EYE_HEIGHT } from './world';
import { HOME_X, HOME_Z } from './villagers';
import { audio } from '@/lib/audio';

interface OrderDef {
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
  // G-08
  { id: 'rally', icon: '📍', label: 'Rally Here', desc: 'Hold the ground you are looking at; fight what comes within reach.' },
];

/** how far off a solid he stands on (a wall, a tower he is posted up on) a defender is looked for open ground */
const STEP_OFF = 4;

/** Where a defender's way to `at` is measured from: where he stands — or, posted up on a keep's wall or a tower, a
 *  solid that the grid measures from whichever open cell lies nearest (outside the ring, for a guard on its wall), the
 *  first open ground straight from him toward the point: where he steps down off it, as navSteer steers him straight
 *  where the grid has no plan for him (Defenders.tsx's rally walk). */
function wayStart(d: { x: number; z: number }, at: { x: number; z: number }): { x: number; z: number } {
  if (!navBlocked(d.x, d.z)) return d;
  const len = Math.hypot(at.x - d.x, at.z - d.z) || 1;
  for (let t = 0.5; t <= Math.min(len, STEP_OFF); t += 0.5) {
    const x = d.x + ((at.x - d.x) / len) * t, z = d.z + ((at.z - d.z) / len) * t;
    if (!navBlocked(x, z)) return { x, z };
  }
  return d;
}

/** G-08 · the rally point a rally order plants: where the player looks (game/rally.ts's lookPoint), or why not — the
 *  defenders hold the homestead alone, a point inside something that stands (a shut wall, a building: the home grid's
 *  solids) has no ground to hold, and one that no defender who will rally has a way to across the grid (a ring of shut
 *  walls about it) is out of their reach. One the Roster keeps on an order of his own stays on it, so his way there
 *  counts for nothing — unless none will rally, when every defender's counts (the point stands for whoever the Roster
 *  sends to it later); a guard posted up is measured from where he steps down (wayStart). A point beyond a shut wall
 *  that the grid has a way to is theirs: they walk it round. */
export function plantRally(st: GameState): { x: number; z: number } | string {
  if (st.destination) return 'Your defenders hold the homestead — rally them there.';
  const at = lookPoint({ x: playerState.x, y: playerState.y + EYE_HEIGHT, z: playerState.z }, playerState.yaw, playerState.pitch, homeGroundY);
  if (navBlocked(at.x, at.z)) return 'Nothing to hold there — look at open ground to rally the defenders.';
  const sworn = st.villagers.filter((v) => v.job === 'defender');
  const rallying = sworn.filter((v) => (defenderOrders.overrides[v.id] ?? 'rally') === 'rally');
  const from = (rallying.length ? rallying : sworn).map((v) => defenderState[v.id] ?? { x: HOME_X, z: HOME_Z });
  const hasWay = (d: { x: number; z: number }) => { const s = wayStart(d, at); return navReachable(s.x, s.z, at.x, at.z); };
  if (from.length && !from.some(hasWay)) return 'Your defenders have no way to there.';
  return at;
}

export const DEFENDER_ORDER_COUNT = DEFENDER_ORDERS.length;

/** give the order in slot `index` — the radial's sector, clockwise from top */
export function giveDefenderOrder(index: number) {
  const def = DEFENDER_ORDERS[index];
  if (!def) return;
  const st = useGameStore.getState();
  if (def.id === 'rally') {
    const at = plantRally(st);
    if (typeof at === 'string') { st.notify(at); return; }
    defenderOrders.rally = at;
  }
  defenderOrders.order = def.id;
  defenderOrders.targetId = null;
  if (def.id === 'scout') scoutReported.clear();
  audio.play('horn', 0.5);
  const n = st.villagers.filter((v) => v.job === 'defender').length;
  st.notify(n
    ? `Order given: ${def.label}`
    : 'You have no defenders to command — assign one in the Roster (N).');
}

/** Wave 23 — a single defender's own standing order, set from their roster
 *  card rather than the fleet-wide radial. Picking the order the fleet is
 *  ALREADY standing is how you rejoin it: no separate "clear override"
 *  control, since that button already reads as "on" whenever there is no
 *  override (see `orderFor`). A fleet-wide radial call deliberately never
 *  touches this map — an archer dedicated to Scout stays scouting through a
 *  horn call, the same independence Loadout/Station/Shift already have. */
export function setDefenderOrder(villagerId: string, orderId: DefenderOrder) {
  if (orderId === defenderOrders.order) delete defenderOrders.overrides[villagerId];
  else defenderOrders.overrides[villagerId] = orderId;
}
