'use client';
// Guild halls (Phase 21): each of the five guilds keeps a modest open-air
// hall near its home instance's travel landing — a stone plinth, the
// guild's twin pennants, and a table of their trade. Same environment-
// placement rules as CourtDressing/CedricCamp: mounted only while visiting,
// every piece terrain-following at its own footprint.
import { Suspense } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { GUILD_BY_WORLD } from '@/game/data/guilds';
import { Grounded, Pennant } from './CourtDressing';
import PropModel from './PropModel';

const SCEN = '/assets/props/scenery';

const GUILD_COLORS: Record<string, string> = {
  woodsmen: '#3f8f4a',
  miners: '#8d939c',
  anglers: '#2e8fb0',
  builders: '#c98a2e',
  knights: '#b03a2e',
};

export default function GuildHalls() {
  const destination = useGameStore((s) => s.destination);
  const guild = destination ? GUILD_BY_WORLD[destination] : null;
  if (!guild) return null;
  const color = GUILD_COLORS[guild.id] ?? '#d8b74a';
  return (
    <Suspense fallback={null}>
      {/* the hall floor: a low stone plinth */}
      <Grounded x={guild.hallX} z={guild.hallZ}>
        <mesh position-y={0.12} castShadow receiveShadow>
          <boxGeometry args={[5.4, 0.24, 4.2]} />
          <meshStandardMaterial color="#6b6b72" roughness={1} />
        </mesh>
      </Grounded>
      {/* twin pennants in the guild's color flank the entrance */}
      <Grounded x={guild.hallX - 2.4} z={guild.hallZ - 1.8}><Pennant color={color} /></Grounded>
      <Grounded x={guild.hallX + 2.4} z={guild.hallZ - 1.8}><Pennant color={color} /></Grounded>
      {/* the guild's table of trade: crate + barrel on the plinth */}
      <Grounded x={guild.hallX - 1} z={guild.hallZ + 0.7} lift={0.24}>
        <PropModel url={`${SCEN}/l301500.glb`} height={0.7} yaw={0.5} />
      </Grounded>
      <Grounded x={guild.hallX + 1.2} z={guild.hallZ + 0.5} lift={0.24}>
        <PropModel url={`${SCEN}/l248900.glb`} height={0.6} />
      </Grounded>
    </Suspense>
  );
}
