import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// The component called as a plain function, on just enough of React to hold its state between calls: a slot per hook
// and per instance; an effect run after the render that declared it when its deps changed, its clean-up run before
// the next run and at unmount; a setter that only stores (the test renders again when it wants to see the result); and
// the frame loop it hands useFrame, kept so that a test can run frames. The rig loader is stood in for: `H.rigs` says
// what each asset resolves to.
interface Effect { deps?: unknown[]; cleanup?: void | (() => void) }
const H = vi.hoisted(() => ({
  inst: null as null | {
    slots: unknown[]; i: number; pending: (() => void)[]; sets: number; frame: null | ((state: unknown, dt: number) => void);
  },
  rigs: {} as Record<string, unknown>,
}));
vi.mock('react', async (original) => {
  const real = await original<typeof import('react')>();
  const slot = <T,>(make: () => T): [T, number] => {
    const c = H.inst!;
    const i = c.i++;
    if (!(i in c.slots)) c.slots[i] = make();
    return [c.slots[i] as T, i];
  };
  return {
    ...real,
    useState: (init: unknown) => {
      const c = H.inst!;
      const [value, i] = slot(() => init);
      return [value, (next: unknown) => { c.slots[i] = next; c.sets++; }];
    },
    useRef: (value: unknown) => slot(() => ({ current: value }))[0],
    useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
      const c = H.inst!;
      const [effect] = slot<Effect>(() => ({}));
      const before = effect.deps;
      const first = !('deps' in effect);
      effect.deps = deps;
      if (first || !before || !deps || deps.some((d, k) => !Object.is(d, before[k]))) {
        c.pending.push(() => {
          if (typeof effect.cleanup === 'function') effect.cleanup();
          effect.cleanup = fn();
        });
      }
    },
  };
});
vi.mock('@react-three/fiber', () => ({ useFrame: (fn: (state: unknown, dt: number) => void) => { H.inst!.frame = fn; } }));
vi.mock('@/lib/propRig', () => ({ loadRiggedProp: async (id: string) => H.rigs[id] ?? null }));

import RiggedProp, { stepGait } from './RiggedProp';

type Props = Parameters<typeof RiggedProp>[0];
interface El { type: unknown; props: Record<string, unknown> & { children?: El } }
/** one instance: `render(props?)` calls the component (with new props, if given) and then runs the effects that
 *  render scheduled; `frame(dt)` runs a frame of the loop its last render handed useFrame; `unmount()` runs every
 *  effect's clean-up; `sets()` counts the state it has set */
function mount(first: Props) {
  const inst = {
    slots: [] as unknown[], i: 0, pending: [] as (() => void)[], sets: 0,
    frame: null as null | ((state: unknown, dt: number) => void),
  };
  let props = first;
  const render = (next?: Props) => {
    if (next) props = next;
    H.inst = inst;
    inst.i = 0;
    const out = (RiggedProp as unknown as (p: Props) => El | string | null)(props);
    H.inst = null;
    for (const effect of inst.pending.splice(0)) effect();
    return out;
  };
  const unmount = () => {
    for (const s of inst.slots) {
      const cleanup = (s as Effect | null)?.cleanup;
      if (typeof cleanup === 'function') cleanup();
    }
  };
  return { render, unmount, sets: () => inst.sets, frame: (dt: number) => inst.frame!(null, dt) };
}
/** let the loader's promise, and what hangs on it, run */
const settle = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };
/** a rig as lib/propRig.ts hands one back: a group, and in it a group marked with the role it plays */
function rigWithFlag() {
  const group = new THREE.Group();
  const flag = new THREE.Group();
  flag.userData.role = 'flag';
  group.add(flag);
  return { group, parts: { flag } };
}
const drawnRig = (out: El | string | null) => (out as El).props.children!.props.object as THREE.Group;
/** a rig of one group per role, as lib/propRig.ts hands back a horse's */
function rigOf(roles: string[]) {
  const group = new THREE.Group();
  const parts: Record<string, THREE.Group> = {};
  for (const role of roles) {
    const g = new THREE.Group();
    g.userData.role = role;
    group.add(g);
    parts[role] = g;
  }
  return { group, parts };
}
/** the part of a drawn rig (the instance's own copy) that plays a role */
function partOf(out: El | string | null, role: string): THREE.Object3D {
  let found: THREE.Object3D | null = null;
  drawnRig(out).traverse((o) => { if (o.userData.role === role) found = o; });
  return found!;
}
/** a standalone horse's legs, as lib/propRig.ts numbers them, and the merchant's team's, as the rig lab names them */
const HORSE_LEGS = [0, 1, 2, 3].flatMap((i) => [`leg_upper#${i}`, `leg_lower#${i}`]);
const TEAM_LEGS = ['horse_L', 'horse_R'].flatMap((side) =>
  ['FL', 'FR', 'BL', 'BR'].flatMap((leg) => [`${side}_leg_${leg}_upper`, `${side}_leg_${leg}_lower`]));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  for (const id of Object.keys(H.rigs)) delete H.rigs[id];
});
const warnings = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('RiggedProp, for an asset that has a rig', () => {
  it('draws nothing until the rig is there, then its own copy of it, placed as asked — never the fallback', async () => {
    const rig = rigWithFlag();
    H.rigs['zz-flagged'] = rig;
    const warn = warnings();
    const { render } = mount({ assetId: 'zz-flagged', height: 2, position: [1, 2, 3], yaw: 0.5, scale: 2, fallback: 'STILL' });
    expect(render()).toBeNull();
    await settle();
    const out = render() as El;
    expect(out.type).toBe('group');
    expect([out.props.position, out.props['rotation-y'], out.props.scale]).toEqual([[1, 2, 3], 0.5, 2]);
    expect(out.props.children!.type).toBe('primitive');
    // a copy: its parts are moved every frame, and two of the same prop must not move as one
    expect(drawnRig(out)).not.toBe(rig.group);
    expect(drawnRig(out).children.map((c) => c.userData.role)).toEqual(['flag']);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('RiggedProp, for an asset with no rig to load', () => {
  it('draws the fallback it was handed, as handed, once the load has come back empty — not before', async () => {
    const warn = warnings();
    const still = { piece: 'the plain model' } as unknown as Props['fallback'];
    const { render } = mount({ assetId: 'zz-rigless-with-fallback', height: 2, position: [1, 2, 3], fallback: still });
    expect(render()).toBeNull(); // not back yet: a rig may still come
    await settle();
    expect(render()).toBe(still);
    expect(warn).not.toHaveBeenCalled();
  });

  it('handed no fallback draws nothing, and in development says so — once for the asset, however many stand about', async () => {
    const warn = warnings();
    const first = mount({ assetId: 'zz-rigless', height: 2 });
    expect(first.render()).toBeNull();
    expect(warn).not.toHaveBeenCalled(); // not back yet is not the same as not there
    await settle();
    expect(first.render()).toBeNull();
    expect(first.render()).toBeNull();
    const second = mount({ assetId: 'zz-rigless', height: 2 });
    second.render();
    await settle();
    expect(second.render()).toBeNull();
    expect(warn.mock.calls).toEqual([['[RiggedProp] "zz-rigless" is NOT DRAWN: it has no rig to load, and was given no fallback to draw instead']]);
  });

  it('handed an explicit null draws nothing and says nothing: that is a caller meaning it', async () => {
    const warn = warnings();
    const { render } = mount({ assetId: 'zz-rigless-on-purpose', height: 2, fallback: null });
    render();
    await settle();
    expect(render()).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps quiet about it in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const warn = warnings();
    const { render } = mount({ assetId: 'zz-rigless-in-production', height: 2 });
    render();
    await settle();
    expect(render()).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('RiggedProp, when a mounted one is given another asset', () => {
  it('from one with no rig to one with: the empty load is forgotten at once — no fallback for the new asset, no report of it', async () => {
    H.rigs['zz-b-rigged'] = rigWithFlag();
    const warn = warnings();
    const still = { piece: 'the plain model' } as unknown as Props['fallback'];
    const withFallback = mount({ assetId: 'zz-a-rigless', height: 2, fallback: still });
    withFallback.render();
    await settle();
    expect(withFallback.render()).toBe(still);
    // the asset changes; the fallback is still handed in, and is not drawn for an asset whose load is not back
    expect(withFallback.render({ assetId: 'zz-b-rigged', height: 2, fallback: still })).toBeNull();
    await settle();
    expect(drawnRig(withFallback.render()).children.map((c) => c.userData.role)).toEqual(['flag']);
    expect(warn).not.toHaveBeenCalled();
    // and one handed no fallback: the asset with no rig is reported, the one that follows it is not
    const bare = mount({ assetId: 'zz-a-rigless', height: 2 });
    bare.render();
    await settle();
    bare.render();
    bare.render({ assetId: 'zz-b-rigged', height: 2 });
    await settle();
    bare.render();
    expect(warn.mock.calls.map((c) => String(c[0]).split('"')[1])).toEqual(['zz-a-rigless']);
  });

  it('from one with a rig to one without: the rig it had goes on being drawn until the new load is back, then the fallback', async () => {
    H.rigs['zz-c-rigged'] = rigWithFlag();
    const warn = warnings();
    const still = { piece: 'the plain model' } as unknown as Props['fallback'];
    const { render } = mount({ assetId: 'zz-c-rigged', height: 2 });
    render();
    await settle();
    const had = drawnRig(render());
    expect(drawnRig(render({ assetId: 'zz-d-rigless', height: 2, fallback: still }))).toBe(had);
    await settle();
    expect(render()).toBe(still);
    expect(warn).not.toHaveBeenCalled();
  });

  it('the same asset at another height is another load: nothing is drawn until that one is back, and the asset is reported once', async () => {
    const warn = warnings();
    const still = { piece: 'the plain model' } as unknown as Props['fallback'];
    const { render } = mount({ assetId: 'zz-e-rigless', height: 2 });
    render();
    await settle();
    render();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(render({ assetId: 'zz-e-rigless', height: 3, fallback: still })).toBeNull(); // another load: not back yet
    await settle();
    expect(render()).toBe(still);
    expect(render({ assetId: 'zz-e-rigless', height: 3 })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('RiggedProp, unmounted before its load is back', () => {
  it('sets nothing afterwards — neither a rig nor an empty load', async () => {
    H.rigs['zz-late-rigged'] = rigWithFlag();
    const warn = warnings();
    const rigged = mount({ assetId: 'zz-late-rigged', height: 2 });
    const rigless = mount({ assetId: 'zz-late-rigless', height: 2 });
    rigged.render();
    rigless.render();
    rigged.unmount();
    rigless.unmount();
    await settle();
    expect([rigged.sets(), rigless.sets()]).toEqual([0, 0]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('RiggedProp, walking a horse', () => {
  it("steps the merchant's team at a standalone horse's cadence, at the same speed: one gait clock, moved on once a frame", async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // every clock starts at 0
    H.rigs['zz-team'] = rigOf([...TEAM_LEGS, 'horse_L_tail', 'horse_R_tail']);
    H.rigs['zz-horse'] = rigOf([...HORSE_LEGS, 'tail']);
    const team = mount({ assetId: 'zz-team', height: 1.7, gaitSpeed: 1.4 });
    const horse = mount({ assetId: 'zz-horse', height: 1.7, gaitSpeed: 1.4 });
    team.render();
    horse.render();
    await settle();
    const [teamOut, horseOut] = [team.render(), horse.render()];
    for (let f = 0; f < 64; f++) {
      team.frame(1 / 64);
      horse.frame(1 / 64);
    }
    // a second at 1.4 m/s: the clock at 2.2 + 1.4 x 1.8 = 4.72 rad, an upper leg swung sin(4.72) x 0.55 — not 9.44 rad,
    // where the team's own block moved it on again after the standalone horse's block
    expect(partOf(teamOut, 'horse_L_leg_FL_upper').rotation.x).toBeCloseTo(Math.sin(4.72) * 0.55, 12);
    // each of the team's legs as the standalone horse's on the same diagonal: FL with the front-left (#0), FR with the
    // front-right (#1), BL with the back-left (#2), BR with the back-right (#3)
    for (const side of ['horse_L', 'horse_R']) {
      for (const [leg, i] of [['FL', 0], ['FR', 1], ['BL', 2], ['BR', 3]] as const) {
        for (const half of ['upper', 'lower']) {
          expect([side, leg, half, partOf(teamOut, `${side}_leg_${leg}_${half}`).rotation.x])
            .toEqual([side, leg, half, partOf(horseOut, `leg_${half}#${i}`).rotation.x]);
        }
      }
    }
  });

  it("swishes each of the team's tails as a standalone horse swishes its own, the right one a beat ahead", async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    H.rigs['zz-team-tails'] = rigOf([...TEAM_LEGS, 'horse_L_tail', 'horse_R_tail']);
    H.rigs['zz-horse-tail'] = rigOf([...HORSE_LEGS, 'tail']);
    for (const gaitSpeed of [0, 1.4]) {
      const team = mount({ assetId: 'zz-team-tails', height: 1.7, gaitSpeed });
      const horse = mount({ assetId: 'zz-horse-tail', height: 1.7, gaitSpeed });
      team.render();
      horse.render();
      await settle();
      const [teamOut, horseOut] = [team.render(), horse.render()];
      for (let f = 0; f < 64; f++) {
        team.frame(1 / 64);
        horse.frame(1 / 64);
      }
      // a second on: sin(2.4) x 0.3 about its own y, and the right one sin(2.4 + 1.3) x 0.3 — never swung as a leg
      const [left, right] = [partOf(teamOut, 'horse_L_tail'), partOf(teamOut, 'horse_R_tail')];
      expect(left.rotation.y).toBeCloseTo(Math.sin(2.4) * 0.3, 12);
      expect(left.rotation.y).toBe(partOf(horseOut, 'tail').rotation.y);
      expect(right.rotation.y).toBeCloseTo(Math.sin(2.4 + 1.3) * 0.3, 12);
      for (const tail of [left, right]) expect(tail.rotation.x).toBeCloseTo(0, 12);
    }
  });
});

describe('stepGait', () => {
  const parts = (roles: string[]) => rigOf(roles).parts;
  it('moves a walk cycle on by as much a frame for a team as for a standalone horse, faster as it moves faster', () => {
    for (const gaitSpeed of [0, 0.9, 1.4]) {
      const once = 0.5 + 0.1 * (2.2 + gaitSpeed * 1.8);
      expect(stepGait(0.5, 0.1, gaitSpeed, parts(TEAM_LEGS))).toBeCloseTo(once, 12);
      expect(stepGait(0.5, 0.1, gaitSpeed, parts(HORSE_LEGS))).toBeCloseTo(once, 12);
    }
  });

  it('moves a prop with no legs on only while it moves', () => {
    expect(stepGait(0.5, 0.1, 0, parts(['flag']))).toBe(0.5);
    expect(stepGait(0.5, 0.1, 1, parts(['flag']))).toBeCloseTo(0.5 + 0.1 * 4, 12);
  });
});
