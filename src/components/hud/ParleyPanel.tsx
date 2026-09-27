'use client';
import { useGameStore } from '@/game/store/gameStore';
import { cedricFinalStandReady, startCedricDuel } from '@/game/cedricSiege';
import { audio } from '@/lib/audio';
import PopupFrame from './PopupFrame';
import SideQuestBoard from './shared/SideQuestBoard';

// Phase 19 alliance branch: parley at Cedric's camp for an unsworn knight —
// the one place the "bad" pledge is offered. Cedric isn't an NpcDef (he's an
// EnemyKind boss), so this is its own small panel rather than DialoguePanel.
export default function ParleyPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const pledgeAlliance = useGameStore((s) => s.pledgeAlliance);
  const betrayedCedric = useGameStore((s) => s.betrayedCedric);
  const finalStandReady = useGameStore((s) => cedricFinalStandReady(s));
  const challenge = () => {
    setPanel('none');
    const finalStand = startCedricDuel(useGameStore.getState());
    audio.play('warcry', 0.9);
    audio.playVoice('greeting_cedric', 0.85);
    useGameStore.getState().notify(
      finalStand
        ? 'Cedric the Bull roars: "This ends here, would-be knight!"'
        : 'Cedric the Bull sneers: "Come to lose your head, have you?"',
      true,
    );
  };
  // War council (Phase 20 4b): a sworn bannerman gets rebellion errands
  // instead of the recruitment pitch — the same sideQuest machinery every
  // court NPC uses, with Cedric's own quest pool (sideQuestsOf('cedric'))
  const alliance = useGameStore((s) => s.alliance);
  const betrayCedric = useGameStore((s) => s.betrayCedric);
  const betrayLeo = useGameStore((s) => s.betrayLeo);
  if (alliance === 'cedric') {
    return (
      <PopupFrame minWidth="min(520px, 94vw)">
        <h2>War Council</h2>
        <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>
          “Ah, my favorite turncoat. The crown bleeds a little more every day — and you&apos;re
          going to open the vein. What do you have for me?”
        </div>
        <SideQuestBoard giverId="cedric" mineIcon="🐂 " offerIcon="⚔ " offersLine="jobs on offer — choose one:" />
        {/* Wave 13 turncoat bones: the one deliberate exception to the
            one-way pledge — see gameStore's betrayCedric for why this is
            permanent and one-directional. */}
        <div className="quest-item" style={{ marginTop: 10 }}>
          <div className="q-name">🗡 Turn on the Bull</div>
          <div className="q-desc">
            Betray the rebellion and walk away unsworn — free to kneel to Leo properly, if the
            crown will still have you. Cedric will never trust you again.
          </div>
          <button
            className="menu-btn small danger"
            style={{ margin: '8px 0 0' }}
            onClick={betrayCedric}
          >
            Turn on the Bull
          </button>
        </div>
        <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
          Leave the council
        </button>
      </PopupFrame>
    );
  }
  // Wave 56 (F4): a Leo-sworn knight gets a distinct parley of his own — not
  // the unsworn branch's first-pledge dialogue reused verbatim. Defecting
  // from a sworn oath reads differently than a first, neutral choice, and
  // "Clasp arms with Cedric" here calls betrayLeo (not pledgeAlliance,
  // which would silently no-op for anyone already sworn — see its own
  // `if (st.alliance) return;` guard).
  if (alliance === 'leo') {
    return (
      <PopupFrame minWidth="min(520px, 94vw)">
        <h2>Cedric the Bull</h2>
        <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>
          “Still wearing that gilded fool&apos;s colors? I&apos;ve seen knights choke on their own
          oaths before. Cast it off — swear to ME instead, and every raider between here and the
          keep answers to you. Or draw steel and settle it that way. Your choice, turncoat.”
        </div>
        <div className="quest-item">
          <div className="q-name">🐂 Turn Your Coat</div>
          {betrayedCedric ? (
            <div className="q-desc">
              You already turned on this camp once. He is not fool enough to trust you a second time.
            </div>
          ) : (
            <>
              <div className="q-desc">
                Break your oath to Leo and pledge to the Bull instead. The crown will name you
                traitor and never forgive it — but Cedric&apos;s raiders will never again touch your
                homestead.
              </div>
              <button className="menu-btn small" style={{ margin: '8px 0 0' }} onClick={betrayLeo}>
                Clasp arms with Cedric
              </button>
            </>
          )}
        </div>
        <div className="quest-item">
          <div className="q-name">⚔ Challenge Him to Battle</div>
          <div className="q-desc">
            {finalStandReady
              ? 'His Final Stand — answer his offer with steel, and finish this for good.'
              : 'Answer his offer with steel — he fights for real, but has not yet earned his final defeat.'}
          </div>
          <button className="menu-btn small danger" style={{ margin: '8px 0 0' }} onClick={challenge}>
            {finalStandReady ? 'Draw your sword — His Final Stand' : 'Draw your sword'}
          </button>
        </div>
        <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
          Walk away
        </button>
      </PopupFrame>
    );
  }
  return (
    <PopupFrame minWidth="min(520px, 94vw)">
      <h2>Cedric the Bull</h2>
      <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>
        “Well, well — Leo&apos;s newest little knight, alone in my woods. You&apos;ve got iron in you,
        I&apos;ll grant that. So here&apos;s my offer: kneel to that gilded fool in his keep… or ride
        with ME, and we&apos;ll take this kingdom apart brick by brick. Choose.”
      </div>
      <div className="quest-item">
        <div className="q-name">🐂 Join Cedric&apos;s Rebellion</div>
        {betrayedCedric ? (
          <div className="q-desc">
            You already turned on this camp once. He is not fool enough to trust you a second time.
          </div>
        ) : (
          <>
            <div className="q-desc">
              Pledge to the Bull. His raiders will never again touch your homestead — but the
              crown&apos;s knights will come for you instead, and the King will not forget.
            </div>
            <button className="menu-btn small" style={{ margin: '8px 0 0' }} onClick={() => pledgeAlliance('cedric')}>
              Clasp arms with Cedric
            </button>
          </>
        )}
      </div>
      <div className="quest-item">
        <div className="q-name">⚔ Challenge Him to Battle</div>
        <div className="q-desc">
          {finalStandReady
            ? 'His Final Stand — answer his offer with steel, and finish this for good.'
            : 'Answer his offer with steel — he fights for real, but has not yet earned his final defeat.'}
        </div>
        <button className="menu-btn small danger" style={{ margin: '8px 0 0' }} onClick={challenge}>
          {finalStandReady ? 'Draw your sword — His Final Stand' : 'Draw your sword'}
        </button>
      </div>
      <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
        Walk away
      </button>
    </PopupFrame>
  );
}
