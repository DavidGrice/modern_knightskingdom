'use client';
// Small home props marking where Alric and Beda actually live, so the
// starter-village corner (data/npcs.ts) reads as lived-in rather than two
// minifigs standing in an empty field. Where they stand is data
// (data/world.ts's VILLAGE_HUTS), which the merchant's way reads too.
import PropModel from './PropModel';
import { VILLAGE_HUT_HEIGHT, VILLAGE_HUTS } from '@/game/data/world';

export default function StarterVillage() {
  return (
    <>
      {VILLAGE_HUTS.map((h, i) => (
        <PropModel key={i} url="/assets/props/buildings/mc001.glb" height={VILLAGE_HUT_HEIGHT} position={[h.x, 0, h.z]} yaw={h.yaw} />
      ))}
    </>
  );
}
