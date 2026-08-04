'use client';
// Requested 2026-07-31: real anti-aliasing options (Off/FXAA/SMAA/Supersample
// 2x — see aaModes.ts for why WebGL can't offer a literal "2x/4x/16x" MSAA
// picker the way a native game does). Built entirely from three.js's own
// bundled `examples/jsm/postprocessing`/`shaders` modules — no new npm
// dependency, no `@react-three/postprocessing` wrapper.
//
// Uses React Three Fiber's manual-render-takeover mechanism: any `useFrame`
// subscriber with a priority > 0 makes R3F skip its own automatic
// `gl.render(scene, camera)` call for the WHOLE canvas and expects that
// subscriber to render instead (verified directly against the installed
// @react-three/fiber source — `internal.priority` bookkeeping). This
// component is the only priority>0 subscriber anywhere in the codebase, and
// it is ALWAYS mounted (never conditionally, so R3F's priority accounting
// never flaps mid-session) — its callback just branches internally: with no
// active composer (`aaMode === 'off'`) it does the exact `gl.render(scene,
// camera)` R3F would have done on its own, so "Off" is byte-identical to
// today's behavior and costs one extra `if` per frame.
//
// Why 2x is the ceiling for the supersample tier, not 4x/8x/16x: this
// approach's cost is the SQUARE of the multiplier (2x per axis = ~4x total
// pixel-shading work already); 4x would be ~16x the cost for diminishing
// visual return, unworkable for sustained 60fps. A jittered multi-sample
// accumulator (three.js's own SSAARenderPass) was considered and rejected
// for the same reason at an even steeper cost — it re-renders the ENTIRE
// scene, shadow pass included, once per sample (2-16x depending on
// settings), a poor fit for a continuously-moving FPS camera. Supersampling
// via an oversized composer buffer instead costs a single, predictable,
// bounded ~4x pixel-shading pass — no extra scene traversal, no jitter.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import type { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { useAppStore } from '@/game/store/appStore';
import { GRAPHICS_PROFILES } from '@/game/graphicsProfiles';
import { worldEnv } from '@/game/env';

// Requested 2026-08-04: a cheap screen-space "wet look" for rain — the
// scoped-down option (see ROADMAP.md's own note on this) of the three
// considered: no per-character material work, no per-character drip
// particles/shaders, just one extra full-screen color-grade pass that
// darkens, boosts saturation a touch, and fakes a specular sheen on bright
// areas — the same trick most games use for rain ambiance. `rainAmount`
// (0..1) is updated from `worldEnv.rain` every frame below; at 0 the shader
// reduces to the identity transform, so leaving the pass wired in through a
// dry spell costs a near-zero fragment-shader branchless lerp, not a real
// per-frame cost swing. Gated on GRAPHICS_PROFILES[tier].wetPostProcess —
// off entirely on Performance, since skipping the pass is strictly cheaper
// than any cheaper version of doing it.
const WetShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    rainAmount: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float rainAmount;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 c = texel.rgb;
      // darken toward a wet look
      c *= mix(1.0, 0.82, rainAmount);
      // a touch more saturated — wet surfaces read richer, not washed out
      float luma = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(luma), c, mix(1.0, 1.25, rainAmount));
      // cheap fake specular sheen: push already-bright areas brighter,
      // approximating the glossy highlights a real wet-surface BRDF would
      // give without actually computing one
      c += max(c - 0.6, 0.0) * (rainAmount * 0.35);
      gl_FragColor = vec4(c, texel.a);
    }
  `,
};

// Requested 2026-08-03: a real WebGL context loss (a GPU driver reset, the
// tab losing GPU priority, sustained memory pressure — anything the browser
// itself decides warrants tearing the context down) is a hard freeze with
// nothing on screen ever moving again: rendering stops silently the instant
// it happens, and per the WebGL spec a lost context stays lost forever
// UNLESS something calls `preventDefault()` on the `webglcontextlost` event
// specifically — no code anywhere in this codebase did, confirmed by
// searching. A full reload is the recovery, not an attempt to hand-rebuild
// this file's own composer/passes/every mounted mesh's GPU resources in
// place — for a game this size that's a large surface to get exactly right,
// where a working reload already exists for free and a partial, subtly
// wrong recovery would be worse than the black screen it replaces.
function useContextLossRecovery(gl: THREE.WebGLRenderer) {
  useEffect(() => {
    const el = gl.domElement;
    const onLost = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.error('[webgl] context lost — reloading to recover');
    };
    const onRestored = () => window.location.reload();
    el.addEventListener('webglcontextlost', onLost);
    el.addEventListener('webglcontextrestored', onRestored);
    return () => {
      el.removeEventListener('webglcontextlost', onLost);
      el.removeEventListener('webglcontextrestored', onRestored);
    };
  }, [gl]);
}

export default function PostProcessing() {
  const aaMode = useAppStore((s) => s.settings.aaMode);
  const wetEligible = useAppStore((s) => GRAPHICS_PROFILES[s.settings.graphicsQuality].wetPostProcess);
  const { gl, scene, camera, size } = useThree();
  if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__kkgl = gl;
  useContextLossRecovery(gl);
  const composerRef = useRef<EffectComposer | null>(null);
  // every pass instance added this mode, tracked for disposal — including
  // RenderPass/OutputPass, which are recreated fresh per mode rather than
  // shared across switches, kept simple over kept-warm
  const passesRef = useRef<Pass[]>([]);
  // only set for 'fxaa': ShaderPass has no built-in setSize hook that
  // touches FXAAShader's own `resolution` uniform (unlike SMAAPass, which
  // handles its own internal targets/uniforms in its own setSize override),
  // so the resize effect below updates it by hand
  const fxaaPassRef = useRef<InstanceType<typeof ShaderPass> | null>(null);
  const wetPassRef = useRef<InstanceType<typeof ShaderPass> | null>(null);

  // (Re)build the pipeline whenever the AA mode (or the renderer/scene/
  // camera identity, which never actually changes post-mount here) changes.
  // Deliberately rebuilds RenderPass/OutputPass from scratch every time
  // rather than trying to reuse them across modes — EffectComposer.dispose()
  // only frees its own two internal ping-pong render targets, NOT any pass
  // added via addPass() (verified directly in the three.js source), so every
  // pass this effect creates must be disposed in its own cleanup below, or
  // switching AA modes in Options repeatedly leaks GPU render targets and
  // textures.
  useEffect(() => {
    // "off" only skips the composer entirely when the wet pass isn't
    // eligible either — Performance tier + AA off stays byte-identical to
    // before (direct gl.render, see the useFrame below), but Balanced/Ultra
    // players who happen to have AA off still get rain's wet look, since
    // that's an orthogonal preference from anti-aliasing.
    if (aaMode === 'off' && !wetEligible) {
      composerRef.current = null;
      fxaaPassRef.current = null;
      wetPassRef.current = null;
      return;
    }

    const composer = new EffectComposer(gl);
    const passes: Pass[] = [];
    const renderPass = new RenderPass(scene, camera);
    const outputPass = new OutputPass();

    if (aaMode === 'smaa') {
      // SMAAPass's own doc comment: "operates in linear-srgb ... must be
      // executed before OutputPass" — the normal order.
      const smaaPass = new SMAAPass();
      composer.addPass(renderPass);
      composer.addPass(smaaPass);
      composer.addPass(outputPass);
      passes.push(renderPass, smaaPass, outputPass);
    } else if (aaMode === 'fxaa') {
      // The ONE mode where OutputPass is NOT last. FXAA's edge/luma
      // heuristic is calibrated for the already gamma-encoded, tone-mapped
      // image (matches three.js's own official FXAA example ordering) — run
      // it before OutputPass and it operates on the wrong color space.
      const fxaaPass = new ShaderPass(FXAAShader);
      composer.addPass(renderPass);
      composer.addPass(outputPass);
      composer.addPass(fxaaPass);
      passes.push(renderPass, outputPass, fxaaPass);
      fxaaPassRef.current = fxaaPass;
    } else {
      // supersample2x, or "off" with only the wet pass wanted: no AA shader
      // at all — see the resize effect below for where 2x resolution is
      // applied (composer.setPixelRatio), skipped for the "off" case.
      composer.addPass(renderPass);
      composer.addPass(outputPass);
      passes.push(renderPass, outputPass);
    }

    // Wet look always goes last — a final color-grade over whatever AA (or
    // no AA) already produced, the same place a photo filter would sit.
    if (wetEligible) {
      const wetPass = new ShaderPass(WetShader);
      composer.addPass(wetPass);
      passes.push(wetPass);
      wetPassRef.current = wetPass;
    } else {
      wetPassRef.current = null;
    }

    passesRef.current = passes;
    composerRef.current = composer;
    // sized once immediately so the very first frame after a mode switch is
    // already correct, not waiting on the resize effect's next fire
    composer.setPixelRatio(aaMode === 'supersample2x' ? gl.getPixelRatio() * 2 : gl.getPixelRatio());
    composer.setSize(size.width, size.height);
    if (fxaaPassRef.current) {
      const pr = gl.getPixelRatio();
      fxaaPassRef.current.material.uniforms.resolution.value.set(1 / (size.width * pr), 1 / (size.height * pr));
    }

    return () => {
      for (const p of passesRef.current) p.dispose();
      passesRef.current = [];
      composer.dispose();
      composerRef.current = null;
      fxaaPassRef.current = null;
      wetPassRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, aaMode, wetEligible]);

  // Resize/pixel-ratio sync — useLayoutEffect so a mid-resize frame never
  // renders through a stale-sized composer.
  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const pr = gl.getPixelRatio();
    composer.setPixelRatio(aaMode === 'supersample2x' ? pr * 2 : pr);
    composer.setSize(size.width, size.height);
    if (fxaaPassRef.current) {
      fxaaPassRef.current.material.uniforms.resolution.value.set(1 / (size.width * pr), 1 / (size.height * pr));
    }
  }, [size.width, size.height, aaMode, gl]);

  // Always subscribed at the same priority for this component's whole
  // mounted lifetime (mounted unconditionally in GameWorld.tsx) — see the
  // header comment for why priority must never flap between 0 and >0.
  useFrame((_, delta) => {
    if (wetPassRef.current) wetPassRef.current.uniforms.rainAmount.value = worldEnv.rain;
    const composer = composerRef.current;
    if (composer) composer.render(delta);
    else gl.render(scene, camera);
  }, 1);

  return null;
}
