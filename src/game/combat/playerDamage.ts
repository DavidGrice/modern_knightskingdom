'use client';
// CLN-11 · split out of game/combat.ts unchanged: every blow the player takes funnels through damagePlayer —
// i-frames, armour, the wall ring, block and parry, and the knockout.
import { audio } from '@/lib/audio';
import type { ItemId } from '../types';
import { useGameStore } from '../store/gameStore';
import { playerState } from '../playerState';
import { resetDungeon } from '../dungeon';
import { standDown } from '../standDown';
import { bestChestplateOwned } from '../data/armor';
import { PERK_FX } from '../data/effects';
import { worldEnv } from '../env';
import { fortDamageReduction } from '../fort';
import { raidActive, raidLost } from '../directors/state';
import { emitSound, SOUND_LOUDNESS } from '@/ai/perception/sounds';
import { noiseBeliefId } from '@/ai/perception/Belief';
import { PARRY_IFRAME_MS, PARRY_KNOCKBACK, PARRY_STAGGER_S, PARRY_STAMINA_COST, PARRY_WINDOW_MS } from '../data/melee';
import { combatState } from './state';
import { useEnemyStore, type EnemyData } from './enemyStore';

/** passive reduction from worn armor (+ the Ironclad perk) — stacks
 *  additively but capped, so a shield block (75% reduction) stays the
 *  primary defense rather than armor alone making the player untouchable. */
function armorReduction(inv: Partial<Record<ItemId, number>>, perks: string[] = []): number {
  let r = 0;
  if ((inv.helmet ?? 0) > 0) r += 0.1;
  // Wave 9 · the best plate you own, not just "a plate" (data/armor.ts). The
  // 0.45 ceiling below is untouched and still does its job — a Castle-Crested
  // plate plus helm plus Ironclad now runs into it, which is the point of
  // having it: a shield block stays the primary defense.
  r += bestChestplateOwned(inv)?.reduction ?? 0;
  if (perks.includes('ironclad')) r += PERK_FX.ironclad.damageReductionPlus;
  return Math.min(0.45, r);
}

export function damagePlayer(amount: number, opts?: { melee?: boolean; attacker?: EnemyData }) {
  // Wave 40 (A6) · the shared invincibility gate. Both the dodge-roll's own
  // burst and a successful parry (below) write iframeUntil — every damage
  // path in the game funnels through this one function (5 call sites,
  // grep-confirmed: ranged bandits, this melee branch, the caster's hostile
  // bolt in stepBolt, the arena's ambient tick, a siege vehicle's splash), so
  // one early-return here covers all of them for free, including dodging
  // away from a spell bolt or an explosion — deliberately, not an oversight.
  // Silent: no sound/flash/notify, matching genre convention that during an
  // i-frame window the hit simply didn't happen.
  if (performance.now() < combatState.iframeUntil) return;
  const st = useGameStore.getState();
  // Wave 8 · Sound Walls. A closed wall ring around the homestead takes a
  // fifth off every blow landed on you INSIDE it (game/fort.ts). Applied on
  // top of armour rather than into armorReduction's own capped pool, because
  // they are two different investments: plate is what you wear, the ring is
  // what you built, and a knight in full harness behind a finished wall should
  // feel both.
  let dmg = amount * (1 - armorReduction(st.inventory, st.perks)) * (1 - fortDamageReduction());
  if (combatState.blocking && (st.inventory.shield ?? 0) > 0 && combatState.stamina > 10) {
    // Wave 40 (A6) · a parry is a MELEE-only skill-reward on top of the
    // existing hold-block (genre-correct scope, and every ranged/caster/
    // siege damage path lacks an attacker reference to stagger anyway — see
    // opts.attacker's own comment). `opts.melee` is only ever set by
    // game/enemyAi/blows.ts's own melee-vs-player call site (fireAtPlayer).
    const parried = !!opts?.melee && (performance.now() - combatState.blockPressedAt) <= PARRY_WINDOW_MS;
    if (parried) {
      dmg = 0;
      combatState.stamina = Math.max(0, combatState.stamina - PARRY_STAMINA_COST);
      combatState.iframeUntil = Math.max(combatState.iframeUntil, performance.now() + PARRY_IFRAME_MS);
      audio.play('brick_collide', 1, false); // full volume, no detune — a sharper clang than the held-block hit
      if (opts?.attacker) {
        const a = opts.attacker;
        // reuses EnemyMob.attackCd as a stagger for free (the enemies' AI, game/enemyAi/, only
        // ever resets it to a SMALLER value when it reaches <=0 — forcing it
        // up from out here is never clobbered) — same trick the combo
        // finisher (melee.ts's landMeleeHit) uses, zero new AI-state machine either place.
        a.mob.attackCd = Math.max(a.mob.attackCd, PARRY_STAGGER_S);
        const pdx = a.mob.x - playerState.x, pdz = a.mob.z - playerState.z, pd = Math.hypot(pdx, pdz) || 1;
        a.mob.x += (pdx / pd) * PARRY_KNOCKBACK;
        a.mob.z += (pdz / pd) * PARRY_KNOCKBACK;
      }
      st.notify('Parry!', true);
    } else {
      dmg = Math.max(0, Math.round(dmg * 0.25 * 10) / 10); // unchanged — the existing hold-block reward stays exactly as good
      combatState.stamina = Math.max(0, combatState.stamina - 14);
      audio.play('brick_collide', 0.7);
    }
  } else {
    audio.play('thud', 0.9);
  }
  combatState.hp = Math.max(0, combatState.hp - dmg);
  combatState.flash = 0.55;
  // NPC_AI_SPEC §6.2 — a blow landing on the player is the loudest thing that
  // happens in this game, and it is exactly the kind of event the spec wants
  // NPCs to hear rather than see. Emitted here, right beside the `audio.play`
  // above, so what an NPC hears and what the player hears cannot drift apart.
  // The source is `noise:combat`, not `player`: what carries is "a fight, over
  // there" — an unattributed hostile cue that raises threat and seeds a
  // fuzzed-position belief — not the player's own identity, who is never
  // hostile (see perception/Belief.ts's id scheme).
  emitSound(playerState.x, playerState.z, SOUND_LOUDNESS.playerStruck, 'combat',
    noiseBeliefId('combat'), st.destination ?? null);
  if (combatState.hp <= 0) {
    combatState.hp = combatState.maxHp;
    combatState.stamina = combatState.maxStamina;
    // Whatever panel was open is shut. A panel does not stop the world — the enemies stand down only for a pause —
    // so the blow that fells the player can land while the Satchel or the Crafting book lies open; he used to come
    // to where he was carried with it still up, and the book went on working for the forge he had been carried away
    // from (ROADMAP.md, "a knock-out left an open panel up"). Ahead of the arena's early return below: being put
    // down outside the ring is a knock-out too.
    st.setPanel('none');
    // And whatever he was in the middle of ends where he falls (game/standDown.ts), as at the knighting: a rider is got
    // off, his horse left there; a crew is stepped down from the engine, whose position used to pull him from the spawn
    // meadow straight back to it; a ram or a cart is let go and its place settled where it stands — they used to be
    // carried off with him (ROADMAP.md, "a knock-out never stood the player down").
    for (const id of standDown()) st.settleCart(id);
    // requested 2026-08-03: the arena's own "respawn just outside, redo"
    // rule, checked and returned BEFORE the general path below — per this
    // function's own long-standing comment (just below) anticipating
    // exactly this. Reuses gameStore's leaveArena() (teleport + notify)
    // rather than duplicating it; deliberately no worldEnv.time jump — "a
    // redo, not a punishment" (ROADMAP), unlike the general knockout below.
    if (st.destination === 'arena') {
      st.leaveArena();
      audio.play('horn', 0.5);
      return;
    }
    combatState.teleportTo = [0, 26]; // back to the spawn meadow
    // a knockout away from home (the Sealed Crypt is the first destination
    // with real killable-by-the-player-taking-damage enemies) must also
    // clear `destination` — otherwise the player lands at home-world
    // coordinates while collision/ground-height code still thinks they're
    // at the (very distant) dungeon origin, and the next frame's circular
    // wander-bound clamp yanks them straight back toward it
    if (st.destination) {
      useGameStore.setState({ destination: null });
      resetDungeon();
    }
    // A real 0-HP state (requested 2026-07-28): explicitly not a game-over —
    // a forced recovery. Jumps to just-before-sunrise, the same dawn value
    // gameStore's own sleep() uses for a bed, and clears whatever was
    // pressuring the player. useEnemyStore holds both raid AND dungeon-room
    // enemies (spawn()'s own dungeonRoom param) in one flat array, so one
    // clear() here despawns both: the raid that knocked the player out is
    // called off, and any dungeon-room fight is abandoned along with the
    // layout reset above (an orphaned dungeon-room enemy surviving a
    // discarded layout was already a latent gap this incidentally closes).
    // F-17 · a raid called off with raiders still standing was not beaten back: the raid director, finding none left
    // on its next tick, used to pay its spoils. It is told the raid was lost — whether he fell at home or away (the
    // clear takes the home raid either way).
    const enemies = useEnemyStore.getState();
    if (raidActive.current && enemies.enemies.some((e) => e.raid && e.mob.state !== 'dying')) raidLost.current = true;
    enemies.clear();
    worldEnv.time = 0.27; // just before sunrise
    st.notify('You were knocked out and carried back to camp… you wake at dawn.', true);
    audio.play('horn', 0.5);
  }
}
