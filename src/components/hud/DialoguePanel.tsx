'use client';
// Parchment dialogue with the royal court: a one-time voiced lore
// introduction (real lines from the original game's 371-line challenge
// voice-over bank) the first time you meet certain NPCs, then flavor line,
// side-quest offer / progress / turn-in, and the main quest hint from Leo.
import { useEffect, useMemo, useState } from 'react';
import { useGameStore, activeQuestOf } from '@/game/store/gameStore';
import { NPC_BY_ID, sideQuestBlocker, sideQuestsOf } from '@/game/data/npcs';
import { SETTLEMENT_FOUNDING } from '@/game/data/settlementQuests';
import {
  CARAVAN_CAP_PER_CART, CARAVAN_INSURANCE_RATE, CARAVAN_MARKUP, CARAVAN_MAX_CARTS, CARAVAN_ROUTES,
  caravanPartnerOf, caravanQuoteGold, caravanRouteKey, caravanTradeableItems,
} from '@/game/data/caravan';
import { ITEMS } from '@/game/data/items';
import { audio } from '@/lib/audio';
import { useEnemyStore, canChallengeStorm } from '@/game/combat';
import type { ItemId } from '@/game/types';
import { playerState } from '@/game/playerState';
import { sampleTemplateGroundY } from '../world/TemplateWorld';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';

export default function DialoguePanel() {
  const npcId = useGameStore((s) => s.dialogueNpc);
  const setPanel = useGameStore((s) => s.setPanel);
  const sideQuest = useGameStore((s) => s.sideQuest);
  const completedQuests = useGameStore((s) => s.completedQuests);
  const acceptSideQuest = useGameStore((s) => s.acceptSideQuest);
  const turnInSideQuest = useGameStore((s) => s.turnInSideQuest);
  const abandonSideQuest = useGameStore((s) => s.abandonSideQuest);
  const loreSeen = useGameStore((s) => s.loreSeen);
  const markLoreSeen = useGameStore((s) => s.markLoreSeen);
  const reputation = useGameStore((s) => s.reputation);
  const alliance = useGameStore((s) => s.alliance);
  const pledgeAlliance = useGameStore((s) => s.pledgeAlliance);
  const inventory = useGameStore((s) => s.inventory);
  const canAfford = useGameStore((s) => s.canAfford);
  const recruitVillageFolk = useGameStore((s) => s.recruitVillageFolk);
  const villagers = useGameStore((s) => s.villagers);
  const completedSideQuests = useGameStore((s) => s.completedSideQuests);
  const allegiance = useGameStore((s) => s.allegiance);
  const settlements = useGameStore((s) => s.settlements);
  const foundSettlement = useGameStore((s) => s.foundSettlement);
  const collectSettlementYield = useGameStore((s) => s.collectSettlementYield);
  const caravans = useGameStore((s) => s.caravans);
  const dispatchCaravan = useGameStore((s) => s.dispatchCaravan);
  const collectCaravan = useGameStore((s) => s.collectCaravan);
  const attrSpent = useGameStore((s) => s.attrSpent);
  const perks = useGameStore((s) => s.perks);

  const npc = npcId ? NPC_BY_ID[npcId] : null;
  const [loreStep, setLoreStep] = useState(0);
  // Wave 27 · the Trade Caravan dispatch form's own local picks — mirrors
  // loreStep just above (plain component state, no store round-trip until
  // the player actually commits with Dispatch).
  const [caravanItem, setCaravanItem] = useState<ItemId | null>(null);
  const [caravanQty, setCaravanQty] = useState(1);
  const [caravanInsured, setCaravanInsured] = useState(false);
  const lore = npc?.loreLines;
  const inLore = !!lore?.length && npcId != null && !loreSeen.includes(npcId) && loreStep < lore.length;

  // exactly one bark plays on open: the one-time voiced lore line the first
  // time you meet an NPC, otherwise their generic greetSound — PlayerController
  // used to also fire greetSound unconditionally, which overlapped this.
  useEffect(() => {
    if (!npc) return;
    if (lore?.length && npcId != null && !loreSeen.includes(npcId)) {
      audio.playVoice(lore[0].sound, 0.9);
    } else {
      audio.playVoice(npc.greetSound, 0.9);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // closing the parchment (any path — ✕, Continue, Esc) silences whatever
  // line is still being spoken; Skip cuts the voice mid-line too
  useEffect(() => () => audio.stopVoice(), []);

  function continueLore() {
    if (!npc || !lore) return;
    const next = loreStep + 1;
    if (next < lore.length) audio.playVoice(lore[next].sound, 0.9);
    else markLoreSeen(npc.id);
    setLoreStep(next);
  }

  function skipLore() {
    if (!npc || !lore) return;
    audio.stopVoice();
    markLoreSeen(npc.id);
    setLoreStep(lore.length);
  }

  const line = useMemo(
    () => (npc ? npc.lines[Math.floor(Math.random() * npc.lines.length)] : ''),
    [npc],
  );
  // Wave 13 · every court NPC's FULL errand pool — baked `sideQuests` plus
  // whatever allegianceQuests.ts/deliveryQuests.ts merges in via
  // `sideQuestsOf()`. This used to read `npc.sideQuests` directly, which
  // silently left every merged-in errand dead: real, complete data (the
  // king/queen/richard/cedric allegiance chains, Alric's and Beda's own
  // village work) that nobody could ever actually be offered through the
  // ordinary "talk to them" flow — logged in ROADMAP.md, left open.
  // QuestLogPanel/HUD/ParleyPanel already all read through sideQuestsOf();
  // this brings the last holdout into line with them.
  const pool = useMemo(() => (npc ? sideQuestsOf(npc.id) : []), [npc]);
  // offer rotates daily-ish: pick by completed-quest count so it varies,
  // skipping anything currently blocked so the panel never shows a quest
  // that would just bounce off acceptSideQuest's own guard.
  //
  // Wave 26 bugfix: also skip anything already in `completedSideQuests` —
  // `sideQuestBlocker` only ever checks precursor/allegiance/alliance gates,
  // never "already done" (QuestLogPanel computes that as its own separate
  // `done` flag, precisely so a finished errand still displays distinctly
  // from a blocked one there — folding it into sideQuestBlocker itself would
  // have made QuestLogPanel show a done quest as 'locked'). Without this,
  // the rotation index is keyed on `completedQuests.length` (MAIN quests),
  // which a side quest turn-in never changes — so a single-slot pool like
  // Torvald's (frostpass_shelter -> frostpass_clear) kept re-offering the
  // just-completed first errand forever, and the second one — the one that
  // actually unlocks the deed — could never surface through the ordinary
  // "talk to them" flow. Live-reproduced during Wave 26 verification; the
  // exact same shape (a 2-quest chain, second `requires` the first) is
  // shared byte-for-byte with Fenwick's settle_scout/settle_clear, so this
  // was a real, pre-existing gap this wave was simply the first to exercise
  // on a fresh save.
  const offer = useMemo(() => {
    if (!npc || pool.length === 0) return null;
    const start = (completedQuests.length + pool.length) % pool.length;
    for (let i = 0; i < pool.length; i++) {
      const q = pool[(start + i) % pool.length];
      if (completedSideQuests.includes(q.id)) continue;
      if (!sideQuestBlocker(q, completedSideQuests, completedQuests, allegiance, alliance)) return q;
    }
    return null; // every candidate is blocked or already done
  }, [npc, pool, completedQuests.length, completedSideQuests, allegiance, alliance]);

  if (!npc) return null;

  const rep = reputation[npc.id] ?? 0;
  const repTier = npc.repTitles ? [...npc.repTitles].reverse().find((t) => rep >= t.min) : null;
  const nextTier = npc.repTitles?.find((t) => t.min > rep);
  const mainQuest = activeQuestOf(completedQuests);
  // the ACTIVE errand's own def, from ITS giver's pool — not necessarily
  // this npc's, see the delivery-quest cross-match right below
  const activeDef = sideQuest ? sideQuestsOf(sideQuest.npcId).find((q) => q.id === sideQuest.questId) : null;
  // Wave 13 · a 'deliver' errand is accepted from its origin giver but can
  // only be turned in at the paired destination (deliverTo) — so "mine" also
  // matches while standing at THAT destination's own resident, even though
  // they didn't hand it to you (see npcs.ts's `deliverTo` doc comment).
  const mySideQuest = sideQuest && (
    sideQuest.npcId === npc.id
    || (activeDef?.kind === 'deliver' && activeDef.deliverTo === npc.world)
  ) ? sideQuest : null;
  const mySideDef = mySideQuest ? activeDef : null;
  const rewardText = (def: NonNullable<typeof offer>) =>
    [
      `${def.xp} ${def.xpSkill} XP`,
      ...Object.entries(def.rewardItems ?? {}).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`),
    ].join(' · ');

  const challengeStorm = () => {
    if (useEnemyStore.getState().enemies.some((e) => e.kind === 'storm')) {
      setPanel('none');
      return;
    }
    if (!canChallengeStorm()) {
      useGameStore.getState().notify('Storm catches her breath — try again in a moment.');
      return;
    }
    useEnemyStore.getState().spawn('storm', npc.x, npc.z, false);
    audio.playVoice('greeting_storm', 0.8);
    useGameStore.getState().notify('Princess Storm draws her sword: "First blood wins. Ready?"', true);
    setPanel('none');
  };

  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(520px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <img
          src={npc.portrait}
          alt={npc.name}
          style={{ width: 64, height: 56, objectFit: 'contain', border: '1px solid var(--gold-dim)', borderRadius: 8, background: 'rgba(0,0,0,0.3)' }}
        />
        <div>
          <div style={{ color: 'var(--gold)', fontSize: 20, letterSpacing: 1 }}>{npc.name}</div>
          <div style={{ color: 'var(--parchment-dark)', fontSize: 13, fontStyle: 'italic' }}>
            {repTier?.title ?? npc.title}
          </div>
          {nextTier && (
            <div style={{ color: 'var(--parchment-dark)', fontSize: 11, marginTop: 2 }}>
              Standing {rep} / {nextTier.min} to become {nextTier.title}
            </div>
          )}
        </div>
      </div>
      {inLore && lore ? (
        <>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>“{lore[loreStep].text}”</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--parchment-dark)' }}>{loreStep + 1} / {lore.length}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="menu-btn small" style={{ margin: 0 }} onClick={skipLore}>Skip</button>
              <button className="menu-btn small" style={{ margin: 0 }} onClick={continueLore}>
                {loreStep + 1 < lore.length ? 'Continue' : 'Finish'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, marginBottom: 14 }}>“{line}”</div>

          {npc.id === 'king' && mainQuest && (
            <div className="quest-item">
              <div className="q-name">➤ {mainQuest.name}</div>
              <div className="q-desc">{mainQuest.description}</div>
            </div>
          )}

          {/* Phase 19 alliance branch: once knighted, the crown asks for a
              real pledge — the counterpart offer waits at Cedric's camp */}
          {npc.id === 'king' && completedQuests.includes('knights_arms') && !alliance && (
            <div className="quest-item">
              <div className="q-name">👑 A Knight&apos;s Oath</div>
              <div className="q-desc">
                Swear fealty to the crown, and Cedric&apos;s rabble will forever be your enemy.
                Or hold your tongue — the Bull makes his own offers to unsworn knights.
              </div>
              <button className="menu-btn small" style={{ margin: '8px 0 0' }} onClick={() => pledgeAlliance('leo')}>
                Pledge your sword to the crown
              </button>
            </div>
          )}
          {npc.id === 'king' && alliance === 'leo' && (
            <div style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 10 }}>
              ⚜ You are sworn to the crown.
            </div>
          )}
          {npc.id === 'king' && alliance === 'cedric' && (
            <div style={{ fontSize: 13, color: 'var(--parchment-dark)', fontStyle: 'italic', marginBottom: 10 }}>
              The King&apos;s eyes are cold — word of your pact with the Bull has reached the court.
            </div>
          )}

          {npc.id === 'storm' && (
            <div className="quest-item">
              <div className="q-name">⚔ Battle Dome Duel</div>
              <div className="q-desc">First blood wins — land the first hit, or take one and try again.</div>
              <button className="menu-btn small" style={{ margin: '8px 0 0' }} onClick={challengeStorm}>
                Challenge to a Duel
              </button>
            </div>
          )}

          {/* Alric & Beda (2026-07-20): the two always-present starter
              villagers get a one-time recruitment offer instead of the
              generic (empty) side-quest pool — bring the goods matching
              their own trade and they join the roster outright, no beds or
              buildings required (they already live here). */}
          {(npc.id === 'farmer_alric' || npc.id === 'miller_beda')
            && !villagers.some((v) => v.id === npc.id) && (() => {
            const isAlric = npc.id === 'farmer_alric';
            const cost: Partial<Record<ItemId, number>> = isAlric ? { wood: 6 } : { stone: 6 };
            const costText = Object.entries(cost).map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(', ');
            const afford = canAfford(cost);
            return (
              <div className="quest-item">
                <div className="q-name">🏡 Join the Homestead</div>
                <div className="q-desc">
                  {isAlric
                    ? "Bring me 6 wood, and I'll put my back into your harvest — I've farmed longer than you've been alive."
                    : "Bring me 6 stone, and I'll break rock for your homestead same as ever."}
                </div>
                <div className="q-desc">Cost: {costText} (you have {Object.entries(cost).map(([id]) => inventory[id as ItemId] ?? 0).join(', ')})</div>
                <button
                  className="menu-btn small"
                  style={{ margin: '8px 0 0' }}
                  disabled={!afford}
                  onClick={() => { recruitVillageFolk(npc.id as 'farmer_alric' | 'miller_beda'); setPanel('none'); }}
                >
                  {afford ? `Welcome ${npc.name} home` : 'Not enough materials'}
                </button>
              </div>
            );
          })()}

          {/* Empire arc, Wave 4: a settlement's own quest-giver (Fenwick at
              template-08; Torvald at template-07 as of Wave 26) offers the
              chain's ordinary errands through the ordinary flow above
              (they're just entries in their own `sideQuests`) — this block
              is only the special "close the deed" / "collect yield" actions
              once earned, same shape as the Alric/Beda block above.
              Wave 26: generalized off the old `npc.id === 'fenwick'` check
              and the hardcoded `'settle_clear'`/`{gold:60}` literals to a
              lookup into SETTLEMENT_FOUNDING (data/settlementQuests.ts) —
              template-08 reads byte-identical values back out, and a second
              site's quest-giver now gets the same UI for free. */}
          {(() => {
            const founding = npc.world ? SETTLEMENT_FOUNDING[npc.world] : undefined;
            if (!founding) return null;
            const world = npc.world!;
            const names = founding.residents.map((r) => r.name);
            const nameList = names.length > 1
              ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
              : names[0];
            if (settlements[world]) {
              return (
                <div className="quest-item">
                  <div className="q-name">🏘️ Settlement Yield</div>
                  <div className="q-desc">{nameList} send word of what the settlement has produced.</div>
                  <button
                    className="menu-btn small"
                    style={{ margin: '8px 0 0' }}
                    onClick={() => collectSettlementYield(world)}
                  >
                    Collect Yield
                  </button>
                </div>
              );
            }
            const ready = completedSideQuests.includes(founding.requiredQuestId);
            const costText = Object.entries(founding.cost)
              .map(([id, n]) => `${n}× ${ITEMS[id as ItemId]?.name ?? id}`).join(', ');
            const afford = canAfford(founding.cost);
            return (
              <div className="quest-item">
                <div className="q-name">🚩 Found Your Settlement</div>
                <div className="q-desc">
                  {ready
                    ? `The work is done. File the deed and ${nameList} will settle here — ${costText}.`
                    : "There's more to prove before I'll see about the deed."}
                </div>
                {ready && (
                  <>
                    <div className="q-desc">
                      {/* Wave 26 polish: named per-item ("you have N× Gold"),
                          not bare comma-joined numbers — both real founding
                          entries (template-07/08) happen to be gold-only
                          today, so this was cosmetically fine either way, but
                          named it properly rather than leaving it correct by
                          coincidence for the first future site with a mixed
                          cost. */}
                      Cost: {costText} (you have {
                        Object.entries(founding.cost)
                          .map(([id]) => `${inventory[id as ItemId] ?? 0}× ${ITEMS[id as ItemId]?.name ?? id}`)
                          .join(', ')
                      })
                    </div>
                    <button
                      className="menu-btn small"
                      style={{ margin: '8px 0 0' }}
                      disabled={!afford}
                      onClick={() => {
                        const groundY = sampleTemplateGroundY(playerState.x, playerState.z);
                        foundSettlement(world, playerState.x, playerState.z, groundY);
                        setPanel('none');
                      }}
                    >
                      {afford ? 'File the Deed' : 'Not enough materials'}
                    </button>
                  </>
                )}
              </div>
            );
          })()}

          {/* Wave 27 · Trade Caravan — extends the settlement block above
              with the new dispatch/collect action, shown only once BOTH
              ends of a caravan route are founded settlements (data/
              caravan.ts's CARAVAN_ROUTES; only template-07<->template-08
              has a route as of this wave). Reuses the exact same "talk to
              the settlement's own resident" access pattern as Settlement
              Yield above — zero new panel/route/hotkey. */}
          {(() => {
            const world = npc.world;
            if (!world || !settlements[world]) return null;
            const partner = caravanPartnerOf(world);
            if (!partner || !settlements[partner]) return null;
            const key = caravanRouteKey(world, partner);
            const route = CARAVAN_ROUTES[key];
            const partnerName = WORLD_DESTINATION_BY_ID[partner]?.name ?? partner;
            const run = caravans[key];

            if (run) {
              const remainMin = Math.ceil((run.etaMs - (Date.now() - run.departedAt)) / 60000);
              const originName = WORLD_DESTINATION_BY_ID[run.from]?.name ?? run.from;
              return (
                <div className="quest-item">
                  <div className="q-name">🐎 Trade Caravan</div>
                  {remainMin <= 0 ? (
                    <>
                      <div className="q-desc">The caravan from {originName} has arrived.</div>
                      <button
                        className="menu-btn small"
                        style={{ margin: '8px 0 0' }}
                        onClick={() => collectCaravan(run.from, run.to)}
                      >
                        ✅ Collect Caravan
                      </button>
                    </>
                  ) : (
                    <div className="q-desc">Caravan en route — back in about {remainMin}m.</div>
                  )}
                </div>
              );
            }

            const carts = Math.min(CARAVAN_MAX_CARTS, villagers.filter((v) => (v.world ?? null) === world && v.gear?.carrier === 'cart').length);
            const cap = carts * CARAVAN_CAP_PER_CART;
            const tradeable = caravanTradeableItems(inventory);
            const wit = attrSpent.wit ?? 0;
            const silverTongue = perks.includes('silver_tongue');
            const held = caravanItem ? (inventory[caravanItem] ?? 0) : 0;
            const qty = Math.max(1, Math.min(caravanQty, cap, held || 1));
            const quote = caravanItem ? caravanQuoteGold(caravanItem, qty, wit, silverTongue) : 0;
            const insuranceCost = caravanItem ? Math.ceil(quote * CARAVAN_INSURANCE_RATE) : 0;

            return (
              <div className="quest-item">
                <div className="q-name">🐎 Trade Caravan</div>
                <div className="q-desc">
                  Load cargo and dispatch a caravan to {partnerName} — {Math.round(CARAVAN_MARKUP * 100 - 100)}%
                  over the merchant&apos;s rate, back in about {Math.round((route?.etaMs ?? 0) / 60000)}m.
                </div>
                {carts <= 0 ? (
                  <div className="q-desc" style={{ fontStyle: 'italic' }}>
                    No one here is equipped with a Hand Cart.
                  </div>
                ) : (
                  <>
                    <div className="equip-tile-row">
                      {tradeable.length === 0 && (
                        <div className="q-desc">Nothing in your satchel is worth carting.</div>
                      )}
                      {tradeable.map((id) => (
                        <button
                          key={id}
                          className="menu-btn small"
                          style={{
                            margin: 0, width: 'auto', padding: '4px 9px',
                            opacity: caravanItem === id ? 1 : 0.65,
                            borderColor: caravanItem === id ? 'var(--gold)' : undefined,
                          }}
                          onClick={() => { setCaravanItem(id); setCaravanQty(Math.min(inventory[id] ?? 1, cap)); }}
                        >
                          {ITEMS[id]?.name ?? id} ({inventory[id] ?? 0})
                        </button>
                      ))}
                    </div>
                    {caravanItem && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
                          <button
                            className="menu-btn small" style={{ margin: 0, width: 'auto', padding: '2px 10px' }}
                            onClick={() => setCaravanQty((q) => Math.max(1, q - 1))}
                          >-</button>
                          <span>{qty} / {cap} cap</span>
                          <button
                            className="menu-btn small" style={{ margin: 0, width: 'auto', padding: '2px 10px' }}
                            onClick={() => setCaravanQty((q) => Math.min(cap, held, q + 1))}
                          >+</button>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                          <input
                            type="checkbox" checked={caravanInsured}
                            onChange={(e) => setCaravanInsured(e.target.checked)}
                          />
                          Escort (insure, {insuranceCost} gold) — guarantees no loss on the road
                        </label>
                        <div className="q-desc">
                          Quote: {quote} gold on arrival
                          {route ? ` (${Math.round(route.riskPct * 100)}% risk uninsured)` : ''}.
                        </div>
                        <button
                          className="menu-btn small"
                          style={{ margin: '8px 0 0' }}
                          disabled={caravanInsured && (inventory.gold ?? 0) < insuranceCost}
                          onClick={() => {
                            dispatchCaravan(world, partner, caravanItem, qty, caravanInsured);
                            setCaravanItem(null); setCaravanQty(1); setCaravanInsured(false);
                          }}
                        >
                          🐎 Dispatch to {partnerName}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {mySideQuest && mySideDef && (() => {
            const notHere = mySideDef.kind === 'deliver' && npc.world !== mySideDef.deliverTo;
            const ready = mySideQuest.have >= mySideDef.need;
            return (
              <div className="quest-item">
                <div className="q-name">📜 {mySideDef.label}</div>
                <div className="q-desc">Progress: {mySideQuest.have}/{mySideDef.need} · Reward: {rewardText(mySideDef)}</div>
                {mySideDef.kind === 'deliver' && (
                  <div className="q-desc" style={{ fontStyle: 'italic' }}>
                    {notHere
                      ? `Carry it to ${WORLD_DESTINATION_BY_ID[mySideDef.deliverTo ?? '']?.name ?? 'its destination'}.`
                      : `Hand it to ${npc.name} here.`}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    className="menu-btn small"
                    style={{ margin: 0 }}
                    disabled={!ready || notHere}
                    onClick={turnInSideQuest}
                  >
                    {!ready ? 'Not finished yet' : notHere ? 'Not delivered here' : 'Turn In'}
                  </button>
                  <button className="menu-btn small danger" style={{ margin: 0 }} onClick={abandonSideQuest}>
                    Abandon
                  </button>
                </div>
              </div>
            );
          })()}

          {!sideQuest && offer && (
            <div className="quest-item">
              <div className="q-name">❓ {offer.label}</div>
              <div className="q-desc">Reward: {rewardText(offer)}</div>
              {offer.kind === 'deliver' && (
                <div className="q-desc" style={{ fontStyle: 'italic' }}>
                  Deliver to {WORLD_DESTINATION_BY_ID[offer.deliverTo ?? '']?.name ?? 'its destination'}.
                </div>
              )}
              <button
                className="menu-btn small"
                style={{ margin: '8px 0 0' }}
                onClick={() => acceptSideQuest(npc.id, offer.id)}
              >
                Accept Errand
              </button>
            </div>
          )}

          {sideQuest && !mySideQuest && (
            <div style={{ fontSize: 13, color: 'var(--parchment-dark)' }}>
              You already carry an errand for {NPC_BY_ID[sideQuest.npcId]?.name}. Finish it first.
            </div>
          )}

          <button className="menu-btn" style={{ marginTop: 14 }} onClick={() => setPanel('none')}>
            Farewell
          </button>
        </>
      )}
    </div>
  );
}
