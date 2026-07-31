'use client';
// Requested 2026-07-30: the homestead roster should show each villager's
// real face, not a generic job emoji (`<Ico e={jobDef.icon}/>`, unrelated to
// how they actually look — `VillagersPanel.tsx`).
//
// A real live-3D preview already exists (`RotatablePreview.tsx`) — reused
// today in the Appearance panel and `NpcEquipPanel`, always ONE instance at a
// time. Embedding it directly into the roster list would mean N simultaneous
// live WebGL canvases (one per row, up to `MAX_VILLAGERS`); no precedent for
// that anywhere in this codebase. So this bakes a thumbnail instead: one
// shared hidden Canvas renders each distinct appearance once, snapshots it
// with `toDataURL`, and caches the PNG — every row after that is a plain
// `<img>`, not a live render.
//
// The cache is keyed on the same fields `RiggedFigure`'s own effect depends
// on (headDonor/bodyDonor/armColor/handColor/legColor/hipColor), not on
// villager id — two villagers who happen to share an appearance correctly
// share a portrait, and an Appearance-panel edit correctly busts the cache
// for whoever it was applied to.
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import RiggedFigure from './RiggedFigure';
import type { RiggedMinifig } from '@/lib/minifigRig';
import type { CharacterConfig } from '@/game/types';

const PORTRAIT_SIZE = 96;

function keyFor(config: CharacterConfig): string {
  return [config.headDonor, config.bodyDonor, config.armColor, config.handColor, config.legColor, config.hipColor].join('|');
}

const cache = new Map<string, string>();
const queue: { key: string; config: CharacterConfig }[] = [];
const queued = new Set<string>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function requestPortrait(config: CharacterConfig) {
  const key = keyFor(config);
  if (cache.has(key) || queued.has(key)) return;
  queued.add(key);
  queue.push({ key, config });
  notify(); // wake the factory even if it's idle with an empty queue
}

/** The cached PNG for this look, or null while it's still queued/baking —
 *  callers fall back to something else (the old job icon) until it resolves. */
export function usePortrait(config: CharacterConfig): string | null {
  const key = keyFor(config);
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => {
    requestPortrait(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return cache.get(key) ?? null;
}

/** Renders whichever job is current, waits a couple of real frames past
 *  "rig assembled" so the renderer has actually drawn it at least once, then
 *  force-renders and snapshots. `preserveDrawingBuffer` on the Canvas below
 *  is what makes `toDataURL` reliable right after a render — without it the
 *  browser is free to have already discarded the drawing buffer. */
function Capture({ job, onDone }: { job: { key: string; config: CharacterConfig }; onDone: () => void }) {
  const { gl, scene, camera } = useThree();
  const [rig, setRig] = useState<RiggedMinifig | null>(null);
  const framesReady = useRef(0);
  // guards against baking the same job twice: `onDone`'s state change takes
  // a render to actually swap this component's `job` prop out, and useFrame
  // keeps firing in the meantime
  const bakedRef = useRef(false);

  useEffect(() => {
    setRig(null);
    framesReady.current = 0;
    bakedRef.current = false;
  }, [job.key]);

  useFrame(() => {
    if (!rig || bakedRef.current) return;
    framesReady.current++;
    if (framesReady.current < 3) return;
    bakedRef.current = true;
    gl.render(scene, camera);
    cache.set(job.key, gl.domElement.toDataURL('image/png'));
    notify();
    onDone();
  });

  return (
    <group position={[0, -0.82, 0]} rotation={[0, 0.35, 0]}>
      <RiggedFigure config={job.config} height={1.75} clip="anim_r_restpose" onReady={setRig} />
    </group>
  );
}

/** Mount exactly once per panel that shows portraits (the module-level cache
 *  persists across mounts, so re-opening a panel reuses whatever was already
 *  baked and only queues genuinely new/changed looks). */
export function PortraitFactory() {
  const [job, setJob] = useState<{ key: string; config: CharacterConfig } | null>(null);
  // `busyRef` (not `job` itself) is what guards against double-dequeuing.
  // `notify()` fires synchronously from every `usePortrait` mount effect —
  // when several villager rows request a portrait in the same commit, `pump`
  // can run several times before React has actually applied the FIRST
  // `setJob` (state updates are batched/async). A `job` closure check reads
  // the pre-batch value on every one of those calls, so each one would shift
  // and discard its own queue entry into a `setJob` that the next call
  // immediately overwrites — real symptom seen live: 4 requested, 3 silently
  // dropped, the 4th baked twice. A ref updates immediately, not batched, so
  // it is correct across calls within the same synchronous burst.
  const busyRef = useRef(false);

  const takeNext = () => {
    if (busyRef.current) return;
    const next = queue.shift();
    if (!next) return;
    queued.delete(next.key);
    busyRef.current = true;
    setJob(next);
  };

  useEffect(() => {
    takeNext();
    listeners.add(takeNext);
    return () => { listeners.delete(takeNext); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDone = () => {
    busyRef.current = false;
    takeNext();
  };

  return (
    <div style={{ position: 'fixed', top: -9999, left: -9999, width: PORTRAIT_SIZE, height: PORTRAIT_SIZE, pointerEvents: 'none' }}>
      <Canvas
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [0, 0.28, 1.15], fov: 30 }}
      >
        <ambientLight intensity={1.25} />
        <directionalLight position={[3, 5, 4]} intensity={2.4} />
        <directionalLight position={[-3, 2, -3]} intensity={0.65} color="#ffd9a0" />
        {job && <Capture job={job} onDone={handleDone} />}
      </Canvas>
    </div>
  );
}
