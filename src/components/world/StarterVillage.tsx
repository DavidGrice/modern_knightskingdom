'use client';
// Small home props marking where Alric and Beda actually live, so the
// starter-village corner (data/npcs.ts) reads as lived-in rather than two
// minifigs standing in an empty field.
import PropModel from './PropModel';

export default function StarterVillage() {
  return (
    <>
      <PropModel url="/assets/props/buildings/mc001.glb" height={2.6} position={[-41.5, 0, 36.5]} yaw={Math.PI * 0.2} />
      <PropModel url="/assets/props/buildings/mc001.glb" height={2.6} position={[-34, 0, 44]} yaw={Math.PI * 1.3} />
    </>
  );
}
