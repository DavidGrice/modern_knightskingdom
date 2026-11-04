// CLN-02 · the unit-test layer for pure logic: `npm run test:unit`. Since wave 63.1 (FEATURE_PLAN.md F-07, OD-11) it
// is a step of CI's required "Typecheck & build" job (.github/workflows/ci.yml), so a failing test blocks the merge.
// Tests live next to the module they cover as *.test.ts.
//
// `vite` is pinned to ^7 in package.json on purpose: vite 8 bundles with rolldown, whose freshly downloaded
// unsigned native binary this development machine's Windows Application Control policy blocks (ERR_DLOPEN_FAILED).
// vite 7's esbuild + rollup binaries load fine. Revisit when that policy or rolldown's signing changes.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // the same `@/*` → `src/*` alias tsconfig.json declares
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // A test may load a component (*.tsx) to call it as a plain function. tsconfig.json says `jsx: preserve`, which
  // leaves the JSX for Next to finish; here it is compiled the way Next does it, with the automatic runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
