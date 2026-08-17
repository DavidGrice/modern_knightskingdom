'use client';
// Wave 15: gamepad panel navigation. A real, deliberately CLOSED v1 slice —
// OPENING and CLOSING the same handful of panels the keyboard already
// toggles (mirrors GameScreen.tsx's keydown switch), NOT in-panel cursor/
// focus navigation.
//
// Why not more: none of the 21 PanelId panels have any DOM-focus/click
// equivalent for a gamepad today, and none of them have a KEYBOARD one
// either — check keybinds.ts's "Panels" group: every action there OPENS a
// panel, nothing navigates inside one. Touch already works here for free
// because a tap synthesizes a real `click` on the underlying <button> DOM
// element (TouchControls.tsx even hides itself whenever a panel is open,
// deliberately leaving the screen free for that). A gamepad button press
// does not synthesize any DOM event at all, so actually selecting a specific
// inventory slot or crafting recipe with a controller would need a full
// virtual-cursor or roving-focus system built across ~18 panel components —
// a genuinely separate, much bigger project than this wave's v1. A
// controller player still needs a mouse (or OS-level gamepad-to-mouse
// emulation, e.g. Steam Input) to act INSIDE a panel, exactly as they do
// today; this component only gets them there and back.
//
// Mounted UNCONDITIONALLY in GameWorld.tsx (like ArenaSpawner/AiRuntime),
// deliberately NOT gated behind `!buildMode` the way CombatController is —
// Start/B need to keep working to pause/back out even while BuildController
// (not PlayerController) owns movement, exactly like the keyboard Escape
// handler (GameScreen.tsx, always mounted regardless of buildMode) already
// does. Its own useFrame runs every rendered frame regardless of
// paused/panel state too, same reasoning: a paused/panelled game still
// renders (the pause overlay sits ON TOP of a live Canvas), so nothing stops
// this from polling — it has to be the thing that gets the player OUT of
// paused/panelled in the first place.
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore, type PanelId } from '@/game/store/gameStore';
import { GAMEPAD_BUTTONS } from '@/game/data/gamepadInput';

/** LB / Back-Select / Left-stick-click — matches KEYBIND_GROUPS' own
 *  "Panels" ordering (Inventory, Crafting, Quests are its first three). Only
 *  three: the research pass's own scoping call, not every panel a keyboard
 *  can reach — a deliberately small, honest slice. */
const TOGGLE_PANEL: { button: number; panel: PanelId }[] = [
  { button: GAMEPAD_BUTTONS.menuInventory, panel: 'inventory' },
  { button: GAMEPAD_BUTTONS.menuCrafting, panel: 'crafting' },
  { button: GAMEPAD_BUTTONS.menuQuests, panel: 'quests' },
];

export default function GamepadMenuController() {
  const prev = useRef<Record<number, boolean>>({});

  useFrame(() => {
    const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
    const gp = pads?.[0];
    const was = prev.current;
    const now: Record<number, boolean> = {};
    // hand-rolled edge detector — a Gamepad object has no native down/up
    // event, so "was this button just pressed THIS frame" has to be tracked
    // by hand, same convention CombatController's touch/pad blocks use. A
    // missing gp (never connected, or disconnected mid-session) reads every
    // button as not-pressed, which self-heals a stuck edge within one frame
    // exactly like PlayerController's own pollGamepad does for movement.
    const edge = (i: number) => {
      const down = !!gp?.buttons[i]?.pressed;
      now[i] = down;
      return down && !was[i];
    };

    const st = useGameStore.getState();

    // Start: mirrors Escape's own cascade exactly (GameScreen.tsx) — close
    // whatever panel is open, else exit build mode, else toggle pause — so
    // the one gamepad "menu" button does what a keyboard player already
    // expects Esc to do.
    if (edge(GAMEPAD_BUTTONS.pause)) {
      if (st.panel !== 'none') st.setPanel('none');
      else if (st.buildMode) st.setBuildMode(false);
      else st.setPaused(!st.paused);
    }

    // B: back/cancel — closes whatever panel is open. Deliberately doesn't
    // also exit build mode or unpause (Start already covers that full
    // cascade) — B mirrors the ubiquitous controller "back" verb for the one
    // thing every panel already has a keyboard (Escape) and mouse
    // equivalent for.
    if (edge(GAMEPAD_BUTTONS.cancel) && st.panel !== 'none') {
      st.setPanel('none');
    }

    // LB / Back-Select / L-stick-click: open/close the three panels above.
    // Same per-action guard the keyboard switch uses (GameScreen.tsx) — just
    // !paused, matching e.g. its 'inventory'/'craft'/'quests' cases exactly
    // (those don't gate on buildMode or interior either).
    //
    // edge() is called UNCONDITIONALLY for all three buttons, same as
    // pause/cancel above — the paused check below only gates the ACTION, not
    // the tracking. Gating the edge() call itself (as an earlier version of
    // this did) leaves `was[button]` stale for any button held through a
    // pause: `now` never gets an entry for it while paused, so the very next
    // unpaused frame reads `was[button]` as undefined — falsy — and a button
    // that was already being held reads as a brand-new press, popping a
    // panel open the player never actually pressed since unpausing.
    for (const { button, panel } of TOGGLE_PANEL) {
      if (edge(button) && !st.paused) st.setPanel(st.panel === panel ? 'none' : panel);
    }

    prev.current = now;
  });

  return null;
}
