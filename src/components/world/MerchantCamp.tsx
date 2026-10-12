'use client';
// Wave 46 (B4) · the traveling merchant's own walled camp — a real defended
// enclosure of his own, rather than sharing Alric's/Beda's starter-village
// corner (see trade.ts's own history comment on MERCHANT_SPOT). Reuses the
// same mc-family wall pieces StarterVillage.tsx already places (mc001
// corners, and mc005 — "Castle Wall (Low)", the straight this family's own
// corner already joins flush against in buildables.ts), at the family's real
// k=0.05 defensive height (3.84) rather than StarterVillage's own stylized
// 2.6m "hut" scale-down — this is a defensive wall, not a cottage.
//
// Three sides only (back + two wings), open north toward the gate the road
// spur (road.ts leg 6) walks in through — MERCHANT_SPOT sits in the yard,
// facing that gate. Corner yaws/seam alignment are a placeholder pending one
// live look-and-feel pass (buildables.ts gives real footprint sizes but no
// rotation convention for how mc001's corner "point" aligns to a 90° join —
// StarterVillage.tsx's own two corner yaws were hand-eyeballed for the same
// reason, not computed).
//
// CLN-22 · WHERE each piece stands is data now: MERCHANT_CAMP_WALLS, beside
// MERCHANT_SPOT in data/trade.ts. This file draws them, in that order.
import PropModel from './PropModel';
import { MERCHANT_CAMP_WALLS } from '@/game/data/trade';

const B = '/assets/props/buildings';
const WALL_HEIGHT = 3.84; // mc001/mc005's shared true height at k=0.05 (buildables.ts)

export default function MerchantCamp() {
  return (
    <>
      {MERCHANT_CAMP_WALLS.map((w, i) => (
        <PropModel key={i} url={`${B}/${w.model}.glb`} height={WALL_HEIGHT} position={[w.x, 0, w.z]} yaw={w.yaw} />
      ))}
    </>
  );
}
