import type { Quest } from '../types';

// Linear quest chain: each quest becomes active when the previous one completes.
export const QUESTS: Quest[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Every legend starts small. Take your axe into the woods and gather timber.',
    objectives: [{ id: 'chop', label: 'Chop 5 wood logs', kind: 'gather', target: 'wood', count: 5 }],
    rewardText: 'Woodcutting XP',
    xp: { woodcutting: 40 },
  },
  {
    id: 'cozy_beginnings',
    name: 'Cozy Beginnings',
    description: 'Turn logs into planks and raise a campfire and a workbench on your homestead. Press B for the aerial build view.',
    objectives: [
      { id: 'planks', label: 'Craft 4 planks', kind: 'craft', target: 'plank', count: 4 },
      { id: 'fire', label: 'Build a Campfire', kind: 'build', target: 'campfire', count: 1 },
      { id: 'bench', label: 'Build a Workbench', kind: 'build', target: 'workbench', count: 1 },
    ],
    rewardText: 'Unlocks Fishing and sturdier walls',
    xp: { building: 60 },
    unlocks: ['fishing', 'building2'],
  },
  {
    // Phase 20 travel beat: the reveal toast said John "will receive you at
    // The River Landing" — this makes actually going there the quest.
    id: 'word_from_river',
    name: 'Word from the River',
    description: 'John of Mayne keeps the realm’s stores at The River Landing. Consult the Travel Map at the signpost and present yourself to the Quartermaster.',
    objectives: [
      { id: 'go', label: 'Travel to The River Landing', kind: 'visit', target: 'template-03', count: 1 },
      { id: 'meet', label: 'Present yourself to John of Mayne', kind: 'talk', target: 'john', count: 1 },
    ],
    rewardText: 'Gold and the Quartermaster’s favor',
    xp: { farming: 30 },
    grantItems: { gold: 10 },
  },
  {
    id: 'stone_age',
    name: 'Stone Age',
    description: 'Craft a pickaxe at your workbench, then break stone from the boulders east of camp.',
    objectives: [
      { id: 'pick', label: 'Craft a Pickaxe', kind: 'craft', target: 'pickaxe', count: 1 },
      { id: 'mine', label: 'Mine 6 stone', kind: 'gather', target: 'stone', count: 6 },
    ],
    rewardText: 'Unlocks Mining',
    xp: { mining: 50 },
    unlocks: ['mining'],
  },
  {
    id: 'forge_ahead',
    name: 'Forge Ahead',
    description: 'Raise a forge of stone, then mine the dark rust-flecked iron veins east of the boulder field and smelt your first bars.',
    objectives: [
      { id: 'forge', label: 'Build a Forge', kind: 'build', target: 'forge', count: 1 },
      { id: 'bars', label: 'Smelt 3 iron bars', kind: 'craft', target: 'iron_bar', count: 3 },
    ],
    rewardText: 'Unlocks Smithing',
    xp: { smithing: 70 },
    unlocks: ['smithing'],
  },
  {
    // Phase 20 travel beat: iron freshly smelted, Richard summons you to
    // his own field to see what the new smith is made of.
    id: 'audience_lists',
    name: 'An Audience at the Lists',
    description: 'Richard the Strong keeps the lists at The Tourney Grounds. Ride out and present yourself to the Master-at-Arms.',
    objectives: [
      { id: 'go', label: 'Travel to The Tourney Grounds', kind: 'visit', target: 'template-02', count: 1 },
      { id: 'meet', label: 'Present yourself to Richard the Strong', kind: 'talk', target: 'richard', count: 1 },
    ],
    rewardText: 'Combat XP and the Master-at-Arms’ regard',
    xp: { combat: 50 },
    grantItems: { gold: 12 },
  },
  {
    id: 'gone_fishing',
    name: 'Gone Fishing',
    description: 'A knight marches on their stomach. Craft a rod and fish the pond, then cook the catch.',
    objectives: [
      { id: 'rod', label: 'Craft a Fishing Rod', kind: 'craft', target: 'fishing_rod', count: 1 },
      { id: 'catch', label: 'Catch 3 fish', kind: 'gather', target: 'fish', count: 3 },
      { id: 'cook', label: 'Cook 2 fish', kind: 'craft', target: 'cooked_fish', count: 2 },
    ],
    rewardText: 'Fishing XP feast',
    xp: { fishing: 80 },
  },
  {
    id: 'squires_errand',
    name: "Squire's Errand",
    description: 'Prove your worth: fortify the homestead with walls fit for a squire.',
    objectives: [
      { id: 'walls', label: 'Build 3 wall sections (palisade or castle wall)', kind: 'build', target: 'anywall', count: 3 },
    ],
    rewardText: 'Building XP',
    xp: { building: 90 },
  },
  {
    id: 'knights_arms',
    name: "Knight's Arms",
    description: 'Forge a sword and shield worthy of knighthood.',
    objectives: [
      { id: 'sword', label: 'Smith a Knight Sword', kind: 'craft', target: 'sword', count: 1 },
      { id: 'shield', label: 'Smith a Kingdom Shield', kind: 'craft', target: 'shield', count: 1 },
    ],
    rewardText: 'Knighthood & the right to raise a Keep',
    xp: { smithing: 120 },
    unlocks: ['keep'],
  },
  {
    // Phase 20 travel beat: knighted at last — the King himself will
    // receive you at his castle before you raise a keep of your own.
    id: 'royal_summons',
    name: 'The Royal Summons',
    description: 'Word arrives under the lion seal: King Leo will receive you at The King’s Approach. Stand before the throne of the realm.',
    objectives: [
      { id: 'go', label: 'Travel to The King’s Approach', kind: 'visit', target: 'template-01', count: 1 },
      { id: 'meet', label: 'Stand before King Leo', kind: 'talk', target: 'king', count: 1 },
    ],
    rewardText: 'Gold and the crown’s blessing',
    xp: { combat: 40 },
    grantItems: { gold: 25 },
  },
  {
    id: 'paladins_keep',
    name: "Paladin's Keep",
    description: 'Raise the Grand Keep and take your place among the paladins of the realm.',
    objectives: [{ id: 'keep', label: 'Build the Grand Keep', kind: 'build', target: 'keep', count: 1 }],
    rewardText: 'The rank of Paladin',
    xp: { building: 200 },
  },
];

export const QUEST_BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));
