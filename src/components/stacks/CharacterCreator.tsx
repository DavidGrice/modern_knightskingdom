'use client';
// 3c · Forge Your Hero — Guild Leather, per the UI handoff pack.
// All eight callings visible at once as a 4×2 grid (never a carousel),
// each stating what it actually gives you, with the selected one's blurb
// on parchment underneath. The turntable keeps its Standing/Running
// toggle and drag-to-rotate.
//
// The mockup's kit hints ("+ axe", "+ coal") describe a game that hands
// out starting gear. This one deliberately doesn't — every calling
// begins bare-handed and the only lasting difference is +10% XP in one
// skill (see data/classes.ts). The hints say that instead of inventing
// a kit the game will not grant.
import { useEffect, useState } from 'react';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { FACE_OPTIONS, CREST_OPTIONS, PALETTE_SWATCHES, type Gender } from '@/game/data/minifigs';
import { crestLocked, crestLockHint } from '@/game/data/crestUnlocks';
import { CLASSES, CLASS_BY_ID } from '@/game/data/classes';
import { SKILLS } from '@/game/data/ranks';
import { loadPalette } from '@/lib/minifig';
import RotatablePreview from '../character/RotatablePreview';
import KkIcon from '../ui/KkIcon';
import type { CharacterConfig } from '@/game/types';

const CALLING_ICON: Record<string, string> = {
  wanderer: 'k-boot', woodsman: 'k-axe', quarryman: 'k-pick', angler: 'k-fish',
  farmhand: 'k-farm', artisan: 'k-bench', prentice: 'k-flame', squire: 'k-shield',
};

const SKILL_LABEL: Record<string, string> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.name.toLowerCase()]),
);

function Swatches({ colors, selected, onPick, label }: {
  colors: { index: number; css: string }[];
  selected: number;
  onPick: (index: number) => void;
  label: string;
}) {
  return (
    <div className="kk-swatch-group">
      <div className="kk-forge-label">{label}</div>
      <div className="kk-swatches">
        {colors.map((c) => (
          <button
            key={c.index}
            type="button"
            aria-label={`${label} ${c.index}`}
            className={`kk-swatch ${selected === c.index ? 'on' : ''}`}
            style={{ background: c.css }}
            onClick={() => onPick(c.index)}
          />
        ))}
      </div>
    </div>
  );
}

function Faces({ options, selected, onPick }: {
  options: { id: string; label: string; thumb: string; locked?: boolean; lockHint?: string }[];
  selected: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="kk-faces">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`kk-face ${selected === o.id ? 'on' : ''}`}
          disabled={o.locked}
          onClick={() => { if (!o.locked) onPick(o.id); }}
          // never disable without naming the blocker (HANDOFF §2)
          title={o.locked ? `Locked — ${o.lockHint}` : o.label}
        >
          {o.locked ? <KkIcon name="k-lock" size={16} /> : <img src={o.thumb} alt={o.label} draggable={false} />}
        </button>
      ))}
    </div>
  );
}

export default function CharacterCreator() {
  const pop = useAppStore((s) => s.pop);
  const push = useAppStore((s) => s.push);
  const newGame = useGameStore((s) => s.newGame);
  const uiTheme = useAppStore((s) => s.settings.uiTheme);

  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const facesForGender = FACE_OPTIONS.filter((f) => f.gender === gender);
  const crestsForGender = CREST_OPTIONS.filter((c) => c.gender === gender).map((c) => ({
    ...c, locked: crestLocked(c.id), lockHint: crestLockHint(c.id),
  }));
  const firstOpenCrest = (list: { id: string }[]) =>
    (list.find((c) => !crestLocked(c.id)) ?? list[0]).id;
  const [faceId, setFaceId] = useState(facesForGender[0].id);
  const [crestId, setCrestId] = useState(firstOpenCrest(crestsForGender));
  const [classId, setClassId] = useState('wanderer');
  const [armColor, setArmColor] = useState(26);
  const [handColor, setHandColor] = useState(18);
  const [legColor, setLegColor] = useState(38);
  const [hipColor, setHipColor] = useState(34);
  const [swatches, setSwatches] = useState<{ index: number; css: string }[]>([]);
  const [pose, setPose] = useState<'standing' | 'running'>('running');

  useEffect(() => {
    loadPalette().then((colors) => {
      setSwatches(
        PALETTE_SWATCHES.map((i) => {
          const [r, g, b] = colors[i] ?? [128, 128, 128];
          return { index: i, css: `rgb(${r},${g},${b})` };
        }),
      );
    });
  }, []);

  function pickGender(g: Gender) {
    setGender(g);
    const faces = FACE_OPTIONS.filter((f) => f.gender === g);
    const crests = CREST_OPTIONS.filter((c) => c.gender === g);
    setFaceId(faces[0].id);
    setCrestId(firstOpenCrest(crests));
  }

  const config: CharacterConfig = {
    name: name || 'Wanderer',
    headDonor: faceId,
    bodyDonor: crestId,
    armColor, handColor, legColor, hipColor,
    classId,
  };

  const calling = CLASS_BY_ID[classId];

  function begin() {
    newGame(config);
    push('game');
  }

  return (
    <div className={`kk-screen kk-screen-scroll kk-screen-${uiTheme}`}>
      <div className="kk-screen-pad">
        <div className="kk-screen-head">
          <h2>FORGE YOUR HERO</h2>
          <span className="rule" />
          <span className="hint">Appearance never affects rank — that is earned in the world</span>
        </div>

        <div className="kk-forge-body">
          <div className="kk-forge-doll">
            <div className="kk-forge-stage">
              <RotatablePreview
                config={config}
                height={2.2}
                clip={pose === 'running' ? 'anim_c_walk' : 'anim_r_restpose'}
                className="kk-forge-canvas"
              />
            </div>
            <div className="kk-toggle">
              <button className={pose === 'standing' ? 'on' : ''} onClick={() => setPose('standing')}>Standing</button>
              <button className={pose === 'running' ? 'on' : ''} onClick={() => setPose('running')}>Running</button>
            </div>
            <div className="kk-forge-hint">Drag to look them over</div>
          </div>

          <div className="kk-forge-form">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="kk-forge-label">Name</div>
                <input
                  className="kk-forge-input"
                  value={name}
                  placeholder="Wanderer"
                  maxLength={24}
                  aria-label="Name"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div style={{ flex: 'none', width: 'clamp(120px, 40%, 170px)' }}>
                <div className="kk-forge-label">Gender</div>
                <div className="kk-toggle">
                  <button className={gender === 'male' ? 'on' : ''} onClick={() => pickGender('male')}>Male</button>
                  <button className={gender === 'female' ? 'on' : ''} onClick={() => pickGender('female')}>Female</button>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                <span className="kk-forge-label" style={{ marginBottom: 6 }}>Calling</span>
                <span style={{ font: '400 10.5px/1 var(--kk-font)', color: 'rgba(240,220,176,.45)' }}>
                  a lifelong knack, never a head start — everyone begins bare-handed
                </span>
              </div>
              <div className="kk-callings">
                {CLASSES.map((c) => (
                  <button
                    key={c.id}
                    className={`kk-calling ${classId === c.id ? 'on' : ''}`}
                    onClick={() => setClassId(c.id)}
                    title={c.desc}
                  >
                    <KkIcon name={CALLING_ICON[c.id] ?? 'k-star'} size={19} />
                    <span className="nm">{c.name}</span>
                    <span className="kit">
                      {c.signature ? `+10% ${SKILL_LABEL[c.signature] ?? c.signature}` : 'no ties'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="kk-parchment">{calling.desc}</div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div className="kk-forge-label">Face</div>
                <Faces options={facesForGender} selected={faceId} onPick={setFaceId} />
              </div>
              <div>
                <div className="kk-forge-label">Crest</div>
                <Faces options={crestsForGender} selected={crestId} onPick={setCrestId} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <Swatches label="Arms" colors={swatches} selected={armColor} onPick={setArmColor} />
              <Swatches label="Hands" colors={swatches} selected={handColor} onPick={setHandColor} />
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <Swatches label="Legs" colors={swatches} selected={legColor} onPick={setLegColor} />
              <Swatches label="Hips" colors={swatches} selected={hipColor} onPick={setHipColor} />
            </div>
          </div>
        </div>

        <div className="kk-screen-actions">
          <button className="kk-btn-wide" onClick={begin}>
            <KkIcon name="k-swords" size={17} /> Take up the road
          </button>
          <button className="kk-btn-quiet" onClick={pop}>Back</button>
        </div>
      </div>
    </div>
  );
}
