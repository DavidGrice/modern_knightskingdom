'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useAppStore } from '@/game/store/appStore';
import { closeWheel, commandWheel, openWheel } from '@/game/commandWheel';
import { DEFENDER_ORDER_COUNT, giveDefenderOrder } from '@/game/data/defenderOrders';
import { useGameStore } from '@/game/store/gameStore';
import { persistSave } from '@/lib/save';
import { audio } from '@/lib/audio';
import { cycleWeapon } from '@/game/combat';
import { isRebindListening } from '@/game/data/keybinds';
import { statsAccum } from '@/game/statsAccum';
import { preloadCommonAssets } from '@/game/preload';
import { GRAPHICS_PROFILES } from '@/game/graphicsProfiles';
import { crashIfArmed } from '@/game/crashTest';
import { FAILED_FRAMES_TO_STOP, WATCH_BEGIN_PRIORITY, WATCH_END_PRIORITY, makeFrameWatch } from '@/game/frameWatch';
import { releaseGameLock } from '@/game/pointerLock';
import { errorLog } from '@/lib/errorLog';
import { saveAndLeave, startAutosave } from '@/game/autosave';
import ErrorBoundary from '../ui/ErrorBoundary';
import GameWorld from '../world/GameWorld';
import HUD from '../hud/HUD';
import TouchControls from '../hud/TouchControls';
import FactionTheme from '../hud/FactionTheme';
import Panels from '../hud/Panels';
import BuildBar from '../hud/BuildBar';
import AIDebugOverlay from '@/ai/debug/AIDebugOverlay';
import PerfOverlay from '@/components/hud/PerfOverlay';
// side-effect import: registers window.__kkdata and, in development, logs any quest/cast data violation
import '@/game/data/validate';

// F-08a · Save & Quit leaves only once the save is written (`onQuit` answers why not, or null when it left): a
// failure stays in the game, with the reason and the choice of trying again or leaving without saving
function PauseMenu({ onQuit, onQuitUnsaved }: { onQuit: () => Promise<string | null>; onQuitUnsaved: () => void }) {
  const setPaused = useGameStore((s) => s.setPaused);
  const push = useAppStore((s) => s.push);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const saveAndQuit = async () => {
    setSaving(true);
    const why = await onQuit();
    setSaving(false);
    setProblem(why);
  };
  if (problem) {
    return (
      <div className="pause-overlay clickable">
        <div className="panel" role="alertdialog" style={{ width: 420 }}>
          <h1 className="game-title" style={{ fontSize: 28 }}>Not Saved</h1>
          <p>Your holdfast was not saved: {problem}. You are still in the game, and nothing has been lost.</p>
          <button className="menu-btn" disabled={saving} onClick={saveAndQuit}>{saving ? 'Saving…' : 'Retry'}</button>
          <button className="menu-btn danger" disabled={saving} onClick={onQuitUnsaved}>Quit without saving</button>
          <button className="menu-btn" disabled={saving} onClick={() => setProblem(null)}>Back</button>
        </div>
      </div>
    );
  }
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
          onClick={saveAndQuit}
        >
          {saving ? 'Saving…' : 'Save & Return to Menu'}
        </button>
      </div>
    </div>
  );
}

// F-06 · what stands in the world's place when it fails: the store and the last autosave are untouched (autosave
// stops with the world), and a reload brings the game back from that save
function WorldFailed() {
  return (
    <div className="pause-overlay clickable" style={{ zIndex: 30 }}>
      <div className="panel" style={{ width: 420 }}>
        <h1 className="game-title" style={{ fontSize: 28 }}>The World Has Faltered</h1>
        <p>Something in the world broke and it could not go on. Your last autosave is safe.</p>
        <button className="menu-btn" onClick={() => window.location.reload()}>Reload</button>
      </div>
    </div>
  );
}

// F-06 · a frame that throws never reaches the scene's error boundary (game/frameWatch.ts says why): this watches the
// world's own frames from inside its Canvas and calls `onStop` once FAILED_FRAMES_TO_STOP in a row have failed
function FrameWatch({ onStop }: { onStop: () => void }) {
  const [watch] = useState(makeFrameWatch);
  useFrame(() => {
    if (watch.begin() >= FAILED_FRAMES_TO_STOP) onStop();
  }, WATCH_BEGIN_PRIORITY);
  useFrame(() => watch.end(), WATCH_END_PRIORITY);
  return null;
}

// F-06 · ...and this throws where the scene's boundary sees it: beside the Canvas, not in it, since a throw in the
// Canvas's own tree reaches the window as well as the boundary, and the log would hold it twice
function WorldStopped(): null {
  const last = errorLog[errorLog.length - 1];
  throw new Error(`the world stopped: ${FAILED_FRAMES_TO_STOP} frames in a row threw${last ? ` (${last.message})` : ''}`);
}

// F-06 · the frame crash test (game/crashTest.ts)
function FrameCrashTest() {
  useFrame(() => crashIfArmed('frame'));
  return null;
}

export default function GameScreen() {
  const guest = useAppStore((s) => s.guest);
  const resetTo = useAppStore((s) => s.resetTo);
  const push = useAppStore((s) => s.push);
  const setHasSave = useAppStore((s) => s.setHasSave);
  const shadows = useAppStore((s) => s.settings.shadows);
  const fov = useAppStore((s) => s.settings.fov);
  const graphicsQuality = useAppStore((s) => s.settings.graphicsQuality);
  const profile = GRAPHICS_PROFILES[graphicsQuality];
  const aaMode = useAppStore((s) => s.settings.aaMode);
  const paused = useGameStore((s) => s.paused);
  const buildMode = useGameStore((s) => s.buildMode);
  const character = useGameStore((s) => s.character);
  const autosave = useRef<{ stop: () => void } | null>(null);
  const [saveProblem, setSaveProblem] = useState<string | null>(null);
  const [worldStopped, setWorldStopped] = useState(false);

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
          // mouse (components/fps/input/usePointerLock.ts), committed on release below.
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
        case 'swapWeapon':
          // Wave 15 · the cycling logic itself now lives in combat.ts
          // (cycleWeapon()) so a gamepad's Y button can call the exact same
          // function instead of a second hand-copied cycle drifting apart
          // from this one (see CombatController.tsx's gamepad block).
          if (st.paused || st.buildMode || st.panel !== 'none') break;
          cycleWeapon();
          break;
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
    preloadCommonAssets(profile.preloadEnemyDonors);
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
    // F-08a · every 20 s while there is anything to save; a failure shows on the HUD's chip and is tried again
    // sooner, backing off (game/autosave.ts)
    autosave.current = startAutosave(async () => {
      const st = useGameStore.getState();
      if (!st.dirty || !st.character) return null;
      const r = await persistSave(st.toSave(), useAppStore.getState().guest);
      if (r.ok) {
        st.markSaved();
        setHasSave(true);
      }
      return r;
    }, setSaveProblem);
    return () => {
      audio.stopAmbience();
      audio.stopAllLoops();
      clearInterval(deedTimer);
      autosave.current?.stop();
    };
  }, [setHasSave]);

  function quit() {
    useGameStore.getState().setPaused(false);
    resetTo('menu');
  }

  function saveAndQuit(): Promise<string | null> {
    const st = useGameStore.getState();
    if (!st.character) {
      quit();
      return Promise.resolve(null);
    }
    return saveAndLeave(() => persistSave(st.toSave(), guest), () => {
      setHasSave(true);
      quit();
    });
  }

  // F-06 · the world failed: free the pointer for the card's button, and autosave no more over the last good save
  function worldFailed() {
    releaseGameLock();
    autosave.current?.stop();
  }

  if (!character) return null;

  return (
    <div style={{ position: 'absolute', inset: 0 }} onContextMenu={(e) => e.preventDefault()}>
      <ErrorBoundary name="scene" fallback={<WorldFailed />} onError={worldFailed}>
        <Canvas
          shadows={shadows}
          dpr={profile.dpr}
          // Requested 2026-07-31: once any PostProcessing AA mode is active,
          // hardware MSAA on the (now offscreen, non-multisampled-target)
          // default framebuffer is inert overhead regardless — this just
          // avoids paying for it. `antialias` is a context-creation attribute
          // (can't change on an already-created WebGL context), so this only
          // takes effect on the next full Canvas mount, same category of
          // limitation as the quality tier's own antialias/powerPreference.
          gl={{ antialias: profile.gl.antialias && aaMode === 'off', powerPreference: profile.gl.powerPreference }}
          camera={{ fov, near: 0.1, far: 500, position: [0, 1.6, 26] }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <GameWorld />
          <FrameCrashTest />
          <FrameWatch onStop={() => setWorldStopped(true)} />
        </Canvas>
        {worldStopped && <WorldStopped />}
      </ErrorBoundary>
      <HUD saveProblem={saveProblem} />
      <TouchControls />
      <FactionTheme />
      <div className="hud" style={{ zIndex: 12 }}>
        {buildMode && <BuildBar />}
      </div>
      <Panels />
      {/* outside .hud on purpose: that layer is pointer-events:none, and the
          overlay's agent tabs have to be clickable when the pointer is free */}
      <AIDebugOverlay />
      <PerfOverlay />
      {paused && <PauseMenu onQuit={saveAndQuit} onQuitUnsaved={quit} />}
    </div>
  );
}
