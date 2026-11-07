import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { MinifigAnimator, type RigJoint } from './minifigRig';
import type { AnimFrame } from './rig/clips';

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

// Wave 66 (G-01) · the 92 clips of the original game came in with their extra tracks: a 'Null' (anim_g_fallbackward
// and the other falls), held gear (sword, shield, horn, goblet …), the hands and feet, a whole horse. A figure's
// animator drives its seven joints and passes over every other track.
const frames = (n: number, rot: number[]) => Array.from({ length: n }, () => ({ pos: [0, 0, 0], rot }));
const EXTRA = ['leftfoot', 'rightfoot', 'lefthand', 'righthand', 'Null', 'sword', 'horsebody'];

describe("a figure's animator and a clip's extra tracks", () => {
  it('drives the joints and passes over the tracks that are not one', async () => {
    const tracks = [...JOINTS, ...EXTRA].map((name) => ({ name, frames: frames(3, [0, 10, 0]) }));
    vi.stubGlobal('fetch', () => Promise.resolve({ json: () => Promise.resolve({ file: 'x', num_frames: 3, tracks }) }));
    const rest = new Map([...JOINTS, ...EXTRA].map((name) => [name, { pos: [0, 0, 0], rot: [0, 0, 0] }]));
    const joints = Object.fromEntries(JOINTS.map((j) => [j, new THREE.Group()])) as Record<RigJoint, THREE.Group>;
    const a = new MinifigAnimator(joints, 1, rest);
    await a.play('extra_tracks');
    expect(() => { for (let k = 0; k < 30; k++) a.update(0.05); }).not.toThrow();
    for (const j of JOINTS) expect(joints[j].rotation.x, j).toBeCloseTo((-10 * Math.PI) / 180);
  });
});

const ASSETS = fileURLToPath(new URL('../../public/assets/anims', import.meta.url));

describe.skipIf(!fs.existsSync(`${ASSETS}/anim_g_drinkgoblet.json`))('the imported clips, one of each family (this machine only)', () => {
  const read = (name: string) => JSON.parse(fs.readFileSync(`${ASSETS}/${name}.json`, 'utf8'));

  it.each(['anim_g_fallbackward', 'anim_g_drinkgoblet', 'anim_r_announce', 'anim_c_surprisestartle', 'anim_horsegallop', 'anim_dragonflight'])(
    '%s parses, every track a frame per frame of the clip',
    (name) => {
      const clip = read(name);
      expect(clip.num_frames).toBeGreaterThan(1);
      for (const t of clip.tracks) {
        expect(t.frames.length, t.name).toBe(clip.num_frames);
        for (const f of t.frames) expect([f.pos.length, f.rot.length, ...f.pos, ...f.rot].every(Number.isFinite)).toBe(true);
      }
    },
  );

  it.each(['anim_g_fallbackward', 'anim_g_drinkgoblet', 'anim_r_announce', 'anim_c_surprisestartle'])(
    "%s plays on a figure against the rest pose, its 'Null' and gear tracks passed over",
    async (name) => {
      vi.stubGlobal('fetch', (url: string) => Promise.resolve({ json: () => Promise.resolve(read(url.split('/').pop()!.replace('.json', ''))) }));
      const rest = new Map<string, AnimFrame>(read('anim_r_restpose').tracks.map((t: { name: string; frames: AnimFrame[] }) => [t.name, t.frames[0]]));
      const joints = Object.fromEntries(JOINTS.map((j) => [j, new THREE.Group()])) as Record<RigJoint, THREE.Group>;
      const a = new MinifigAnimator(joints, 1, rest);
      await a.play(name, { loop: false });
      for (let k = 0; k < 200; k++) a.update(1 / 15);
      for (const j of JOINTS) expect([joints[j].rotation.x, joints[j].rotation.y, joints[j].rotation.z].every(Number.isFinite), j).toBe(true);
    },
  );
});
