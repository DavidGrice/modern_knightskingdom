import type { Metadata, Viewport } from 'next';
import './globals.css';

// Wave 15 (2026-08-17): installable-PWA v1. The <link rel="manifest"> tag
// itself needs no entry here — Next auto-detects app/manifest.ts and always
// wins the `metadata.manifest` field regardless of what's set on this
// object (see resolve-metadata.js's mergeStaticMetadata, which overwrites it
// unconditionally whenever that file exists). `appleWebApp` still has to be
// set explicitly though: it covers the apple-mobile-web-app-* meta tags iOS
// wants even though it ignores the real manifest file entirely (a
// long-standing Safari quirk, not a Next gap) — a typed Metadata sub-field,
// so no raw <head> JSX is needed. No service worker yet: real offline
// caching for a 597+ binary-asset game is a materially bigger, separate
// lift (cache strategy, versioning, an asset manifest) — this ships
// "installs and launches full-screen", a real, spec-compliant improvement
// on its own, and leaves true offline support as a documented follow-up.
export const metadata: Metadata = {
  title: "Knights' Kingdom — Modern",
  description: 'A modern 3D remake adventure built with Next.js, React and Three.js',
  appleWebApp: {
    capable: true,
    title: "Knights' Kingdom",
    statusBarStyle: 'black-translucent',
  },
};

// mobile-friendly pass (2026-07-20): pin the layout viewport and block the
// pinch-zoom/double-tap-zoom gestures that would otherwise fight the game's
// own touch camera-look and virtual joystick (see TouchControls.tsx)
//
// themeColor (Wave 15, 2026-08-17): the browser-chrome/status-bar tint —
// lives on Viewport, not Metadata, since Next 14 (theme-color is a viewport
// concept per spec). Same value as manifest.ts's theme_color, so an
// installed app and an ordinary browser tab tint identically.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#2a1c0e',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
