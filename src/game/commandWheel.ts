'use client';
// I41 · Defender orders as a HOLD-TO-OPEN RADIAL.
//
// The old command panel was a modal. Every open exited pointer lock and every
// close re-acquired it, so giving a routine order mid-fight punched a hole in
// mouse-look twice — and the browser's own lock/unlock has a visible latency
// you cannot tune away. The fix is not to release the pointer at all: hold
// the key, flick the mouse toward the order you want, release to commit.
//
// A mutable leaf module because the input side lives in PlayerController's
// frame/mouse handlers (inside the R3F tree) and the drawing lives in the DOM
// HUD, exactly like touchInput and combatState.
export const commandWheel = {
  /** the key is being held; the radial is up and steering the mouse */
  open: false,
  /** accumulated pointer travel while open, in pixels */
  dx: 0,
  dy: 0,
  /** index of the order under the cursor, or -1 for the neutral centre */
  choice: -1,
  /** how many options the wheel is showing (set by the HUD when it opens) */
  count: 4,
};

/** how far the pointer must travel from centre before a sector is picked —
 *  a small flick chooses, a twitch does not */
export const WHEEL_DEADZONE = 46;

export function openWheel(count: number) {
  commandWheel.open = true;
  commandWheel.count = count;
  commandWheel.dx = 0;
  commandWheel.dy = 0;
  commandWheel.choice = -1;
}

export function closeWheel() {
  commandWheel.open = false;
  commandWheel.choice = -1;
}

/** feed raw pointer deltas in while the wheel is up, and resolve a sector.
 *  Sector 0 sits at the top and they run clockwise, which is how the HUD
 *  lays them out. */
export function steerWheel(dx: number, dy: number) {
  commandWheel.dx += dx;
  commandWheel.dy += dy;
  const r = Math.hypot(commandWheel.dx, commandWheel.dy);
  if (r < WHEEL_DEADZONE) { commandWheel.choice = -1; return; }
  // clamp the travel so the marker stays on the ring instead of flying off
  if (r > WHEEL_DEADZONE * 3) {
    const k = (WHEEL_DEADZONE * 3) / r;
    commandWheel.dx *= k;
    commandWheel.dy *= k;
  }
  // atan2(x, -y): 0 at the top, increasing clockwise
  let a = Math.atan2(commandWheel.dx, -commandWheel.dy);
  if (a < 0) a += Math.PI * 2;
  const seg = (Math.PI * 2) / commandWheel.count;
  commandWheel.choice = Math.floor((a + seg / 2) % (Math.PI * 2) / seg) % commandWheel.count;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkwheel = commandWheel;
}
