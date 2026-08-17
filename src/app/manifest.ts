import type { MetadataRoute } from 'next';

// Wave 15 (2026-08-17): "Add to Home Screen" / installable-PWA v1. Next 15's
// typed app/manifest.ts convention — no new art asset: public/icons/icon.svg
// is the same castle glyph already shipping as the browser-tab favicon
// (src/app/icon.svg, Next's separate file-convention icon route), just
// copied into public/ so this manifest has a stable, always-fetchable path
// of its own rather than depending on the favicon route's internals.
// Deliberately only one icon entry, sizes:'any' — modern Chromium/Android
// accept an SVG manifest icon directly at any resolution, so there's no
// real gap a generated set of PNG rasters would close here. Not marked
// purpose:'maskable': the source art fills close to the full 32x32 canvas
// with no safe-zone padding, so labelling it maskable would just get it
// cropped badly by Android's masking, not improved by it — a real PNG/SVG
// with genuine safe-zone padding is a fair follow-up, not this pass's job.
//
// No service worker yet (see layout.tsx's header comment) — a manifest
// without one is still a legitimate, spec-compliant install target on both
// iOS and Android; it just launches full-screen online rather than offline.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Knights' Kingdom — Modern",
    short_name: "Knights' Kingdom",
    description: 'A modern 3D remake adventure built with Next.js, React and Three.js',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    // matches html/body's own real background (globals.css) — the color an
    // installed launch actually shows before the game's own canvas paints
    background_color: '#0b0d12',
    // matches the icon's own plate colour (icon.svg / public/icons/icon.svg)
    theme_color: '#2a1c0e',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
