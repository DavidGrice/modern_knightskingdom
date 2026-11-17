// G-04 · the major-event arbiter: one big thing at the homestead at a time. Each night event used to keep its own
// list of what it must not land on top of — Cedric's siege checked the dragon, itself and his final stand
// (CedricSiege.tsx), a dragon checked only the dragons (dragonAir.busy) — and the raid checked nothing, so the dusk raid
// could ride in under a dragon siege. Now each event says here when it is on, and each asks, before it starts, whether
// any is (majorEventOn): a raid (its warning included), Cedric's siege and his final stand, either dragon (the omen
// holds the green dragon's sky too) and a settlement raid. Hideout assaults (G-16a/b), garrison sieges (G-24a), the
// Rival Castle (G-32a) and the field battle (G-34a) register the same way.
//
// A leaf, as sessionHooks.ts is: each event registers itself beside its own state (dragonAir.ts, cedricSiege.ts,
// settlementRaid.ts, directors/state.ts) — some of which sit on the game store's side of the import graph — so this
// imports none of them.

export type MajorEvent = 'raid' | 'cedricSiege' | 'cedricFinalStand' | 'dragon' | 'blackDragon' | 'settlementRaid';

const events: [MajorEvent, () => boolean][] = [];

/** `on` says whether the event is under way; registered once, at its module's load */
export function registerMajorEvent(id: MajorEvent, on: () => boolean): void {
  events.push([id, on]);
}

/** the major event under way, if any — what an event about to start must wait on */
export function majorEventOn(): MajorEvent | null {
  for (const [id, on] of events) if (on()) return id;
  return null;
}
