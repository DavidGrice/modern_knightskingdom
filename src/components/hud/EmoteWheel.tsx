'use client';
// Emote picker (G): plays an original minifig animation on your avatar.
import { useGameStore } from '@/game/store/gameStore';
import { EMOTES } from '@/lib/minifigRig';
import Ico from '../ui/Ico';

export default function EmoteWheel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const playEmote = useGameStore((s) => s.playEmote);
  return (
    <div className="game-panel clickable" style={{ minWidth: 380 }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>Emotes</h2>
      <div className="inv-grid" style={{ gridTemplateColumns: 'repeat(3, 110px)' }}>
        {EMOTES.map((e) => (
          <div
            key={e.id}
            className="inv-slot"
            style={{ width: 110, cursor: 'pointer' }}
            onClick={() => playEmote(e.clip)}
            title={e.label}
          >
            <div className="icon" style={{ fontSize: 30 }}><Ico e={e.icon} /></div>
            <div className="iname" style={{ fontSize: 12 }}>{e.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: '#a89468', marginTop: 10 }}>
        Emotes play in third-person view (V toggles it any time).
      </div>
    </div>
  );
}
