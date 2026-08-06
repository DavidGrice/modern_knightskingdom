'use client';
// 1a–1d · the field HUD, rebuilt to the UI handoff pack's cluster plan.
//
// Nine clusters, each anchored to a viewport edge and never to another
// cluster (HANDOFF §3 rule 4): vitals TL · compass + clock TR · objective
// card R · reticle + hold-E ring C · toasts R-mid · and — critically —
// resource ledger, readied gear and minimap as ONE bottom flow row rather
// than three things independently positioned in the same 22px band, which
// is what used to collide.
import { useEffect, useRef, useState } from 'react';
import { useGameStore, activeQuestOf } from '@/game/store/gameStore';
import { sideQuestGiverName, sideQuestsOf } from '@/game/data/npcs';
import { clockLabel, nightFactor } from '@/game/env';
import { activeMelee, combatState, type MeleeWeaponId } from '@/game/combat';
import { aimState, type AimTarget, type Standing } from '@/game/targeting';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';
import Minimap from './Minimap';
import Vitals from './Vitals';
import Compass from './Compass';
import FpsReadout from './FpsReadout';
import FishingMeter from './FishingMeter';
import ClaimBanner from './ClaimBanner';
import DungeonStatus from './DungeonStatus';
import ArenaHud from './ArenaHud';
import OrderRadial from './OrderRadial';
import KkIcon from '../ui/KkIcon';
import { ICON_FOR_EMOJI } from '../ui/KkIcon';

/** the five resources worth a permanent readout; the rest live in the satchel */
const LEDGER: ItemId[] = ['wood', 'stone', 'iron_bar', 'herb', 'gold'];

/** notify() strings were written when the toast had no mark of its own, so
 *  many lead with an emoji. The pill draws a real mark now — drop the glyph
 *  at the render site rather than rewriting every call site's copy. */
const LEADING_EMOJI = /^[\p{Extended_Pictographic}️‍\s]+/u;

function WorldClock() {
  const t = useGameStore((s) => s.timeOfDay);
  const dayCount = useGameStore((s) => s.dayCount);
  const night = nightFactor(t) > 0.5;
  // five pips across the day, so the time of day reads at a glance
  const seg = Math.min(4, Math.floor((t / (24 * 60)) * 5));
  return (
    <div className="kk-clock kk-glass">
      <KkIcon name={night ? 'k-moon' : 'k-sun'} size={13} />
      Day {dayCount + 1} · {clockLabel(t)}
      <span className="pips">
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i === seg ? 'on' : ''} />)}
      </span>
    </div>
  );
}

/** D14/D15 · who is under the crosshair. Reads the shared aim resolve
 *  (game/targeting.ts) so the readout, the reticle colour and the scan can
 *  never disagree about what you are looking at.
 *
 *  K61 · It used to be a 210px-wide panel parked in the middle of the screen,
 *  and only while a bow was drawn. Both were wrong: it now hangs over the
 *  figure's own head wherever they are, and it appears for whatever you happen
 *  to be holding — bow, axe, sword or bare hands — because "who is that" is
 *  not a question about your weapon.
 */
function AimReadout({ onStanding }: { onStanding: (s: Standing | null) => void }) {
  const bestiary = useGameStore((s) => s.bestiary);
  const [t, setT] = useState<AimTarget | null>(null);
  const plate = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      // the RETICLE colours for every target, always — that is the
      // at-a-glance cue and it must not depend on what is drawn below
      const raw = aimState.target;
      onStanding(raw?.standing ?? null);
      setT((prev) => (prev?.key === raw?.key
        && prev?.hp === raw?.hp
        && Math.round(prev?.distance ?? -1) === Math.round(raw?.distance ?? -1)
        ? prev : raw));
    }, 100);
    return () => clearInterval(id);
  }, [onStanding]);

  // the position follows the head every frame, outside React: re-rendering a
  // card 60 times a second to move it a few pixels would be absurd
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = plate.current;
      if (!el) return;
      const s = aimState.screen;
      el.style.opacity = s.vis ? '1' : '0';
      el.style.transform = `translate(-50%, -100%) translate(${Math.round(s.x)}px, ${Math.round(s.y)}px)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!t) return null;
  const known = t.standing === 'hostile' && bestiary.includes(t.kind);
  const frac = t.maxHp ? Math.max(0, Math.min(1, (t.hp ?? 0) / t.maxHp)) : null;
  return (
    <div ref={plate} className="kk-aim kk-glass">
      <div className="kk-aim-name">{t.name}</div>
      <div className="kk-aim-row">
        <span className={`kk-aim-standing ${t.standing}`}>
          <KkIcon name={t.standing === 'hostile' ? 'k-skull' : 'k-shield'} size={10} />
          {t.standing === 'hostile' ? 'Hostile' : t.standing === 'friendly' ? 'Friendly' : 'Neutral'}
        </span>
        <span className="kk-aim-meta">{Math.round(t.distance)} m</span>
      </div>
      {frac !== null && (
        <div className="kk-bar vigour">
          <i style={{ width: `calc(${frac * 100}% - 2px)` }} />
        </div>
      )}
      {t.standing === 'hostile' && (
        <div className={`kk-aim-scan ${known ? 'known' : ''}`}>
          {known ? 'Recorded' : 'F to record'}
        </div>
      )}
    </div>
  );
}

function CeremonyBanner() {
  const ceremony = useGameStore((s) => s.ceremony);
  if (!ceremony) return null;
  return (
    <div className="ceremony-banner" key={ceremony.rank}>
      <div className="c-rank">{ceremony.rank}</div>
      <div className="c-sub">King Leo bestows the honor upon you</div>
    </div>
  );
}

/** the tracked quest as a proper objective card: kicker, title, steps with
 *  their own progress, and the swap control folded into the kicker row */
function ObjectiveCard() {
  const completedQuests = useGameStore((s) => s.completedQuests);
  const questProgress = useGameStore((s) => s.questProgress);
  const sideQuest = useGameStore((s) => s.sideQuest);
  const trackedQuest = useGameStore((s) => s.trackedQuest);
  const setTrackedQuest = useGameStore((s) => s.setTrackedQuest);
  const quest = activeQuestOf(completedQuests);

  if ((trackedQuest === 'side' || !quest) && sideQuest) {
    const def = sideQuestsOf(sideQuest.npcId).find((q) => q.id === sideQuest.questId);
    if (def) {
      const cur = Math.min(def.need, sideQuest.have);
      return (
        <div className="kk-objective kk-glass">
          <div className="kk-objective-in">
            <div className="kk-objective-kicker">
              <KkIcon name="k-swords" size={13} /> Errand
              {quest && (
                <button title="Track the Main Chronicle instead" onClick={() => setTrackedQuest('main')}>
                  <KkIcon name="k-scroll" size={12} />
                </button>
              )}
            </div>
            <div className="kk-objective-title">{def.label}</div>
            <div className="kk-objective-steps">
              <div className={`kk-step ${cur >= def.need ? 'done' : 'active'}`}>
                <span className="dot">{cur >= def.need && <KkIcon name="k-check" size={9} />}</span>
                For {sideQuestGiverName(sideQuest.npcId)}
                <span className="num">{cur}/{def.need}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  if (!quest) {
    return (
      <div className="kk-objective kk-glass">
        <div className="kk-objective-in">
          <div className="kk-objective-kicker"><KkIcon name="k-crown" size={13} /> Chronicle</div>
          <div className="kk-objective-title">All quests complete</div>
          <div className="kk-objective-steps">
            <div className="kk-step">The kingdom celebrates its new Paladin.</div>
          </div>
        </div>
      </div>
    );
  }

  const qp = questProgress[quest.id] ?? {};
  return (
    <div className="kk-objective kk-glass">
      <div className="kk-objective-in">
        <div className="kk-objective-kicker">
          <KkIcon name="k-scroll" size={13} /> Tracked
          {sideQuest && (
            <button title="Track your errand instead" onClick={() => setTrackedQuest('side')}>
              <KkIcon name="k-swords" size={12} />
            </button>
          )}
        </div>
        <div className="kk-objective-title">{quest.name}</div>
        <div className="kk-objective-steps">
          {quest.objectives.map((o) => {
            const cur = Math.min(o.count, qp[o.id] ?? 0);
            const done = cur >= o.count;
            return (
              <div key={o.id} className={`kk-step ${done ? 'done' : 'active'}`}>
                <span className="dot">{done && <KkIcon name="k-check" size={9} />}</span>
                {o.label}
                <span className="num">{cur}/{o.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** resource ledger — the five running totals, left end of the bottom row */
function Ledger() {
  const inventory = useGameStore((s) => s.inventory);
  return (
    <div className="kk-ledger kk-glass">
      {LEDGER.map((id) => (
        <span key={id} className={`chip ${id === 'gold' ? 'gold' : ''}`} title={ITEMS[id].name}>
          <KkIcon name={ICON_FOR_EMOJI[ITEMS[id].icon] ?? 'k-stud'} size={14} />
          {(inventory[id] ?? 0).toLocaleString()}
        </span>
      ))}
    </div>
  );
}

/** Readied gear, centre of the bottom row. Deliberately NOT the mockup's
 *  eight numbered hotbar slots — this game has no hotbar bindings, and
 *  drawing eight digits that do nothing would be a lie. These are the
 *  slots that DO reflect state: the weapon Q swaps between, with its live
 *  ammo count, and the tools you are actually carrying. */
function ReadiedRow() {
  const inventory = useGameStore((s) => s.inventory);
  const [weapon, setWeapon] = useState({ ranged: false, bow: false, melee: 'sword' as MeleeWeaponId });

  useEffect(() => {
    const t = setInterval(() => setWeapon({
      ranged: combatState.weapon === 'ranged',
      bow: combatState.rangedWeapon === 'longbow',
      // Wave 7 · which of the three melee weapons is lit, not just "melee".
      // activeMelee() rather than the raw preference, so a slot can never
      // light up for a weapon that has left the Satchel.
      melee: activeMelee(),
    }), 160);
    return () => clearInterval(t);
  }, []);

  const has = (id: ItemId) => (inventory[id] ?? 0) > 0;
  const melee = (id: MeleeWeaponId) => !weapon.ranged && weapon.melee === id;
  const slots: { id: ItemId; icon: string; on: boolean; count?: number; key?: string }[] = [
    { id: 'sword', icon: 'k-sword', on: melee('sword') },
    { id: 'halberd', icon: 'k-sword', on: melee('halberd'), key: 'Q' },
    { id: 'spear', icon: 'k-sword', on: melee('spear'), key: 'Q' },
    { id: 'crossbow', icon: 'k-crossbow', on: weapon.ranged && !weapon.bow, count: inventory.bolt ?? 0, key: 'Q' },
    { id: 'longbow', icon: 'k-crossbow', on: weapon.ranged && weapon.bow, count: inventory.arrow ?? 0, key: 'Q' },
    { id: 'axe', icon: 'k-axe', on: false },
    { id: 'pickaxe', icon: 'k-pick', on: false },
    { id: 'fishing_rod', icon: 'k-fish', on: false },
  ].filter((s) => has(s.id as ItemId)) as typeof slots;

  if (!slots.length) return <div />;
  return (
    <div className="kk-hotbar kk-glass">
      {slots.map((s) => (
        <div key={s.id} className={`kk-slot ${s.on ? 'on' : ''}`} title={ITEMS[s.id].name}>
          <KkIcon name={s.icon} size={26} />
          {s.key && <span className="digit">{s.key}</span>}
          {s.count !== undefined && <span className="count">{s.count}</span>}
        </div>
      ))}
    </div>
  );
}

export default function HUD() {
  const prompt = useGameStore((s) => s.prompt);
  const progress = useGameStore((s) => s.actionProgress);
  const notifications = useGameStore((s) => s.notifications);
  const buildMode = useGameStore((s) => s.buildMode);
  const paused = useGameStore((s) => s.paused);
  const panel = useGameStore((s) => s.panel);
  const photoMode = useGameStore((s) => s.photoMode);
  // lifted so the reticle can recolour from the same resolve the readout uses
  const [standing, setStanding] = useState<Standing | null>(null);

  if (photoMode) {
    // everything else hidden — free the frame for the screenshot the OS's
    // own capture tool (or a Steam-style overlay) takes of it
    return (
      <div className="hud">
        <div className="keyhint" style={{ position: 'absolute', bottom: 14, right: 14, opacity: 0.6 }}>
          Photo Mode — <b>P</b> to exit
        </div>
      </div>
    );
  }

  const field = !buildMode && !paused && panel === 'none';
  // a "Hold E" prompt reads as a verb on a ring; a tap prompt as a key chip
  const holdMatch = prompt?.match(/^Hold\s+(\S+)\s+—?\s*(.*)$/i);
  const tapMatch = prompt?.match(/^(\S+)\s+—\s+(.*)$/);
  const verb = holdMatch?.[2] ?? tapMatch?.[2] ?? prompt ?? '';
  const key = holdMatch?.[1] ?? tapMatch?.[1] ?? 'E';
  const held = !!holdMatch;

  return (
    <div className="hud">
      {field && (
        <>
          <div className={`kk-reticle ${standing ?? ''}`} />
          <AimReadout onStanding={setStanding} />
          {prompt && (
            <div className="kk-prompt kk-glass">
              <div
                className="kk-prompt-ring"
                style={{ ['--kk-hold' as string]: String(progress ?? 0) }}
              >
                <span><KkIcon name="k-hand" size={17} /></span>
              </div>
              <div>
                <div className="kk-prompt-key">{held ? 'Hold' : 'Press'} <b>{key}</b></div>
                <div className="kk-prompt-verb">{verb}</div>
              </div>
            </div>
          )}
        </>
      )}

      {!buildMode && <Vitals />}
      <DungeonStatus />
      <ArenaHud />

      <div className="kk-topright">
        {!buildMode && <Compass />}
        <WorldClock />
        <FpsReadout />
      </div>

      {!buildMode && <ObjectiveCard />}

      <div className="kk-bottom">
        <Ledger />
        {field ? <ReadiedRow /> : <div />}
        {!buildMode ? <Minimap /> : <div />}
      </div>

      {!buildMode && panel === 'none' && <FishingMeter />}
      <OrderRadial />
      <ClaimBanner />
      <CeremonyBanner />

      <div className="kk-toasts">
        {notifications.map((n) => (
          <div key={n.id} className={`kk-toast kk-glass ${n.gold ? 'gold' : ''}`}>
            <span className="mark"><KkIcon name={n.gold ? 'k-coin' : 'k-check'} size={15} /></span>
            {n.text.replace(LEADING_EMOJI, '')}
          </div>
        ))}
      </div>
    </div>
  );
}
