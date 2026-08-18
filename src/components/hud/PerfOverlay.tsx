'use client';
// Wave 16 phase 1 — the frame-profiling overlay's DOM half. Mirrors
// AIDebugOverlay.tsx's convention exactly: always mounted regardless of
// open/closed state, a keydown listener (gated by isRebindListening() so it
// doesn't fire while Options is capturing a rebind) flips a local `open`
// boolean, and while open a 100ms setInterval forces a repaint rather than
// subscribing to per-frame state directly — costs the game nothing when shut.
//
// Toggle key: F3 — grepped free (no existing binding/handler used it),
// deliberately distinct from `AIDebugOverlay`'s ` family so it reads as its
// own instrument.
import { useEffect, useState } from 'react';
import { isRebindListening } from '@/game/data/keybinds';
import { fpsMeter } from '@/game/fpsMeter';
import { perfMeter } from '@/game/perfMeter';

// Chrome/Edge-only non-standard heap counters — same "undefined elsewhere is
// 'no signal', never treated as zero" guard precedent deviceProfile.ts
// already uses for navigator.deviceMemory.
function readHeapMB(): { used: number; limit: number } | null {
  const mem = (performance as unknown as {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  }).memory;
  if (!mem) return null;
  return { used: mem.usedJSHeapSize / 1048576, limit: mem.jsHeapSizeLimit / 1048576 };
}

export default function PerfOverlay() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'F3' || isRebindListening()) return;
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const fps = fpsMeter.value;
  const frameMs = fps > 0 ? 1000 / fps : 0;
  const heap = readHeapMB();

  return (
    <div className="perf-debug">
      <div className="perf-debug-head">
        <b>PERF</b>
        <span>F3 to hide</span>
      </div>
      <div className="perf-debug-row">
        FPS <b>{fps.toFixed(0)}</b> · FRAME <b>{frameMs.toFixed(2)}ms</b>
      </div>
      <div className="perf-debug-row">
        DRAW CALLS <b>{perfMeter.drawCalls}</b>
      </div>
      <div className="perf-debug-row">
        TRIANGLES <b>{perfMeter.triangles.toLocaleString()}</b>
      </div>
      {perfMeter.points > 0 && (
        <div className="perf-debug-row perf-debug-dim">POINTS {perfMeter.points}</div>
      )}
      {perfMeter.lines > 0 && (
        <div className="perf-debug-row perf-debug-dim">LINES {perfMeter.lines}</div>
      )}
      <div className="perf-debug-row perf-debug-dim">
        GEOMETRIES {perfMeter.geometries} · TEXTURES {perfMeter.textures} · PROGRAMS{' '}
        {perfMeter.programs}
      </div>
      {heap && (
        <div className="perf-debug-row perf-debug-dim">
          JS HEAP {heap.used.toFixed(0)}MB / {heap.limit.toFixed(0)}MB
        </div>
      )}
    </div>
  );
}
