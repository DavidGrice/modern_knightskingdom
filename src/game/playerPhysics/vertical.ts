// CLN-26 · the player's fall and landing: the frame's gravity chain, moved from PlayerController.tsx as it was —
// airborne, fall and land on the floor; grounded with the floor gone from under them (a ledge, not a slope), start to
// fall; otherwise follow the floor's height. `groundEye` is where their eye stands on the floor this frame.
import type * as THREE from 'three';

export function fall(p: THREE.Vector3, vel: { current: THREE.Vector3 }, grounded: { current: boolean }, dt: number, groundEye: number, slopeUnderfoot: boolean): void {
  if (!grounded.current) {
    vel.current.y -= 14 * dt;
    p.y += vel.current.y * dt;
    if (vel.current.y <= 0 && p.y <= groundEye) {
      p.y = groundEye;
      vel.current.y = 0;
      grounded.current = true;
    }
  } else if (p.y > groundEye + 0.08 && !slopeUnderfoot) {
    // walked off an edge — Wave 12: unless the GROUND is what dropped, and
    // it was ground last frame too. This is a LEDGE test, and terrain has
    // no ledges; it slopes. The follow-lerp below trails a descent by
    // roughly (vertical speed / 12), which is 0.11m at nothing more than a
    // walk down the North Downs — unqualified, the test fired on every
    // single frame of the descent and the player bounced down the hill in
    // a stutter of little falls instead of running down it. A slope now
    // falls through to that lerp and stays grounded. BOTH frames have to be
    // open ground: stepping down off a crate is a real step down (that
    // floor genuinely ended one frame ago) and a battlement must still drop
    // you. The one thing it also smooths is dismounting — same ground
    // before and after, only the eye height changed — which used to be a
    // short involuntary fall and is now the ease that mounting always was.
    grounded.current = false;
    vel.current.y = 0;
  } else if (Math.abs(p.y - groundEye) > 0.005) {
    p.y += (groundEye - p.y) * Math.min(1, dt * 12);
  }
}
