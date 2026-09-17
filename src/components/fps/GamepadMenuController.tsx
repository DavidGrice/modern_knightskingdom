'use client';
// Wave 15: gamepad panel navigation. v1 was a deliberately CLOSED slice —
// OPENING and CLOSING the same handful of panels the keyboard already
// toggles (mirrors GameScreen.tsx's keydown switch), NOT in-panel cursor/
// focus navigation.
//
// Wave 61 (H1) adds that in-panel navigation, at a real but honestly-scoped
// shape: re-reading every one of the 19 real, reachable PanelId panels
// (`commands` is dead code — no `setPanel('commands')` call anywhere and
// Panels.tsx's switch has no case for it) showed the overwhelming majority of
// their actionable controls are ALREADY real `<button>` elements — natively
// Tab/Shift-Tab-focusable and Enter/Space-activatable the instant pointer
// lock releases (PlayerController's pointer-lock effect calls
// `document.exitPointerLock()` the moment any panel opens). That already
// worked today, silently, just invisibly (no focus-visible ring) and
// unreachable by a gamepad specifically, since a gamepad press synthesizes
// no DOM event at all. So rather than a bespoke system per panel, this is one
// generic roving-focus rove scoped to the `.game-panel` DOM subtree every
// panel already shares (confirmed: every one of the 19 panels' root element
// carries that exact class) — it covers all that already-`<button>` content
// for free, plus a short, separately-named pass (Panels.tsx, QuestLogPanel/
// EmoteWheel/NpcEquipPanel) added `tabIndex`+Enter/Space wiring to the
// specific onClick-`<div>` spots that weren't buttons. This also makes
// keyboard Tab+Enter an official, visible, working feature (see
// `.game-panel :focus-visible` in globals.css), not just gamepad.
//
// Explicitly still out of scope, permanently: the two HTML5 drag-and-drop
// equip gestures (InventoryPanel's weapon row, NpcEquipPanel's Armory/gear
// tiles) — dragging itself is the one interaction pattern a gamepad genuinely
// cannot do without a full virtual cursor, so those two stay mouse/touch-only
// exactly as before (their CLICK half is in the rove; their DROP half isn't).
// Per-direction d-pad rebinding is also declined — see gamepadInput.ts's
// header comment.
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
import { useAppStore } from '@/game/store/appStore';
import type { GamepadAction } from '@/game/data/gamepadInput';

/** every element the rove/Tab should stop on inside an open panel — mirrors
 *  what a keyboard's own Tab order already reaches natively, so the two
 *  input methods land on exactly the same set. */
const FOCUSABLE_SELECTOR = 'button:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** LB / Back-Select / Left-stick-click — matches KEYBIND_GROUPS' own
 *  "Panels" ordering (Inventory, Crafting, Quests are its first three). Only
 *  three: the research pass's own scoping call, not every panel a keyboard
 *  can reach — a deliberately small, honest slice.
 *
 *  Wave 33: `action` (not a raw button index) — the actual index is now
 *  rebindable, so it's resolved live from the settings store every frame
 *  inside useFrame below instead of being baked in here at module-load time.
 *  This array itself only had to change shape, not location: it was already
 *  built once at import time, which is exactly the staleness a rebind would
 *  have hit without this. */
const TOGGLE_PANEL: { action: GamepadAction; panel: PanelId }[] = [
  { action: 'menuInventory', panel: 'inventory' },
  { action: 'menuCrafting', panel: 'crafting' },
  { action: 'menuQuests', panel: 'quests' },
];

export default function GamepadMenuController() {
  const prev = useRef<Record<number, boolean>>({});
  // Wave 61 (H1) · which panel the LAST frame saw, so opening one (or
  // switching MenuTabs' tab, which is also just a `setPanel` call) can be
  // told apart from every other frame where nothing changed — this component
  // only polls (see header comment), it doesn't subscribe/re-render on
  // `panel`, so a ref is the right home for "did it change" rather than
  // reactive state.
  const lastPanel = useRef<PanelId>('none');

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
    // Wave 33: live (possibly rebound) button indices, read fresh every
    // frame — see TOGGLE_PANEL's own comment above for why this can't be
    // hoisted to module scope.
    const gpBtn = useAppStore.getState().settings.gamepadButtons;

    // Start: mirrors Escape's own cascade exactly (GameScreen.tsx) — close
    // whatever panel is open, else exit build mode, else toggle pause — so
    // the one gamepad "menu" button does what a keyboard player already
    // expects Esc to do.
    if (edge(gpBtn.pause)) {
      if (st.panel !== 'none') st.setPanel('none');
      else if (st.buildMode) st.setBuildMode(false);
      else st.setPaused(!st.paused);
    }

    // B: back/cancel — closes whatever panel is open. Deliberately doesn't
    // also exit build mode or unpause (Start already covers that full
    // cascade) — B mirrors the ubiquitous controller "back" verb for the one
    // thing every panel already has a keyboard (Escape) and mouse
    // equivalent for.
    if (edge(gpBtn.cancel) && st.panel !== 'none') {
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
    for (const { action, panel } of TOGGLE_PANEL) {
      if (edge(gpBtn[action]) && !st.paused) st.setPanel(st.panel === panel ? 'none' : panel);
    }

    // Wave 61 (H1) · in-panel roving focus. d-pad up/down and `confirm` are
    // tracked UNCONDITIONALLY every frame (edge() called regardless of
    // whether a panel is open), same reasoning as pause/cancel/TOGGLE_PANEL
    // above — only the ACTION below is gated on `st.panel`, so a d-pad press
    // held from before a panel opened doesn't read as a fresh edge the frame
    // it does.
    const roveUp = edge(12);
    const roveDown = edge(13);
    const confirmEdge = edge(gpBtn.confirm);

    if (st.panel !== lastPanel.current) {
      // A panel just opened, closed, or swapped for another (MenuTabs'
      // Satchel/Crafting/Quests/Abilities/Roster/Lore tabs are all just a
      // `setPanel` call too) — land focus on its first focusable element so
      // Tab, the rove below, and `confirm` all have somewhere real to start
      // instead of the page body. Deferred one frame via requestAnimationFrame:
      // this runs the instant the store updates, before React has committed
      // the new panel's own DOM (or torn down the old one), so querying
      // `.game-panel` synchronously here would often still see last frame's.
      lastPanel.current = st.panel;
      if (st.panel !== 'none' && typeof document !== 'undefined') {
        const nextPanel = st.panel;
        requestAnimationFrame(() => {
          if (useGameStore.getState().panel !== nextPanel) return; // already moved on
          const root = document.querySelector('.game-panel');
          root?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
        });
      }
    } else if (st.panel !== 'none' && typeof document !== 'undefined' && (roveUp || roveDown || confirmEdge)) {
      const root = document.querySelector('.game-panel');
      const items = root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];
      if (items.length > 0) {
        if (roveUp || roveDown) {
          const active = document.activeElement as HTMLElement | null;
          const at = active ? items.indexOf(active) : -1;
          const next = at === -1 ? 0 : (at + (roveDown ? 1 : -1) + items.length) % items.length;
          items[next]?.focus();
        }
        // `confirm` (default A) activates whatever's currently focused — a
        // real DOM `.click()`, so it fires the exact same onClick a mouse
        // click or a keyboard Enter/Space (via onKeyActivate, see
        // components/ui/a11yClick.ts) already would, no separate action table.
        if (confirmEdge) (document.activeElement as HTMLElement | null)?.click();
      }
    }

    prev.current = now;
  });

  return null;
}
