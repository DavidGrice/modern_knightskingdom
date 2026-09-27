'use client';
// A roster/loadout choice chip: the small parchment-menu button that reads as chosen (full opacity + gold edge),
// available (dimmed) or unavailable (faded). `color` is only set by the trait chips.
export default function ChoiceChip({ opacity, selected, color, ...rest }: {
  opacity: number;
  selected: boolean;
  color?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="menu-btn small"
      {...rest}
      style={{
        margin: 0, width: 'auto', padding: '5px 10px',
        opacity,
        borderColor: selected ? 'var(--gold)' : undefined,
        color,
      }}
    />
  );
}
