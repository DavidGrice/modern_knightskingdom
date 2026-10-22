import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MinifigAnimator, type RigJoint } from './minifigRig';

const JOINTS: RigJoint[] = ['head', 'body', 'hips', 'leftarm', 'rightarm', 'leftleg', 'rightleg'];
const animator = () =>
  new MinifigAnimator(Object.fromEntries(JOINTS.map((j) => [j, new THREE.Group()])) as Record<RigJoint, THREE.Group>, 1, new Map());
const clipOf = (file: string) => ({ file, num_frames: 1, tracks: [] });

/** the clips' fetch held until the test lets each one come back; each test names its own clips (the module keeps
 *  every clip it has loaded) */
const held = new Map<string, () => void>();
function holdFetches() {
  vi.stubGlobal('fetch', (url: string) => new Promise((resolve) => {
    const name = url.split('/').pop()!.replace('.json', '');
    held.set(name, () => resolve({ json: () => Promise.resolve(clipOf(name)) }));
  }));
}
const comeBack = async (name: string) => {
  held.get(name)!();
  for (let k = 0; k < 5; k++) await Promise.resolve();
};
afterEach(() => { vi.unstubAllGlobals(); held.clear(); });

describe("a figure's animator", () => {
  it('plays the clip asked for last, whichever load comes back first', async () => {
    holdFetches();
    const a = animator();
    const first = a.play('race_first');
    const second = a.play('race_second');
    await comeBack('race_second');
    await second;
    expect(a.current).toBe('race_second');
    // the first's load comes back last: it is not taken up over the later one
    await comeBack('race_first');
    await first;
    expect(a.current).toBe('race_second');
  });

  it('keeps the clip it plays when that clip is asked for again while another load is out', async () => {
    holdFetches();
    const a = animator();
    const rest = a.play('again_rest');
    await comeBack('again_rest');
    await rest;
    const run = a.play('again_run');
    await a.play('again_rest');
    await comeBack('again_run');
    await run;
    expect(a.current).toBe('again_rest');
  });

  it('stays stopped when a load asked for before the stop comes back', async () => {
    holdFetches();
    const a = animator();
    const walk = a.play('stop_walk');
    a.stop();
    await comeBack('stop_walk');
    await walk;
    expect(a.current).toBe('');
  });
});
