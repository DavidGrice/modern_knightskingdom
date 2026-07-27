'use client';
import { useAppStore } from '@/game/store/appStore';
import { useGameStore } from '@/game/store/gameStore';
import { CHALLENGES, challengeProgress } from '@/game/data/challenges';
import { KIND_LABEL } from '@/game/combat';
import Ico from '../ui/Ico';

function formatPlaytime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function StatRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="opt-row">
      <label>{icon} {label}</label>
      <span className="opt-value">{value}</span>
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
            <text x={0} y={y + rowH / 2 + 4} fontSize={12} fill="var(--parchment-dark)">
              <Ico e={b.icon} /> {b.label}
            </text>
            <rect x={128} y={y + 4} width={barMaxW} height={rowH - 10} fill="rgba(255,255,255,0.08)" rx={3} />
            <rect x={128} y={y + 4} width={Math.max(2, w)} height={rowH - 10} fill="url(#bar-grad)" rx={3} />
            <text x={128 + barMaxW + 8} y={y + rowH / 2 + 4} fontSize={12} fill="var(--gold)">
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

  return (
    <div className="stack-screen">
      <div className="panel" style={{ width: 460 }}>
        <h1 className="game-title" style={{ fontSize: 30 }}>Chronicle of Deeds</h1>
        <p style={{ textAlign: 'center', opacity: 0.7, marginTop: -8 }}>
          {character?.name ?? 'Your'}&apos;s lifetime record
        </p>

        <div className="creator-section">Life on the Homestead</div>
        <StatRow icon="⏱" label="Time Played" value={formatPlaytime(stats.playtimeSec)} />
        <StatRow icon="🥾" label="Distance Traveled" value={formatDistance(stats.distanceMeters)} />
        <StatRow icon="🧱" label="Buildings Placed" value={String(stats.buildingsPlaced)} />
        <StatRow icon="🪵" label="Resources Gathered" value={String(stats.resourcesGathered)} />
        <StatRow icon="⚔️" label="Enemies Defeated" value={String(stats.kills)} />
        <StatRow icon="🗝️" label="Crypts Cleared" value={String(stats.dungeonsCleared)} />
        <StatRow icon="🔨" label="Items Crafted" value={String(stats.itemsCrafted)} />
        <StatRow icon="💰" label="Gold Earned (lifetime)" value={String(stats.goldEarnedLifetime)} />

        <div className="creator-section" style={{ marginTop: 16 }}>Resources Harvested</div>
        <BarChart bars={harvestBars} />

        <div className="creator-section" style={{ marginTop: 16 }}>Foes Defeated</div>
        <BarChart bars={killBars} />

        <div className="creator-section" style={{ marginTop: 16 }}>Challenges</div>
        {CHALLENGES.map((c) => {
          const { value, tierIndex, next, prevThreshold } = challengeProgress(c, stats);
          const current = tierIndex >= 0 ? c.tiers[tierIndex].label : null;
          const span = next ? next.threshold - prevThreshold : 1;
          const pct = next ? Math.min(100, Math.round(((value - prevThreshold) / span) * 100)) : 100;
          return (
            <div className="skill-row" key={c.id}>
              <div className="s-ico"><Ico e={c.icon} /></div>
              <div className="s-body">
                <div className="s-name">
                  {current ?? c.name} <span>{value} {c.unit}</span>
                </div>
                {next ? (
                  <div className="xpbar"><div style={{ width: `${pct}%` }} /></div>
                ) : (
                  <div className="s-locked">All tiers complete!</div>
                )}
              </div>
            </div>
          );
        })}

        <button className="menu-btn" onClick={pop} style={{ marginTop: 22 }}>Back</button>
      </div>
    </div>
  );
}
