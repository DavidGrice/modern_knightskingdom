'use client';
// A small standalone HUD prompt (Phase 13) — deliberately not part of the
// hold-E interaction system in PlayerController.tsx, which already has an
// unconditional early-return for "E always returns home" while visiting a
// destination; bolting claiming onto that same key risked regressing a
// well-tested existing affordance. Claiming just needs the player's current
// spot + the real ground height sampled there, both cheaply available here.
import { useGameStore } from '@/game/store/gameStore';
import { playerState } from '@/game/playerState';
import { sampleTemplateGroundY } from '../world/TemplateWorld';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';

export default function ClaimBanner() {
  const destination = useGameStore((s) => s.destination);
  const claimedWorlds = useGameStore((s) => s.claimedWorlds);
  const paused = useGameStore((s) => s.paused);
  const buildMode = useGameStore((s) => s.buildMode);
  const panel = useGameStore((s) => s.panel);
  const claimWorld = useGameStore((s) => s.claimWorld);

  // the Sealed Crypt (Phase 17) regenerates every visit — not a claimable plot
  if (!destination || destination === 'dungeon' || claimedWorlds[destination] || paused || buildMode || panel !== 'none') return null;
  const dest = WORLD_DESTINATION_BY_ID[destination];

  return (
    <div style={{ position: 'absolute', bottom: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 11 }}>
      <button
        className="menu-btn"
        style={{ width: 'auto', padding: '10px 22px', whiteSpace: 'nowrap' }}
        onClick={() => {
          const groundY = sampleTemplateGroundY(playerState.x, playerState.z);
          claimWorld(destination, playerState.x, playerState.z, groundY);
        }}
      >
        🚩 Claim {dest?.name ?? 'this Land'} for your Kingdom
      </button>
    </div>
  );
}
