'use client';
// The travel signpost's map: pick one of the eight original template-world
// dioramas to visit, waypoint straight to a named resident inside one, or
// head to the Sealed Crypt / Endless Arena / bonus Challenge Grounds. A
// one-time reward is granted on first arrival at a destination.
//
// Wave 14 Pass B: redesigned from a dark HUD card grid (Pass A's minimal
// data/mechanism wiring, which only proved travelTo(id, poiId) end-to-end)
// into an illustrated parchment map. Pins group into three legible regions —
// the eight roads, the frontier challenge grounds, and the two sealed
// landmarks — rather than a literal plot of each destination's origin.x/z:
// worlds.ts's own header comment confirms those coordinates are just
// non-overlapping render-space bake slots picked to avoid bounding-sphere
// collisions, not real relative geography, so a literal scatter plot of them
// would be meaningless. Clicking a pin only ever selects it into the side
// detail card — the real travelTo()/enterDungeon()/enterArena() calls still
// fire exclusively from an explicit button there, exactly like the old cards
// did (browsing the map never travels you by accident). Undiscovered POIs
// still show a "???" placeholder rather than being hidden outright, matching
// Pass A's own design decision (display-only gate, never a travel lock) —
// destinations themselves were never gated behind "visited" either, before
// or after this redesign.
import { useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATIONS, WORLD_DESTINATION_BY_ID, CHALLENGE_DESTINATIONS } from '@/game/data/worlds';
import { poisForDestination, type Poi } from '@/game/data/npcs';
import { DUNGEON_UNLOCK_QUEST } from '@/game/dungeon';
import { ARENA_ENVS } from '@/game/arena';

// Hand-picked per-template flavor icons — purely presentational polish, not
// data. Falls back to a plain castle for anything not listed, so a future
// 10th template still renders a sensible pin without needing an entry here.
const TEMPLATE_ICONS: Record<string, string> = {
  'template-01': '🏰', 'template-02': '🎪', 'template-03': '⛵',
  'template-04': '⚔️', 'template-05': '🏯', 'template-06': '🏛️',
  'template-07': '❄️', 'template-08': '🏚️',
};

interface MapPinProps {
  name: string;
  icon: string;
  selected: boolean;
  here: boolean;
  visited: boolean;
  yours?: boolean;
  locked?: boolean;
  onSelect: () => void;
  /** Wave 14 · satellite dots for this destination's resident POIs (see
   *  data/npcs.ts's poisForDestination) — clicking one waypoints straight to
   *  that resident, independent of (and without needing) the main pin's own
   *  select/detail-card flow. */
  pois?: Poi[];
  discoveredPois?: string[];
  onWaypoint?: (poiId: string) => void;
}

// A destination pin: the castle/landmark icon itself is one real <button>
// (click = select into the detail card), and each POI satellite dot is its
// own separate <button> alongside it (click = waypoint immediately) — kept
// as siblings, not nested, so no interactive element ends up inside another.
function MapPin({ name, icon, selected, here, visited, yours, locked, onSelect, pois, discoveredPois, onWaypoint }: MapPinProps) {
  return (
    <div className={`tm-pin${selected ? ' selected' : ''}${here ? ' here' : ''}${locked ? ' locked' : ''}`}>
      <button type="button" className="tm-pin-main" onClick={onSelect} title={name}>
        <span className="tm-pin-badge">
          {icon}
          {yours && <span className="tm-pin-yours" title="Your settlement">👑</span>}
          {visited && <span className="tm-pin-visited" title="Visited">✓</span>}
          {locked && <span className="tm-pin-locked" title="Locked">🔒</span>}
        </span>
        <span className="tm-pin-label">{name}</span>
      </button>
      {!!pois?.length && (
        <div className="tm-pin-pois">
          {pois.map((poi) => {
            const found = !!discoveredPois?.includes(poi.id);
            return (
              <button
                key={poi.id}
                type="button"
                className={`tm-poi-dot${found ? ' found' : ''}`}
                onClick={() => onWaypoint?.(poi.id)}
                title={found ? `Waypoint to ${poi.name}, ${poi.title}` : 'Waypoint to an undiscovered resident'}
                style={found ? { backgroundImage: `url(${poi.portrait})` } : undefined}
              >
                {found ? '' : '?'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TravelPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const destination = useGameStore((s) => s.destination);
  const visitedWorlds = useGameStore((s) => s.visitedWorlds);
  const discoveredPois = useGameStore((s) => s.discoveredPois);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const settlements = useGameStore((s) => s.settlements);
  const travelTo = useGameStore((s) => s.travelTo);
  const enterDungeon = useGameStore((s) => s.enterDungeon);
  const enterArena = useGameStore((s) => s.enterArena);
  const dungeonUnlocked = completedQuests.includes(DUNGEON_UNLOCK_QUEST);

  // template-09 IS the homestead now (Phase 20) — you can't travel to the
  // place you're standing on, so it's filtered from the roads region exactly
  // like the old grid always filtered it.
  const roadDestinations = WORLD_DESTINATIONS.filter((d) => d.id !== 'template-09');

  // Which pin the detail card on the right currently shows — purely local UI
  // state, never touches the store. Defaults to wherever you're actually
  // standing, or the first road if you're home. Never re-synced afterward:
  // travelTo/enterDungeon/enterArena all close the panel the moment any of
  // them fires (panel: 'none'), so the component unmounts and this is
  // recomputed fresh the next time the map is opened.
  const [selectedId, setSelectedId] = useState<string>(() => destination ?? roadDestinations[0].id);

  const sel = WORLD_DESTINATION_BY_ID[selectedId] ?? roadDestinations[0];
  const selHere = destination === sel.id;
  const selVisited = visitedWorlds.includes(sel.id);
  const selPois = poisForDestination(sel.id, completedQuests);
  const isDungeon = sel.id === 'dungeon';
  const isArena = sel.id === 'arena';

  return (
    <div className="game-panel clickable travel-map-panel">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>Travel Map</h2>
      <div className="tm-intro">
        Eight roads lead out from the Far Meadow, each to one of the realm&apos;s original places.
      </div>

      <div className="tm-body">
        <div className="tm-surface">
          <div className="tm-compass" aria-hidden="true">🧭</div>

          <div className="tm-region tm-region-roads">
            <div className="tm-region-title">The Eight Roads</div>
            <div className="tm-pins">
              {roadDestinations.map((d) => (
                <MapPin
                  key={d.id}
                  name={d.name}
                  icon={TEMPLATE_ICONS[d.id] ?? '🏰'}
                  selected={selectedId === d.id}
                  here={destination === d.id}
                  visited={visitedWorlds.includes(d.id)}
                  yours={!!settlements[d.id]}
                  onSelect={() => setSelectedId(d.id)}
                  pois={poisForDestination(d.id, completedQuests)}
                  discoveredPois={discoveredPois}
                  onWaypoint={(poiId) => travelTo(d.id, poiId)}
                />
              ))}
            </div>
          </div>

          <div className="tm-region tm-region-frontier">
            <div className="tm-region-title">Challenge Grounds</div>
            <div className="tm-pins">
              {CHALLENGE_DESTINATIONS.map((d) => (
                <MapPin
                  key={d.id}
                  name={d.name}
                  icon="🗺️"
                  selected={selectedId === d.id}
                  here={destination === d.id}
                  visited={visitedWorlds.includes(d.id)}
                  onSelect={() => setSelectedId(d.id)}
                />
              ))}
            </div>
          </div>

          <div className="tm-region tm-region-landmarks">
            <div className="tm-region-title">Sealed Away</div>
            <div className="tm-pins">
              <MapPin
                name="Sealed Crypt" icon="🗝️"
                selected={selectedId === 'dungeon'} here={destination === 'dungeon'}
                visited={destination === 'dungeon'} locked={!dungeonUnlocked}
                onSelect={() => setSelectedId('dungeon')}
              />
              <MapPin
                name="Endless Arena" icon="⚔️"
                selected={selectedId === 'arena'} here={destination === 'arena'}
                visited={destination === 'arena'} locked={!dungeonUnlocked}
                onSelect={() => setSelectedId('arena')}
              />
            </div>
          </div>
        </div>

        <div className="tm-detail">
          {isDungeon ? (
            <>
              <div className="tm-detail-name">🗝️ The Sealed Crypt{destination === 'dungeon' ? ' ✓' : ''}</div>
              <div className="tm-detail-blurb">
                {dungeonUnlocked
                  ? 'A shifting underground ruin — a fresh layout every descent. Clear every chamber for gold and salvage.'
                  : 'Sealed until you have proven yourself a Knight.'}
              </div>
              <button
                className="tm-detail-action"
                disabled={!dungeonUnlocked || destination === 'dungeon'}
                onClick={enterDungeon}
              >
                {destination === 'dungeon' ? 'You are here' : dungeonUnlocked ? 'Descend' : 'Locked'}
              </button>
            </>
          ) : isArena ? (
            <>
              <div className="tm-detail-name">⚔️ The Endless Arena{destination === 'arena' ? ' ✓' : ''}</div>
              <div className="tm-detail-blurb">
                {dungeonUnlocked
                  ? 'A sealed pit. They keep coming until you leave, or you don’t. Pick a ring.'
                  : 'Sealed until you have proven yourself a Knight.'}
              </div>
              <div className="tm-arena-rings">
                {ARENA_ENVS.map((env) => (
                  <div key={env.id} className="tm-ring-row">
                    <div className="tm-ring-name">{env.name}</div>
                    <div className="tm-ring-blurb">{env.blurb}</div>
                    <button
                      className="tm-detail-action"
                      disabled={!dungeonUnlocked || !!destination}
                      onClick={() => enterArena(env.id)}
                    >
                      {dungeonUnlocked ? 'Enter' : 'Locked'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {sel.thumb && <img src={sel.thumb} alt={sel.name} className="tm-detail-thumb" />}
              <div className="tm-detail-name">{sel.name}{selVisited ? ' ✓' : ''}</div>
              {settlements[sel.id] && <div className="tm-detail-yours">🏰 YOURS</div>}
              <div className="tm-detail-blurb">{sel.blurb}</div>
              {selPois.length > 0 && (
                <div className="tm-detail-pois">
                  {selPois.map((poi) => {
                    const found = discoveredPois.includes(poi.id);
                    return (
                      <button
                        key={poi.id}
                        className="tm-poi-btn"
                        onClick={() => travelTo(sel.id, poi.id)}
                        title={found ? poi.title : 'Waypoint to an undiscovered resident'}
                      >
                        ⚜ {found ? poi.name : '???'}
                      </button>
                    );
                  })}
                </div>
              )}
              <button className="tm-detail-action" disabled={selHere} onClick={() => travelTo(sel.id)}>
                {selHere ? 'You are here' : 'Travel'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
