'use client';
// Wave 33: KTX2/Basis Universal texture support, shared by every useGLTF()
// call site (InstancedProps.tsx, PropModel.tsx, TemplateWorld.tsx,
// Terrain.tsx). Registers a KTX2Loader on the GLTFLoader drei's useGLTF()
// constructs, using this GPU's actual detected compressed-texture support
// (KTX2Loader.detectSupport(gl) — a KTX2 texture transcodes to whichever of
// S3TC/ETC/PVRTC/ASTC the real device supports, decided at runtime, so this
// call genuinely can't be skipped even though nothing today emits KTX2 yet).
//
// Self-hosted transcoder (public/basis/basis_transcoder.js + .wasm, copied
// verbatim from three's own npm package — see that folder's own presence in
// public/), not a CDN dependency: this project already commits every other
// runtime asset itself (see .gitignore's public/assets carve-out) and a
// third-party CDN would be one more thing that can go down independently of
// this app.
//
// Genuinely a no-op today: confirmed live (2026-09-02) that zero current
// GLBs declare KHR_texture_basisu — the encoder step (compress-textures.mjs)
// is gated on the `ktx` CLI binary, which this machine doesn't have and
// can't install unattended (see that script's own header). The moment a
// compressed GLB exists anywhere under public/assets, every one of the four
// consumers below picks it up automatically — that's the whole point of
// centralizing this one hook instead of wiring KTX2Loader ad hoc per file.
import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { KTX2Loader, type GLTFLoader } from 'three-stdlib';

// module-scope singleton, same convention drei's own Gltf.js uses for its
// DRACOLoader — one transcoder instance/worker pool for the whole app, not
// one per useGLTF() call site.
let ktx2Loader: KTX2Loader | null = null;

/** Returns a stable `extendLoader`-shaped callback for useGLTF()'s 4th
 *  argument (drei's own Gltf.js: `extendLoader(loader)` runs on the raw
 *  GLTFLoader BEFORE Draco/Meshopt are attached — same slot those two use,
 *  just for the texture side instead of the geometry side). Needs `gl`
 *  (from useThree, not available inside the extend callback itself) to call
 *  detectSupport, so this has to be a hook, not a bare function like
 *  gamepadInput.ts's constants — every call site already runs inside the
 *  Canvas tree, so this is a normal hook call, not a new architectural
 *  pattern for those components. */
export function useKtx2ExtendLoader(): (loader: GLTFLoader) => void {
  const gl = useThree((s) => s.gl);
  return useMemo(() => (loader: GLTFLoader) => {
    if (!ktx2Loader) {
      ktx2Loader = new KTX2Loader().setTranscoderPath('/basis/');
    }
    ktx2Loader.detectSupport(gl);
    loader.setKTX2Loader(ktx2Loader);
  }, [gl]);
}
