'use client';
// NPC_AI_SPEC §9's scene gizmos — "vision cone, belief markers at
// `lastKnownPosition` with confidence-scaled opacity", plus (phase 7) the
// combat actions' own chosen cover point and the believed threat it was chosen
// against. The name is phase 6's; the layer is "everything about an agent that
// is only answerable in world space", and a second `lineSegments` component
// drawing two more lines per agent would cost a draw call to say so.
//
// §0.5 is the reason this exists at all: "every layer ships with a debug
// visualization in the same session it's built. If the scores aren't visible
// on screen, the layer isn't done." Perception is the first layer in this
// system whose output is fundamentally SPATIAL — a threat number in the DOM
// panel tells you an agent is alarmed, but only a cone on the ground tells
// you it is alarmed by the raider it is facing rather than the one behind it,
// and only a belief marker tells you it is remembering a position the raider
// left four seconds ago.
//
// Everything is drawn into ONE `lineSegments` with preallocated buffers:
// one geometry, one draw call, zero allocation per frame (§0.4) even though
// this is debug-only code that is off by default. It reads `agentManager`
// directly rather than through a store — the same bare module-singleton read
// `AiRuntime.tsx` and `AIDebugOverlay.tsx` already make, and for the same
// reason: none of this data lives in zustand (§3.2), precisely so that
// watching it costs the game nothing.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PERCEPTION } from '../config';
import { agentManager } from '../core/AgentManager';
import { isHostileBeliefId } from '../perception/Belief';
import { peekCombatState } from '../actions/combatState';
import { aiDebugState } from './aiDebugState';

/** Sized for the §8 scale the whole system is built for ("6-20 active NPCs")
 *  with headroom. Anything past this simply isn't drawn — a debug view that
 *  reallocates its buffers mid-frame is a worse bug than a missing cone. */
const MAX_AGENTS = 32;
/** beliefs drawn per agent — a raid tops out well under this */
const MAX_BELIEFS_PER_AGENT = 8;
/** arc resolution of the cone's far edge */
const CONE_ARC_SEGMENTS = 10;

/** cone = 2 straight edges + the arc, then the peripheral ring, then per
 *  belief a tether from the agent plus a 2-stroke cross at the remembered
 *  position, then phase 7's combat pair: agent -> chosen cover point, and
 *  cover point -> the believed threat it was chosen against */
const CONE_LINES = 2 + CONE_ARC_SEGMENTS;
const RING_LINES = 16;
const BELIEF_LINES = 3;
const COMBAT_LINES = 2;
const MAX_LINES = MAX_AGENTS
  * (CONE_LINES + RING_LINES + COMBAT_LINES + MAX_BELIEFS_PER_AGENT * BELIEF_LINES);
const MAX_VERTS = MAX_LINES * 2;

/** drawn just off the ground so the lines are not z-fighting the terrain */
const Y = 0.06;

// palette: green = calm, amber = something noticed, red = threatened. Belief
// markers take the hostility of what they are about, and their brightness
// carries confidence — §9 asks for "confidence-scaled opacity", and
// brightness-on-black is the same signal for a line material where per-vertex
// alpha would need a custom shader.
const CALM = new THREE.Color(0x4fd08a);
const ALERT = new THREE.Color(0xffb060);
const HOSTILE = new THREE.Color(0xff5544);
const FRIENDLY = new THREE.Color(0x66ccff);
const _c = new THREE.Color();

export default function AIPerceptionGizmos() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_VERTS * 3), 3));
    g.setDrawRange(0, 0);
    return g;
  }, []);
  const linesRef = useRef<THREE.LineSegments>(null);
  // kept out of React state on purpose: flipping it is a render-loop concern,
  // and a setState here would re-render the whole scene subtree on a keypress
  const visible = useRef(false);

  useFrame(() => {
    const on = aiDebugState.gizmos;
    if (linesRef.current && visible.current !== on) {
      visible.current = on;
      linesRef.current.visible = on;
    }
    if (!on) return;

    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const col = geom.getAttribute('color') as THREE.BufferAttribute;
    const posArr = pos.array as Float32Array;
    const colArr = col.array as Float32Array;
    let v = 0;

    const push = (x1: number, z1: number, x2: number, z2: number, c: THREE.Color, mul: number) => {
      if (v + 2 > MAX_VERTS) return;
      const r = c.r * mul, g2 = c.g * mul, b = c.b * mul;
      let p = v * 3;
      posArr[p] = x1; posArr[p + 1] = Y; posArr[p + 2] = z1;
      colArr[p] = r; colArr[p + 1] = g2; colArr[p + 2] = b;
      p += 3;
      posArr[p] = x2; posArr[p + 1] = Y; posArr[p + 2] = z2;
      colArr[p] = r; colArr[p + 1] = g2; colArr[p + 2] = b;
      v += 2;
    };

    const vis = PERCEPTION.vision;
    const half = vis.fov / 2;
    const agents = agentManager.agents;
    const n = Math.min(agents.length, MAX_AGENTS);

    for (let i = 0; i < n; i++) {
      const a = agents[i];
      // Tier D has `perceiveHz` 0 — it genuinely is not looking at anything,
      // and drawing it a cone would be a lie the moment you tried to work out
      // why it never noticed the raider standing in front of it.
      if (a.perceiveHz <= 0) continue;
      const ax = a.position.x;
      const az = a.position.z;
      const threat = a.bb.threatLevel;
      _c.copy(threat > 0.05 ? (threat > 0.4 ? HOSTILE : ALERT) : CALM);

      // the cone: Locomotion.ts writes yaw as atan2(-nx,-nz), so the forward
      // bearing is yaw + PI in the standard atan2(x,z) sense — laid out here
      // by rotating the forward vector rather than by juggling that offset, so
      // the gizmo cannot drift from what VisionSensor actually tests
      const fx = -Math.sin(a.yaw);
      const fz = -Math.cos(a.yaw);
      /** the forward vector rotated by `t`, scaled to sight range — one
       *  formula for both cone edges and every arc segment, so the drawing
       *  cannot drift from the dot-product test VisionSensor actually runs */
      const rimX = (t: number) => ax + (fx * Math.cos(t) + fz * Math.sin(t)) * vis.range;
      const rimZ = (t: number) => az + (-fx * Math.sin(t) + fz * Math.cos(t)) * vis.range;
      push(ax, az, rimX(-half), rimZ(-half), _c, 1);
      push(ax, az, rimX(half), rimZ(half), _c, 1);
      for (let s = 0; s < CONE_ARC_SEGMENTS; s++) {
        const t0 = -half + (2 * half * s) / CONE_ARC_SEGMENTS;
        const t1 = -half + (2 * half * (s + 1)) / CONE_ARC_SEGMENTS;
        push(rimX(t0), rimZ(t0), rimX(t1), rimZ(t1), _c, 0.8);
      }

      // the 360° peripheral band — dimmer, because it is a real second sense
      // with its own radius and forgetting it exists is how you conclude the
      // cone is broken when something behind an NPC gets noticed anyway
      for (let s = 0; s < RING_LINES; s++) {
        const t0 = (s / RING_LINES) * Math.PI * 2;
        const t1 = ((s + 1) / RING_LINES) * Math.PI * 2;
        push(
          ax + Math.cos(t0) * vis.peripheralRange, az + Math.sin(t0) * vis.peripheralRange,
          ax + Math.cos(t1) * vis.peripheralRange, az + Math.sin(t1) * vis.peripheralRange,
          _c, 0.35,
        );
      }

      // belief markers at lastKnownPosition (§9), brightness = confidence
      let drawn = 0;
      for (const b of a.bb.beliefs.values()) {
        if (drawn >= MAX_BELIEFS_PER_AGENT) break;
        drawn++;
        const bc = isHostileBeliefId(b.entityId) ? HOSTILE : FRIENDLY;
        // floor the brightness so a belief at the 0.05 prune threshold is
        // still faintly visible — an invisible marker and a pruned one would
        // look identical, which is exactly the distinction you open this for
        const mul = 0.25 + 0.75 * b.confidence;
        const bx = b.lastKnownPosition.x;
        const bz = b.lastKnownPosition.z;
        // tether: which agent holds this belief, dashed-looking by drawing
        // only the half nearest the remembered position
        push(ax + (bx - ax) * 0.5, az + (bz - az) * 0.5, bx, bz, bc, mul * 0.5);
        // a cross at the remembered position — larger while actually visible,
        // so "I can see it right now" reads differently from "I remember it"
        const r = b.isVisibleNow ? 0.55 : 0.3;
        push(bx - r, bz, bx + r, bz, bc, mul);
        push(bx, bz - r, bx, bz + r, bc, mul);
      }

      // Phase 7 (§0.5 for the combat layer): where this agent decided to stand
      // and what it decided that against. The DOM panel can print both pairs of
      // coordinates, but only the drawing answers the question you actually
      // open this for — is the piece it picked genuinely between the two of
      // them, or did chooseCover put it on the raider's side of the barn.
      // Amber leg = the run to cover; hostile-red leg = cover -> believed
      // threat, so a good choice reads as a bent elbow with the agent and the
      // threat at opposite ends.
      const cbs = peekCombatState(a.id);
      if (cbs && cbs.mode) {
        push(ax, az, cbs.coverX, cbs.coverZ, ALERT, 0.9);
        push(cbs.coverX, cbs.coverZ, cbs.threatX, cbs.threatZ, HOSTILE, 0.55);
      }
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    geom.setDrawRange(0, v);
  });

  return (
    <lineSegments ref={linesRef} geometry={geom} frustumCulled={false} visible={false} renderOrder={999}>
      <lineBasicMaterial vertexColors transparent opacity={0.9} depthTest={false} />
    </lineSegments>
  );
}
