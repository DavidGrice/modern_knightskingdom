'use client';
// Phase 20 styling v2: the UI's chrome swears allegiance. Gold text stays
// gold for everyone — both factions genuinely wear #eac000 (Leo's crown,
// Cedric's horns) — while the chrome triad (--chrome / --chrome-2 /
// --chrome-glow: every border, frame, divider, heraldic header band and
// hover glow) shifts with the sworn side via a [data-faction] attribute on
// the root element (see globals.css's token blocks): unsworn aged gold-iron,
// the crown blue/gold/white, the Bull red/grey/black. Values grounded in
// the extraction's own materials (see the faction-palette proposal artifact).
import { useEffect } from 'react';
import { useGameStore } from '@/game/store/gameStore';

export default function FactionTheme() {
  const alliance = useGameStore((s) => s.alliance);
  useEffect(() => {
    const root = document.documentElement;
    if (alliance) root.dataset.faction = alliance;
    else delete root.dataset.faction;
    return () => { delete root.dataset.faction; };
  }, [alliance]);
  return null;
}
