import type { ItemId } from '@/game/types';

// Wave 9 · the helmet is the only remaining plain on/off armor slot (one helm
// mold exists in the whole extraction, see RealHelmet). The chestplate became
// a tier — its tiles are built from CHESTPLATES below.
export type GearSlot = 'helmet';
export const SLOT_ITEM: Record<GearSlot, ItemId> = { helmet: 'helmet' };
export const SLOT_ICON: Record<GearSlot, string> = { helmet: '🪖' };
export const SLOT_LABEL: Record<GearSlot, string> = { helmet: 'Helmet' };
