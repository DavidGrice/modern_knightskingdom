'use client';
// J51 · What can stand here.
//
// Opened by walking to a socket on the castle foundation and pressing E, so
// the choice is made AT the corner rather than from a menu of everything. The
// panel only ever offers what fits this socket kind, and each option shows
// its own bill of pieces from the parts bin (J45) — you can see what a turret
// costs in bricks before you commit a corner to it.
import { useGameStore } from '@/game/store/gameStore';
import { KEEP_PART_BY_ID, SOCKET_BY_ID, partsFor } from '@/game/data/keep';
import { brickFor, brickLabel } from '@/game/data/brickResources';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';

export default function KeepSocketPanel() {
  const keep = useGameStore((s) => s.keep);
  const socketId = useGameStore((s) => s.keepSocket);
  const inventory = useGameStore((s) => s.inventory);
  const raise = useGameStore((s) => s.raiseKeepPart);
  const socket = socketId ? SOCKET_BY_ID[socketId] : null;

  const setPanel = useGameStore((s) => s.setPanel);
  if (!keep || !socket) return null;
  const standing = keep.parts[socket.id];
  const built = keep.built[socket.id] ?? 0;

  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(460px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>{socket.name}</h2>
      {standing ? (
        <div className="keep-standing">
          <div className="creator-section" style={{ marginBottom: 8 }}>
            {KEEP_PART_BY_ID[standing]?.name ?? standing}
          </div>
          <div className="loading-note">
            {built >= 1
              ? 'Raised and finished. Nothing more to do here.'
              : `Staked out — ${Math.round(built * 100)}% built. Swing a hammer at it.`}
          </div>
        </div>
      ) : (
        <>
          <div className="loading-note" style={{ marginBottom: 12 }}>
            Choose what to raise on this {socket.kind === 'wall' ? 'wall run' : socket.kind === 'corner' ? 'corner' : 'bailey'}.
          </div>
          <div className="keep-options">
            {partsFor(socket.kind).map((part) => {
              const afford = Object.entries(part.cost)
                .every(([id, n]) => (inventory[id as ItemId] ?? 0) >= (n ?? 0));
              return (
                <button
                  key={part.id}
                  className={`keep-option${afford ? '' : ' short'}`}
                  disabled={!afford}
                  onClick={() => raise(socket.id, part.id)}
                  title={afford ? `Raise a ${part.name}` : 'You are short of pieces'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="keep-option-thumb" src={part.thumb} alt="" />
                  <div className="keep-option-body">
                    <div className="keep-option-name">{part.name}</div>
                    <div className="keep-option-blurb">{part.blurb}</div>
                    <div className="keep-option-cost">
                      {Object.entries(part.cost).map(([id, n]) => {
                        const brick = brickFor(id as ItemId);
                        const have = inventory[id as ItemId] ?? 0;
                        return (
                          <span
                            key={id}
                            className={`b-cost-part${have >= (n ?? 0) ? '' : ' short'}`}
                            title={`${brickLabel(id as ItemId, ITEMS[id as ItemId]?.name ?? id)} — you have ${have}`}
                          >
                            {brick
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img className="b-cost-thumb" src={brick.thumb} alt="" />
                              : <span>{ITEMS[id as ItemId]?.icon ?? id}</span>}
                            {n}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
