'use client';
// NPC_AI_SPEC §9 — the debug overlay, built in phase 1 rather than last.
//
// §0.5: a layer without a debug view is not finished. This panel is the whole
// deliverable of phase 1 — the agent it watches deliberately does nothing, so
// what is on screen here IS the proof that the clock, the scheduler and the
// LOD tiering work.
//
// It re-renders at 10 Hz on an interval, matching the fastest think rate.
// Never at frame rate, and never off a store subscription: none of this data
// lives in zustand (§3.2) precisely so that watching it costs the game
// nothing when the panel is shut.

import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { isRebindListening } from '@/game/data/keybinds';
import { NEED_IDS } from '../config';
import { agentManager } from '../core/AgentManager';

/** ".72" / "1.00", the format §9's mock-up prints needs and scores in */
function dec(v: number): string {
  if (v >= 1) return '1.00';
  if (v <= 0) return '.00';
  return v.toFixed(2).slice(1);
}

export default function AIDebugOverlay() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [, force] = useState(0);
  const photoMode = useGameStore((s) => s.photoMode);

  // `~` toggles (§9); Shift+`~` cycles the watched agent, because with the
  // pointer locked to the canvas the rows below are not clickable
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Backquote' || isRebindListening()) return;
      if (e.shiftKey) setSelected((s) => s + 1);
      else setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [open]);

  if (!open || photoMode) return null;

  const agents = agentManager.agents;
  const agent = agents.length ? agents[selected % agents.length] : null;

  return (
    <div className="ai-debug">
      <div className="ai-debug-head">
        <b>NPC AI</b>
        <span>phase 1 · skeleton</span>
        <span className="ai-debug-dim">
          {agents.length} agent{agents.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="ai-debug-row ai-debug-dim">
        CLOCK {agentManager.now.toFixed(1)}s · THINKS {agentManager.thinksPerSec.toFixed(1)}/s ·
        {' PEAK '}
        <span className={agentManager.peakThinksPerFrame >= agentManager.thinkBudget ? 'ai-warn' : ''}>
          {agentManager.peakThinksPerFrame}/{agentManager.thinkBudget}
        </span>
        {' per frame'}
        {agentManager.deferredLastFrame > 0 && (
          <span className="ai-warn"> · {agentManager.deferredLastFrame} DEFERRED</span>
        )}
        {' · REGION '}
        {agentManager.activeRegion ?? 'home'}
      </div>

      {agents.length > 1 && (
        <div className="ai-debug-tabs">
          {agents.map((a, i) => (
            <button
              key={a.id}
              className={i === selected % agents.length ? 'on' : ''}
              onClick={() => setSelected(i)}
            >
              {a.id}
            </button>
          ))}
        </div>
      )}

      {!agent && <div className="ai-debug-row">no agents registered</div>}

      {agent && (
        <>
          <div className="ai-debug-row">
            AGENT <b>{agent.id}</b> · TIER <b>{agent.tier}</b> · ACTION{' '}
            <b>
              {agent.bb.currentActionId
                ? `${agent.bb.currentActionId} (${(agentManager.now - agent.bb.currentActionStartedAt).toFixed(1)}s)`
                : '—'}
            </b>
          </div>
          <div className="ai-debug-row ai-debug-dim">
            {agent.def.label} · think {agent.measuredHz.toFixed(1)}/{agent.thinkHz} Hz · see{' '}
            {agent.perceiveHz} Hz · steer {agent.steering} · #{agent.thinkCount}
          </div>

          <div className="ai-debug-row">
            NEEDS
            {NEED_IDS.map((id) => {
              const v = agent.bb.needs[id];
              return (
                <span key={id} className={`ai-need ${v < 0.25 ? 'urgent' : ''}`}>
                  {id} {dec(v)}
                </span>
              );
            })}
          </div>

          <div className="ai-debug-row ai-debug-dim">
            THREAT {dec(agent.bb.threatLevel)} · BELIEFS {agent.bb.beliefs.size} · COOLDOWNS{' '}
            {agent.bb.cooldowns.size} · POS {agent.position.x.toFixed(1)},{' '}
            {agent.position.z.toFixed(1)} · HOME {agent.region ?? 'home'}
          </div>

          <div className="ai-debug-row ai-debug-dim">
            INTRINSIC {agent.def.intrinsic.join(', ')}
          </div>

          <div className="ai-debug-row ai-debug-head2">SCORED ACTIONS</div>
          {agent.bb.lastScores.length === 0 && (
            <div className="ai-debug-row ai-debug-dim">
              — no reasoner yet (spec §5, phase 5)
            </div>
          )}
          {/* the renderer is here in full so phase 5 only has to fill
              bb.lastScores: §9 requires the input AND the post-curve output of
              every consideration, or a bad curve is indistinguishable from a
              bad input */}
          {agent.bb.lastScores.map((s) => (
            <div key={s.actionId} className={`ai-debug-score ${s.gated ? 'gated' : ''}`}>
              <span className="v">{s.score.toFixed(3)}</span>
              <span className="a">{s.actionId}</span>
              {s.considerations.map((c) => (
                <span key={c.name} className="c">
                  [{c.name} {dec(c.input)}→{dec(c.output)}]
                </span>
              ))}
              {s.gated && <span className="g">← GATED</span>}
            </div>
          ))}
        </>
      )}

      <div className="ai-debug-row ai-debug-dim ai-debug-hint">
        ` hide · Shift+` next agent
      </div>
    </div>
  );
}
