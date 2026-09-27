'use client';
// One loadout chip strip: "Bare-handed" plus a chip per loadout, each showing what it costs out of the Armory. Shared by a
// defender's roster row and Tam's own card (which passes only the melee loadouts).
import { ITEMS } from '@/game/data/items';
import { DEFENDER_LOADOUTS, LOADOUT_REQUIRES } from '@/game/data/villagers';
import type { DefenderLoadout, ItemId } from '@/game/types';
import ChoiceChip from './ChoiceChip';

export default function LoadoutRow({ current, loadouts, armory, onBare, onPick }: {
  current: DefenderLoadout | undefined;
  loadouts: typeof DEFENDER_LOADOUTS;
  armory: Partial<Record<ItemId, number>>;
  onBare: () => void;
  onPick: (id: DefenderLoadout) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
      <ChoiceChip
        opacity={!current ? 1 : 0.65}
        selected={!current}
        onClick={onBare}
        title="Bare-handed — returns any equipped weapon to the Armory"
      >
        ✋ Bare-handed
      </ChoiceChip>
      {loadouts.map((lo) => {
        const owned = current === lo.id;
        const need = LOADOUT_REQUIRES[lo.id];
        const afford = Object.entries(need).every(([id, n]) => (armory[id as ItemId] ?? 0) >= (n as number));
        const costLine = Object.entries(need).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(' + ');
        const stockLine = Object.entries(need).map(([id]) => `${armory[id as ItemId] ?? 0} in Armory`).join(', ');
        return (
          <ChoiceChip
            key={lo.id}
            disabled={!owned && !afford}
            opacity={owned ? 1 : afford ? 0.85 : 0.4}
            selected={owned}
            onClick={() => onPick(lo.id)}
            title={owned ? `Equipped — costs ${costLine} (return to Armory via Bare-handed)` : `Costs ${costLine} (${stockLine})`}
          >
            {afford || owned ? lo.icon : '🔒'} {lo.label}
          </ChoiceChip>
        );
      })}
    </div>
  );
}
