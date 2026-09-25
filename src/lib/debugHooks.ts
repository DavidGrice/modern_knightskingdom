// The one place that publishes `window.__kk*` live-verification handles.
//
// These handles are the contract the local Playwright smoke scripts drive the running game through
// (they read/poke live module state that has no UI). Names and object identities are load-bearing:
// never rename a hook, and always pass the live object itself, not a copy.
//
// Zero imports on purpose — the store-free leaf modules (riding, carts, env, ...) can pull this in
// without adding an edge to any import cycle. SSR-safe: a no-op when there is no `window`.
// Deliberately NOT gated on NODE_ENV — stripping the hooks from production builds is an open owner
// decision (CLEANUP_PLAN.md, Open questions), not something this helper decides.
// Dev note: ~70 modules import this file, so editing it under `next dev` re-creates their singletons —
// reload the page afterwards.
//
// Live list: `grep -rn "^ *exposeDebug('" src`. Registered handles, by module (folder/file: names):
//   ai/actions/index:        __kkactions
//   ai/core/AgentManager:    __kkai            ai/core/AnchorResolution: __kkanchor
//   ai/core/Locomotion:      __kkloco          ai/core/Memory:           __kkmemory
//   ai/core/Reasoner:        __kkreason        ai/core/TargetRegistry:   __kktargets
//   ai/perception/index:     __kkperception    ai/perception/sounds:     __kksounds
//   components/fps/PlayerController: __kkscene, __kkcam
//   components/world/BlackDragonSiege: __kkBlackSiege   CedricSiege: __kkCedricSiege   DragonSiege: __kkSiege
//   components/world/Merchant: __kkmerchant   PostProcessing: __kkgl   RiggedProp: __kkpropfire
//   components/world/TemplatePopulation: __kkpop   TemplateWorld: __kkworld
//   game/arena: __kkarena                      game/buildCam: __kkbuildcam
//   game/buildChallenge: __kkbuildchallenge    game/carts: __kkCart, __kkCartPos
//   game/cedricSiege: __kkCedricWar            game/challengeModes: __kkchallenges
//   game/collisionShapes: __kkshapes           game/commandWheel: __kkwheel
//   game/companion: __kkcompanioncombat        game/crew: __kkcrew
//   game/defenders: __kkdefenders, __kkorders  game/difficulty: __kkdiff
//   game/dragonAir: __kkdragonAir, __kkdragonAirBlack
//   game/dungeon: __kkdungeon    game/env: __kkenv    game/fishing: __kkfish    game/hitbox: __kkhitbox
//   game/fort: __kkfort, __kkfortCheck         game/navgrid: __kknav       game/npcMobs: __kknpcs
//   game/perfMeter: __kkperf                   game/playerState: __kkp
//   game/raiderLadder: __kkLadder              game/raiderRam: __kkRam
//   game/riding: __kkr, __kkhorses, __kkstable, __kkmount
//   game/settlementRaid: __kksettlementraid    game/siege: __kkFire, __kkExplode, __kkDetonate
//   game/targeting: __kkaim                    game/touchInput: __kktouch
//   game/villagerCombat: __kkvillagercombat    game/villagerMobs: __kkvillagers
//   game/workSignal: __kkwork
//   game/combat: __kkc, __kkfireBolt, __kke, __kkResolveDuel, __kkAttack, __kkDamagePlayer, __kkBolt, __kkArrow, __kkBolts
//   game/data/buildables: __kkcollideFor       game/data/road: __kkroadEntry, __kkonRoad
//   game/store/appStore: __kkapp               game/store/gameStore: __kk
//   lib/audio: __kkaudio

export function exposeDebug(name: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>)[name] = value;
}
