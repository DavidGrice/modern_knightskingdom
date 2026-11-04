// F-08b · the beacon's POST (app/api/save/route.ts) is a CORS-simple request: a plain form or a no-cors fetch can send
// one with no preflight, and a page on another port or subdomain of the same site carries the player's session cookie
// (SameSite=Lax), so it could post a save over theirs. A browser always sends Origin with a POST — sendBeacon too — so
// the save is taken only from the game's own origin. A request with no Origin is no browser's; PUT's own checks
// (signed in, size, a readable save) still stand for it.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (origin === null) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
