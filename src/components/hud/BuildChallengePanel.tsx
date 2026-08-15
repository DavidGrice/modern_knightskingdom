'use client';
// Wave 13 · Timed Build Challenge — start button + live countdown for the
// one challenge ground that has the mechanic (game/buildChallenge.ts).
// Two small pieces in one file, both gated the same way ClaimBanner.tsx
// already gates its own button (only shown at the right destination, hidden
// while paused/building/a panel is open) since this is the same kind of
// "standalone HUD prompt, not the hold-E interaction system" affordance.
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import {
  buildChallengeState, startBuildChallenge,
  BUILD_CHALLENGE_ID, BUILD_CHALLENGE_TARGET, BUILD_CHALLENGE_TIME_MS,
} from '@/game/buildChallenge';

export default function BuildChallengePanel() {
  const destination = useGameStore((s) => s.destination);
  const claimed = useGameStore((s) => !!s.claimedWorlds[BUILD_CHALLENGE_ID]);
  const paused = useGameStore((s) => s.paused);
  const buildMode = useGameStore((s) => s.buildMode);
  const panel = useGameStore((s) => s.panel);
  const notify = useGameStore((s) => s.notify);
  // buildChallengeState is a plain leaf module (not store/React state, same
  // pattern as dungeonState/fishingState) — poll it on a rAF throttle the
  // same way DungeonStatus.tsx already does for its own non-reactive read.
  const [, setTick] = useState(0);
  const last = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last.current < 100) return;
      last.current = now;
      setTick((n) => n + 1);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (destination !== BUILD_CHALLENGE_ID || paused || buildMode || panel !== 'none') return null;
  // ClaimBanner.tsx already owns "claim this ground" at this exact screen
  // spot for every unclaimed destination (challenge-1 included, it excludes
  // only 'dungeon'/'arena') — showing the Start button on top of it here
  // would stack two buttons in the same place. Defer to it until claimed.
  if (!claimed && !buildChallengeState.active) return null;

  if (buildChallengeState.active) {
    const remainingMs = Math.max(0, buildChallengeState.deadline - performance.now());
    const frac = remainingMs / BUILD_CHALLENGE_TIME_MS;
    // no button while the countdown runs — plain HUD chrome, no `.clickable`
    // needed (and deliberately not added, so it can't eat clicks meant for
    // the world while a challenge is in progress)
    return (
      <div style={{ position: 'absolute', top: '16%', left: '50%', transform: 'translate(-50%,0)', textAlign: 'center', zIndex: 11 }}>
        <div className="rank-badge" style={{ minWidth: 0, padding: '7px 14px', display: 'inline-block' }}>
          <span style={{ fontSize: 14 }}>
            🔔 {Math.ceil(remainingMs / 1000)}s — {buildChallengeState.built}/{BUILD_CHALLENGE_TARGET} raised
          </span>
        </div>
        <div style={{ width: 200, height: 8, margin: '6px auto 0', borderRadius: 4, background: 'rgba(0,0,0,0.55)', border: '1px solid var(--chrome-2)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round(frac * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#c98a2c,#e8c141)' }} />
        </div>
      </div>
    );
  }

  return (
    // Bugfix (2026-08-14, found by Wave 13's verify pass): same fix as
    // ClaimBanner.tsx, whose pattern this panel copied bug and all — a plain
    // child of `.hud` never receives clicks (globals.css's
    // `.hud > * { pointer-events: none }`) without the `.clickable` escape
    // hatch DialoguePanel/Panels.tsx already rely on.
    <div className="clickable" style={{ position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 11, textAlign: 'center' }}>
      <button
        className="menu-btn"
        style={{ width: 'auto', padding: '10px 22px', whiteSpace: 'nowrap' }}
        onClick={() => {
          startBuildChallenge();
          notify(`The bell rings — raise ${BUILD_CHALLENGE_TARGET} pieces in ${BUILD_CHALLENGE_TIME_MS / 1000}s!`, true);
        }}
      >
        🔔 Ring the Bell — Raise {BUILD_CHALLENGE_TARGET} in {BUILD_CHALLENGE_TIME_MS / 1000}s
      </button>
    </div>
  );
}
