// CLN-21 · the starter village folk, moved verbatim out of data/npcs.ts's NPCS array.
import { DELIVERY_QUESTS } from '../deliveryQuests';
import type { NpcDef } from './types';

export const VILLAGE_NPCS: NpcDef[] = [
  // Always-present village folk: the game opens as a small farm/village, not
  // a royal court — these two are just flavor (a greeting, no errands), so
  // the world doesn't feel empty before any quest has revealed the nobles.
  {
    id: 'farmer_alric',
    name: 'Alric',
    title: 'Village Farmer',
    config: {
      name: 'Alric', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 22, handColor: 18, legColor: 34, hipColor: 34,
    },
    // Tucked in a quiet corner well outside the homestead build area (see
    // StarterVillage.tsx for the two hut props marking their homes) — the
    // build grid needs to stay clear of standing NPCs.
    x: -40, z: 38, yaw: Math.PI * 0.35,
    // a farmer is not carrying the generic donor's molded halberd
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Mornin'! Small farm we've got here, but it's honest work.",
      "The King and his court? Keep to the castle, mostly. Folk like us tend the land.",
      'Chop, gather, build — a homestead grows one day at a time.',
    ],
    // Wave 13: his one delivery errand, out to Fenwick's new settlement —
    // see deliveryQuests.ts's own header for why it lives in its own file.
    sideQuests: DELIVERY_QUESTS.farmer_alric,
  },
  {
    id: 'miller_beda',
    name: 'Beda',
    title: 'Village Miller',
    config: {
      // K57 · head and body MUST come from the same donor. Beda had her head
      // from the good generic and her torso from the bad one — two different
      // body types — so the arms the rig re-hangs belong to a torso she is
      // not wearing, and they sit wrong however well they are classified.
      // (Audited the whole roster: she was the only mismatch.)
      name: 'Beda', headDonor: 'minifiggenericgood00', bodyDonor: 'minifiggenericgood00',
      armColor: 30, handColor: 18, legColor: 38, hipColor: 24,
    },
    x: -35, z: 42, yaw: Math.PI * 1.1,
    // nor is a miller carrying the bad-guy donor's crossbow
    keepProps: false,
    greetSound: 'villager',
    portrait: '/assets/minifigs/minifiggenericgood00.png',
    lines: [
      "Bring us wood and stone and I'll not say no.",
      "Prove yourself and word travels — even to the castle, they say.",
    ],
    // Wave 13: her one delivery errand, out to Fenwick's new settlement.
    sideQuests: DELIVERY_QUESTS.miller_beda,
  },
];
