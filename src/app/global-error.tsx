'use client';
// F-06 · app/error.tsx's stand-in for a throw in the root layout itself, which that boundary sits inside: it replaces
// the whole document, so it brings its own <html> and plain styles. Logged like the rest (lib/errorLog.ts).
import { useEffect } from 'react';
import { logError } from '@/lib/errorLog';

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => logError(error, 'app'), [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#2a1c0e', color: '#f1e3c4', fontFamily: 'Georgia, serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Something Broke</h1>
          <p>The game met an error it could not get past. Your saved journey is safe.</p>
          <button onClick={() => window.location.reload()} style={{ fontSize: 18, padding: '8px 24px' }}>Reload</button>
        </div>
      </body>
    </html>
  );
}
