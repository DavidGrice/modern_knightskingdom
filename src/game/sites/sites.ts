// Wave 67 (G-36) · Socket sites.
//
// The Grand Keep was the game's one socket model: a foundation with named sockets (data/keep.ts), each taking a piece
// you raise, hammer up and see battered down. Everything that read it assumed there was one — `st.keep`, laid out by
// KEEP_SOCKETS around an origin that never turned. A bandit stronghold, a settlement's town plan and the Rival Castle's
// breakable sections are the same thing in other places, so the keep is now one SITE among many: an id, the world it
// stands in, an origin and a turn, a layout, and what stands on each socket.
//
// The home keep is site 'keep', and it is still `st.keep`: its save shape is the one every save already holds, and a
// save written before sites existed loads as it was. Every other site lives in `st.sites` (saved as `sites`). Reading
// a site goes through siteById / sitesIn, which see the keep as a site; writing one goes through siteWrite, which puts
// a change back where that site lives — so the keep's record never takes a site's own fields (id, world, layout).
//
// Leaf module: types and data only (no store import), so the store's slices can use it.
import {
  KEEP_PART_BY_ID, KEEP_SIZE, KEEP_SOCKETS, SOCKET_BY_ID, WALK_CORNER_HALF, WALK_DEEP_HALF, WALK_RUN_HALF,
  type KeepSocket, type KeepState, type SocketKind,
} from '../data/keep';

/** a site's ground plan: its named sockets, and the size of the square plate they stand on */
interface SiteLayout {
  sockets: KeepSocket[];
  byId: Record<string, KeepSocket>;
  size: number;
}

/** every layout a site can be laid out to. The Grand Keep's is the keep's own socket ring. */
export const SITE_LAYOUTS = {
  grandKeep: { sockets: KEEP_SOCKETS, byId: SOCKET_BY_ID, size: KEEP_SIZE },
} satisfies Record<string, SiteLayout>;

export type SiteLayoutId = keyof typeof SITE_LAYOUTS;

/** a socket site: what stands on its sockets (the same record a keep is), and where it is laid out */
export interface SocketSite extends KeepState {
  id: string;
  /** the template world it stands in; null = the homestead (the PlacedBuilding convention) */
  world: string | null;
  /** the layout's turn about its origin, radians, the way three's rotation-y turns a group; absent = 0 */
  rot?: number;
  layout: SiteLayoutId;
}

/** the home keep's site id: the site `st.keep` holds */
export const KEEP_SITE_ID = 'keep';

/** what the site helpers read: the store's keep and its other sites */
interface SiteHolder {
  keep: KeepState | null;
  sites: SocketSite[];
}

/** the home keep seen as a site. It never turns yet: OPEN-023 (the player turning the keep) would store a `rot` on
 *  KeepState, and every reader that goes through siteSocketWorld follows it. */
function keepSite(keep: KeepState): SocketSite {
  return { ...keep, id: KEEP_SITE_ID, world: null, layout: 'grandKeep' };
}

export function siteById(st: SiteHolder, id: string): SocketSite | null {
  if (id === KEEP_SITE_ID) return st.keep ? keepSite(st.keep) : null;
  return st.sites.find((s) => s.id === id) ?? null;
}

/** every site standing in `world` (null = the homestead), the home keep first */
export function sitesIn(st: SiteHolder, world: string | null): SocketSite[] {
  const out = world === null && st.keep ? [keepSite(st.keep)] : [];
  for (const s of st.sites) if ((s.world ?? null) === world) out.push(s);
  return out;
}

/** the state patch that writes `change` onto site `id`, wherever it lives — `st.keep` for the home keep, so its record
 *  keeps exactly the shape (and key order) it always had */
export function siteWrite(st: SiteHolder, id: string, change: Partial<KeepState>): Partial<SiteHolder> {
  if (id === KEEP_SITE_ID) return st.keep ? { keep: { ...st.keep, ...change } } : {};
  return { sites: st.sites.map((s) => (s.id === id ? { ...s, ...change } : s)) };
}

export function siteSockets(site: Pick<SocketSite, 'layout'>): KeepSocket[] {
  return SITE_LAYOUTS[site.layout].sockets;
}

export function siteSocket(site: Pick<SocketSite, 'layout'>, socketId: string): KeepSocket | null {
  return SITE_LAYOUTS[site.layout].byId[socketId] ?? null;
}

/** G-05 · the first piece lying in ruins on a site in `world` (null = the homestead), and where it stands: the
 *  builders' work once no building site is waiting (villagerSlice.ts's builder pass, Villagers.tsx's walk to it) */
export function siteRuinIn(st: SiteHolder, world: string | null): { site: string; socket: string; x: number; z: number } | null {
  for (const site of sitesIn(st, world)) {
    for (const sock of siteSockets(site)) {
      if (!site.ruined?.[sock.id] || !site.parts[sock.id]) continue;
      const at = siteSocketWorld(site, sock.id)!;
      return { site: site.id, socket: sock.id, x: at.x, z: at.z };
    }
  }
  return null;
}

/** the site is "finished" once every socket carries a completed piece */
export function siteComplete(site: SocketSite): boolean {
  return siteSockets(site).every((s) => site.parts[s.id] && (site.built[s.id] ?? 0) >= 1);
}

/** the ground a socket's piece covers, as half extents along its own length and across it: a corner (and the bailey)
 *  4 m square, a wall run 8 m by 2.4 — the footprints fort.ts's seal stamped */
const FOOTPRINT: Record<SocketKind, [number, number]> = {
  corner: [WALK_CORNER_HALF, WALK_CORNER_HALF],
  wall: [WALK_RUN_HALF, WALK_DEEP_HALF],
  centre: [WALK_CORNER_HALF, WALK_CORNER_HALF],
};

/** |v|, with the last bits of a quarter turn's cosine or sine (6e-17 for cos(π/2)) taken as the 0 it stands for, so
 *  a footprint turned a quarter is exactly the one turned by hand */
const flat = (v: number) => (Math.abs(v) < 1e-9 ? 0 : Math.abs(v));

export interface SocketWorld {
  x: number;
  z: number;
  /** which way the piece faces in the world, radians (yaw 0 faces -Z) */
  yaw: number;
  /** half extents of the ground the piece covers, along the world's X and Z axes (its turned footprint's bounds) */
  hx: number;
  hz: number;
  /** Wave 69 (G-02) · half extents of that ground in the piece's own frame: along it (its own x, turned by `yaw`) and
   *  across it — the footprint itself, where hx and hz bound it */
  along: number;
  across: number;
}

/** where one socket of a site stands in the world: its layout position turned by the site's rot about its origin, the
 *  piece's facing, and the bounds of its footprint. At rot 0 it is the keep's old `keep.x + sock.x` to the bit. */
export function siteSocketWorld(site: Pick<SocketSite, 'x' | 'z' | 'rot' | 'layout'>, socketId: string): SocketWorld | null {
  const sock = siteSocket(site, socketId);
  if (!sock) return null;
  const rot = site.rot ?? 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const yaw = sock.yaw + rot;
  const [along, across] = FOOTPRINT[sock.kind];
  const ca = flat(Math.cos(yaw));
  const sa = flat(Math.sin(yaw));
  return {
    x: site.x + sock.x * c + sock.z * s,
    z: site.z - sock.x * s + sock.z * c,
    yaw,
    hx: ca * along + sa * across,
    hz: sa * along + ca * across,
    along,
    across,
  };
}

/** G-02 · whether a piece stands on the socket: raised and finished — a ruin is built 0, a breach */
export function siteStands(site: Pick<SocketSite, 'parts' | 'built'>, socketId: string): boolean {
  return !!site.parts[socketId] && (site.built[socketId] ?? 0) >= 1;
}

/** G-02 · the gate standing on a socket (the gatehouse), 'open' or 'shut' — its gateOpen absent is open, as a placed
 *  gate's `st.gateOpen[id] ?? true` is, so no keep from before the gatehouse shut is shut now; null for any other piece,
 *  and for a gate not standing (a ruined one is a breach, whichever it was) */
export function siteGate(site: Pick<SocketSite, 'parts' | 'built' | 'gateOpen'>, socketId: string): 'open' | 'shut' | null {
  if (!KEEP_PART_BY_ID[site.parts[socketId] ?? '']?.gate || !siteStands(site, socketId)) return null;
  return (site.gateOpen?.[socketId] ?? true) ? 'open' : 'shut';
}

/** G-02 · (x, z) in a socket piece's own frame: along it, and across it */
function socketFrame(at: SocketWorld, x: number, z: number): [number, number] {
  const c = Math.cos(at.yaw), s = Math.sin(at.yaw), dx = x - at.x, dz = z - at.z;
  return [dx * c - dz * s, dx * s + dz * c];
}

/** G-02 · how far (x, z) is from the ground a socket's piece covers (0 on it) */
export function siteSocketGap(site: Pick<SocketSite, 'x' | 'z' | 'rot' | 'layout'>, socketId: string, x: number, z: number): number {
  const at = siteSocketWorld(site, socketId);
  if (!at) return Infinity;
  const [u, v] = socketFrame(at, x, z);
  return Math.hypot(Math.max(0, Math.abs(u) - at.along), Math.max(0, Math.abs(v) - at.across));
}

/** G-02 · the ground `gap` metres out from a socket's piece on the side away from the site's middle, where someone
 *  outside comes up against it — straight out from a wall run's face, out from a corner's point */
export function siteSocketOutside(site: Pick<SocketSite, 'x' | 'z' | 'rot' | 'layout'>, socketId: string, gap: number): { x: number; z: number } | null {
  const at = siteSocketWorld(site, socketId);
  if (!at) return null;
  const out = Math.hypot(at.x - site.x, at.z - site.z);
  if (out < 1e-9) return null; // the bailey's middle has no outside
  const nx = (at.x - site.x) / out, nz = (at.z - site.z) / out;
  // from the piece's middle along that way to its edge, in its own frame
  const [u, v] = socketFrame(at, at.x + nx, at.z + nz);
  const edge = Math.min(Math.abs(u) > 1e-9 ? at.along / Math.abs(u) : Infinity, Math.abs(v) > 1e-9 ? at.across / Math.abs(v) : Infinity);
  return { x: at.x + nx * (edge + gap), z: at.z + nz * (edge + gap) };
}

/** G-02 · whether (x, z) lies on a site's plate, inside the ring its sockets stand round */
export function siteCovers(site: Pick<SocketSite, 'x' | 'z' | 'rot' | 'layout'>, x: number, z: number): boolean {
  const rot = site.rot ?? 0, c = Math.cos(rot), s = Math.sin(rot), dx = x - site.x, dz = z - site.z;
  const half = SITE_LAYOUTS[site.layout].size / 2;
  return Math.abs(dx * c - dz * s) < half && Math.abs(dx * s + dz * c) < half;
}
