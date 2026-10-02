// CLN-02 · an additive, opt-in unit-test layer for pure logic: `npm run test:unit`. It is deliberately NOT a CI
// gate — CI still runs only tsc + next build (see .github/workflows/ci.yml); whether tests ever become a required
// check is an open owner decision in CLEANUP_PLAN.md. Tests live next to the module they cover as *.test.ts.
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
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
