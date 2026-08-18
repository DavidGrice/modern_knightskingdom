// Wave 16 phase 1 — frame-profiling overlay's data half.
//
// A mutable leaf module, same "written every frame inside the Canvas, polled
// by DOM code outside it" convention `fpsMeter.ts` already uses — deliberately
// NOT zustand, so watching this costs nothing when the panel (PerfOverlay.tsx)
// is closed.
//
// Real gotcha (found reading three.js source, not assumed): WebGLRenderer's
// own `info.render.{calls,triangles,points,lines}` reset on EVERY call to
// `renderer.render()`, not once per rendered frame. PostProcessing.tsx's
// EffectComposer chain calls `renderer.render()` once per pass (RenderPass +
// each active AA/wet ShaderPass's FullScreenQuad) — left on three.js's
// default `autoReset = true`, reading `gl.info` after the frame would only
// ever show the LAST pass's ~1-quad stats the instant any AA mode or the
// rain "wet" pass is active. Fix (three.js's own documented pattern): this
// module takes ownership of `gl.info.autoReset = false` once, and
// `samplePerfFrame` — called from a normal priority-0 useFrame, which R3F
// runs BEFORE PostProcessing's priority-1 callback — copies out whatever
// accumulated across the ENTIRE previous frame's composer chain, then resets
// it itself before this frame's passes run. Net effect: one-frame-stale
// (~16ms, negligible) but a TRUE accumulated per-frame total, not a
// last-pass fragment.
//
// Known, disclosed limitation: shadow-map draws happen inside the same
// renderer.render() call but before the reset checkpoint, so they're reset
// away before being counted here — draw calls/triangles below are the main
// color pass (+ any composer passes) only, the same convention most
// browser-based profilers use.
//
// `memory.{geometries,textures}` and `programs` are untouched by any of
// this — tracked cumulatively on upload/dispose, never reset per-render — so
// those three fields are always accurate regardless of autoReset.
import type { WebGLRenderer } from 'three';

export const perfMeter = {
  drawCalls: 0,
  triangles: 0,
  points: 0,
  lines: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
};

let autoResetDisabled = false;

export function samplePerfFrame(gl: WebGLRenderer): void {
  if (!autoResetDisabled) {
    gl.info.autoReset = false;
    autoResetDisabled = true;
  }
  const r = gl.info.render;
  perfMeter.drawCalls = r.calls;
  perfMeter.triangles = r.triangles;
  perfMeter.points = r.points;
  perfMeter.lines = r.lines;
  perfMeter.geometries = gl.info.memory.geometries;
  perfMeter.textures = gl.info.memory.textures;
  perfMeter.programs = gl.info.programs?.length ?? 0;
  gl.info.reset();
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__kkperf = perfMeter;
}
