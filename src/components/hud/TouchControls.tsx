'use client';
// Mobile-friendly pass (2026-07-20): a virtual joystick (movement), a
// full-screen drag surface (camera look, behind the joystick/buttons in the
// DOM so their own touches take priority), and three action buttons
// (Interact/Jump/Sprint). Feature-detected — renders nothing on a desktop
// without touch support, so this is purely additive alongside keyboard/
// mouse/gamepad. Writes into game/touchInput.ts's leaf module; reads nothing
// back (PlayerController.tsx, a separate React tree under the Canvas, is the
// only consumer — same bridge pattern as playerState/combatState).
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { touchState, detectTouch, resetTouchState } from '@/game/touchInput';

const JOYSTICK_RADIUS = 52; // px the knob can travel from center

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
    let dx = clientX - joyCenter.current.x;
    let dy = clientY - joyCenter.current.y;
    const d = Math.hypot(dx, dy);
    if (d > JOYSTICK_RADIUS) { dx = (dx / d) * JOYSTICK_RADIUS; dy = (dy / d) * JOYSTICK_RADIUS; }
    touchState.moveX = dx / JOYSTICK_RADIUS;
    touchState.moveY = dy / JOYSTICK_RADIUS;
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
    <div className="hud touch-controls">
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
        <button
          className="touch-btn touch-btn-interact"
          onTouchStart={(e) => { e.preventDefault(); touchState.interact = true; }}
          onTouchEnd={(e) => { e.preventDefault(); touchState.interact = false; }}
          onTouchCancel={(e) => { e.preventDefault(); touchState.interact = false; }}
        >
          E
        </button>
      </div>
    </div>
  );
}
