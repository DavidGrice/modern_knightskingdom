'use client';
// CLN-18 · what a figure holds and wears, hung on its rig. Defenders.tsx,
// Companion.tsx, Villagers.tsx and the equip panel's preview each carried
// these portals, in this order, with their own subset of the lines: a
// defender all seven, the preview the same, Tam all but the crossbow and
// the carrier, an ordinary villager only what is worn.
//
// Every armed figure keeps `keepProps` false and wears a REAL, separately
// portalled weapon (see Companion.tsx's header for why a rig's own molded
// props cannot be used): sword-and-shield and halberd are mutually exclusive
// on the right arm, the crossbow takes the same hand, helmet and plate layer
// on independently, and a carrier sits on the hips — the one joint nothing
// else claims, so it never fights the weapon or a carried load.
import { createPortal } from '@react-three/fiber';
import { ArmShield, Chestplate, HeldCrossbow, HeldHalberd, HeldHelmet, HeldSword, WornCarrier } from './Equipment';
import { chestplateTierOf } from '@/game/data/armor';
import type { RiggedMinifig } from '@/lib/minifigRig';
import type { DefenderLoadout, Villager } from '@/game/types';

export default function LoadoutGear({ rig, loadout, gear, crossbow = true, carrier = true }: {
  /** nothing is hung until the figure's rig is ready */
  rig: RiggedMinifig | null;
  /** the weapon in hand; undefined = bare-handed, no weapon portal at all.
   *  Whoever passes it decides what an unset loadout means: a defender's
   *  stays undefined, Tam's falls back to sword and shield (Companion.tsx). */
  loadout?: DefenderLoadout;
  gear?: Villager['gear'];
  /** false for Tam, who fights hand to hand: his loadout has no 'bow' by
   *  type, and a save that says so anyway has always left him bare-handed */
  crossbow?: boolean;
  /** false for Tam: `carrier` is part of the gear shape he shares with the
   *  villagers, but he hauls nothing and has never been drawn with one */
  carrier?: boolean;
}) {
  if (!rig) return null;
  // whichever plate tier they are actually wearing (data/armor.ts)
  const plate = chestplateTierOf(gear);
  return (
    <>
      {loadout === 'sword_shield' && createPortal(<HeldSword side={-1} />, rig.joints.rightarm)}
      {loadout === 'sword_shield' && createPortal(<ArmShield side={1} />, rig.joints.leftarm)}
      {loadout === 'halberd' && createPortal(<HeldHalberd side={-1} />, rig.joints.rightarm)}
      {crossbow && loadout === 'bow' && createPortal(<HeldCrossbow side={-1} />, rig.joints.rightarm)}
      {gear?.helmet && createPortal(<HeldHelmet />, rig.joints.head)}
      {plate && createPortal(<Chestplate tier={plate} />, rig.joints.body)}
      {carrier && gear?.carrier && createPortal(<WornCarrier tier={gear.carrier} />, rig.joints.hips)}
    </>
  );
}
