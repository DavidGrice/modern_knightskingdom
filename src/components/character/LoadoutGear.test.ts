import { describe, expect, it, vi } from 'vitest';

// what is hung where, without a renderer: a portal becomes "<piece>@<joint>", with the hand a weapon is held in
// ("/-1" the right, "/1" the left) and the tier of a piece that has one
vi.mock('@react-three/fiber', () => ({
  createPortal: (el: { type: string; props: { side?: number; tier?: string } }, joint: string) =>
    el.type + (el.props.side !== undefined ? '/' + el.props.side : '') + (el.props.tier ? ':' + el.props.tier : '') + '@' + joint,
}));
vi.mock('./Equipment', () => ({
  HeldSword: 'sword', ArmShield: 'shield', HeldHalberd: 'halberd', HeldCrossbow: 'crossbow', HeldHelmet: 'helmet', Chestplate: 'plate', WornCarrier: 'carrier',
}));

import LoadoutGear from './LoadoutGear';
import type { RiggedMinifig } from '@/lib/minifigRig';

const RIG = { joints: { rightarm: 'rightarm', leftarm: 'leftarm', head: 'head', body: 'body', hips: 'hips' } } as unknown as RiggedMinifig;
type Props = Parameters<typeof LoadoutGear>[0];
/** the portals, in order */
const hung = (props: Omit<Props, 'rig'> & { rig?: RiggedMinifig | null }): string[] => {
  const out = LoadoutGear({ rig: RIG, ...props }) as { props: { children: unknown[] } } | null;
  return out ? out.props.children.filter((c): c is string => typeof c === 'string') : [];
};
const FULL = { helmet: true, chestplate: 'forged', carrier: 'basket' } as const;

describe('LoadoutGear', () => {
  it('hangs nothing until the rig is ready', () => {
    expect(LoadoutGear({ rig: null, loadout: 'sword_shield', gear: FULL })).toBeNull();
  });

  it('a defender: the weapon of the loadout, then helmet, plate and carrier', () => {
    expect(hung({ loadout: 'sword_shield', gear: FULL })).toEqual(['sword/-1@rightarm', 'shield/1@leftarm', 'helmet@head', 'plate:forged@body', 'carrier:basket@hips']);
    expect(hung({ loadout: 'halberd', gear: FULL })).toEqual(['halberd/-1@rightarm', 'helmet@head', 'plate:forged@body', 'carrier:basket@hips']);
    expect(hung({ loadout: 'bow', gear: FULL })).toEqual(['crossbow/-1@rightarm', 'helmet@head', 'plate:forged@body', 'carrier:basket@hips']);
  });

  it('bare-handed with no loadout: an ordinary villager, or a defender not yet armed', () => {
    expect(hung({ gear: FULL })).toEqual(['helmet@head', 'plate:forged@body', 'carrier:basket@hips']);
    expect(hung({})).toEqual([]);
    expect(hung({ gear: {} })).toEqual([]);
  });

  it('each piece of armor on its own; a plate saved as `true` is iron', () => {
    expect(hung({ gear: { helmet: true } })).toEqual(['helmet@head']);
    expect(hung({ gear: { chestplate: true } })).toEqual(['plate:iron@body']);
    expect(hung({ gear: { chestplate: 'crested' } })).toEqual(['plate:crested@body']);
    expect(hung({ gear: { carrier: 'cart' } })).toEqual(['carrier:cart@hips']);
  });

  it('Tam: never a crossbow, never a carrier — whatever his record says', () => {
    const tam = { crossbow: false, carrier: false };
    expect(hung({ ...tam, loadout: 'sword_shield', gear: FULL })).toEqual(['sword/-1@rightarm', 'shield/1@leftarm', 'helmet@head', 'plate:forged@body']);
    expect(hung({ ...tam, loadout: 'halberd', gear: { carrier: 'cart' } })).toEqual(['halberd/-1@rightarm']);
    expect(hung({ ...tam, loadout: 'bow', gear: FULL })).toEqual(['helmet@head', 'plate:forged@body']);
  });
});
