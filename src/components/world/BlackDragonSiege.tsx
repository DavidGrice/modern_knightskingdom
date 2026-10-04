'use client';
// Wave 36 (A8) · The Black Dragon: Cedric's own beast, l7517401 — a second,
// fully independent dragon siege with the green dragon's own nightly-roll
// shape. It began as a sibling copy of DragonSiege.tsx, to keep it from
// blurring into "build a generalized boss-encounter framework" and risking
// the shipped encounter; Wave 38 (A1) gave both dragons one hits-to-rout
// curve (game/bossEncounter.ts), and CLN-18 one state machine
// (DragonSiegeController.tsx). What makes it THIS dragon is BLACK_DRAGON
// (game/dragonSiegeConfig.ts) — unlike the original (which granted nothing on
// a rout but achievements until Wave 38), Cedric's beast has carried a real
// haul from the start.
import DragonSiegeController from './DragonSiegeController';
import { BLACK_DRAGON } from '@/game/dragonSiegeConfig';

export default function BlackDragonSiege() {
  return <DragonSiegeController config={BLACK_DRAGON} />;
}
