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
  const gold = inventory.gold ?? 0;

  const sellables = (Object.keys(SELL_PRICES) as ItemId[]).filter((id) => (inventory[id] ?? 0) > 0);

  return (
    <div className="game-panel clickable" style={{ minWidth: 640 }}>
      <button className="panel-close" onClick={() => setPanel('none')}>✕</button>
      <h2>Merchant</h2>
      <div style={{ fontSize: 15, color: 'var(--gold)', marginBottom: 12 }}>🪙 Your purse: {gold} gold</div>
      <div style={{ display: 'flex', gap: 22 }}>
        <div style={{ flex: 1 }}>
          <div className="creator-section">Sell</div>
          {sellables.length === 0 && (
            <div className="loading-note">Nothing in your satchel he wants today.</div>
          )}
          {sellables.map((id) => (
            <div className="recipe-row" key={id}>
              <div className="icon"><Ico e={ITEMS[id].icon} /></div>
              <div className="r-main">
                <div className="r-name">{ITEMS[id].name} × {inventory[id]}</div>
                <div className="r-cost">{SELL_PRICES[id]}g each</div>
              </div>
              <button onClick={() => sellItem(id, 1)}>Sell 1</button>
              <button onClick={() => sellItem(id, inventory[id] ?? 0)}>All</button>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div className="creator-section">Buy</div>
          {BUY_OFFERS.map((o) => (
            <div className="recipe-row" key={o.item}>
              <div className="icon"><Ico e={ITEMS[o.item].icon} /></div>
              <div className="r-main">
                <div className="r-name">{ITEMS[o.item].name}{o.qty > 1 ? ` ×${o.qty}` : ''}</div>
                <div className="r-cost">{o.price}g</div>
              </div>
              <button disabled={gold < o.price} onClick={() => buyOffer(o.item, o.qty, o.price)}>
                Buy
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
