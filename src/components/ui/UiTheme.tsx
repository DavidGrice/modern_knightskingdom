'use client';
// UI lane + quality driver (2026-07-25, from the UI handoff pack).
//
// The handoff ships four approved surface treatments over ONE set of metrics,
// so the whole look swaps by changing a single attribute — nothing reflows.
// `data-kk-lane` on <html> selects the treatment; globals.css maps it onto the
// game's existing panel/HUD classes rather than every component having to know
// which lane it's in.
//
// `data-kk-quality` is the token sheet's own perf escape hatch: at "low" it
// drops `backdrop-filter` for a flat tint (the handoff budgets at most four
// blurred surfaces on screen). It's driven off the existing graphics-quality
// setting so there's no second control to keep in sync.
import { useEffect } from 'react';
import { useAppStore } from '@/game/store/appStore';

export default function UiTheme() {
  const uiTheme = useAppStore((s) => s.settings.uiTheme);
  const graphicsQuality = useAppStore((s) => s.settings.graphicsQuality);

  useEffect(() => {
    document.documentElement.dataset.kkLane = uiTheme;
  }, [uiTheme]);

  useEffect(() => {
    document.documentElement.dataset.kkQuality = graphicsQuality === 'performance' ? 'low' : 'high';
  }, [graphicsQuality]);

  return null;
}
