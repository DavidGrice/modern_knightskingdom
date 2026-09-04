'use client';
import { Suspense } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import Terrain, { GameSky } from './Terrain';
import DayNight from './DayNight';
import PostProcessing from './PostProcessing';
import FpsMeter from './FpsMeter';
import PerfMeter from './PerfMeter';
import Weather from './Weather';
import Wildlife from './Wildlife';
import ResourceNodes from './ResourceNodes';
import Grounds from './Grounds';
import KeepAssembly from './KeepAssembly';
import MountedHorse from './MountedHorse';
import Companion from './Companion';
import WorkshopBench from './WorkshopBench';
import Buildings from './Buildings';
import Npc from './Npc';
import Merchant from './Merchant';
import Villagers from './Villagers';
import Defenders from './Defenders';
import DepositFloaties from './DepositFloaties';
import StarterVillage from './StarterVillage';
import Road from './Road';
import Emplacements from './Emplacements';
import CedricCamp from './CedricCamp';
import BattleDome from './BattleDome';
import CourtDressing from './CourtDressing';
import TemplatePopulation from './TemplatePopulation';
import GuildHalls from './GuildHalls';
import DragonOmen from './DragonOmen';
import DragonSiege from './DragonSiege';
import BlackDragonSiege from './BlackDragonSiege';
import CedricSiege from './CedricSiege';
import BuildingInteriorRoom from './BuildingInteriorRoom';
import Signpost from './Signpost';
import TemplateWorld from './TemplateWorld';
import DestinationScope from './DestinationScope';
import PlayerController from '../fps/PlayerController';
import PlayerAvatar from '../fps/PlayerAvatar';
import Viewmodel from '../fps/Viewmodel';
import GamepadMenuController from '../fps/GamepadMenuController';
import BuildController from '../build/BuildController';
import CombatController from '../combat/CombatController';
import Enemies from '../combat/Enemies';
import RaiderRam from '../combat/RaiderRam';
import Cannonballs from '../combat/Cannonballs';
import Bolts from '../combat/Bolts';
import ArenaSpawner from '../combat/ArenaSpawner';
import AiRuntime from '@/ai/AiRuntime';
import AIPerceptionGizmos from '@/ai/debug/AIPerceptionGizmos';

export default function GameWorld() {
  const buildMode = useGameStore((s) => s.buildMode);
  // requested 2026-08-04: the skybox used to be one hardcoded 'grass' bake
  // rendered behind every destination, including the "icy mountain pass"
  // template — see Terrain.tsx's SKY_VARIANTS for the fix itself.
  const destination = useGameStore((s) => s.destination);
  const skyVariant = (destination && WORLD_DESTINATION_BY_ID[destination]?.sky) || 'grass';

  return (
    <>
      <PostProcessing />
      <FpsMeter />
      <PerfMeter />
      <DayNight />
      <Weather />
      <Wildlife />
      <Suspense fallback={null}>
        <GameSky variant={skyVariant} />
      </Suspense>
      {/* Wave 18 #5 · home-only environment pieces, gated at THIS mount site
          rather than with an internal `if (destination) return null` —
          Terrain owns its own useFrame (seasonal tint + water scroll), and a
          real unmount is what actually tears that down instead of leaving it
          ticking behind a hidden mesh. See PROJECT_CONTEXT.md's "Instance
          separation" note for the full render-guarantee this completes. */}
      {!destination && <Terrain />}
      <ResourceNodes />
      <Grounds />
      <KeepAssembly />
      <MountedHorse />
      {/* Wave 25 · same unconditional, everywhere-the-player-is convention
          as MountedHorse above — see Companion.tsx's own header for the
          confirmed precedent. Renders nothing until st.companionRecruited. */}
      <Companion />
      <WorkshopBench />
      <Buildings />
      {!destination && <Signpost />}
      <Suspense fallback={null}>
        <BuildingInteriorRoom />
      </Suspense>
      <Suspense fallback={null}>
        <TemplateWorld />
      </Suspense>
      <Suspense fallback={null}>
        <Npc />
        {!destination && <Merchant />}
        <Villagers />
        <Defenders />
        <DepositFloaties />
        {!destination && <Road />}
        {/* real simulation, not decoration — its useFrame drives actual
            raid-defense fire/detonation via siege.ts and renders nothing
            itself, so there is no GPU cost to save by gating it; only the
            tick would be lost, silently disabling home defense while away */}
        <Emplacements />
        {!destination && <StarterVillage />}
        <CedricCamp />
        <BattleDome />
        <CourtDressing />
        <TemplatePopulation />
        <DestinationScope />
        <GuildHalls />
        <DragonOmen />
        <DragonSiege />
        <BlackDragonSiege />
        <CedricSiege />
      </Suspense>
      {buildMode ? <BuildController /> : <PlayerController />}
      {/* the player's own body stays visible in build mode too — it used to
          vanish entirely (not just uninteractable) because this was folded
          into the same condition that swaps the controller/viewmodel, which
          genuinely are FPS-combat-only */}
      <Suspense fallback={null}>
        <PlayerAvatar />
      </Suspense>
      {!buildMode && (
        <Suspense fallback={null}>
          <Viewmodel />
          <CombatController />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <Enemies />
        {/* Wave 18 #5 · left always-mounted, deliberately not gated on
            destination: its own useFrame is the only place raiderRamState
            advances toward the home gate and calls ramCheck (real siege
            damage) — there is no central store tick doing this, so gating
            the render would silently freeze the ram's advance while the
            player is away. */}
        <RaiderRam />
      </Suspense>
      <Cannonballs />
      <Bolts />
      <ArenaSpawner />
      {/* Wave 15 · always mounted (unlike CombatController above), same
          reasoning as ArenaSpawner/AiRuntime here — Start/B need to keep
          opening/closing panels and pausing even while BuildController (not
          PlayerController) owns movement, exactly like the keyboard's own
          Escape handler (GameScreen.tsx) already does regardless of
          buildMode. See the component's own header for the full scope call. */}
      <GamepadMenuController />
      {/* NPC_AI_SPEC §2 — steps the agent scheduler; renders nothing */}
      <AiRuntime />
      {/* §9's scene gizmos (phase 6): vision cones + belief markers. Always
          mounted, drawing nothing until Alt+` turns it on — the geometry is
          preallocated once and the per-frame path early-outs on a boolean,
          so an off gizmo layer costs one branch. */}
      <AIPerceptionGizmos />
    </>
  );
}
