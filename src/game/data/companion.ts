'use client';
// Wave 25 — Tam, the companion squire's identity: donor/colors/name and his
// flavor greet lines. A separate leaf module from game/companion.ts (his
// COMBAT state) for the same reason a villager's look (data/villagerLooks.ts)
// and its combat state (game/villagerCombat.ts) stay apart — one is what he
// looks like/says, the other is what a fight does to him.
//
// IDENTITY (Q1, investigated against the live donor catalog before writing
// this): `minifiggenericgood00` is the right donor — checked every claimed
// headDonor/bodyDonor in data/npcs.ts and Enemies.tsx's CONFIGS first. Every
// named court NPC (king/queen/richard/john/storm) and every combat-mob family
// (weezil/gilbertbad/skeleton/cedric) is already claimed; the only donor still
// open is this one, already worn by Alric, Beda, Fenwick and the traveling
// Merchant (Merchant.tsx) — always as ANONYMOUS village folk, never a named
// character. Tam keeps that same "no story of his own before now" register
// rather than inventing new geometry, and his colors (below) are a combo none
// of those four already use.
//
// WEAPON — a real, verified deviation from this wave's own research pass.
// The plan's original idea was `keepProps: true` to keep this donor's molded
// halberd+shield. That is wrong, and demonstrably so: `minifiggenericgood00`'s
// halberd+shield are 'prop'-kind parts, parented straight to the BODY joint at
// their ORIGINAL baked position rather than re-hung alongside the arm
// (lib/minifigRig.ts's rehangArm) — precisely the bug Enemies.tsx's own
// 2026-07-28 comment documents finding and fixing for Gilbert (a floating axe
// once his arm settled to its neutral hang). Every armed figure in this game
// already avoids that by keeping `keepProps` false and wearing a REAL,
// separately-portalled weapon instead (Defenders.tsx's sword_shield loadout;
// Enemies.tsx's own bandits/Gilbert/royal knights) — see components/world/
// Companion.tsx, which equips Tam with HeldSword+ArmShield the same way,
// rather than reusing a molded prop that would silently reintroduce a bug
// this codebase already found and fixed elsewhere.
import type { CharacterConfig } from '../types';

/** The fixed id used everywhere Tam needs one: agentManager.spawn/get,
 *  companionCombatState, PlayerController's interact check, Enemies.tsx's
 *  companionTarget branch. Never a roster villager id (those are 'v<n>',
 *  gameStore's villagerSeq) — Tam is never pushed into st.villagers (see
 *  gameStore's recruitCompanion), so there is no collision to guard against. */
export const COMPANION_ID = 'companion_tam';

/** Colors are reused from the existing palette (PALETTE_SWATCHES,
 *  data/minifigs.ts) — no new swatch needed — in a combo none of this
 *  donor's other four wearers use: Alric (22/18/34/34), Beda (30/18/38/24),
 *  Fenwick (90/18/38/90), the Merchant (30/18/34/30). handColor 18 is the
 *  universal skin tone every CharacterConfig in this game uses. */
export const TAM_CONFIG: CharacterConfig = {
  name: 'Tam', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
  armColor: 32, handColor: 18, legColor: 38, hipColor: 34,
};

/** Not "Squire" alone — data/ranks.ts's own RANKS already uses that as the
 *  PLAYER's own rank name, and an NPC-facing title needs to read as a role,
 *  not collide with the player's own. Referenced by flavor text only; Tam has
 *  no NpcDef of his own for a UI to render this label from (see
 *  PlayerController's 'talk_companion' interact for why). */
export const TAM_TITLE = 'Your Squire';

/** Picked at random by greetCompanion() (gameStore.ts). Flavor-only, not a
 *  real NpcDef's `lines` — Tam follows the player everywhere and has no
 *  fixed x/z/world for DialoguePanel's stationary-NPC/POI/side-quest
 *  machinery to hang off of. */
export const COMPANION_LINES: string[] = [
  "Lead on — I'll watch your back.",
  "Say the word and I'm at your side.",
  "Quiet homestead today. Suits me fine.",
  "I swore to Richard I'd keep you standing, and I mean to.",
  "Wherever you're bound, I'm bound too.",
];
