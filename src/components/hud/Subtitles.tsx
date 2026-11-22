'use client';
// G-09 · the subtitle of the line being spoken (game/subtitles.ts): the speaker and the words, low in the middle of
// the screen — above the claim and challenge banners' slot (92 px up) and clear of the toasts' column on the right —
// on a layer of its own under the panels (GameScreen.tsx), so it shows in build mode too. The region stays in the page
// with or without a line, so a screen reader hears each one as it comes (aria-live).
import { useGameStore } from '@/game/store/gameStore';
import { useSubtitle } from '@/game/subtitles';

export default function Subtitles() {
  const line = useSubtitle((s) => s.line);
  const photoMode = useGameStore((s) => s.photoMode);
  return (
    <div className="kk-subtitles" role="status" aria-live="polite">
      {line && !photoMode && (
        <div className="kk-subtitle">
          <b className="who">{line.speaker}:</b> <span>{line.text}</span>
        </div>
      )}
    </div>
  );
}
