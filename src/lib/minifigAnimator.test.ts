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

// G-10 · a swing swung again: the same clip, played again on a new cue, from the frame it is asked from
describe("a figure's animator and a swing's cue", () => {
  // a clip whose right arm's pitch is its frame number: the joint says which frame is posed
  const ramp = { file: 'cue_ramp', num_frames: 40, tracks: [{ name: 'rightarm', frames: Array.from({ length: 40 }, (_, i) => ({ pos: [0, 0, 0], rot: [0, i, 0] })) }] };
  it('starts a clip from `from`, and plays it again from there on a new cue — the same cue changes nothing', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ json: () => Promise.resolve(ramp) }));
    const joints = Object.fromEntries(JOINTS.map((j) => [j, new THREE.Group()])) as Record<RigJoint, THREE.Group>;
    const a = new MinifigAnimator(joints, 1, new Map([['rightarm', { pos: [0, 0, 0], rot: [0, 0, 0] }]]));
    const frame = () => Math.round(-joints.rightarm.rotation.x * 180 / Math.PI);
    await a.play('cue_ramp', { loop: false, from: 10, cue: 1 });
    a.update(0.2); // past the cross-fade: 0.2 s on, 3 frames
    expect(frame()).toBe(13);
    await a.play('cue_ramp', { loop: false, from: 10, cue: 1 });
    a.update(0.2);
    expect(frame()).toBe(16);
    await a.play('cue_ramp', { loop: false, from: 10, cue: 2 });
    a.update(0.2);
    expect(frame()).toBe(13);
  });
});

// G-11 · the knock-down clips: a fall ends lying, and the stand from it starts lying. A one-shot clip's hip height is
// measured from the rest pose's (every one that starts standing starts at it), below it as a share of the figure's own
// hip height (the clips' units are some five times the rig's: at unitScale a man lying lay under the ground), and
// cross-faded from where it was.
describe("a figure's animator and a clip that starts down", () => {
  /** a clip whose hips stand at `ys[i]` on frame i (the rest pose's at 100); the figure's hips 0.5 up, unitScale 0.01 */
  const hipsClip = (file: string, ys: number[]) => ({ file, num_frames: ys.length, tracks: [{ name: 'hips', frames: ys.map((y) => ({ pos: [0, y, 0], rot: [0, 0, 0] })) }] });
  const clips: Record<string, ReturnType<typeof hipsClip>> = {
    down_fall: hipsClip('down_fall', [100, 60, 20, 20]), // a fall: standing to lying
    down_stand: hipsClip('down_stand', [20, 20, 20, 20, 20, 20, 60, 100]), // the stand from it: lying, then up
    down_jump: hipsClip('down_jump', [100, 150, 150, 150, 150, 100]), // a jump: up and down again
    down_loop: hipsClip('down_loop', [80, 80, 80]), // a cycle held below the rest height
  };
  const figure = () => {
    vi.stubGlobal('fetch', (url: string) => Promise.resolve({ json: () => Promise.resolve(clips[url.split('/').pop()!.replace('.json', '')]) }));
    const joints = Object.fromEntries(JOINTS.map((j) => [j, new THREE.Group()])) as Record<RigJoint, THREE.Group>;
    joints.hips.position.y = 0.5;
    const a = new MinifigAnimator(joints, 0.01, new Map([['hips', { pos: [0, 100, 0], rot: [0, 0, 0] }]]));
    return { a, hips: () => +joints.hips.position.y.toFixed(6) };
  };
  it('plays the stand from a fall lying on the ground at its start, its hips a fifth of their height up', async () => {
    const { a, hips } = figure();
    await a.play('down_stand', { loop: false });
    a.update(0.2); // past the cross-fade, on its frame 3 (from its frame 0 it was 0.5, a standing man's; at unitScale, -0.3)
    expect(hips()).toBeCloseTo(0.5 * 0.2, 9);
    a.update(1); // up, held on its last frame
    expect(hips()).toBeCloseTo(0.5, 9);
  });
  it('fades the hips from the height they were at: the fall ends lying, and the stand takes up from there', async () => {
    const { a, hips } = figure();
    await a.play('down_fall', { loop: false });
    a.update(1); // to its last frame, held
    expect(hips()).toBeCloseTo(0.1, 9);
    await a.play('down_stand', { loop: false });
    a.update(0.01); // the cross-fade barely begun (faded from the rest height, the hips stood 0.38 higher)
    expect(hips()).toBeCloseTo(0.1, 9);
  });
  it('above the rest height, and in a loop, at unitScale as ever', async () => {
    const { a, hips } = figure();
    await a.play('down_jump', { loop: false });
    a.update(0.2); // frame 3, past the fade: 50 up
    expect(hips()).toBeCloseTo(0.5 + 50 * 0.01, 9);
    await a.play('down_loop');
    a.update(1); // a loop about its own middle, as ever: at the figure's hip height, not a share of it
    expect(hips()).toBeCloseTo(0.5, 9);
  });
});

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
