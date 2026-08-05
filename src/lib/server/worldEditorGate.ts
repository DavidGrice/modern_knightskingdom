// Wave 6 · the one gate /secret/worldeditor and its API routes share.
//
// Research before building this (predev's own `rmSync('data', ...)` wipes
// users.json — and with it every account id — on every single `npm run dev`
// restart) ruled out a hardcoded user-id allow-list: it would invalidate
// itself the next time anyone restarted the dev server. This project already
// has a proven "hidden, dev-only" idiom used in five other places
// (grounds.ts, cultivatedPlots.ts, Grounds.tsx, buildables.ts, navTerrain.ts,
// all `if (process.env.NODE_ENV !== 'production')`) — reusing it here is
// consistent, not a shortcut.
export function worldEditorEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}
