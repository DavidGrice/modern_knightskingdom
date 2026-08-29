'use client';
// The traveling merchant's ledger: sell surplus, buy stock.
import { useGameStore } from '@/game/store/gameStore';
import { SELL_PRICES, BUY_OFFERS } from '@/game/data/trade';
import { ITEMS } from '@/game/data/items';
import type { ItemId } from '@/game/types';
import Ico from '../ui/Ico';

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
  const gold = inventory.gold ?? 0;

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
            const each = Math.round((SELL_PRICES[id] ?? 0) * (1 + wit * 0.04 + (silverTongue ? 0.15 : 0)));
            return (
              <div className="recipe-row" key={id}>
                <div className="icon"><Ico e={ITEMS[id].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[id].name} × {inventory[id]}</div>
                  <div className="r-cost">{each}g each</div>
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
            const cost = Math.max(1, Math.round(o.price * (1 - wit * 0.04 - (silverTongue ? 0.15 : 0))));
            return (
              <div className="recipe-row" key={o.item}>
                <div className="icon"><Ico e={ITEMS[o.item].icon} /></div>
                <div className="r-main">
                  <div className="r-name">{ITEMS[o.item].name}{o.qty > 1 ? ` ×${o.qty}` : ''}</div>
                  <div className="r-cost">{cost}g</div>
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
