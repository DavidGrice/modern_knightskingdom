'use client';
// Change how your character looks, mid-game.
//
// Appearance used to be a one-shot decision at Forge Your Hero: pick a face
// and four colours, then live with them for the whole save. That is a poor
// trade for something the HUD now shows you constantly (the vitals crest
// portrait) and which the first-person view wears on its sleeves. This is
// the same set of choices the creator offers, reachable from the Satchel,
// writing straight back to `character` — every consumer already keys off
// that (rigExtract caches by appearance, so the viewmodel arms and the
// portrait both follow with no explicit invalidation).
//
// It deliberately does NOT offer gender, calling or name. Those are
// identity, not looks: switching calling would retroactively change an
// earned XP bonus, and the name is on the save.
import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { FACE_OPTIONS, CREST_OPTIONS } from '@/game/data/minifigs';
import { crestLocked, crestLockHint } from '@/game/data/crestUnlocks';
import { swatchIndices } from '@/game/data/dyes';
import { loadPalette } from '@/lib/minifig';
import RotatablePreview from '../character/RotatablePreview';
import KkIcon from '../ui/KkIcon';
import MenuTabs from './MenuTabs';
import DyeRack from './DyeRack';

export default function AppearancePanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const character = useGameStore((s) => s.character);
  const setCharacter = useGameStore((s) => s.setCharacter);
  // Wave 9 · the free swatches PLUS whatever dye rows this save has opened
  // (data/dyes.ts). The character creator deliberately does NOT read this —
  // it runs before a save exists, so it keeps offering exactly the free set.
  const dyes = useGameStore((s) => s.dyes);
  const [swatches, setSwatches] = useState<{ index: number; css: string }[]>([]);

  useEffect(() => {
    loadPalette().then((colors) => {
      setSwatches(swatchIndices(dyes).map((i) => {
        const [r, g, b] = colors[i] ?? [128, 128, 128];
        return { index: i, css: `rgb(${r},${g},${b})` };
      }));
    });
  }, [dyes]);

  if (!character) return null;

  // the creator picks a gender and filters by it; mid-game we only know the
  // donor that was chosen, so offer whichever list contains it
  const gender = FACE_OPTIONS.find((f) => f.id === character.headDonor)?.gender ?? 'male';
  const faces = FACE_OPTIONS.filter((f) => f.gender === gender);
  const crests = CREST_OPTIONS.filter((c) => c.gender === gender).map((c) => ({
    ...c, locked: crestLocked(c.id), lockHint: crestLockHint(c.id),
  }));

  const set = (patch: Partial<typeof character>) => setCharacter({ ...character, ...patch });

  const Swatches = ({ label, value, onPick }: {
    label: string; value: number; onPick: (i: number) => void;
  }) => (
    <div className="kk-swatch-group">
      <div className="creator-section">{label}</div>
      <div className="kk-swatches">
        {swatches.map((c) => (
          <button
            key={c.index}
            type="button"
            aria-label={`${label} ${c.index}`}
            className={`kk-swatch ${value === c.index ? 'on' : ''}`}
            style={{ background: c.css }}
            onClick={() => onPick(c.index)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>Appearance</h2>
      <div className="panel-scroll">
        <div className="equip-layout" style={{ marginBottom: 18 }}>
          <RotatablePreview
            config={character}
            height={2.2}
            clip="anim_r_restpose"
            className="equip-preview"
            cameraZ={4.4}
          />
          <div className="equip-slots">
            <div className="creator-section">Face</div>
            <div className="kk-faces">
              {faces.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`kk-face ${character.headDonor === o.id ? 'on' : ''}`}
                  title={o.label}
                  onClick={() => set({ headDonor: o.id })}
                >
                  <img src={o.thumb} alt={o.label} draggable={false} />
                </button>
              ))}
            </div>

            <div className="creator-section">Crest</div>
            <div className="kk-faces">
              {crests.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`kk-face ${character.bodyDonor === o.id ? 'on' : ''}`}
                  disabled={o.locked}
                  // never disable without naming the blocker
                  title={o.locked ? `Locked — ${o.lockHint}` : o.label}
                  onClick={() => { if (!o.locked) set({ bodyDonor: o.id }); }}
                >
                  {o.locked ? <KkIcon name="k-lock" size={16} /> : <img src={o.thumb} alt={o.label} draggable={false} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Swatches label="Arms" value={character.armColor} onPick={(i) => set({ armColor: i })} />
          <Swatches label="Hands" value={character.handColor} onPick={(i) => set({ handColor: i })} />
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Swatches label="Legs" value={character.legColor} onPick={(i) => set({ legColor: i })} />
          <Swatches label="Hips" value={character.hipColor} onPick={(i) => set({ hipColor: i })} />
        </div>

        <DyeRack />

        <div className="loading-note" style={{ marginTop: 12 }}>
          Your crest badge, first-person sleeves and the portrait up in the corner all
          follow these straight away. Rank is earned in the world — nothing here touches it.
        </div>
      </div>
    </div>
  );
}
