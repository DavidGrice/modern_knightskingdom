'use client';
// The traveling merchant's ledger: sell surplus, buy stock.
import { useEffect, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { SELL_PRICES, BUY_OFFERS, marketPriceMultiplier } from '@/game/data/trade';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';
import Ico from '../ui/Ico';

/** Wave 49 (C3) · how a live market swing reads to the player — a colored
 *  ▲/▼ tag next to the gold number rather than a new dashboard, matching
 *  this project's own polish bar (Wave 43's ChallengeRunner HUD, Wave 48's
 *  DungeonStatus countdown). Necessary, not just decorative: a 25% swing on
 *  a 1-2g good (wood/stone) rounds away in the displayed gold number, so
 *  without this tag the mechanic would be invisible for half the sell list. */
function MarketTag({ mul }: { mul: number }) {
  if (Math.abs(mul) < 0.01) return null;
  const pct = Math.round(mul * 100);
  const up = mul > 0;
  return (
    <span style={{ marginLeft: 6, fontSize: 12, color: up ? '#e0a94a' : '#7fc47f' }}>
      {up ? `▲ scarce (+${pct}%)` : `▼ oversupplied (${pct}%)`}
    </span>
  );
}

export default function ShopPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const inventory = useGameStore((s) => s.inventory);
  const sellItem = useGameStore((s) => s.sellItem);
  const buyOffer = useGameStore((s) => s.buyOffer);
  // Wit + Silver Tongue trade-off perk: the haggle terms here mirror the
  // exact multipliers sellItem()/buyOffer() themselves apply — shown so the
  // price on the ticket is the price actually charged, not a stale base
  // number, and so the Buy button's affordability check agrees with what
  // buyOffer() will really deduct (a player with exactly enough gold for the
  // discounted price would otherwise see it wrongly greyed out).
  const silverTongue = useGameStore((s) => s.perks.includes('silver_tongue'));
  const wit = useGameStore((s) => s.attrSpent.wit ?? 0);
  const marketState = useGameStore((s) => s.marketState);
  const gold = inventory.gold ?? 0;

  // Wave 49 (C3): the market decays continuously (a linear real-time curve,
  // read lazily), so a panel left open needs its own light refresh to show
  // that motion — the same polling shape EquipmentSection already uses for
  // its own live reads, just slower, since a 20-minute recovery curve needs
  // nothing faster than a few seconds to look alive.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const sellables = (Object.keys(SELL_PRICES) as ItemId[]).filter((id) => (inventory[id] ?? 0) > 0);

  return (
    <div className="game-panel clickable" style={{ minWidth: 'min(640px, 94vw)' }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>Merchant</h2>
      <div style={{ fontSize: 15, color: 'var(--gold)', marginBottom: 12 }}>🪙 Your purse: {gold} gold</div>
      <div className="shop-columns" style={{ display: 'flex', gap: 22 }}>
        <div style={{ flex: 1 }}>
          <div className="creator-section">Sell</div>
          {sellables.length === 0 && (
            <div className="loading-note">Nothing in your satchel he wants today.</div>
          )}
          {sellables.map((id) => {
            // Wave 49 (C3): mirrors marketPriceMultiplier's exact read
            // sellItem() itself makes — see this file's own long-standing
            // comment above on why the ticket must show the real price.
            const marketMul = marketPriceMultiplier(marketState[id], Date.now());
            const each = Math.round((SELL_PRICES[id] ?? 0) * (1 + marketMul + wit * 0.04 + (silverTongue ? 0.15 : 0)));
            return (
              <div className="recipe-row" key={id}>
                <div className="icon"><Ico e={ITEMS[id].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[id].name} × {inventory[id]}</div>
                  <div className="r-cost">{each}g each<MarketTag mul={marketMul} /></div>
                </div>
                <button onClick={() => sellItem(id, 1)}>Sell 1</button>
                <button onClick={() => sellItem(id, inventory[id] ?? 0)}>All</button>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1 }}>
          <div className="creator-section">Buy</div>
          {BUY_OFFERS.map((o) => {
            const marketMul = marketPriceMultiplier(marketState[o.item], Date.now());
            const cost = Math.max(1, Math.round(o.price * (1 + marketMul - wit * 0.04 - (silverTongue ? 0.15 : 0))));
            return (
              <div className="recipe-row" key={o.item}>
                <div className="icon"><Ico e={ITEMS[o.item].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[o.item].name}{o.qty > 1 ? ` ×${o.qty}` : ''}</div>
                  <div className="r-cost">{cost}g<MarketTag mul={marketMul} /></div>
                </div>
                <button disabled={gold < cost} onClick={() => buyOffer(o.item, o.qty, o.price)}>
                  Buy
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
