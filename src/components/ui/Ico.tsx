'use client';
// Emoji → drawn mark, in one place.
//
// The UI pack replaces emoji as iconography: one set, 24×24, 1.7px stroke,
// `currentColor`, no internal gradients, so a mark recolours per rarity /
// faction / state for free. Emoji can't do any of that and render differently
// on every platform.
//
// The game's DATA still carries emoji (`ITEMS[x].icon`, `Buildable.icon`,
// `JOBS[].icon`…) and that's deliberate — those strings are also used in
// notification text, tooltips and `title` attributes where a real glyph is
// the right thing. So the swap happens at the RENDER site: wherever an icon
// is drawn as UI, `<Ico e={...} />` maps it through the sprite, and falls
// back to the original glyph for anything the set doesn't cover.
import KkIcon, { ICON_FOR_EMOJI } from './KkIcon';

export default function Ico({
  e,
  size = 18,
  className,
  style,
}: {
  /** the emoji the data carries, e.g. ITEMS[id].icon */
  e: string | undefined;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!e) return null;
  // strip any variation selector so '⛏️' and '⛏' both resolve
  const name = ICON_FOR_EMOJI[e] ?? ICON_FOR_EMOJI[e.replace(/️/g, '')];
  if (!name) {
    return (
      <span className={className} style={{ fontSize: size, lineHeight: 1, ...style }}>
        {e}
      </span>
    );
  }
  return <KkIcon name={name} size={size} className={className} style={style} />;
}
