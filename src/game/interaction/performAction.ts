// CLN-26 · what acting on a target does: performAction, moved here whole from PlayerController.tsx (it was a function
// inside the component; it takes the five refs of the component's it used — the player's position, velocity, facing,
// footing and the talk cooldown — from `ctx`). One branch per kind of target (types.ts's InteractKind).
import * as THREE from 'three';
import { useGameStore } from '@/game/store/gameStore';
import { BUILDABLE_BY_ID, labAssetId, sizeFor } from '@/game/data/buildables';
import {
  EYE_HEIGHT,
} from '@/game/data/world';
import { audio } from '@/lib/audio';
import { worldEnv } from '@/game/env';
import { fishingState, startFishing } from '@/game/fishing';
import { ridingState, mountHorse, dismountHorse, canStable, stableHorse } from '@/game/riding';
import { detonate, fireCannon } from '@/game/siege';
import { quintainHit } from '@/game/quintain';
import { cartState } from '@/game/carts';
import { dungeonState } from '@/game/dungeon';
import { isBuilt } from '@/game/types';
import { labOccupyMode } from '@/game/data/labCapabilities';
import { KEEP_PART_BY_ID } from '@/game/data/keep';
import { leaveEngine, manEngine } from '@/game/crew';
import type { Target } from './types';
import { climbTargetFor } from './climb';

/** J49 · the most hammer swings any one piece can ask for. At the construct
 *  hold's duration (findTarget.ts) that is a bit over half a minute for the Grand Keep, and
 *  five or six seconds for a barrel. */
const CONSTRUCT_MAX_SWINGS = 26;

/** What performAction reads and moves of PlayerController's: the player's position, velocity, facing and footing, and
 *  the cooldown between two conversations. */
export interface ActionCtx {
  grounded: { current: boolean };
  pos: { current: THREE.Vector3 };
  talkCooldown: { current: number };
  vel: { current: THREE.Vector3 };
  yaw: { current: number };
}

export function performAction(ctx: ActionCtx, t: Target, st: ReturnType<typeof useGameStore.getState>) {
  const { grounded, pos, talkCooldown, vel, yaw } = ctx;
  if (t.kind === 'npc') {
    // DialoguePanel decides which single bark to play (the one-time voiced
    // lore line vs. this greetSound) so the two never overlap — see its
    // own effect for the branch.
    st.openDialogue(t.id);
  } else if (t.kind === 'merchant') {
    audio.play('villager', 0.8, false);
    st.setPanel('shop');
  } else if (t.kind === 'station') {
    st.openStationMenu(t.station as 'workbench' | 'forge' | 'campfire');
  } else if (t.kind === 'bed') {
    st.sleep();
  } else if (t.kind === 'horse') {
    mountHorse(t.id);
    audio.play('whinny', 0.7);
    // Wave 7 fix · this used to `st.setCameraMode('third')`, a leftover from
    // when riding really was a chase cam. Riding has forced FIRST person
    // since L62 (see placeCamera, components/fps/cameraRig.ts, and
    // MountedHorse.tsx's own comment), so all the flip still did was
    // (a) blank the FPS viewmodel — a mounted player saw no weapon in hand
    // at all, which hid every mounted pose there is — and (b) silently
    // leave them in third person after they dismounted, whatever they had
    // chosen before. The stored preference is the player's, so mounting
    // no longer touches it; the viewmodel renders while mounted regardless
    // of it (Viewmodel.tsx), matching what the camera actually does.
    st.notify('You mount the horse. Hold Shift to gallop!');
  } else if (t.kind === 'call_falcon') {
    st.tameFalcon();
  } else if (t.kind === 'talk_companion') {
    st.greetCompanion();
  } else if (t.kind === 'dungeon_relic') {
    // Wave 13 · direct mutation on the shared dungeonState leaf module,
    // same convention the crypt's director (game/directors/dungeonDirector.ts) already uses for room.cleared/spawned —
    // there is no store-side copy of dungeon room state to keep in sync.
    const layout = dungeonState.layout;
    const room = layout?.rooms.find((r) => String(r.index) === t.id);
    if (room && !room.relicTaken) {
      room.relicTaken = true;
      room.cleared = true;
      const bonus = 10 + layout!.rooms.length * 3;
      st.addItems({ gold: bonus }, 'grant');
      st.notify(`You lift the Sealed Reliquary from its cradle — +${bonus} gold.`, true);
      // Bugfix (2026-08-14, found while live-reverifying the reachability
      // fix in findTarget.ts): dungeon_relic is the FIRST duration>0 hold action ever
      // reachable inside findTarget()'s `if (st.destination)` block —
      // every other target there (NPC/horse/Cedric/guild hall/the
      // 'Return Home' fallback itself) is duration:0 and fires instantly,
      // so there was never a frame gap between "this hold finished" and
      // "what's the next target" while the SAME key-press was still down.
      // Taking the relic removes it from consideration, so the very next
      // frame's findTarget() falls through to that same block's
      // 'travel_return' fallback — and since it is duration:0 and
      // talkCooldown is otherwise already elapsed, it fires the instant a
      // real player's E-release lags the completion by even one frame,
      // silently ejecting them from the dungeon (and any unclear rooms,
      // including the full-clear reward) the moment they pick up a relic.
      // Reusing the same talkCooldown gate every duration:0 action already
      // respects buys the player a real beat to let go of E first.
      talkCooldown.current = 0.6;
      audio.play('treasure', 0.8);
    }
  } else if (t.kind === 'dungeon_captive') {
    // Wave 48 (B9) · same shared-leaf-module mutation as dungeon_relic
    // just above, and the same anti-double-trigger grace (talkCooldown) —
    // freeing doesn't clear the room by itself (DungeonRoom.objective's own
    // doc), only walking the captive back to layout.entryPos does
    // (the crypt's 1Hz director, game/directors/dungeonDirector.ts), so
    // this branch never touches `cleared`.
    const layout = dungeonState.layout;
    const room = layout?.rooms.find((r) => String(r.index) === t.id);
    if (room && !room.captiveFreed) {
      room.captiveFreed = true;
      st.notify('The prisoner is free — lead them back to the entrance!', true);
      talkCooldown.current = 0.6;
      audio.play('treasure', 0.6);
    }
  } else if (t.kind === 'dismount') {
    const fx = -Math.sin(yaw.current);
    const fz = -Math.cos(yaw.current);
    // G27 · dismounting AT a built stable stables the horse: it stops
    // wandering the meadow and becomes homestead property, assignable to a
    // defender who then patrols mounted. Catching one is the ride itself —
    // you have to find it, get on it, and walk it home. Only a horse of the
    // homestead's own herd (riding.ts's canStable): a destination can be
    // claimed and a Stable placed there (none is finished there by ordinary
    // play today), and Richard's steed is not the player's to keep.
    const ridden = ridingState.horseId;
    const stable = st.buildings.find((b) => b.type === 'stable' && isBuilt(b)
      && Math.hypot(b.x - pos.current.x, b.z - pos.current.z) < 6);
    dismountHorse(pos.current.x - fx * 1.2, pos.current.z - fz * 1.2, yaw.current);
    if (ridden && stable && canStable(ridden)) {
      stableHorse(ridden);
      st.notify('The horse is stabled — assign it to a defender in the Roster (N).', true);
    }
    audio.play('graze', 0.5);
  } else if (t.kind === 'quintain') {
    quintainHit(t.id, ridingState.active);
  } else if (t.kind === 'examine_skeleton') {
    // Wave 34 (G6.2) · flavor text only — the lab's `hasSkeleton`/
    // `hasStandSpot` traits describe a display piece, not a mechanic, so
    // this is deliberately a repeatable notify rather than a one-time
    // state flag (loreSeen is documented as NPC voiced-lore ids; a
    // building id doesn't belong in that array).
    st.notify('A knight’s bones, picked clean and mounted as a warning to raiders.');
  } else if (t.kind === 'launch') {
    // Wave 34 (G6.2) · the springboard (oc6096b5, traits.interaction.
    // canLaunch). The lab itself flags `launchPartUncertain` — which part
    // actually launches is unclear — so this is framed as a player
    // jump-boost rather than firing a projectile from a specific part,
    // sidestepping that uncertainty entirely. Reuses the exact same
    // fall/landing physics a normal jump already has (PlayerController.tsx's own
    // `vel.current.y = 5` on a grounded jump), just a taller arc.
    vel.current.y = 11;
    grounded.current = false;
    st.notify('You spring into the air!');
  } else if (t.kind === 'joust') {
    st.joustRichard();
  } else if (t.kind === 'push_cart') {
    if (cartState.pushingId === t.id) {
      cartState.pushingId = null;
      st.settleCart(t.id);
      st.notify('You set the ram down.');
    } else {
      cartState.pushingId = t.id;
      cartState.hitchedId = null;
      st.notify('Pushing the battering ram — walk it into a gate!');
    }
  } else if (t.kind === 'hitch_cart') {
    if (cartState.hitchedId === t.id) {
      cartState.hitchedId = null;
      st.settleCart(t.id);
      st.notify('You unhitch the cart.');
    } else {
      cartState.hitchedId = t.id;
      cartState.pushingId = null;
      st.notify('Cart hitched — it will follow you.');
    }
  } else if (t.kind === 'plot') {
    const growth = st.plots[t.id];
    if (growth === undefined) st.plantPlot(t.id);
    else if (growth === 0) st.harvestPlot(t.id);
  } else if (t.kind === 'man_engine') {
    const b = st.buildings.find((x) => x.id === t.id);
    if (b) {
      if (ridingState.active) dismountHorse(pos.current.x + 1.4, pos.current.z, yaw.current);
      manEngine(
        b, labOccupyMode(labAssetId(b.type)), yaw.current,
        BUILDABLE_BY_ID[b.type]?.size?.[2] ?? 2, BUILDABLE_BY_ID[b.type]?.size?.[1] ?? 2,
      );
      st.notify('You take the crew position — aim with your look, click to loose.');
    }
  } else if (t.kind === 'leave_engine') {
    leaveEngine();
    st.notify('You step down.');
  } else if (t.kind === 'cannon') {
    const b = st.buildings.find((x) => x.id === t.id);
    if (b) fireCannon(b);
  } else if (t.kind === 'detonate') {
    const b = st.buildings.find((x) => x.id === t.id);
    if (b) detonate(b);
  } else if (t.kind === 'interior_enter') {
    st.enterInterior(t.id);
  } else if (t.kind === 'interior_exit') {
    st.exitInterior();
  } else if (t.kind === 'chest') {
    st.openTreasureChest();
  } else if (t.kind === 'collect_taxes') {
    st.collectTaxes();
  } else if (t.kind === 'gate') {
    st.toggleGate(t.id);
  } else if (t.kind === 'climb') {
    // Wave 8 · up onto the wall. The position is SET, not lerped: every
    // duration-gated interaction in this game pays out at 100% of the hold
    // (interior_enter, the chest, the keep sockets), and the hold ring is
    // already the "you are climbing" feedback. What matters is where you
    // land — climbTargetFor only ever answers with a spot that
    // floorHeightAt agrees is floor, so gravity holds you there afterwards
    // with no pinned movement mode of its own to maintain or exit.
    const b = st.buildings.find((x) => x.id === t.id);
    const climb = b ? climbTargetFor(st, b) : null;
    if (climb) {
      pos.current.set(climb.x, climb.y + EYE_HEIGHT, climb.z);
      vel.current.y = 0;
      grounded.current = true;
      audio.play('step', 0.6);
      st.notify(`You climb onto the ${climb.what}.`);
    }
  } else if (t.kind === 'climb_down') {
    const b = st.buildings.find((x) => x.id === t.id);
    if (b) {
      // step off on the ladder's OWN side of whatever it leans against,
      // rather than dropping through the wall you were standing on
      const climb = climbTargetFor(st, b);
      let fx = 0;
      let fz = 1;
      if (climb) {
        const dx = b.x - climb.x;
        const dz = b.z - climb.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.1) { fx = dx / d; fz = dz / d; }
      }
      const [lsx, lsz] = sizeFor(b.type, b.rot);
      const out = Math.max(lsx, lsz) / 2 + 0.9;
      const dx = b.x + fx * out;
      const dz = b.z + fz * out;
      pos.current.set(dx, (b.y ?? 0) + EYE_HEIGHT, dz);
      vel.current.y = 0;
      grounded.current = true;
      audio.play('step', 0.6);
    }
  } else if (t.kind === 'travel_board') {
    st.setPanel('travel');
  } else if (t.kind === 'travel_return') {
    st.returnHome();
  } else if (t.kind === 'construct') {
    // J49 · one hammer swing's worth of progress. It used to top out at 8
    // swings, so a keep went up in about seven seconds — the ceiling was
    // there because the only feedback was a grey box inflating, and nobody
    // wants to watch that for long. Now the real piece rises out of the
    // ground course by course (J48), so the work can take the time the work
    // should take: a barrel is still a handful of swings, a keep is a job.
    const b = st.buildings.find((x) => x.id === t.id);
    const def = b ? BUILDABLE_BY_ID[b.type] : null;
    const swings = def ? Math.min(CONSTRUCT_MAX_SWINGS, Math.max(4, Math.round(def.buildXp / 2.5))) : 5;
    st.constructBuilding(t.id, 1 / swings);
  } else if (t.kind === 'workshop') {
    st.setPanel('workshop');
  } else if (t.kind === 'set_part') {
    st.placeSetPart();
  } else if (t.kind === 'buy_ground') {
    st.buyLand();
  } else if (t.kind === 'draw_water') {
    // no vessel to craft and nothing to spend: the walk to the water IS the
    // cost this wave (see ROADMAP — a real bucket item/animation is later)
    st.addItems({ water_bucket: 1 }, 'grant');
    // no water sample in the extracted bank (see lib/audioCatalog.ts's SOUNDS) — the
    // soft 'graze' is what plantPlot already borrows for the same reason
    audio.play('graze', 0.5);
    st.notify('You fill a pail from the brook.');
  } else if (t.kind === 'plant_plot') {
    st.cultivatePlot(t.id);
  } else if (t.kind === 'water_plot') {
    st.waterPlot(t.id);
  } else if (t.kind === 'keep_socket') {
    st.openKeepSocket(t.id);
  } else if (t.kind === 'keep_work') {
    // the same work a building site asks for, scaled by the piece
    const partId = st.keep?.parts[t.id];
    const part = partId ? KEEP_PART_BY_ID[partId] : null;
    const swings = part ? Math.min(CONSTRUCT_MAX_SWINGS, Math.max(4, Math.round(part.buildXp / 2.5))) : 8;
    st.workKeepPart(t.id, 1 / swings);
  } else if (t.kind === 'guild_hall') {
    st.setPanel('guild');
  } else if (t.kind === 'challenge_cedric') {
    // Wave 56 (F4): every alliance state gets the parley moment first —
    // the fight is one of the panel's own choices (ParleyPanel's Leo-sworn
    // and unsworn branches both keep "Challenge Him to Battle" alongside
    // the peaceful option), never a silent instant duel. His sworn
    // bannermen still get the war council instead (ParleyPanel branches on
    // alliance) — rebellion errands, never a fight.
    st.setPanel('parley');
    audio.playVoice('greeting_cedric', 0.85);
  } else if (t.kind === 'fishing') {
    if (fishingState.nodeId !== t.id) {
      startFishing(t.id, worldEnv.rain > 0.4);
    } else if (fishingState.phase === 'biting') {
      st.harvestNode(t.id); // grants the fish + Fishing XP + its own catch sound
      fishingState.phase = 'waiting';
      fishingState.nextEventAt = performance.now() + 2000 + Math.random() * 3000;
    }
  } else {
    st.harvestNode(t.id);
    if (t.kind === 'tree') audio.play('sword_swish', 0.5);
  }
}
