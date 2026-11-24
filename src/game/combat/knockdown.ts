// G-11 · an enemy knocked flat: by a combo's finisher (melee.ts), a cannonball's or a charge's blast (siege.ts's
// explodeBall, detonate) or the player's ram run into him (siege.ts's ramCheck). He falls the way the hit throws him —
// struck from the front, on his back; from behind, on his face; a blast throws him through the air away from it — lies
// a moment and gets up again (the knock-down clips of the original game), and while he is down he neither strikes,
// draws nor moves of himself (enemyAi/step.ts). It is a state beside his `mob.state`, never a value of it: every reader
// of that (the raid's end and its settling, the arena, targeting, perception, the camp's rally) goes on taking him for
// one still in the fight — he takes his blows as ever, and one killed while down falls apart as any.
import { CLIP_FPS } from '@/lib/rig/clips';
import type { EnemyData } from './enemyStore';
import type { Arms } from './fightClips';

/** how he went down — on his back or his face, or thrown through the air on it by a blast — the seconds since, and the
 *  throw */
export type Knock = NonNullable<EnemyData['mob']['knock']>;
type KnockHow = Knock['how'];

/** the seconds he is down, all told: the fall (or a blast's flight) KNOCK_FALL_S, then the stand */
export const KNOCK_S = 2;
export const KNOCK_FALL_S = 0.7;
/** once up, how long before his first blow — closeIn's hold on a man arriving within reach */
export const KNOCK_HOLD_S = 0.4;
/** once up, the seconds in which nothing knocks him down again: longer than the slowest full chain (the halberd's
 *  three swings, 2.85 s), so no run of finishers keeps a man on the ground — he is on his feet three seconds in five */
export const KNOCK_GUARD_S = 3;
/** how far past square to his side a hit still counts as from in front of him: the sine of that angle (0.15, some
 *  8.6°) — the hit's direction against his facing, normalised, at -SIDE_ON or more */
const SIDE_ON = 0.15;
/** how far a blast throws him through his flight, and how high */
export const BLAST_THROW = 2.5;
export const BLAST_ARC = 0.6;

/** the falls and the stands, bare and with a shield on his arm (no flight has one) */
const FALL: Record<KnockHow, readonly [string, string]> = {
  backward: ['anim_g_fallbackward', 'anim_g_fallbackwardwithshield'],
  forward: ['anim_g_fallforward', 'anim_g_fallforwardwithshield'],
  flyingbackward: ['anim_g_flyingbackward', 'anim_g_flyingbackward'],
  flyingforward: ['anim_g_flyingforward', 'anim_g_flyingforward'],
};
const STAND: Record<'backward' | 'forward', readonly [string, string]> = {
  backward: ['anim_g_standfromfallbackward', 'anim_g_standfromfallbackwardwithshield'],
  forward: ['anim_g_standfromfallforward', 'anim_g_standfromfallforwardwithshield'],
};
const back = (how: KnockHow) => how === 'backward' || how === 'flyingbackward';

/** Each knock-down clip's motion: the frame it is played from and the frame it is still from, read off the clips' tracks
 *  (public/assets/anims, 2026-11-23). Frame counts in brackets. A shield's clip moves as the bare one does. The fall or
 *  the flight is fitted into KNOCK_FALL_S, the stand into the rest of KNOCK_S. */
const KNOCK_TIMING: Record<string, { from: number; end: number }> = {
  anim_g_fallbackward: { from: 0, end: 45 }, // [46] hit 0-12, sat down 15-21, laid back 21-33, legs flat by 45
  anim_g_fallforward: { from: 0, end: 36 }, // [41] doubled over 0-12, down on his face 15-21, legs kicked 21-36
  anim_g_flyingbackward: { from: 0, end: 20 }, // [21] on his back in the air, a slow sway
  anim_g_flyingforward: { from: 0, end: 20 }, // [21] on his face in the air
  // [101] a first try at sitting up (39-57) that falls back flat by 60 is left out: from 60, up by 93
  anim_g_standfromfallbackward: { from: 60, end: 93 },
  anim_g_standfromfallforward: { from: 0, end: 78 }, // [81] pushed up 0-30, a knee 30-60, upright by 78
};
for (const how of ['backward', 'forward'] as const) {
  KNOCK_TIMING[FALL[how][1]] = KNOCK_TIMING[FALL[how][0]];
  KNOCK_TIMING[STAND[how][1]] = KNOCK_TIMING[STAND[how][0]];
}

/** whether he is down (G-18a takes a man prisoner only so) */
export function isKnocked(e: EnemyData): boolean {
  return !!e.mob.knock;
}

/** Knocks him flat, struck from (fromX, fromZ) — by a blast, thrown through the air — and returns whether he went
 *  down. Not one already down or just up (KNOCK_GUARD_S), dead or dying, on a ladder, in the saddle (a rider's figure
 *  sits his horse), at a siege engine (it is drawn in his own group, and would be thrown and lifted with him), nor
 *  Storm, whose duel is settled sword to sword. A shot he was drawing is let go, his next blow is held till
 *  KNOCK_HOLD_S after he is up (a finisher's stagger runs on inside that: FINISHER_STAGGER_S is the shorter), and he
 *  stands up into his stance at rest, as one just come into it (engage.ts's swungInStance). */
export function knockDown(e: EnemyData, fromX: number, fromZ: number, blast = false): boolean {
  const m = e.mob;
  if (isKnocked(e) || (m.knockGuardT ?? 0) > 0 || e.hp <= 0 || m.state === 'dying' || m.state === 'climbing'
    || e.mountAsset || e.siegeAsset || e.kind === 'storm') return false;
  // his facing is (-sin, -cos) of his yaw: the hit from in front of him throws him on his back — and from his side, or
  // a hair behind it (SIDE_ON), as well, so that a hit square to his side does not fall either way by a sliver of yaw
  const dx = fromX - m.x, dz = fromZ - m.z, dd = Math.hypot(dx, dz) || 1;
  const front = (dx * -Math.sin(m.yaw) + dz * -Math.cos(m.yaw)) / dd >= -SIDE_ON;
  // a blast throws him through the air — but one up on a wall-walk is knocked flat where he stands (no throw, no flight)
  const thrown = blast && !m.elevated;
  let vx = 0, vz = 0;
  if (thrown) {
    const d = Math.hypot(m.x - fromX, m.z - fromZ);
    const [ax, az] = d > 0.01 ? [(m.x - fromX) / d, (m.z - fromZ) / d] : [Math.sin(m.yaw), Math.cos(m.yaw)];
    vx = (ax * BLAST_THROW) / KNOCK_FALL_S;
    vz = (az * BLAST_THROW) / KNOCK_FALL_S;
  }
  m.knock = { how: thrown ? (front ? 'flyingbackward' : 'flyingforward') : front ? 'backward' : 'forward', t: 0, vx, vz };
  m.knocks = (m.knocks ?? 0) + 1;
  m.draw = undefined;
  m.stanceSwings = m.swings ?? 0;
  m.attackCd = Math.max(m.attackCd, KNOCK_S + KNOCK_HOLD_S);
  return true;
}

/** His knockdown run on by `dt` (step.ts, at the head of his frame): his cooldown runs down as the seconds pass, and a
 *  blast's throw carries him through his flight; up once KNOCK_S are out, and from then guarded KNOCK_GUARD_S. Returns
 *  whether he is down this frame. */
export function stillDown(m: EnemyData['mob'], dt: number): boolean {
  const k = m.knock;
  if (!k) {
    if (m.knockGuardT) m.knockGuardT = Math.max(0, m.knockGuardT - dt);
    return false;
  }
  const flight = Math.min(dt, KNOCK_FALL_S - k.t);
  if (flight > 0) {
    m.x += k.vx * flight;
    m.z += k.vz * flight;
  }
  k.t += dt;
  m.attackCd = Math.max(0, m.attackCd - dt);
  if (k.t < KNOCK_S) return true;
  m.knock = undefined;
  m.knockGuardT = KNOCK_GUARD_S;
  return false;
}

/** how high above the ground a blast has thrown him: an arc through his flight, BLAST_ARC at its top */
export function knockLift(k: Knock): number {
  if (k.how !== 'flyingbackward' && k.how !== 'flyingforward') return 0;
  const s = Math.min(1, k.t / KNOCK_FALL_S);
  return 4 * BLAST_ARC * s * (1 - s);
}

/** the clip he plays while down: his fall or his flight, then the stand from it — a shield's where there is one */
export function knockClip(k: Knock, a: Arms): string {
  const i = a.shield ? 1 : 0;
  return k.t < KNOCK_FALL_S ? FALL[k.how][i] : STAND[back(k.how) ? 'backward' : 'forward'][i];
}

/** every knock-down clip a figure with or without a shield can play (fetched as he comes on: EnemyFigure.tsx) */
export function knockClips(shield: boolean): string[] {
  const i = shield ? 1 : 0;
  return [...Object.values(FALL).map((c) => c[i]), ...Object.values(STAND).map((c) => c[i])];
}

/** How a knock-down clip is played (EnemyFigure.tsx), or undefined for any other: once, from its first frame of motion,
 *  at the timeScale that fits its motion into its part of KNOCK_S. */
export function knockPlay(clip: string): { from: number; timeScale: number } | undefined {
  const t = KNOCK_TIMING[clip];
  if (!t) return undefined;
  const seconds = clip.includes('standfromfall') ? KNOCK_S - KNOCK_FALL_S : KNOCK_FALL_S;
  return { from: t.from, timeScale: (t.end - t.from) / CLIP_FPS / seconds };
}
