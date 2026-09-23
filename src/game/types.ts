// Shared game types — barrel re-export.
//
// CLN-08: this file used to be the real 752-line definition of everything
// below; it is now a barrel over game/types/{core,world,villagers,save}.ts,
// split along the same domain boundaries the rest of the codebase already
// groups these types by. Every one of this barrel's ~90 existing importers
// keeps working unchanged — `import type { X } from '@/game/types'` (or
// `'./types'`) still resolves every name, since none of the 4 files below
// share a name with each other.
//
// `RectSection` (grounds) and `MarketEntry` (trade) are the two exceptions:
// their REAL definitions moved into game/types/world.ts, and
// data/grounds.ts / data/trade.ts now `import type` + re-export them instead
// of owning them — see world.ts's own header comment for why (it closes the
// game/types.ts <-> data/{grounds,trade}.ts edge in the reported 6-file
// import cycle). Nothing importing RectSection/MarketEntry from
// '@/game/data/grounds' or '@/game/data/trade' needed to change.
export * from './types/core';
export * from './types/world';
export * from './types/villagers';
export * from './types/save';
