'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useAppStore } from '@/game/store/appStore';
import { closeWheel, commandWheel, openWheel } from '@/game/commandWheel';
import { DEFENDER_ORDER_COUNT, giveDefenderOrder } from '@/game/data/defenderOrders';
import { useGameStore } from '@/game/store/gameStore';
import { persistSave } from '@/lib/save';
import { audio } from '@/lib/audio';
import { combatState } from '@/game/combat';
import { isRebindListening } from '@/game/data/keybinds';
import { statsAccum } from '@/game/statsAccum';
import { preloadCommonAssets } from '@/game/preload';
import GameWorld from '../world/GameWorld';
import HUD from '../hud/HUD';
import TouchControls from '../hud/TouchControls';
import FactionTheme from '../hud/FactionTheme';
import Panels from '../hud/Panels';
import BuildBar from '../hud/BuildBar';
import AIDebugOverlay from '@/ai/debug/AIDebugOverlay';

function PauseMenu({ onQuit }: { onQuit: () => void }) {
  const setPaused = useGameStore((s) => s.setPaused);
  const push = useAppStore((s) => s.push);
  const [saving, setSaving] = useState(false);
  return (
    <div className="pause-overlay clickable">
      <div className="panel" style={{ width: 380 }}>
        <h1 className="game-title" style={{ fontSize: 28 }}>Rest a While</h1>
        <button className="menu-btn" onClick={() => setPaused(false)}>Resume</button>
        <button className="menu-btn" onClick={() => push('options')}>Options</button>
        <button className="menu-btn" onClick={() => push('stats')}>Stats</button>
        <button
          className="menu-btn"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onQuit();
          }}
        >
          {saving ? 'Saving…' : 'Save & Return to Menu'}
        </button>
      </div>
    </div>
  );
}

export default function GameScreen() {
  const guest = useAppStore((s) => s.guest);
  const resetTo = useAppStore((s) => s.resetTo);
  const push = useAppStore((s) => s.push);
  const setHasSave = useAppStore((s) => s.setHasSave);
  const shadows = useAppStore((s) => s.settings.shadows);
  const fov = useAppStore((s) => s.settings.fov);
  const graphicsQuality = useAppStore((s) => s.settings.graphicsQuality);
  const dpr: [number, number] =
    graphicsQuality === 'low' ? [0.65, 0.65]
      : graphicsQuality === 'medium' ? [0.85, 1.25]
        : [1, 2];
  const paused = useGameStore((s) => s.paused);
  const buildMode = useGameStore((s) => s.buildMode);
  const character = useGameStore((s) => s.character);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // hotkeys — looked up by action through the current keybinds, not the raw
  // key code, so rebinding in Options (see keybinds.ts) takes effect here
  // without touching this switch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useGameStore.getState();
      if (e.code === 'Escape') {
        if (st.panel !== 'none') st.setPanel('none');
        else if (st.buildMode) st.setBuildMode(false);
        else st.setPaused(!st.paused);
        return;
      }
      if (isRebindListening()) return; // Options screen is capturing this key itself
      const kb = useAppStore.getState().settings.keybinds;
      const action = Object.keys(kb).find((a) => kb[a] === e.code);
      switch (action) {
        case 'inventory':
          if (!st.paused) st.setPanel(st.panel === 'inventory' ? 'none' : 'inventory');
          break;
        case 'craft':
          if (!st.paused) st.setPanel(st.panel === 'crafting' ? 'none' : 'crafting');
          break;
        case 'quests':
          if (!st.paused) st.setPanel(st.panel === 'quests' ? 'none' : 'quests');
          break;
        case 'skills':
          if (!st.paused) st.setPanel(st.panel === 'skills' ? 'none' : 'skills');
          break;
        case 'build':
          if (
            !st.paused && st.panel === 'none' && !st.interior
            && (!st.destination || !!st.claimedWorlds[st.destination])
          ) st.setBuildMode(!st.buildMode);
          break;
        case 'camera':
          if (!st.paused && !st.buildMode) st.setCameraMode(st.cameraMode === 'fps' ? 'third' : 'fps');
          break;
        case 'emotes':
          if (!st.paused && !st.buildMode) st.setPanel(st.panel === 'emotes' ? 'none' : 'emotes');
          break;
        case 'roster':
          if (!st.paused && !st.buildMode) st.setPanel(st.panel === 'villagers' ? 'none' : 'villagers');
          break;
        case 'lore':
          if (!st.paused && !st.buildMode) st.setPanel(st.panel === 'chronicle' ? 'none' : 'chronicle');
          break;
        case 'bestiary':
          if (!st.paused && !st.buildMode) st.setPanel(st.panel === 'bestiary' ? 'none' : 'bestiary');
          break;
        case 'scan':
          // record whatever the crosshair is on — a no-op unless it is a foe
          // you have not written up yet (see gameStore.scanTarget)
          if (!st.paused && !st.buildMode && st.panel === 'none') st.scanTarget();
          break;
        case 'tactics':
          // I41 · hold to open the order radial. It is NOT a panel: opening a
          // panel releases pointer lock, and giving a routine order should
          // not interrupt mouse-look at all. Held open here, steered by the
          // mouse in PlayerController, committed on release below.
          if (!st.paused && !st.buildMode && st.panel === 'none' && !commandWheel.open) {
            openWheel(DEFENDER_ORDER_COUNT);
          }
          break;
        case 'photoMode':
          if (!st.paused && !st.buildMode && st.panel === 'none') st.setPhotoMode(!st.photoMode);
          break;
        case 'help':
          if (!st.paused && !st.buildMode && st.panel === 'none') push('help');
          break;
        case 'swapWeapon': {
          if (st.paused || st.buildMode || st.panel !== 'none') break;
          const hasCrossbow = (st.inventory.crossbow ?? 0) > 0;
          const hasLongbow = (st.inventory.longbow ?? 0) > 0;
          if (!hasCrossbow && !hasLongbow) break;
          const order = ['melee', 'crossbow', 'longbow'] as const;
          const current = combatState.weapon === 'melee' ? 'melee' : combatState.rangedWeapon;
          let idx = order.indexOf(current);
          let next: (typeof order)[number] = current;
          for (let i = 0; i < order.length; i++) {
            idx = (idx + 1) % order.length;
            const cand = order[idx];
            if (cand === 'melee' || (cand === 'crossbow' && hasCrossbow) || (cand === 'longbow' && hasLongbow)) {
              next = cand;
              break;
            }
          }
          combatState.weapon = next === 'melee' ? 'melee' : 'ranged';
          if (next !== 'melee') combatState.rangedWeapon = next;
          combatState.aiming = false;
          combatState.drawStart = 0;
          st.notify(
            next === 'melee' ? '⚔️ Melee readied'
              : next === 'crossbow' ? '🏹 Crossbow readied (RMB to aim)'
              : '🏹 Longbow readied (hold LMB to draw, release to loose)',
          );
          break;
        }
      }
    };
    // releasing the order key commits whatever sector the pointer landed on
    const onKeyUp = (e: KeyboardEvent) => {
      if (!commandWheel.open) return;
      const kb = useAppStore.getState().settings.keybinds;
      if (e.code !== kb.tactics) return;
      const pick = commandWheel.choice;
      closeWheel();
      if (pick >= 0) giveDefenderOrder(pick);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ambience + autosave
  useEffect(() => {
    audio.preload().then(() => audio.startAmbience());
    preloadCommonAssets();
    const deedTimer = setInterval(() => {
      const st = useGameStore.getState();
      if (!st.paused && st.character) st.checkDeeds();
      if (!st.paused && st.character) st.checkChallenges();
      if (!st.paused && st.character) statsAccum.playtimeSec += 4;
      if (statsAccum.distanceMeters > 0 || statsAccum.playtimeSec > 0) {
        st.flushStats({ distanceMeters: statsAccum.distanceMeters, playtimeSec: statsAccum.playtimeSec });
        statsAccum.distanceMeters = 0;
        statsAccum.playtimeSec = 0;
      }
    }, 4000);
    saveTimer.current = setInterval(async () => {
      const st = useGameStore.getState();
      if (st.dirty && st.character) {
        const ok = await persistSave(st.toSave(), useAppStore.getState().guest);
        if (ok) {
          st.markSaved();
          setHasSave(true);
        }
      }
    }, 20000);
    return () => {
      audio.stopAmbience();
      audio.stopAllLoops();
      clearInterval(deedTimer);
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, [setHasSave]);

  async function saveAndQuit() {
    const st = useGameStore.getState();
    if (st.character) {
      const ok = await persistSave(st.toSave(), guest);
      if (ok) setHasSave(true);
    }
    st.setPaused(false);
    resetTo('menu');
  }

  if (!character) return null;

  return (
    <div style={{ position: 'absolute', inset: 0 }} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        shadows={shadows}
        dpr={dpr}
        camera={{ fov, near: 0.1, far: 500, position: [0, 1.6, 26] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <GameWorld />
      </Canvas>
      <HUD />
      <TouchControls />
      <FactionTheme />
      <div className="hud" style={{ zIndex: 12 }}>
        {buildMode && <BuildBar />}
      </div>
      <Panels />
      {/* outside .hud on purpose: that layer is pointer-events:none, and the
          overlay's agent tabs have to be clickable when the pointer is free */}
      <AIDebugOverlay />
      {paused && <PauseMenu onQuit={saveAndQuit} />}
    </div>
  );
}
