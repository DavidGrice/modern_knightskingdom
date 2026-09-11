// Wave 53 (E5) — the shared "is this active right now" primitive.
//
// Verified live before writing this: three independent, hand-rolled
// day/night window checks already existed with ZERO shared code between
// them — `isWorkingHours`/`isWatchHours` (this directory's villagers.ts) and
// `merchantPresent` (trade.ts) — despite all three being the exact same
// question ("is this NPC/feature active at this time of day") asked three
// separate times. `isWatchHours` already had to reason about wrapping past
// midnight; the other two didn't need to and don't. This wave adds a FOURTH
// (court hours, npcs.ts's isCourtHours) — building the shared primitive now,
// while adding the first new window that actually needs it, is what stops
// that from becoming a fourth independent literal rather than unification
// for its own sake.
//
// `inclusive` preserves each existing call site's own boundary convention
// EXACTLY rather than picking one style and calling the others close enough:
// isWorkingHours/isWatchHours both read `>=`/`<=` (inclusive at both ends),
// merchantPresent reads `>`/`<` (exclusive) — a real difference between them
// today, even though it can never actually matter against a continuously
// advancing float clock. Defaults to `true` since two of the three real call
// sites want that; merchantPresent passes `false` explicitly so its own
// "same values, same behavior" refactor is byte-identical, not just close.
export function activeWindow(time: number, start: number, end: number, inclusive = true): boolean {
  if (start <= end) {
    return inclusive ? (time >= start && time <= end) : (time > start && time < end);
  }
  // wraps midnight (start > end) — isWatchHours' own case, `time` is in
  // range if it's past `start` (still today) OR before `end` (already
  // tomorrow), mirroring that function's original `>= WORK_END || <= WORK_START`.
  return inclusive ? (time >= start || time <= end) : (time > start || time < end);
}
