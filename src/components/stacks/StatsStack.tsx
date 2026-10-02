'use client';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { CHALLENGES, challengeProgress } from '@/game/data/challenges';
import { KIND_LABEL } from '@/game/combat';
import Ico from '../ui/Ico';
import { ScreenHead, ScreenActions } from './ScreenShell';

function formatPlaytime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

// The readout's own 44px width is sized for Options' slider numbers; a lifetime
// total ("1234567", "27h 26m") needs its natural width or it wraps/overflows.
const READOUT_AUTO = { width: 'auto', whiteSpace: 'nowrap' } as const;

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="kk-opt-row">
      <span className="name wide">{icon} {label}</span>
      <span className="readout" style={READOUT_AUTO}>{value}</span>
    </div>
  );
}

// A small hand-rolled horizontal bar chart (viewBox-scaled SVG rects) — the
// project has no charting dependency and doesn't need one for this; the
// existing minimap is the one precedent for a hand-rolled visual (canvas
// there, SVG here since these bars need crisp text labels, not per-frame redraw).
function BarChart({ bars }: { bars: { label: string; icon: string; value: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const rowH = 26;
  const width = 400;
  const barMaxW = 200;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${bars.length * rowH}`} style={{ marginTop: 4 }}>
      {bars.map((b, i) => {
        const w = (b.value / max) * barMaxW;
        const y = i * rowH;
        return (
          <g key={b.label}>
            <text x={0} y={y + rowH / 2 + 4} fontSize={12} fill="var(--kk-n-300)">
              <Ico e={b.icon} /> {b.label}
            </text>
            <rect x={128} y={y + 4} width={barMaxW} height={rowH - 10} fill="rgba(255,255,255,0.08)" rx={3} />
            <rect x={128} y={y + 4} width={Math.max(2, w)} height={rowH - 10} fill="url(#bar-grad)" rx={3} />
            <text x={128 + barMaxW + 8} y={y + rowH / 2 + 4} fontSize={12} fill="var(--kk-a-400)">
              {b.value}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="bar-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="#7c9f3f" />
          <stop offset="100%" stopColor="#b7d94e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function StatsStack() {
  const pop = useAppStore((s) => s.pop);
  const uiTheme = useAppStore((s) => s.settings.uiTheme);
  const stats = useGameStore((s) => s.stats);
  const character = useGameStore((s) => s.character);

  const harvestBars = [
    { label: 'Trees', icon: '🪵', value: stats.nodesHarvested.tree ?? 0 },
    { label: 'Rocks', icon: '⛏️', value: stats.nodesHarvested.rock ?? 0 },
    { label: 'Fish', icon: '🎣', value: stats.nodesHarvested.fishing ?? 0 },
    { label: 'Herbs', icon: '🌿', value: stats.nodesHarvested.herb ?? 0 },
  ];
  const killBars = Object.entries(KIND_LABEL).map(([kind, label]) => ({
    label, icon: '⚔️', value: stats.killsByKind[kind] ?? 0,
  }));

  // CLN-31 · a real page migration onto the kk screen system every sibling
  // stack screen already uses (Credits/Help/Options/CharacterCreator), not just
  // a new outer wrapper around the legacy markup: ScreenHead for the title,
  // a kk-opt-body scroll column (the same one Options scrolls its tabs in, so
  // there is no horizontal overflow at any width), kk-sec-label section heads,
  // kk-opt-row rows, the HUD's kk-bar for challenge progress and a
  // ScreenActions Back button. The screen now follows the player's lane theme
  // (background, fonts, colours) like every other screen — a deliberate,
  // visible change; the numbers, rows and order shown are unchanged.
  return (
    <div className={`kk-screen kk-screen-${uiTheme}`}>
      <div className="kk-screen-pad">
        <ScreenHead title="CHRONICLE OF DEEDS" hint={`${character?.name ?? 'Your'}'s lifetime record`} />

        {/* 440 rather than kk-opt-body's own 640: the bar charts are width-100% SVGs
            drawn on a 400-unit viewBox, so a wider column would blow their 12px labels
            up past the rows' text size and leave each row's value far from its bar */}
        <div className="kk-opt-body" style={{ maxWidth: 440 }}>
          <div className="kk-opt-rows" style={{ gap: 22 }}>
            <div>
              <div className="kk-sec-label">Life on the Homestead</div>
              <div className="kk-opt-rows">
                <StatRow icon="⏱" label="Time Played" value={formatPlaytime(stats.playtimeSec)} />
                <StatRow icon="🥾" label="Distance Traveled" value={formatDistance(stats.distanceMeters)} />
                <StatRow icon="🧱" label="Buildings Placed" value={String(stats.buildingsPlaced)} />
                <StatRow icon="🪵" label="Resources Gathered" value={String(stats.resourcesGathered)} />
                <StatRow icon="⚔️" label="Enemies Defeated" value={String(stats.kills)} />
                <StatRow icon="🗝️" label="Crypts Cleared" value={String(stats.dungeonsCleared)} />
                <StatRow icon="🔨" label="Items Crafted" value={String(stats.itemsCrafted)} />
                <StatRow icon="💰" label="Gold Earned (lifetime)" value={String(stats.goldEarnedLifetime)} />
              </div>
            </div>

            <div>
              <div className="kk-sec-label">Resources Harvested</div>
              <BarChart bars={harvestBars} />
            </div>

            <div>
              <div className="kk-sec-label">Foes Defeated</div>
              <BarChart bars={killBars} />
            </div>

            <div>
              <div className="kk-sec-label">Challenges</div>
              <div className="kk-opt-rows">
                {CHALLENGES.map((c) => {
                  const { value, tierIndex, next, prevThreshold } = challengeProgress(c, stats);
                  const current = tierIndex >= 0 ? c.tiers[tierIndex].label : null;
                  const span = next ? next.threshold - prevThreshold : 1;
                  const pct = next ? Math.min(100, Math.round(((value - prevThreshold) / span) * 100)) : 100;
                  return (
                    <div key={c.id}>
                      <div className="kk-opt-row">
                        <span className="name wide"><Ico e={c.icon} /> {current ?? c.name}</span>
                        <span className="readout" style={READOUT_AUTO}>{value} {c.unit}</span>
                      </div>
                      {next ? (
                        <div className="kk-bar xp" style={{ marginTop: 4 }}>
                          <i style={{ width: `calc(${pct}% - 2px)` }} />
                        </div>
                      ) : (
                        <div style={{ font: '400 10.5px/1.5 var(--kk-font)', color: 'var(--kk-text-dim)', fontStyle: 'italic' }}>
                          All tiers complete!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <ScreenActions>
          <button className="kk-btn-quiet" onClick={pop} style={{ marginLeft: 'auto' }}>Back</button>
        </ScreenActions>
      </div>
    </div>
  );
}
