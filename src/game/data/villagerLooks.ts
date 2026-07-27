// Homestead folk appearance (2026-07-20). Every villager/defender used to be
// rendered with a hardcoded `minifiggenericgood00` head AND torso — one face
// for the entire settlement, and an all-male one at that. Looks are now:
//
//   • DERIVED from the villager's id by default (a pure function, same
//     "never persist what you can re-derive" rule `attrsOf` already follows,
//     so existing saves get a varied homestead with zero migration), and
//   • OVERRIDABLE per villager via `Villager.look`, which is what the roster's
//     appearance editor writes — only the fields the player actually changed
//     are stored, so an untouched villager still tracks the derived default.
//
// The face/crest donors here are the same cosmetic pool the player's own
// creator draws from (data/minifigs.ts's FACE_OPTIONS/CREST_OPTIONS), and
// carry no rank or story meaning — see that file's header note.
import { PALETTE_SWATCHES, type Gender } from './minifigs';
import type { CharacterConfig, Villager } from '../types';

export interface VillagerLook {
  headDonor?: string;
  bodyDonor?: string;
  armColor?: number;
  handColor?: number;
  legColor?: number;
  hipColor?: number;
}

/** stable string hash — the seed every derived villager trait keys off */
export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Villager looks, EVERY ONE screenshot-verified (scripts/smoke68.mjs, the
 *  same drive-the-avatar-via-store technique as smoke32.mjs) before shipping,
 *  and independently confirmed against the rig lab's own data: every donor
 *  below is `equipKind: "none"` in PAK_CAPABILITY_OVERRIDES.json, i.e. the
 *  lab's human-verified pass found no weapon molded into the mesh. That field
 *  is the cheap way to pre-screen any future addition to this pool — the
 *  per-donor `rigs/<id>_rig.json` part list is the authoritative version
 *  (it names the offending shape outright, e.g. genericgood00's `halberd`
 *  and `shield` parts).
 *
 *  Two hard rules came out of that validation pass, both of which cost a
 *  visibly broken homestead when violated:
 *
 *  1. **Head and torso must come from the SAME donor.** Every mixed pair
 *     tested (john's head on the generic torso, leonora's on it, etc.)
 *     assembled wrong — floating shields, detached blue limb shards, mangled
 *     head geometry. The rig's spatial part classifier resolves a donor as a
 *     whole posed figure; taking the head from one and the torso from another
 *     leaves its limb/prop clusters straddling two different source poses.
 *     (The player's own creator gets away with mixing because its curated
 *     face/crest sets were tuned for it — do not assume that transfers here.)
 *  2. **Some donors have props molded into the mesh** — `minifiggenericgood00`
 *     carries a halberd + shield and `minifiggenericbad00` a crossbow + shield.
 *     This used to disqualify them outright (the rig scattered the weapon
 *     across the figure). It no longer does: lib/rigParts.ts feeds the rig
 *     lab's verified shape->role map into assembly, so those props are
 *     identified by name and dropped for unarmed roles — villagers render
 *     clean while enemies built from the same meshes keep the weapon
 *     (`keepProps`). Both generic donors are therefore back in the pool.
 */
export const VILLAGER_LOOKS: { headDonor: string; bodyDonor: string; gender: Gender }[] = [
  { headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00', gender: 'male' },
  { headDonor: 'minifiggenericbad00', bodyDonor: 'minifiggenericbad00', gender: 'male' },
  { headDonor: 'minifigjohnmayne00', bodyDonor: 'minifigjohnmayne00', gender: 'male' },
  { headDonor: 'minifigweezil00', bodyDonor: 'minifigweezil00', gender: 'male' },
  { headDonor: 'minifigrichardstrong00', bodyDonor: 'minifigrichardstrong00', gender: 'male' },
  { headDonor: 'minifigqueenleonora00', bodyDonor: 'minifigqueenleonora00', gender: 'female' },
  { headDonor: 'minifigprincessstorm00', bodyDonor: 'minifigprincessstorm00', gender: 'female' },
];

const swatch = (n: number) => PALETTE_SWATCHES[n % PALETTE_SWATCHES.length];

/** the look a villager has before the player edits anything — pure in `id` */
export function defaultLookOf(id: string): Required<VillagerLook> {
  const h = hashId(id);
  const base = VILLAGER_LOOKS[h % VILLAGER_LOOKS.length];
  return {
    headDonor: base.headDonor,
    bodyDonor: base.bodyDonor,
    armColor: swatch(h),
    handColor: 18, // classic minifig yellow hands, same as the player's default
    legColor: swatch(h + 7),
    hipColor: swatch(h + 11),
  };
}

/** full render config for a villager: derived default + any saved overrides */
export function villagerConfig(v: Villager): CharacterConfig {
  const base = defaultLookOf(v.id);
  return { name: v.name, ...base, ...(v.look ?? {}) };
}
