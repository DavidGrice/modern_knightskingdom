'use client';
// Canvas minimap (top-right): player arrow, resources, buildings, pond, NPC
// and the build region. M toggles between compact and large.
// Phase 23: instance-aware — every destination is its OWN map, centered on
// its own origin at its own scale, with its own landmarks. The homestead
// frame (pond/build region/nodes/merchant) never bleeds onto another realm.
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/game/store/gameStore';
import { useAppStore } from '@/game/store/appStore';
import { BUILD_REGION } from '@/game/data/buildables';
import { BATTLE_DOME, CEDRIC_CAMP, CEDRIC_WORLD, KEEP_INTERIOR, POND, STORM_WORLD, WORLD_HALF } from '@/game/data/world';
import { WORLD_DESTINATION_BY_ID } from '@/game/data/worlds';
import { GUILD_BY_WORLD } from '@/game/data/guilds';
import { NPCS } from '@/game/data/npcs';
import { MERCHANT_SPOT, merchantPresent } from '@/game/data/trade';
import { worldEnv } from '@/game/env';
import { playerState } from '../fps/PlayerController';
import { useEnemyStore } from '@/game/combat';
import { villagerMobs } from '@/game/villagerMobs';

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Requested 2026-07-31: a real Options setting for which size the map
  // STARTS at each session — a plain imperative read (not a subscribed hook
  // value), since this only ever seeds the initial state; the M-key toggle
  // below stays a live, session-only quick-toggle, unchanged.
  const [large, setLarge] = useState(() => useAppStore.getState().settings.minimapDefaultSize === 'large');
  const colorblind = useAppStore((s) => s.settings.colorblindMode);
  const colorblindRef = useRef(colorblind);
  colorblindRef.current = colorblind;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM') {
        const st = useGameStore.getState();
        if (!st.paused && !st.buildMode) setLarge((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const size = large ? 380 : 170;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 180) return; // ~5 fps is plenty
      last = now;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const S = canvas.width;
      const st = useGameStore.getState();
      // every destination is its own map: center on its own origin at its
      // own scale — never the homestead frame with a dot smeared off-edge
      const dest = st.destination ? WORLD_DESTINATION_BY_ID[st.destination] : null;
      const cx = dest ? dest.origin.x : 0;
      const cz = dest ? dest.origin.z : 0;
      const half = dest ? dest.radius * 1.12 : WORLD_HALF;
      const k = S / (half * 2); // world meters -> px
      const px = (x: number) => (x - cx + half) * k;
      const pz = (z: number) => (z - cz + half) * k;

      ctx.clearRect(0, 0, S, S);
      // ground — visiting realms read colder than the home meadow
      ctx.fillStyle = dest ? 'rgba(34, 40, 32, 0.9)' : 'rgba(30, 48, 24, 0.88)';
      ctx.beginPath();
      ctx.roundRect(0, 0, S, S, 10);
      ctx.fill();

      const cb = colorblindRef.current;
      if (!dest) {
        // homestead dressing only ever draws on the homestead's own map
        ctx.strokeStyle = 'rgba(232, 193, 65, 0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          px(BUILD_REGION.minX), pz(BUILD_REGION.minZ),
          (BUILD_REGION.maxX - BUILD_REGION.minX) * k,
          (BUILD_REGION.maxZ - BUILD_REGION.minZ) * k,
        );
        ctx.fillStyle = '#2d6bb0';
        ctx.beginPath();
        ctx.arc(px(POND.x), pz(POND.z), POND.radius * k, 0, Math.PI * 2);
        ctx.fill();
        // resources — colorblind palette swaps green/green-ish pairs (tree vs
        // herb) for tones that stay distinct under deuteranopia/protanopia
        for (const n of st.nodes) {
          if (n.respawnAt) continue;
          if (n.kind === 'tree') ctx.fillStyle = cb ? '#009E73' : '#3f9a3f';
          else if (n.kind === 'fishing') ctx.fillStyle = '#7fd4ff';
          else if (n.kind === 'herb') ctx.fillStyle = cb ? '#F0E442' : '#a8e05f';
          else ctx.fillStyle = n.variant === 'iron' ? '#c97434' : '#9a9aa0';
          ctx.beginPath();
          ctx.arc(px(n.x), pz(n.z), n.kind === 'tree' ? 2.2 : 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // this realm's own frame: the wander bound is the map's edge…
        ctx.strokeStyle = 'rgba(232, 193, 65, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px(cx), pz(cz), dest.radius * k, 0, Math.PI * 2);
        ctx.stroke();
        // …plus its own landmarks
        if (st.destination === STORM_WORLD) {
          ctx.strokeStyle = '#dfe4f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px(BATTLE_DOME.x), pz(BATTLE_DOME.z), Math.max(3, BATTLE_DOME.radius * k), 0, Math.PI * 2);
          ctx.stroke();
        }
        if (st.destination === CEDRIC_WORLD) {
          ctx.fillStyle = '#a02318';
          ctx.save();
          ctx.translate(px(CEDRIC_CAMP.x), pz(CEDRIC_CAMP.z));
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
        const guild = GUILD_BY_WORLD[st.destination ?? ''];
        if (guild) {
          ctx.strokeStyle = '#e8c141';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px(guild.hallX), pz(guild.hallZ), 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // buildings — this realm's own only (instance-separation doctrine: a
      // remote claimed plot's structures belong to that map, not this one)
      ctx.fillStyle = '#d8b878';
      for (const b of st.buildings) {
        if ((b.world ?? null) !== (st.destination ?? null)) continue;
        ctx.fillRect(px(b.x) - 2, pz(b.z) - 2, 4, 4);
      }
      // enemies — colorblind mode uses vermillion + a square marker so they
      // stay shape-distinct from the (also reddish-to-some-eyes) NPC dots
      for (const e of useEnemyStore.getState().enemies) {
        if (e.mob.state === 'dying') continue;
        ctx.fillStyle = cb ? '#D55E00' : '#e04434';
        if (cb) {
          ctx.fillRect(px(e.mob.x) - 3, pz(e.mob.z) - 3, 6, 6);
        } else {
          ctx.beginPath();
          ctx.arc(px(e.mob.x), pz(e.mob.z), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // NPCs of the current place only — instance residents (Phase 20) live
      // a thousand units away and would just smear dots off the map edge
      ctx.fillStyle = '#e8c141';
      for (const n of NPCS) {
        if ((n.world ?? null) !== (st.destination ?? null)) continue;
        ctx.beginPath();
        ctx.arc(px(n.x), pz(n.z), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // recruited villagers
      ctx.fillStyle = '#8fc9e8';
      for (const v of st.villagers) {
        const m = villagerMobs[v.id];
        if (!m) continue;
        ctx.beginPath();
        ctx.arc(px(m.x), pz(m.z), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      // traveling merchant (diamond, daylight only — a homestead visitor)
      if (!dest && merchantPresent(worldEnv.time)) {
        ctx.fillStyle = cb ? '#F0E442' : '#7fd48a';
        ctx.save();
        ctx.translate(px(MERCHANT_SPOT.x), pz(MERCHANT_SPOT.z));
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-2.6, -2.6, 5.2, 5.2);
        ctx.restore();
      }
      // the keep's great hall (once a Grand Keep has been raised at HOME —
      // a keep built on some remote claimed plot doesn't light this up)
      if (!dest && st.buildings.some((b) => b.type === 'keep' && (b.world ?? null) === null)) {
        ctx.strokeStyle = '#e8c141';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px(KEEP_INTERIOR.x), pz(KEEP_INTERIOR.z), 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      // player arrow (yaw 0 faces -Z = up on the map)
      ctx.save();
      ctx.translate(px(playerState.x), pz(playerState.z));
      ctx.rotate(-playerState.yaw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 5);
      ctx.lineTo(-4, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // north marker
      ctx.fillStyle = 'rgba(232, 217, 176, 0.9)';
      ctx.font = 'bold 11px Georgia';
      ctx.fillText('N', S / 2 - 4, 13);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  // the frame carries the lane treatment (HANDOFF §7.5: one minimap shape
  // per lane); the canvas just fills it
  return (
    <div className="kk-minimap-frame kk-glass">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
