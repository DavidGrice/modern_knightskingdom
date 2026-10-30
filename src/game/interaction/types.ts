// CLN-26 · what the player can act on: a Target is what findTarget picks in front of them, its `kind` (one of
// InteractKind) the branch performAction takes when they act on it.

/** every kind of thing the player can act on (findTarget picks one; performAction acts on it) */
export type InteractKind = 'tree' | 'rock' | 'fishing' | 'herb' | 'npc' | 'station' | 'bed' | 'horse' | 'dismount' | 'quintain' | 'cannon' | 'merchant' | 'plot' | 'interior_enter' | 'interior_exit' | 'chest' | 'collect_taxes' | 'gate' | 'travel_board' | 'travel_return' | 'joust' | 'push_cart' | 'hitch_cart' | 'challenge_cedric' | 'construct' | 'guild_hall' | 'detonate' | 'man_engine' | 'leave_engine' | 'keep_socket' | 'keep_work' | 'buy_ground' | 'workshop' | 'set_part' | 'draw_water' | 'plant_plot' | 'water_plot' | 'climb' | 'climb_down' | 'call_falcon' | 'dungeon_relic' | 'dungeon_captive' | 'talk_companion' | 'examine_skeleton' | 'launch';

export interface Target {
  id: string;
  label: string;
  actionable: boolean;
  duration: number; // seconds of holding E; 0 = instant
  kind: InteractKind;
  station?: string;
}
