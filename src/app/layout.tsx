import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Knights' Kingdom — Modern",
  description: 'A modern 3D remake adventure built with Next.js, React and Three.js',
};

// mobile-friendly pass (2026-07-20): pin the layout viewport and block the
// pinch-zoom/double-tap-zoom gestures that would otherwise fight the game's
// own touch camera-look and virtual joystick (see TouchControls.tsx)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
