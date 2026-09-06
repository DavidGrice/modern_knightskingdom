'use client';
// Wave 43 (B6) — start button + live readout for whichever of the 3 new
// challenge mechanics (game/challengeModes.ts) applies to the ground the
// player is currently standing on. One component, branching internally,
// rather than three near-identical files — copies BuildChallengePanel.tsx's
// exact shape (gated on destination + claimed + not paused/buildMode/panel-
// open, a leaf-module run-state polled on a rAF throttle, Start button,
// live countdown) for each branch.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import {
  isGatherChallenge, isDefendChallenge, isJoustChallenge,
  gatherChallengeState, startGatherChallenge, GATHER_TARGET_COUNT, GATHER_TIME_MS,
  defendChallengeState, startDefendChallenge, DEFEND_TIME_MS, DEFEND_START_HP,
  joustChallengeState, startJoustChallenge, JOUST_RING_COUNT, JOUST_TIME_MS,
} from '@/game/challengeModes';

const BADGE: CSSProperties = { position: 'absolute', top: '16%', left: '50%', transform: 'translate(-50%,0)', textAlign: 'center', zIndex: 11 };
const BAR_WRAP: CSSProperties = { width: 200, height: 8, margin: '6px auto 0', borderRadius: 4, background: 'rgba(0,0,0,0.55)', border: '1px solid var(--chrome-2)', overflow: 'hidden' };
const START_WRAP: CSSProperties = { position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 11, textAlign: 'center' };

function Bar({ frac, color }: { frac: number; color: string }) {
  return (
    <div style={BAR_WRAP}>
      <div style={{ width: `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`, height: '100%', background: color }} />
    </div>
  );
}

export default function ChallengePanels() {
  const destination = useGameStore((s) => s.destination);
  const claimed = useGameStore((s) => (destination ? !!s.claimedWorlds[destination] : false));
  const paused = useGameStore((s) => s.paused);
  const buildMode = useGameStore((s) => s.buildMode);
  const panel = useGameStore((s) => s.panel);
  const notify = useGameStore((s) => s.notify);
  // all three states below are plain leaf modules (game/challengeModes.ts),
  // not store/React state — poll on a rAF throttle, same convention
  // BuildChallengePanel/ArenaHud already use for their own non-reactive reads.
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

  if (!destination || paused || buildMode || panel !== 'none') return null;

  if (isGatherChallenge(destination)) {
    const g = gatherChallengeState;
    // ClaimBanner.tsx already owns "claim this ground" at this exact screen
    // spot for every unclaimed destination — defer to it until claimed.
    if (!claimed && !g.active) return null;
    if (g.active) {
      const remainingMs = Math.max(0, g.deadline - performance.now());
      const collected = g.points.filter((p) => p.collected).length;
      return (
        <div style={BADGE}>
          <div className="rank-badge" style={{ minWidth: 0, padding: '7px 14px', display: 'inline-block' }}>
            <span style={{ fontSize: 14 }}>🌿 {Math.ceil(remainingMs / 1000)}s — {collected}/{GATHER_TARGET_COUNT} gathered</span>
          </div>
          <Bar frac={remainingMs / GATHER_TIME_MS} color="linear-gradient(90deg,#2c8ac9,#41c1e8)" />
        </div>
      );
    }
    return (
      <div className="clickable" style={START_WRAP}>
        <button
          className="menu-btn"
          style={{ width: 'auto', padding: '10px 22px', whiteSpace: 'nowrap' }}
          onClick={() => {
            startGatherChallenge(destination);
            notify(`Gather ${GATHER_TARGET_COUNT} markers in ${GATHER_TIME_MS / 1000}s!`, true);
          }}
        >
          🌿 Start the Gather Race — {GATHER_TARGET_COUNT} in {GATHER_TIME_MS / 1000}s
        </button>
      </div>
    );
  }

  if (isDefendChallenge(destination)) {
    const d = defendChallengeState;
    if (!claimed && !d.active) return null;
    if (d.active) {
      const remainingMs = Math.max(0, d.deadline - performance.now());
      return (
        <div style={BADGE}>
          <div className="rank-badge" style={{ minWidth: 0, padding: '7px 14px', display: 'inline-block' }}>
            <span style={{ fontSize: 14 }}>🛡️ {Math.ceil(remainingMs / 1000)}s — banner holding</span>
          </div>
          <Bar frac={d.plotHp / DEFEND_START_HP} color="linear-gradient(90deg,#8a2c2c,#e85f5f)" />
        </div>
      );
    }
    return (
      <div className="clickable" style={START_WRAP}>
        <button
          className="menu-btn"
          style={{ width: 'auto', padding: '10px 22px', whiteSpace: 'nowrap' }}
          onClick={() => {
            startDefendChallenge(destination);
            notify(`Raise the banner — defend the plot for ${DEFEND_TIME_MS / 1000}s!`, true);
          }}
        >
          🛡️ Defend the Plot — Hold {DEFEND_TIME_MS / 1000}s
        </button>
      </div>
    );
  }

  if (isJoustChallenge(destination)) {
    const j = joustChallengeState;
    if (!claimed && !j.active) return null;
    if (j.active) {
      const remainingMs = Math.max(0, j.deadline - performance.now());
      const avgPrecision = j.hits > 0 ? Math.round((j.precisionSum / Math.max(1, j.ringIndex)) * 100) : 0;
      return (
        <div style={BADGE}>
          <div className="rank-badge" style={{ minWidth: 0, padding: '7px 14px', display: 'inline-block' }}>
            <span style={{ fontSize: 14 }}>🏇 {Math.ceil(remainingMs / 1000)}s — ring {Math.min(j.ringIndex + 1, JOUST_RING_COUNT)}/{JOUST_RING_COUNT} ({avgPrecision}% precision)</span>
          </div>
          <Bar frac={j.ringIndex / JOUST_RING_COUNT} color="linear-gradient(90deg,#c98a2c,#e8c141)" />
        </div>
      );
    }
    return (
      <div className="clickable" style={START_WRAP}>
        <button
          className="menu-btn"
          style={{ width: 'auto', padding: '10px 22px', whiteSpace: 'nowrap' }}
          onClick={() => {
            startJoustChallenge(destination);
            notify(`Ready the lance — clear ${JOUST_RING_COUNT} rings in ${JOUST_TIME_MS / 1000}s!`, true);
          }}
        >
          🏇 Ready the Lance — {JOUST_RING_COUNT} Rings in {JOUST_TIME_MS / 1000}s
        </button>
      </div>
    );
  }

  return null;
}
