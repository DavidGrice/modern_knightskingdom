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
import { difficultyState, DRAGON_TIER } from '@/game/difficulty';
import { COMBAT, LOD, NEED_IDS, PERCEPTION } from '../config';
import { agentManager } from '../core/AgentManager';
import { coarseSteppedLastFrame } from '../core/Locomotion';
import type { Intent } from '../core/Agent';
import { isHostileBeliefId } from '../perception/Belief';
import { peekPerceptionState } from '../perception/state';
import { peekCombatState } from '../actions/combatState';
import { aiDebugState, toggleAiGizmos } from './aiDebugState';

/** ".72" / "1.00", the format §9's mock-up prints needs and scores in */
function dec(v: number): string {
  if (v >= 1) return '1.00';
  if (v <= 0) return '.00';
  return v.toFixed(2).slice(1);
}

/** Phase 3, iteration 3.6 — one line per Intent variant, params and all.
 *  Nothing renders MOVE_TO_ANCHOR's target as anything friendlier than its
 *  raw TargetId here on purpose: resolving it to a name would mean this
 *  debug-only file reaching into TargetRegistry for a cosmetic label, and
 *  the id is exactly what a hardcoded intent queue's own author typed in
 *  (§3.5's verification driver), so it is the more useful form to see. */
function describeIntent(intent: Intent | null): string {
  if (!intent) return '—';
  switch (intent.type) {
    case 'MOVE_TO':
      return `MOVE_TO (${intent.position.x.toFixed(1)}, ${intent.position.z.toFixed(1)}) ${intent.speed} stop${intent.stopDistance}`;
    case 'MOVE_TO_ANCHOR':
      return `MOVE_TO_ANCHOR ${intent.targetId}@${intent.anchorName} ${intent.speed}`;
    case 'PLAY_ANIM':
      return `PLAY_ANIM ${intent.clip} ${intent.loop ? 'loop' : 'once'}${intent.anchored ? ' anchored' : ''}`;
    case 'FACE':
      return `FACE (${intent.target.x.toFixed(1)}, ${intent.target.z.toFixed(1)})`;
    case 'IDLE':
      return 'IDLE';
  }
}

export default function AIDebugOverlay() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [, force] = useState(0);
  const photoMode = useGameStore((s) => s.photoMode);

  // `~` toggles (§9); Shift+`~` cycles the watched agent, because with the
  // pointer locked to the canvas the rows below are not clickable. Alt+`~`
  // toggles §9's scene gizmos (phase 6's vision cones + belief markers) —
  // handled here rather than in the gizmo component because this overlay is
  // mounted whether the panel is open or not, so the cones can be watched
  // without a wall of text over them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Backquote' || isRebindListening()) return;
      if (e.altKey) { toggleAiGizmos(); force((n) => n + 1); }
      else if (e.shiftKey) setSelected((s) => s + 1);
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
  // §6 — sensor-internal bookkeeping (perception/state.ts), deliberately NOT
  // on the Blackboard. `peek` never creates an entry, so opening this panel
  // cannot change what an agent perceives; undefined simply means this agent
  // has not run a think tick since the perception layer loaded.
  const ps = agent ? peekPerceptionState(agent.id) : undefined;
  // §7 — the same rule, for the combat actions' own decision state
  // (actions/combatState.ts): which believed hostile is being answered and
  // what was picked to stand behind. Written only by take_cover/engage_threat,
  // so `undefined` means this agent has never run one.
  const cbs = agent ? peekCombatState(agent.id) : undefined;
  // Which of `take_cover`'s three gate regimes is holding it up right now
  // (takeCover.ts's `coverThreatInput`). The SCORED ACTIONS list cannot say:
  // all three print through the same `threat_high` row, and while travelling
  // that row reads a flat `cover.commitThreat` (.80) by COMMITMENT rather than
  // because threat is really .80 — without this the panel would look like it
  // was lying about the sensor.
  const coverHold = !cbs || cbs.mode !== 'cover' ? null
    : cbs.coverArrived ? `watching · release <${COMBAT.cover.sustainThreat}`
      : agentManager.now - cbs.coverStartedAt < COMBAT.cover.commitSec
        ? `committed ${(agentManager.now - cbs.coverStartedAt).toFixed(1)}/${COMBAT.cover.commitSec}s`
        : 'en route · commitment expired';

  return (
    <div className="ai-debug">
      <div className="ai-debug-head">
        <b>NPC AI</b>
        <span>phase 8 · LOD + ambient</span>
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
        {/* §8's other half, and the only one with no per-agent row to show it:
            how many agents last frame had an Intent and NO renderer to act on
            it, so `stepUnrenderedAgents` coarse-stepped them itself. Zero is
            the normal reading at home — it should climb the moment the player
            steps through a portal and every home villager goes tier D. If it
            stays at zero there, the sweep is not reaching them and §8's
            "jump along their path" is silently doing nothing. */}
        {' · COARSE '}
        {coarseSteppedLastFrame}
      </div>

      {/* O7 · the shared threat tier. Here rather than in the game HUD
          because it is a tuning instrument, not player-facing information. */}
      <div className="ai-debug-row ai-debug-dim">
        THREAT TIER <b>{difficultyState.tier}</b> · struct {difficultyState.structures} · skill{' '}
        {difficultyState.skill} · kills {difficultyState.kills} · day {difficultyState.days}
        {' · DIFF '}
        <b>{difficultyState.difficultyMult.toFixed(2)}x</b>
        <br />
        DRAGON{' '}
        <span className={difficultyState.tier >= DRAGON_TIER && difficultyState.rangedReady ? '' : 'ai-warn'}>
          {difficultyState.tier >= DRAGON_TIER
            ? (difficultyState.rangedReady ? 'ALLOWED' : 'BLOCKED — no ranged weapon + ammo')
            : `BLOCKED — tier ${difficultyState.tier}/${DRAGON_TIER}`}
        </span>
        {difficultyState.blocking.length > 0 && (
          <>
            <br />
            NEXT TIER NEEDS {difficultyState.blocking.join(' · ')}
          </>
        )}
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
            AGENT <b>{agent.id}</b> · TIER <b>{agent.tier}</b>
            {/* WHY this tier, not just which one. C has three separate causes
                (behind the camera, past a windowed region's nav bound, or past
                farDistance) and they are diagnosed completely differently — an
                agent stuck on C in front of the player is a frustum bug, one
                capped at 60 m is working exactly as authored. Only the two
                flagged causes can be named; a bare "C" is the frustum one. */}
            {agent.boundCapped && <span className="ai-debug-dim"> (window edge)</span>}
            {agent.distanceCapped && (
              <span className="ai-debug-dim"> (past {LOD.farDistance}m)</span>
            )} · ACTION{' '}
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

          {/* §3.4's debug addition: current Intent (type, params, elapsed)
              plus bb.movement.status — the actuation layer's own state,
              distinct from bb.currentActionId above (phase 5's Activity id,
              still unset until the reasoner exists). Elapsed reads
              Agent.intentSetAt, stamped by the `intent` setter itself
              (iteration 3.6) against AgentManager.now, so it stays correct
              even if the panel was closed when the intent was assigned. */}
          <div className="ai-debug-row ai-debug-dim">
            INTENT {describeIntent(agent.intent)}
            {agent.intent && ` · ${(agentManager.now - agent.intentSetAt).toFixed(1)}s`}
            {' · MOVEMENT '}
            {agent.bb.movement.status}
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

          {/* §6.3/§9 — THREAT shows the SMOOTHED `bb.threatLevel` every
              action's `not_threatened` consideration actually reads, and
              after the arrow the raw per-tick target it is chasing. Same
              rule §9 states for considerations (show the input AND the
              output): with only the smoothed number on screen, "the
              derivation is wrong" and "the smoothing has not caught up yet"
              look identical, and they are the two things you come here to
              tell apart. */}
          <div className="ai-debug-row ai-debug-dim">
            THREAT {dec(agent.bb.threatLevel)}
            {ps && <> →{dec(ps.threatTarget)}</>} · BELIEFS {agent.bb.beliefs.size} · COOLDOWNS{' '}
            {agent.bb.cooldowns.size} · POS {agent.position.x.toFixed(1)},{' '}
            {agent.position.z.toFixed(1)} · HOME {agent.region ?? 'home'}
          </div>

          {/* §6.1/§6.2 — the sensor's own shape and this tick's real work.
              `los n/4` is §6.1's per-agent raycast budget: seeing it pegged
              at the cap is how you find out candidates are being round-
              robined rather than ignored. */}
          <div className="ai-debug-row ai-debug-dim">
            SEE {Math.round((PERCEPTION.vision.fov * 180) / Math.PI)}° ·{' '}
            {PERCEPTION.vision.range}m (+{PERCEPTION.vision.peripheralRange}m 360°) · HEAR{' '}
            {Math.round(PERCEPTION.hearing.radiusPerLoudness)}m@1.0
            {agent.perceiveHz <= 0
              ? <span className="ai-warn"> · TIER D — perception off (§8)</span>
              : ps && (
                <>
                  {' · seen '}{ps.seenCount} · heard {ps.heardCount} · los {ps.losChecks}/
                  {PERCEPTION.vision.losChecksPerTick} · react {Math.round(ps.reactionTime * 1000)}ms
                </>
              )}
          </div>

          {/* §7 — the combat actions' own decision, which the score list
              cannot show: WHICH believed hostile is being answered (never a
              live mob — §3.3), where that belief put it, and what was chosen
              to stand behind. A cover point next to the wrong side of a wall,
              or one that reads `open ground` in a settlement full of walls, is
              a chooseCover bug and nothing else on screen would say so.
              `since` is how stale the answer is: the pair (threat position,
              cover point) is only re-decided when the belief moves more than
              cover.repathDistance. */}
          {cbs && cbs.mode && (
            <div className="ai-debug-row ai-debug-dim">
              COMBAT <b>{cbs.mode}</b> · vs {cbs.targetBeliefId ?? '—'} @ {cbs.threatX.toFixed(1)},{' '}
              {cbs.threatZ.toFixed(1)}
              {cbs.mode === 'cover' ? (
                <>
                  {' · behind '}<b>{cbs.coverLabel}</b> @ {cbs.coverX.toFixed(1)}, {cbs.coverZ.toFixed(1)} ·{' '}
                  {Math.hypot(cbs.coverX - agent.position.x, cbs.coverZ - agent.position.z).toFixed(1)}m to go ·{' '}
                  <b>{coverHold}</b>
                </>
              ) : (
                <> · swing {cbs.swingCd > 0 ? `${cbs.swingCd.toFixed(1)}s` : 'ready'} · hits {cbs.hits}</>
              )}
            </div>
          )}

          <div className="ai-debug-row ai-debug-head2">BELIEFS</div>
          {agent.bb.beliefs.size === 0 && (
            <div className="ai-debug-row ai-debug-dim">— nothing sensed</div>
          )}
          {/* §3.3's record, field for field: confidence, whether it is a live
              sighting or a memory, and `lastKnownPosition` — which is the
              whole point of the type and the only position anything
              downstream is allowed to read. A belief whose marker sits where
              the raider ISN'T is correct behaviour, and this row is how you
              confirm that rather than filing it as a bug. */}
          {[...agent.bb.beliefs.values()].map((b) => (
            <div key={b.entityId} className={`ai-debug-score ${b.isVisibleNow ? '' : 'gated'}`}>
              <span className="v">{dec(b.confidence)}</span>
              <span className="a">{b.entityId}</span>
              <span className="c">[{isHostileBeliefId(b.entityId) ? 'hostile' : 'neutral'}]</span>
              <span className="c">
                [{b.isVisibleNow ? 'SEEN' : `memory ${(agentManager.now - b.lastSeenAt).toFixed(1)}s`}]
              </span>
              <span className="c">
                [at {b.lastKnownPosition.x.toFixed(1)}, {b.lastKnownPosition.z.toFixed(1)} ·{' '}
                {Math.hypot(
                  b.lastKnownPosition.x - agent.position.x,
                  b.lastKnownPosition.z - agent.position.z,
                ).toFixed(1)}m]
              </span>
            </div>
          ))}

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
          {agent.bb.lastScores.map((s, i) => (
            // Phase 5, final validation pass (5.9) — keying by s.actionId
            // alone was fine when built (phase 1, before per-target
            // expansion existed): every action had at most one scored
            // entry. gather_resource/haul_to_deposit (5.4+) can now
            // legitimately produce several entries sharing the SAME
            // actionId, one per nearby target — a real React duplicate-key
            // warning, found live running several AI-driven villagers
            // together for the first time. ScoredAction doesn't carry a
            // target id (Blackboard.ts), so the array index is the
            // simplest disambiguator; order is stable within a single
            // render (lastScores is overwritten whole, not mutated).
            <div key={`${s.actionId}-${i}`} className={`ai-debug-score ${s.gated ? 'gated' : ''}`}>
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
        ` hide · Shift+` next agent · Alt+` gizmos{' '}
        <b>{aiDebugState.gizmos ? 'ON' : 'off'}</b>
      </div>
    </div>
  );
}
