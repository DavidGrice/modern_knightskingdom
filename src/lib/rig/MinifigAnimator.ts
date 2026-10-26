'use client';
// CLN-29 · a rigged minifig's animator: the clip it plays, cross-faded, looped or held, applied to the joints as
// rotation deltas from the rest pose (the SMO axes' signs below).
import * as THREE from 'three';
import { loadClip, type AnimClip, type AnimFrame } from './clips';
import { JOINTS, type RigJoint } from './joints';

// Axis mapping from anim rot triples to three.js euler (order YXZ), tuned
// against the walk/greet cycles: rot[0]→yaw, rot[1]→pitch, rot[2]→roll.
const SIGN_X = -1; // pitch (arm/leg swing)
const SIGN_Y = -1; // bearing (head turn)
const SIGN_Z = 1;  // roll

const FPS = 15;
const FADE = 0.18;

/** Exported for its tests; built for a figure only by assembleRiggedMinifig. */
export class MinifigAnimator {
  private clip: AnimClip | null = null;
  private clipName = '';
  private time = 0;
  private loop = true;
  private fade = 0;
  private blendFrom = new Map<RigJoint, THREE.Euler>();
  private hipsBaseY: number;
  private hipsRefY = 0;
  private onEnd: (() => void) | null = null;
  /** how many play() and stop() calls have been made: each takes its number, and a play() whose clip is still loading
   *  takes effect only if no later call has come in by the time its load is in */
  private calls = 0;
  timeScale = 1;

  constructor(
    private joints: Record<RigJoint, THREE.Group>,
    private unitScale: number,
    private rest: Map<string, AnimFrame>,
  ) {
    this.hipsBaseY = joints.hips.position.y;
  }

  get current() { return this.clipName; }

  /** Plays `name` once its clip is loaded — unless another play() or a stop() has been called meanwhile: only the latest
   *  call counts, so a clip asked for while an earlier one's first load is still out is not overtaken by that one when
   *  it comes back (ROADMAP.md, "a figure's clip asked for before another's load had come back ended on the older
   *  one"). Asking for the clip it already plays changes nothing, and counts as the latest. */
  async play(name: string, opts: { loop?: boolean; timeScale?: number; onEnd?: () => void } = {}) {
    const call = ++this.calls;
    if (this.clipName === name && (opts.loop ?? true) === this.loop) return;
    const clip = await loadClip(name);
    if (call !== this.calls) return;
    // snapshot current pose for crossfade
    this.blendFrom.clear();
    for (const j of JOINTS) this.blendFrom.set(j, this.joints[j].rotation.clone());
    this.clip = clip;
    this.clipName = name;
    this.time = 0;
    this.fade = FADE;
    this.loop = opts.loop ?? true;
    this.timeScale = opts.timeScale ?? 1;
    this.onEnd = opts.onEnd ?? null;
    const hipsTrack = clip.tracks.find((t) => t.name === 'hips');
    const frame0Y = hipsTrack?.frames[0].pos[1] ?? 0;
    if (this.loop && hipsTrack) {
      // a looping clip's frame 0 is just an arbitrary point in the repeating
      // cycle, not a neutral reference -- anim_c_run's frame 0 happens to sit
      // at the stride's highest point, so anchoring to it (as one-shot clips
      // correctly do below) pulled the hips down for nearly the whole run
      // cycle instead of bobbing evenly, reading as the character sinking
      // into the ground while running. Anchor loops to the cycle's midpoint
      // instead, so the bob is symmetric around the normal stance height.
      const ys = hipsTrack.frames.map((f) => f.pos[1]);
      this.hipsRefY = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else {
      // one-shot reactions (jump, fall, emotes) should animate away from
      // whatever pose the character is actually in when they start playing.
      this.hipsRefY = frame0Y;
    }
  }

  stop() {
    this.calls++;
    this.clip = null;
    this.clipName = '';
    for (const j of JOINTS) this.joints[j].rotation.set(0, 0, 0);
    this.joints.hips.position.y = this.hipsBaseY;
  }

  update(dt: number) {
    if (!this.clip) return;
    this.time += dt * this.timeScale;
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt);
    const frames = this.clip.num_frames;
    let ft = this.time * FPS;
    if (this.loop) {
      ft %= frames;
    } else if (ft >= frames - 1) {
      ft = frames - 1;
      const done = this.onEnd;
      this.onEnd = null;
      if (done) done();
    }
    const i0 = Math.floor(ft) % frames;
    const i1 = (i0 + 1) % frames;
    const a = ft - Math.floor(ft);
    const blend = this.fade > 0 ? 1 - this.fade / FADE : 1;

    for (const track of this.clip.tracks) {
      const j = track.name as RigJoint;
      const joint = this.joints[j];
      if (!joint || !JOINTS.includes(j)) continue;
      const rest = this.rest.get(track.name);
      if (!rest) continue;
      const f0 = track.frames[i0];
      const f1 = track.frames[i1];
      const rot = (k: number) => {
        const v = f0.rot[k] + (f1.rot[k] - f0.rot[k]) * a - rest.rot[k];
        return (v * Math.PI) / 180;
      };
      const target = new THREE.Euler(SIGN_X * rot(1), SIGN_Y * rot(0), SIGN_Z * rot(2), 'YXZ');
      if (blend < 1) {
        const from = this.blendFrom.get(j)!;
        joint.rotation.set(
          from.x + (target.x - from.x) * blend,
          from.y + (target.y - from.y) * blend,
          from.z + (target.z - from.z) * blend,
        );
        joint.rotation.order = 'YXZ';
      } else {
        joint.rotation.copy(target);
      }
      // hips vertical bob (walk bounce, jumps) — relative to hipsRefY (the
      // loop's own midpoint for cyclic clips, or frame 0 for one-shots; see
      // play()) so stance-height offsets between clips don't float the rig
      if (j === 'hips') {
        const dy = f0.pos[1] + (f1.pos[1] - f0.pos[1]) * a - this.hipsRefY;
        joint.position.y = this.hipsBaseY + dy * this.unitScale * blend;
      }
    }
  }
}
