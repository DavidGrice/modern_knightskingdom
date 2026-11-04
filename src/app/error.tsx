'use client';
// F-06 · the last boundary: a throw in the app that none of the game's own boundaries caught (the panels and the world
// have theirs — components/ui/ErrorBoundary.tsx) lands here, in place of Next's bare "Application error" page. It is
// logged with its stack (lib/errorLog.ts), and a reload starts the game afresh; the saves are untouched.
import { useEffect } from 'react';
import { logError } from '@/lib/errorLog';

export default function AppError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => logError(error, 'app'), [error]);
  return (
    <main className="kk-screen kk-title-screen">
      <div className="kk-title-sky" />
      <div className="panel" style={{ width: 420, position: 'relative' }}>
        <h1 className="game-title" style={{ fontSize: 28 }}>Something Broke</h1>
        <p>The game met an error it could not get past. Your saved journey is safe.</p>
        <button className="menu-btn" onClick={() => window.location.reload()}>Reload</button>
      </div>
    </main>
  );
}
