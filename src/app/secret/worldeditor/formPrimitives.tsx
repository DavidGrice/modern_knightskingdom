// Wave 6 / CLN-09 · the pieces every table form on the world editor is built from — a labelled field, a row's card,
// the add and remove buttons, and the add / update / remove each form does to its rows — which the four forms used to
// write out for themselves, near enough line for line. They render exactly what the forms did.
import type { Kind } from './liveChecks';

export const WARN_COLOR = '#c0392b';

export function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** A form's rows, edited: each change hands `onChange` a new array, never the old one altered. */
export function rowEdits<T extends object>(rows: T[], onChange: (rows: T[]) => void) {
  return {
    update: (i: number, patch: Partial<T>) => {
      const next = rows.slice();
      next[i] = { ...next[i], ...patch };
      onChange(next);
    },
    remove: (i: number) => onChange(rows.filter((_, idx) => idx !== i)),
    add: (row: T) => onChange([...rows, row]),
  };
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, gap: 2 }}>
      {label}
      {children}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  background: '#26282e', color: '#e8e6df', border: '1px solid #444', borderRadius: 3, padding: '4px 6px', fontSize: 12, width: '100%',
};

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label}><input style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} /></Field>;
}

export function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <Field label={label}><input style={inputStyle} type="number" value={value} onChange={(e) => onChange(num(e.target.value))} /></Field>;
}

export function KindSelect({ value, onChange }: { value: Kind; onChange: (v: Kind) => void }) {
  return (
    <Field label="kind">
      <select style={inputStyle} value={value} onChange={(e) => onChange(e.target.value as Kind)}>
        <option value="tree">tree</option><option value="rock">rock</option><option value="herb">herb</option>
      </select>
    </Field>
  );
}

export function FieldGrid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>{children}</div>;
}

export function RowCard({ problem, children }: { problem: boolean; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${problem ? WARN_COLOR : '#3a3f4b'}`, borderRadius: 6, padding: 10, marginBottom: 8, background: '#20222a' }}>
      {children}
    </div>
  );
}

export function RemoveButton({ onClick, gap = 8, children = 'Remove' }: { onClick: () => void; gap?: number; children?: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ marginTop: gap, fontSize: 11, background: 'none', border: '1px solid #663333', color: '#d99', borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 4, border: '1px solid #444', background: '#26282e', color: '#e8e6df', cursor: 'pointer' }}>
      {children}
    </button>
  );
}
