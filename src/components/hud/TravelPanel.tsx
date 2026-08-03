'use client';
// The travel signpost's map: pick one of the nine original template-world
// dioramas to visit. A one-time reward is granted on first arrival.
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATIONS } from '@/game/data/worlds';
import { NPCS, isNpcRevealed } from '@/game/data/npcs';
import { DUNGEON_UNLOCK_QUEST } from '@/game/dungeon';
import { ARENA_ENVS } from '@/game/arena';

export default function TravelPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const destination = useGameStore((s) => s.destination);
  const visitedWorlds = useGameStore((s) => s.visitedWorlds);
  const travelTo = useGameStore((s) => s.travelTo);
  const enterDungeon = useGameStore((s) => s.enterDungeon);
  const enterArena = useGameStore((s) => s.enterArena);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const dungeonUnlocked = completedQuests.includes(DUNGEON_UNLOCK_QUEST);

  return (
    <div className="game-panel clickable" style={{ minWidth: 720 }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>Travel Map</h2>
      <div style={{ fontSize: 13, color: 'var(--parchment-dark)', marginBottom: 12 }}>
        Eight roads lead out from the Far Meadow, each to one of the realm&apos;s original places.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {/* template-09 IS the homestead now (Phase 20) — you can't travel to
            the place you're standing on, so it's filtered from the grid */}
        {WORLD_DESTINATIONS.filter((d) => d.id !== 'template-09').map((d) => {
          const here = destination === d.id;
          const visited = visitedWorlds.includes(d.id);
          return (
            <div
              key={d.id}
              style={{
                border: `1px solid ${here ? 'var(--gold)' : 'var(--chrome-2)'}`,
                borderRadius: 6, padding: 8, background: 'rgba(0,0,0,0.25)',
              }}
            >
              <img
                src={d.thumb}
                alt={d.name}
                style={{ width: '100%', borderRadius: 4, display: 'block', marginBottom: 6 }}
              />
              <div style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: 14 }}>
                {d.name}{visited ? ' ✓' : ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--parchment-dark)', margin: '4px 0 8px' }}>
                {d.blurb}
              </div>
              {(() => {
                // Phase 20: show who holds court here — revealed residents
                // only, so unmet characters aren't spoiled by the map
                const residents = NPCS
                  .filter((n) => n.world === d.id && isNpcRevealed(n, completedQuests))
                  .map((n) => n.name);
                return residents.length > 0 ? (
                  <div style={{ fontSize: 11.5, color: 'var(--gold)', margin: '0 0 8px' }}>
                    ⚜ {residents.join(' · ')}
                  </div>
                ) : null;
              })()}
              <button disabled={here} onClick={() => travelTo(d.id)} style={{ width: '100%' }}>
                {here ? 'You are here' : 'Travel'}
              </button>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--chrome-2)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{ fontSize: 28 }}>🗝️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: 14 }}>
            The Sealed Crypt {destination === 'dungeon' ? ' ✓' : ''}
          </div>
          <div style={{ fontSize: 12, color: 'var(--parchment-dark)' }}>
            {dungeonUnlocked
              ? 'A shifting underground ruin — a fresh layout every descent. Clear every chamber for gold and salvage.'
              : 'Sealed until you have proven yourself a Knight.'}
          </div>
        </div>
        <button
          disabled={!dungeonUnlocked || destination === 'dungeon'}
          onClick={enterDungeon}
          style={{ width: 160 }}
        >
          {destination === 'dungeon' ? 'You are here' : dungeonUnlocked ? 'Descend' : 'Locked'}
        </button>
      </div>

      {/* requested 2026-08-03: same unlock gate as the Crypt above (a first
          cut, no dedicated arena quest yet) — reusing dungeonUnlocked keeps
          this section correctly locked/unlocked in step with it */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--chrome-2)' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: 14, marginBottom: 8 }}>
          ⚔️ The Endless Arena {destination === 'arena' ? ' ✓' : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--parchment-dark)', marginBottom: 10 }}>
          {dungeonUnlocked
            ? 'A sealed pit. They keep coming until you leave, or you don’t. Pick a ring.'
            : 'Sealed until you have proven yourself a Knight.'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {ARENA_ENVS.map((env) => (
            <div
              key={env.id}
              style={{
                border: '1px solid var(--chrome-2)', borderRadius: 6, padding: 8,
                background: 'rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: 13, marginBottom: 4 }}>
                {env.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--parchment-dark)', marginBottom: 8, minHeight: 44 }}>
                {env.blurb}
              </div>
              <button
                disabled={!dungeonUnlocked || !!destination}
                onClick={() => enterArena(env.id)}
                style={{ width: '100%' }}
              >
                {dungeonUnlocked ? 'Enter' : 'Locked'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
