'use client';
// 3d · Options — Metalheart, per the UI handoff pack.
//
// Requested 2026-07-31: reorganized from a fixed two-column grid into tabs
// (Sound / Controls / Graphics / Interface / Keybinds) — the Graphics
// section grew real anti-aliasing, anisotropic filtering, and view-distance
// controls on top of what was already there, and a long two-column scroll
// stopped having room for it. "World" (Day length) folds into Controls;
// "Colourblind-friendly minimap" moves from Graphics into Interface (an
// accessibility/UI setting, not a render-cost one) — both small, justified
// cleanups made while reorganizing anyway, not scope creep.
import { useEffect, useState } from 'react';
import { useAppStore, UI_THEMES } from '@/game/store/appStore';
import { KEYBIND_GROUPS, codeLabel, rebindState } from '@/game/data/keybinds';
import { GRAPHICS_PROFILES, GRAPHICS_QUALITY_LIST } from '@/game/graphicsProfiles';
import { AA_MODES } from '@/game/aaModes';

const ANISOTROPY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'Off' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
  { value: 8, label: '8x' },
  { value: 16, label: '16x' },
];

type Tab = 'sound' | 'controls' | 'graphics' | 'interface' | 'keybinds';
const TABS: { id: Tab; label: string }[] = [
  { id: 'sound', label: 'Sound' },
  { id: 'controls', label: 'Controls' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'interface', label: 'Interface' },
  { id: 'keybinds', label: 'Keybinds' },
];

function KeybindRow({ actionId, label }: { actionId: string; label: string }) {
  const code = useAppStore((s) => s.settings.keybinds[actionId]);
  const setKeybind = useAppStore((s) => s.setKeybind);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!listening) return;
    rebindState.listening = true;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code !== 'Escape') setKeybind(actionId, e.code);
      setListening(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      rebindState.listening = false;
    };
  }, [listening, actionId, setKeybind]);

  return (
    <div className="kk-key-row">
      <span>{label}</span>
      <button
        className={`kk-cap ${listening ? 'listening' : ''}`}
        style={{ border: 0, cursor: 'pointer' }}
        onClick={() => setListening((l) => !l)}
      >
        {listening ? 'PRESS A KEY' : codeLabel(code)}
      </button>
    </div>
  );
}

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div className="kk-opt-row">
      <span className="name">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="readout">{format ? format(value) : `${Math.round(value * 100)}%`}</span>
    </div>
  );
}

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="kk-opt-row">
      <span className="name wide">{label}</span>
      <button
        className="kk-switch"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

/** a labeled row wrapping the same `.kk-seg` segmented-button pattern the
 *  Quality preset row already established — Anti-aliasing/Anisotropy reuse
 *  it verbatim instead of inventing a second segmented-control shape */
function Segmented<T extends string | number>({
  label, options, value, onChange,
}: {
  label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="kk-opt-row">
      <span className="name">{label}</span>
      <span className="kk-seg">
        {options.map((o) => (
          <button key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </span>
    </div>
  );
}

export default function OptionsStack() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const resetKeybinds = useAppStore((s) => s.resetKeybinds);
  const pop = useAppStore((s) => s.pop);
  const [tab, setTab] = useState<Tab>('sound');

  return (
    <div className={`kk-screen kk-screen-${settings.uiTheme}`}>
      <div className="kk-screen-pad">
        <div className="kk-screen-head">
          <h2>OPTIONS</h2>
          <span className="rule" />
          <span className="hint">Esc to close</span>
        </div>

        <div className="kk-opt-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="kk-opt-body">
          {tab === 'sound' && (
            <div className="kk-opt-rows">
              <Slider label="Master volume" value={settings.masterVolume} min={0} max={1} step={0.05}
                onChange={(v) => update({ masterVolume: v })} />
              <Slider label="Effects" value={settings.sfxVolume} min={0} max={1} step={0.05}
                onChange={(v) => update({ sfxVolume: v })} />
              <Slider label="Music &amp; ambience" value={settings.musicVolume} min={0} max={1} step={0.05}
                onChange={(v) => update({ musicVolume: v })} />
            </div>
          )}

          {tab === 'controls' && (
            <div className="kk-opt-rows">
              <Slider label="Mouse sensitivity" value={settings.mouseSensitivity} min={0.1} max={1.5} step={0.05}
                onChange={(v) => update({ mouseSensitivity: v })} format={(v) => v.toFixed(2)} />
              <Switch label="Invert Y axis" on={settings.invertY} onChange={(v) => update({ invertY: v })} />
              <Slider label="Day length" value={settings.dayLengthMin} min={4} max={30} step={1}
                onChange={(v) => update({ dayLengthMin: v })} format={(v) => `${v}m`} />
            </div>
          )}

          {tab === 'graphics' && (
            <div className="kk-opt-rows">
              <Slider label="Field of view" value={settings.fov} min={60} max={100} step={1}
                onChange={(v) => update({ fov: v })} format={(v) => String(v)} />
              <Switch label="Shadows" on={settings.shadows} onChange={(v) => update({ shadows: v })} />
              <Segmented
                label="Quality preset"
                options={GRAPHICS_QUALITY_LIST.map((p) => ({ id: p.id, label: p.label }))}
                value={settings.graphicsQuality}
                onChange={(id) => update({
                  graphicsQuality: id,
                  shadows: GRAPHICS_PROFILES[id].shadowsDefault,
                  viewDistance: GRAPHICS_PROFILES[id].viewDistanceDefault,
                })}
              />
              <div className="kk-opt-note">{GRAPHICS_PROFILES[settings.graphicsQuality].blurb}</div>

              <Segmented
                label="Anti-aliasing"
                options={AA_MODES.map((m) => ({ id: m.id, label: m.label }))}
                value={settings.aaMode}
                onChange={(id) => update({ aaMode: id })}
              />
              <div className="kk-opt-note">
                {AA_MODES.find((m) => m.id === settings.aaMode)!.blurb}
                {settings.aaMode === 'supersample2x' && settings.graphicsQuality === 'performance'
                  ? ' Heads up: this stacks a real cost on top of Performance tier — try Balanced or Ultra if frame rate drops.'
                  : ''}
              </div>

              <Segmented
                label="Anisotropic filtering"
                options={ANISOTROPY_LEVELS.map((a) => ({ id: a.value, label: a.label }))}
                value={settings.anisotropy}
                onChange={(v) => update({ anisotropy: v })}
              />
              <Slider label="View distance" value={settings.viewDistance} min={0.7} max={1.3} step={0.05}
                onChange={(v) => update({ viewDistance: v })} format={(v) => `${Math.round(v * 100)}%`} />
              <Switch label="Show FPS counter" on={settings.showFps} onChange={(v) => update({ showFps: v })} />
            </div>
          )}

          {tab === 'interface' && (
            <div className="kk-opt-rows">
              {/* The four approved surface treatments. They share one set of
                  metrics, so switching restyles every panel and HUD cluster
                  without anything reflowing. */}
              <div>
                <div className="kk-sec-label">Interface Theme</div>
                <div className="theme-grid">
                  {UI_THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={`theme-card ${settings.uiTheme === t.id ? 'selected' : ''}`}
                      onClick={() => update({ uiTheme: t.id })}
                    >
                      <div className={`tc-swatch ${t.id}`} />
                      <div className="tc-name">{t.label}{t.id === 'glass' ? ' · default' : ''}</div>
                      <div className="tc-blurb">{t.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Switch
                label="Colourblind-friendly minimap"
                on={settings.colorblindMode}
                onChange={(v) => update({ colorblindMode: v })}
              />
              <Segmented
                label="Minimap starts"
                options={[{ id: 'small' as const, label: 'Small' }, { id: 'large' as const, label: 'Large' }]}
                value={settings.minimapDefaultSize}
                onChange={(v) => update({ minimapDefaultSize: v })}
              />
              <div className="kk-opt-note">M still toggles the minimap size live in-game — this just picks what you start with.</div>
              <Segmented
                label="Prompt style"
                options={[
                  { id: 'auto' as const, label: 'Auto' },
                  { id: 'keyboard' as const, label: 'Keyboard' },
                  { id: 'gamepad' as const, label: 'Gamepad' },
                  { id: 'touch' as const, label: 'Touch' },
                ]}
                value={settings.inputMode}
                onChange={(v) => update({ inputMode: v })}
              />
              <div className="kk-opt-note">Auto follows whatever you actually pick up last (keyboard, a controller, or the touch controls) — pin it if you'd rather the on-screen prompts stayed put.</div>
            </div>
          )}

          {tab === 'keybinds' && (
            <div>
              <div className="kk-rule-head" style={{ marginBottom: 10 }}>
                <span>Keybinds</span>
                <span className="rule" />
                <button className="kk-link-btn" onClick={resetKeybinds}>Reset to default</button>
              </div>
              <div className="kk-keys">
                {KEYBIND_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div style={{ font: '600 9.5px/1 var(--kk-font)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--kk-text-faint)', margin: '8px 0 5px' }}>
                      {group.label}
                    </div>
                    {group.actions.map((a) => (
                      <KeybindRow key={a.id} actionId={a.id} label={a.label} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="kk-screen-actions">
          <button className="kk-btn-quiet" onClick={pop} style={{ marginLeft: 'auto' }}>Back</button>
        </div>
      </div>
    </div>
  );
}
