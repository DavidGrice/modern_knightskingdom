'use client';
// The Chronicle: a growing record of genuine voice lines from the original
// game's challenge/tutorial voice-over bank, collected as you meet each
// court NPC's one-time lore introduction (see data/npcs.ts's loreLines and
// gameStore's loreSeen). Not paraphrased — every line here is transcribed
// verbatim from the real .wav it plays.
import { useGameStore } from '@/game/store/gameStore';
import MenuTabs from './MenuTabs';
import { NPCS } from '@/game/data/npcs';
import { audio } from '@/lib/audio';

export default function ChroniclePanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const loreSeen = useGameStore((s) => s.loreSeen);

  const chroniclers = NPCS.filter((n) => n.loreLines?.length);
  const totalLines = chroniclers.reduce((t, n) => t + (n.loreLines?.length ?? 0), 0);
  const recordedLines = chroniclers
    .filter((n) => loreSeen.includes(n.id))
    .reduce((t, n) => t + (n.loreLines?.length ?? 0), 0);

  return (
    <div className="game-panel clickable menu-family">
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <MenuTabs />
      <h2>The Chronicle</h2>
      <div className="panel-scroll">
      <div style={{ fontSize: 13, color: 'var(--parchment-dark)', fontStyle: 'italic', marginBottom: 14 }}>
        Genuine words spoken by those you've met, drawn from Knights' Kingdom's own telling — not
        a paraphrase, the record verbatim. Recorded: {recordedLines} / {totalLines} lines.
      </div>
      {chroniclers.map((npc) => {
        const recorded = loreSeen.includes(npc.id);
        return (
          <div key={npc.id} style={{ display: 'flex', gap: 14, marginBottom: 18 }}>
            <img
              src={npc.portrait}
              alt={npc.name}
              style={{
                width: 56, height: 50, objectFit: 'contain', flexShrink: 0,
                border: '1px solid var(--gold-dim)', borderRadius: 8,
                background: 'rgba(0,0,0,0.3)', opacity: recorded ? 1 : 0.4,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--gold)', fontSize: 16, letterSpacing: 0.5, marginBottom: 6 }}>
                {npc.name}
              </div>
              {recorded ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {npc.loreLines!.map((line, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <button
                        className="menu-btn small"
                        style={{ margin: 0, width: 'auto', flex: '0 0 auto', padding: '2px 8px' }}
                        onClick={() => audio.playVoice(line.sound, 0.9)}
                        title="Replay"
                      >
                        ▶
                      </button>
                      <div style={{ fontSize: 13.5, lineHeight: 1.5, flex: '1 1 auto', minWidth: 0 }}>
                        “{line.text}”
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--parchment-dark)' }}>
                  🔒 Not yet recorded — speak with {npc.name} to add their words to the Chronicle.
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
