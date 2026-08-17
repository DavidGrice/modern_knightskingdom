'use client';
// Mobile-friendly pass (2026-07-20): a virtual joystick (movement), a
// full-screen drag surface (camera look, behind the joystick/buttons in the
// DOM so their own touches take priority), and action buttons
// (Sprint/Jump/Block/Interact/Attack). Feature-detected — renders nothing on
// a desktop without touch support, so this is purely additive alongside
// keyboard/mouse/gamepad. Writes into game/touchInput.ts's leaf module; reads
// nothing back (PlayerController.tsx, a separate React tree under the
// Canvas, is the only consumer — same bridge pattern as playerState/
// combatState).
//
// Wave 15 (2026-08-17): Block/Attack added as plain held-state booleans,
// same as Sprint/Jump/Interact already were — TouchControls does no combat
// logic itself. CombatController.tsx reads touchState.attack/block every
// frame and hand-rolls the press/release edge, then calls the exact same
// startAttack/releaseAttack/startBlock/endBlock helpers its own mouse
// listeners call, so a touch player and a mouse player run identical
// combat code from that point on.
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { touchState, detectTouch, resetTouchState } from '@/game/touchInput';
import { noteInputDevice } from '@/game/inputMode';

// Wave 15 responsive residual (2026-08-17): used to be a flat 52px, tuned
// by eye to the old fixed 120px CSS base — now that the base's own CSS size
// is viewport-relative (globals.css's clamp(84px, 22vmin, 120px)), a
// hardcoded travel radius here would silently stop matching it below
// ~730px-wide viewports (base shrinks, JS didn't), letting the knob visibly
// overshoot its own ring. Measured from the base's live rendered size at
// touch-start instead (onJoyStart, below) — same 52/120 ratio as before, so
// desktop's exact old feel is unchanged, but it now tracks whatever the CSS
// actually rendered rather than a second guess of it.
const JOYSTICK_RADIUS_RATIO = 52 / 120;

export default function TouchControls() {
  const buildMode = useGameStore((s) => s.buildMode);
  const paused = useGameStore((s) => s.paused);
  const panel = useGameStore((s) => s.panel);
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => setIsTouch(detectTouch()), []);

  const joyBase = useRef<HTMLDivElement>(null);
  const joyKnob = useRef<HTMLDivElement>(null);
  const joyTouchId = useRef<number | null>(null);
  const joyCenter = useRef({ x: 0, y: 0 });
  const joyRadius = useRef(52); // recomputed from the real rendered base each onJoyStart
  const lookTouchId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  // a panel/pause/build-mode interruption orphans any in-progress touch —
  // reset on every unmount so a stuck joystick can't leave you "still
  // moving" the instant controls remount
  useEffect(() => {
    touchState.active = isTouch;
    return () => resetTouchState();
  }, [isTouch]);

  const active = isTouch && !buildMode && !paused && panel === 'none';
  if (!active) return null;

  function updateJoy(clientX: number, clientY: number) {
    const r = joyRadius.current;
    let dx = clientX - joyCenter.current.x;
    let dy = clientY - joyCenter.current.y;
    const d = Math.hypot(dx, dy);
    if (d > r) { dx = (dx / d) * r; dy = (dy / d) * r; }
    touchState.moveX = dx / r;
    touchState.moveY = dy / r;
    if (joyKnob.current) joyKnob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function endJoy() {
    joyTouchId.current = null;
    touchState.moveX = 0;
    touchState.moveY = 0;
    if (joyKnob.current) joyKnob.current.style.transform = 'translate(0px, 0px)';
  }
  function onJoyStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    const rect = joyBase.current!.getBoundingClientRect();
    joyCenter.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    joyRadius.current = rect.width * JOYSTICK_RADIUS_RATIO;
    updateJoy(t.clientX, t.clientY);
  }
  function onJoyMove(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchId.current) { updateJoy(t.clientX, t.clientY); return; }
    }
  }
  function onJoyEnd(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === joyTouchId.current) { endJoy(); return; }
    }
  }

  function onLookStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    lookTouchId.current = t.identifier;
    lookLast.current = { x: t.clientX, y: t.clientY };
  }
  function onLookMove(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current) {
        touchState.lookDX += t.clientX - lookLast.current.x;
        touchState.lookDY += t.clientY - lookLast.current.y;
        lookLast.current = { x: t.clientX, y: t.clientY };
        return;
      }
    }
  }
  function onLookEnd(e: React.TouchEvent) {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current) { lookTouchId.current = null; return; }
    }
  }

  return (
    <div className="hud touch-controls" onTouchStart={() => noteInputDevice('touch')}>
      <div
        className="clickable touch-look-surface"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
      />
      <div
        ref={joyBase}
        className="clickable touch-joystick-base"
        onTouchStart={onJoyStart}
        onTouchMove={onJoyMove}
        onTouchEnd={onJoyEnd}
        onTouchCancel={onJoyEnd}
      >
        <div ref={joyKnob} className="touch-joystick-knob" />
      </div>
      <div className="touch-buttons clickable">
        <button
          className="touch-btn touch-btn-sprint"
          onTouchStart={(e) => { e.preventDefault(); touchState.sprint = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchState.sprint = false; }}
          onTouchCancel={(e) => { e.preventDefault(); touchState.sprint = false; }}
        >
          »
        </button>
        <button
          className="touch-btn touch-btn-jump"
          onTouchStart={(e) => { e.preventDefault(); touchState.jump = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchState.jump = false; }}
          onTouchCancel={(e) => { e.preventDefault(); touchState.jump = false; }}
        >
          ⤒
        </button>
        {/* Wave 15: Block is a hold, exactly like RMB — mirrors the shield/aim
            gesture CombatController's own mousedown(button 2) drives. */}
        <button
          className="touch-btn touch-btn-block"
          onTouchStart={(e) => { e.preventDefault(); touchState.block = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchState.block = false; }}
          onTouchCancel={(e) => { e.preventDefault(); touchState.block = false; }}
        >
          🛡
        </button>
        <button
          className="touch-btn touch-btn-interact"
          onTouchStart={(e) => { e.preventDefault(); touchState.interact = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchState.interact = false; }}
          onTouchCancel={(e) => { e.preventDefault(); touchState.interact = false; }}
        >
          E
        </button>
        {/* Wave 15: Attack is a hold too — press mirrors LMB-down (melee swing
            fires immediately, a bow starts its draw), release mirrors
            LMB-up (fires the arrow at whatever power the hold reached). Same
            button does double duty for melee/ranged, exactly like LMB does
            on desktop, so there's no separate "draw" button to fit. */}
        <button
          className="touch-btn touch-btn-attack"
          onTouchStart={(e) => { e.preventDefault(); touchState.attack = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchState.attack = false; }}
          onTouchCancel={(e) => { e.preventDefault(); touchState.attack = false; }}
        >
          ⚔
        </button>
      </div>
    </div>
  );
}
