'use client';
// The drawn icon set from the UI handoff pack — 62 marks, 24×24, 1.7px
// stroke, `currentColor`, no internal gradients, so one mark recolours per
// rarity/faction/state for free. This replaces emoji as iconography.
//
// `<use href="#id">` needs the sprite to be IN the document — it cannot be an
// <img src>. The sprite is fetched once and injected into <body> by
// KkIconSprite (mounted at the app root); every KkIcon after that is a
// three-element <svg><use/></svg>.
import { useEffect, useState } from 'react';

let spritePromise: Promise<string> | null = null;

function loadSprite(): Promise<string> {
  if (!spritePromise) {
    spritePromise = fetch('/assets/ui/kk-icons.svg')
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
  }
  return spritePromise;
}

/** Mount once, near the root. Injects the symbol sheet into the document. */
export function KkIconSprite() {
  const [markup, setMarkup] = useState('');
  useEffect(() => {
    let alive = true;
    loadSprite().then((t) => { if (alive) setMarkup(t); });
    return () => { alive = false; };
  }, []);
  if (!markup) return null;
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

export default function KkIcon({
  name,
  size = 20,
  className,
  style,
  title,
}: {
  /** symbol id without the `k-` prefix is NOT accepted — pass the full id, e.g. "k-coin" */
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <use href={`#${name}`} />
    </svg>
  );
}

/** The handoff's emoji→mark mapping, so the swap can happen incrementally
 *  without every call site inventing its own name. */
export const ICON_FOR_EMOJI: Record<string, string> = {
  '🎒': 'k-cuirass', '🔨': 'k-hammer', '📜': 'k-scroll', '⭐': 'k-star',
  '👥': 'k-people', '📖': 'k-book', '🪓': 'k-axe', '⛏️': 'k-pick', '⛏': 'k-pick',
  '⚔️': 'k-swords', '⚔': 'k-swords', '🛡️': 'k-shield', '🛡': 'k-shield',
  '⛑': 'k-helm', '🏹': 'k-crossbow', '🔥': 'k-flame', '🕯️': 'k-torch', '🕯': 'k-torch',
  '🛏️': 'k-bed', '🛏': 'k-bed', '🪵': 'k-log', '🪨': 'k-stone', '⚒️': 'k-anvil', '⚒': 'k-anvil',
  '🌿': 'k-herb', '🐟': 'k-fish', '🌼': 'k-flower', '🌻': 'k-flower', '🌳': 'k-tree',
  '🏰': 'k-keep', '👑': 'k-crown', '🧱': 'k-brick', '🪟': 'k-window', '🏭': 'k-forge',
  '🛢': 'k-barrel', '🌾': 'k-farm', '🔒': 'k-lock', '☀️': 'k-sun', '☀': 'k-sun',
  '🌙': 'k-moon', '⚙️': 'k-cog', '⚙': 'k-cog', '❓': 'k-book', '✋': 'k-hand',
  '🪙': 'k-coin', '🧪': 'k-potion', '💀': 'k-skull', '🗼': 'k-tower', '🚧': 'k-fence',
  '🎣': 'k-fish', '🍞': 'k-bread', '🔱': 'k-halberd', '🦺': 'k-cuirass', '🪖': 'k-helm',
};
