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
};
