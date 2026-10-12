import { describe, expect, it } from 'vitest';
import { WORLD_ANCHOR } from './anchors';
import { GUILD_BY_ID } from './guilds';
import { NPC_BY_ID } from './npcs';
import { CEDRIC_CAMP, NPC_KING } from './world';
import { resolveWorldAnchor, resolveDestPoint, TEMPLATE_ARRIVAL_SPAWN, WORLD_DESTINATIONS, WORLD_DESTINATION_BY_ID } from './worlds';

const hall = (guild: string) => ({ x: GUILD_BY_ID[guild].hallX, z: GUILD_BY_ID[guild].hallZ });
const point = (p: { x: number; z: number }) => ({ x: p.x, z: p.z });

describe('the shared anchors', () => {
  it('each name a real template and resolve as any other local point there does', () => {
    const templates = WORLD_DESTINATIONS.map((d) => d.id);
    for (const a of Object.values(WORLD_ANCHOR)) {
      expect(templates).toContain(a.dest);
      expect(resolveWorldAnchor(a)).toEqual(resolveDestPoint(WORLD_DESTINATION_BY_ID[a.dest], a.x, a.z));
    }
  });

  it('cannot be resolved at a place that is no destination of the map', () => {
    for (const dest of ['dungeon', 'arena', 'challenge-1', 'template-99']) expect(() => resolveWorldAnchor({ dest, x: 0, z: 0 })).toThrow(TypeError);
  });

  // every pair below used to be the same numbers typed in two files
  it("put the King's seat and his NpcDef on one point", () => {
    expect(point(NPC_KING)).toEqual(resolveWorldAnchor(WORLD_ANCHOR.king));
    expect(point(NPC_BY_ID.king)).toEqual(point(NPC_KING));
    expect(NPC_BY_ID.king.world).toBe(WORLD_ANCHOR.king.dest);
  });

  it("put Cedric's camp and the point a traveller arrives at on one point", () => {
    expect(CEDRIC_CAMP).toEqual(resolveWorldAnchor(WORLD_ANCHOR.cedricCamp));
    expect(point(TEMPLATE_ARRIVAL_SPAWN[WORLD_ANCHOR.cedricCamp.dest])).toEqual(CEDRIC_CAMP);
  });

  it("put the Woodsmen's hall and the Frozen Pass's arrival point on one point", () => {
    expect(hall('woodsmen')).toEqual(resolveWorldAnchor(WORLD_ANCHOR.woodsmenHall));
    expect(GUILD_BY_ID.woodsmen.world).toBe(WORLD_ANCHOR.woodsmenHall.dest);
    expect(point(TEMPLATE_ARRIVAL_SPAWN[WORLD_ANCHOR.woodsmenHall.dest])).toEqual(hall('woodsmen'));
  });

  it('stand the three hall-side residents due east of their halls', () => {
    for (const [npcId, guild, anchor] of [
      ['torvald', 'woodsmen', WORLD_ANCHOR.woodsmenHall], ['garrick', 'builders', WORLD_ANCHOR.buildersHall], ['wyeth', 'anglers', WORLD_ANCHOR.anglersHall],
    ] as const) {
      const npc = NPC_BY_ID[npcId], h = hall(guild);
      expect(h).toEqual(resolveWorldAnchor(anchor));
      expect(npc.world).toBe(anchor.dest);
      expect(npc.z).toBe(h.z);
      // 20 to 22 metres out: clear of the hall's own prompt, still beside it
      expect(npc.x - h.x).toBeGreaterThan(19.5);
      expect(npc.x - h.x).toBeLessThan(22.5);
    }
  });

  // close, but two points: see the note at the head of anchors.ts
  it("leave the Siege Camp's arrival point a millimetre and a half from the Builders' hall", () => {
    const arrival = TEMPLATE_ARRIVAL_SPAWN['template-04'], h = hall('builders');
    const apart = Math.hypot(arrival.x - h.x, arrival.z - h.z);
    expect(apart).toBeGreaterThan(0.001);
    expect(apart).toBeLessThan(0.002);
  });
});
