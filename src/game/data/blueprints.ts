// Blueprints: a named, re-stampable template of placed buildings (Phase 13).
// A real port of the nine original template worlds' actual placement data
// (`template_placements.generated.json` in the sibling extraction repo)
// turned out not to be feasible — every one of its ~1,300 placements across
// all nine templates references a raw catalog model id, and cross-checking
// them found zero overlap with any id in this game's own buildable catalog
// (hand-crafted or the 133-piece generated one): the template scenes were
// dressed from separate asset pools never wired into the build menu at all.
// So the starter blueprints below are hand-authored using this game's own
// existing buildable ids instead — grounded in "what these scenes' own
// architecture looks like" (a gatehouse flanked by wall runs, a corner
// watchtower run) rather than a literal, piece-for-piece data port.
import type { Blueprint } from '../types';

export const STARTER_BLUEPRINTS: Blueprint[] = [
  {
    id: 'bp_gatehouse',
    name: 'Rival Gatehouse',
    starter: true,
    pieces: [
      // spacing matches the Castle Wall's real 8m width (Phase 18 asset
      // correction) — gate half(2) + wall half(4) = 6; wall's far edge(10)
      // + tower half(2) = 12
      { type: 'gate', dx: 0, dz: 0, rot: 0 },
      { type: 'stonewall', dx: -6, dz: 0, rot: 0 },
      { type: 'stonewall', dx: 6, dz: 0, rot: 0 },
      { type: 'tower', dx: -12, dz: 0, rot: 0 },
      { type: 'tower', dx: 12, dz: 0, rot: 0 },
    ],
  },
  {
    id: 'bp_watch_corner',
    name: 'Watch Corner',
    starter: true,
    pieces: [
      // tower half(2) + wall half(4) = 6
      { type: 'tower', dx: 0, dz: 0, rot: 0 },
      { type: 'stonewall', dx: 6, dz: 0, rot: 0 },
      { type: 'stonewall', dx: 0, dz: 6, rot: 1 },
    ],
  },
];

export const STARTER_BLUEPRINT_BY_ID: Record<string, Blueprint> =
  Object.fromEntries(STARTER_BLUEPRINTS.map((b) => [b.id, b]));
