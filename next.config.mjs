/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // the floating dev badge sat over the HUD's bottom-left resource bar
  devIndicators: false,
  // Requested 2026-07-31: `npm run dev` was sitting around ~2GB. Webpack's
  // dev-mode module graph for this project is large (three.js/R3F/drei plus
  // every game module), and its default in-memory caching optimizes for
  // rebuild SPEED over footprint. This is Next's own official knob for
  // exactly that trade-off ("reduces the max size of the heap but may
  // increase compile times slightly" — next.config type docs) — not a
  // workaround, the documented lever for this exact complaint.
  experimental: {
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
