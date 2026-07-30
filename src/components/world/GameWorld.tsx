'use client';
import { Suspense } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import Terrain, { GameSky } from './Terrain';
import DayNight from './DayNight';
import Weather from './Weather';
import Wildlife from './Wildlife';
import ResourceNodes from './ResourceNodes';
import Grounds from './Grounds';
import KeepAssembly from './KeepAssembly';
import MountedHorse from './MountedHorse';
import WorkshopBench from './WorkshopBench';
import Buildings from './Buildings';
import Npc from './Npc';
import Merchant from './Merchant';
import Villagers from './Villagers';
import Defenders from './Defenders';
import StarterVillage from './StarterVillage';
import Road from './Road';
import Emplacements from './Emplacements';
import CedricCamp from './CedricCamp';
import BattleDome from './BattleDome';
import CourtDressing from './CourtDressing';
import GuildHalls from './GuildHalls';
import DragonOmen from './DragonOmen';
import DragonSiege from './DragonSiege';
import CedricSiege from './CedricSiege';
import BuildingInteriorRoom from './BuildingInteriorRoom';
import Signpost from './Signpost';
import TemplateWorld from './TemplateWorld';
import PlayerController from '../fps/PlayerController';
import PlayerAvatar from '../fps/PlayerAvatar';
import Viewmodel from '../fps/Viewmodel';
import BuildController from '../build/BuildController';
import CombatController from '../combat/CombatController';
import Enemies from '../combat/Enemies';
import RaiderRam from '../combat/RaiderRam';
import Cannonballs from '../combat/Cannonballs';
import Bolts from '../combat/Bolts';
import RideHorse from '../fps/RideHorse';
import AiRuntime from '@/ai/AiRuntime';

export default function GameWorld() {
  const buildMode = useGameStore((s) => s.buildMode);

  return (
    <>
      <DayNight />
      <Weather />
      <Wildlife />
      <Suspense fallback={null}>
        <GameSky />
      </Suspense>
      <Terrain />
      <ResourceNodes />
      <Grounds />
      <KeepAssembly />
      <MountedHorse />
      <WorkshopBench />
      <Buildings />
      <Signpost />
      <Suspense fallback={null}>
        <BuildingInteriorRoom />
      </Suspense>
      <Suspense fallback={null}>
        <TemplateWorld />
      </Suspense>
      <Suspense fallback={null}>
        <Npc />
        <Merchant />
        <Villagers />
        <Defenders />
        <Road />
        <Emplacements />
        <StarterVillage />
        <CedricCamp />
        <BattleDome />
        <CourtDressing />
        <GuildHalls />
        <DragonOmen />
        <DragonSiege />
        <CedricSiege />
      </Suspense>
      {buildMode ? <BuildController /> : <PlayerController />}
      {!buildMode && (
        <Suspense fallback={null}>
          <PlayerAvatar />
          <Viewmodel />
          <CombatController />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <Enemies />
        <RaiderRam />
      </Suspense>
      <Cannonballs />
      <Bolts />
      {/* NPC_AI_SPEC §2 — steps the agent scheduler; renders nothing */}
      <AiRuntime />
      {!buildMode && <RideHorse />}
    </>
  );
}
