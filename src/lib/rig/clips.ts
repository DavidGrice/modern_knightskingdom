'use client';
// CLN-29 · the SMO animation clips (loaded once each, and ahead of time on request) and the rest pose they are
// played against.

export interface AnimFrame { pos: number[]; rot: number[] }
interface AnimTrack { name: string; frames: AnimFrame[] }
export interface AnimClip { file: string; num_frames: number; tracks: AnimTrack[] }

const clipCache = new Map<string, Promise<AnimClip>>();

export function loadClip(name: string): Promise<AnimClip> {
  let p = clipCache.get(name);
  if (!p) {
    p = fetch(`/assets/anims/${name}.json`).then((r) => r.json());
    clipCache.set(name, p);
  }
  return p;
}

/** Starts loading an animation clip ahead of its first play(), so that play() finds it loaded and the figure takes it
 *  up at once rather than a load later. A failed load is play()'s to report. */
export function preloadClip(name: string): void {
  loadClip(name).catch(() => {});
}

/** rest-pose reference rotations/positions per track (from anim_r_restpose frame 0) */
let restRef: Promise<Map<string, AnimFrame>> | null = null;
export function loadRest(): Promise<Map<string, AnimFrame>> {
  if (!restRef) {
    restRef = loadClip('anim_r_restpose').then((clip) => {
      const m = new Map<string, AnimFrame>();
      for (const t of clip.tracks) m.set(t.name, t.frames[0]);
      return m;
    });
  }
  return restRef;
}
