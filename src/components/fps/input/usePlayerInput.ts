// CLN-26 · the player's keyboard, and the gamepad's comings and goings: `keys`, the keyboard codes held now, and
// `pad`, what the gamepad and touch hold this frame (pads.ts's pollPads writes it once a frame; PlayerController.tsx's
// isDown() ORs the two). Moved from PlayerController.tsx as they were.
import { useEffect, useRef } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { noteInputDevice } from '@/game/inputMode';

export function usePlayerInput() {
  const keys = useRef<Record<string, boolean>>({});
  const pad = useRef<Record<string, boolean>>({});

  // ---- keyboard ----
  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; noteInputDevice('keyboard'); };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ---- gamepad connect/disconnect ----
  // Wave 15: navigator.getGamepads() is polled cold every frame elsewhere
  // (pads.ts's pollGamepad, and CombatController/GamepadMenuController's own
  // reads) rather than cached from these events, so nothing here is load-
  // bearing for correctness — pollGamepad's own `!gp` branch already self-
  // heals a stale hold the frame after a disconnect regardless of whether
  // this event ever fires. What these two listeners buy: a visible cue that
  // a controller was recognised at all (nothing else in the UI shows
  // connection state), and clearing `pad` immediately on disconnect instead
  // of waiting up to one frame for the poll loop to notice.
  useEffect(() => {
    const onConnect = (e: GamepadEvent) => {
      useGameStore.getState().notify(`🎮 Controller connected: ${e.gamepad.id}`);
    };
    const onDisconnect = (e: GamepadEvent) => {
      pad.current = {};
      useGameStore.getState().notify(`🎮 Controller disconnected: ${e.gamepad.id}`);
    };
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
    };
  }, []);

  return { keys, pad };
}
