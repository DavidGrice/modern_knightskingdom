'use client';
// G-07 · the raid report: what a raid the player fell out of came to — knocked out mid-raid, or away with his garrison
// down (game/directors/raidSettle.ts) — read on waking at dawn, or on coming home. One report, the last raid's: there is
// no chronicle of events (ChroniclePanel is a gallery of lore lines); G-25's dispatches will keep them.
import { useGameStore } from '@/game/store/gameStore';
import { goodsNamed, haulOf } from '@/game/plunder';
import type { RaidReport } from '@/game/raidResolver';
import PopupFrame from './PopupFrame';

const HEADLINE = {
  held: 'The garrison held',
  pressed: 'The garrison held, at a cost',
  lost: 'The raiders had the field',
} as const;

const SAYING = {
  held: 'your defenders fought on without you and beat the raiders off.',
  pressed: 'your defenders beat the raiders off, but it cost them dear.',
} as const;

/** What the report says the raid came to: a raid lost with no defender in the fight to lose it — none sworn to the
 *  homestead (those the raiders knocked down before it was settled are named: directors/state.ts's raidDowned) — says
 *  so; and the raiders tore down what they could only if they wrecked anything (a raid whose fighters are all down or
 *  gone wrecks nothing: raidResolver.ts). */
export function reportSaying(r: RaidReport): string {
  if (r.outcome !== 'lost') return SAYING[r.outcome];
  const who = r.downed.length ? 'every defender went down, and the raiders' : 'no defender stood against the raiders, and they';
  return `${who} took${r.ruined.length + r.razed.length ? ' and tore down' : ''} what they could before they went.`;
}

export default function RaidReportPanel() {
  const report = useGameStore((s) => s.raidReport);
  const setPanel = useGameStore((s) => s.setPanel);
  if (!report) return null;
  const rows: [string, string][] = [
    ['Goods carried off', haulOf(report.lost) ? goodsNamed(report.lost) : 'none'],
    ['Goods taken back', haulOf(report.recovered) ? goodsNamed(report.recovered) : 'none'],
    ['Left in ruins', report.ruined.length ? report.ruined.join(', ') : 'none'],
    ['Razed to the ground', report.razed.length ? report.razed.join(', ') : 'none'],
    ['Defenders downed', report.downed.length ? report.downed.join(', ') : 'none'],
  ];
  return (
    <PopupFrame minWidth="min(480px, 94vw)">
      <h2>{HEADLINE[report.outcome]}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>
        {report.away ? 'Word from home, while you were away: ' : 'While you lay senseless: '}
        {reportSaying(report)}
      </div>
      {rows.map(([label, text]) => (
        <div key={label} className="quest-item">
          <div className="q-name">{label}</div>
          <div className="q-desc">{text}</div>
        </div>
      ))}
      <button className="menu-btn closing" onClick={() => setPanel('none')}>
        Close
      </button>
    </PopupFrame>
  );
}
