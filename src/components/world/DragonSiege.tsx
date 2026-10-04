'use client';
// The Dragonfire Siege: once the omen has been witnessed, deep-night rolls
// can bring the beast DOWN on the homestead. The siege itself — the circling
// flight, the fire, the stings that rout it — is DragonSiegeController.tsx;
// what makes it THIS dragon is GREEN_DRAGON (game/dragonSiegeConfig.ts).
import DragonSiegeController from './DragonSiegeController';
import { GREEN_DRAGON } from '@/game/dragonSiegeConfig';

export default function DragonSiege() {
  return <DragonSiegeController config={GREEN_DRAGON} />;
}
