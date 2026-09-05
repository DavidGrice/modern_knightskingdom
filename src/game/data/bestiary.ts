// Requested 2026-07-30: "journal entries about strengths, weaknesses, etc."
// for the Collection Book — real notes about how a fight actually goes, not
// just a Vigour number. Every line below describes a REAL mechanical hook
// already coded (`Enemies.tsx`'s own AI branches, `combat.ts`'s attack
// tables), not invented flavor — see each entry's own comment for where the
// mechanic it describes actually lives.
import type { EnemyKind } from '../combat';

export interface BestiaryLore {
  /** what actually happens if this fight goes badly for THEM */
  strength: string;
  /** what actually happens if this fight goes badly for YOU */
  weakness: string;
}

export const BESTIARY_LORE: Record<EnemyKind, BestiaryLore> = {
  // lowest Vigour in the book (KIND_HP.skeleton = 5); never spawns solo —
  // the night timer and the dusk-raid roll both seed several at once
  skeleton: {
    strength: 'Never rises alone — expect a pack, not a single foe.',
    weakness: 'The frailest thing in the book. One or two good hits ends it, and it cannot outrun a chase.',
  },
  // ~40% roll ranged at spawn (combat.ts's spawn()); the rest carry the
  // halberd. Both variants break and flee once battered to 2 HP or less
  // (Enemies.tsx's own morale check)
  bandit: {
    strength: 'About two in five carry a crossbow and hold their distance instead of closing — do not assume every bandit comes to melee range.',
    weakness: 'Breaks and runs once battered down to 2 Vigour or less. A beaten raiding party thins out on its own.',
  },
  // KIND_HP.gilbert = 14, ATTACK_DMG.gilbert = 2 — both meaningfully above a
  // plain bandit's 8/1.5, and he is absent from the morale-break condition
  // entirely (only 'bandit' and 'cedric' ever flee), so he fights to the end
  gilbert: {
    strength: 'Tougher and hits harder than the men he leads, and unlike them, his nerve never breaks — he fights to the end.',
    weakness: 'Always melee, always on his own — no crossbow, no pack to call on, and nothing rallies him.',
  },
  // KIND_HP.cedric = 45, by far the highest in the roster. Flees below
  // CEDRIC_FLEE_HP everywhere except his own sanctioned final stand
  // (`finalStand`, see Cedric's Siege) — the one fight he does not walk away
  // from, and the only one that permanently ends him
  cedric: {
    strength: 'By far the toughest fight in the realm — 45 Vigour and a real three-point swing.',
    weakness: 'Everywhere but his own camp, once truly weathered, he breaks off and flees rather than dying — only his sanctioned final stand is a fight to the finish.',
  },
  // KIND_HP.royal = 12, always sword-and-shield (ArmShield), never rolls
  // ranged and is absent from the flee condition — stands its ground
  royal: {
    strength: 'Rides in sword-and-shield, the same kit you carry yourself, and never breaks off once engaged.',
    weakness: 'Always melee — no crossbow in the ranks, nothing that reaches you from a distance.',
  },
  // Wave 36 (A3) · KIND_HP.mountedRaider = 16, ATTACK_DMG = 2.2 — tougher and
  // harder-hitting than a plain bandit, and (like gilbert/royal) absent from
  // the morale-break condition, so it never breaks and runs. Rides a saddle
  // height above the ground (combat.ts's MOUNT_SEAT_Y) at a real horse's
  // pace, well above every on-foot kind in the roster.
  mountedRaider: {
    strength: "Rides one of Cedric's own chargers at a real horse's pace — faster than anything else in this book, and it will run you down before you outdistance it.",
    weakness: 'A couched spear and shield leave no room for a bow — it never fights you from range, only up close.',
  },
  // excluded from the Collection Book (KINDS in BestiaryPanel.tsx) — a duel,
  // not a scannable foe. Kept here only so the Record stays total.
  storm: { strength: '', weakness: '' },
  // Wave 37 (A3 remainder) · KIND_HP.caster = 6, the lowest Vigour in the
  // book after storm's own 1-hit duel — but CASTER_RANGE = 16 (Enemies.tsx)
  // is the longest reach any raider has, and fireSpellBolt is a real,
  // visible travelling projectile rather than a silent hit-scan
  caster: {
    strength: 'Strikes from up to 16m with a real bolt of violet fire you can actually see coming — closing the gap fast is the only way to stop another.',
    weakness: 'The frailest thing in the book after a plain skeleton. A couple of good hits ends it, and up close its own swing barely scratches you (ATTACK_DMG.caster = 0.8).',
  },
  // KIND_HP.shieldedElite = 18, and isFrontalHit (combat.ts) blocks 70% of
  // whatever lands on its front — melee AND ranged alike
  shieldedElite: {
    strength: 'Carries a shield that blocks most of what lands on its front, sword or bolt alike, for as long as you stand in front of it.',
    weakness: 'The block only covers its front. Step to its flank or its back and the reduction is gone entirely.',
  },
  // rides in with Cedric's War Party and mans a real oc6098b1 catapult
  // (Enemies.tsx) — never chases, but the d<1.8 melee branch still fires
  // first if you walk right up, so it is a real, killable fight
  siegeCrew: {
    strength: "Sets up on a real catapult and works it against your homestead on its own timer, unattended, from well outside your own reach.",
    weakness: 'Never abandons its post to chase you down. Walk up and it fights back only in melee like anything else — kill it and the catapult falls silent for good.',
  },
};
