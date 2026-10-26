// CLN-29 · the emote wheel's list (moved from lib/minifigRig.ts: it is data, not rigging).

// convenience emote map (clip + optional chatter sound)
export const EMOTES: { id: string; label: string; icon: string; clip: string }[] = [
  { id: 'wave', label: 'Wave', icon: '👋', clip: 'anim_r_greet1' },
  { id: 'regal', label: 'Regal Wave', icon: '👑', clip: 'anim_r_regalwave' },
  { id: 'pleased', label: 'Cheer', icon: '😄', clip: 'anim_c_pleased' },
  { id: 'angry', label: 'Grr!', icon: '😠', clip: 'anim_c_angry' },
  { id: 'think', label: 'Ponder', icon: '🤔', clip: 'anim_c_think' },
  { id: 'jump', label: 'Startle', icon: '😲', clip: 'anim_c_surprisejump' },
];
