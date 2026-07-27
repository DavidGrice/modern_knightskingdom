'use client';
// 3d · Options — Metalheart, per the UI handoff pack. Two columns instead
// of one long scroll, grouped Sound / Controls / World | Graphics /
// Interface / Keybinds, every slider reading its own value on the right,
// and Quality Preset as a segmented control that also drives
// `data-kk-quality` (which the token sheet uses to drop panel blur).
import { useEffect, useState } from 'react';
import { useAppStore, UI_THEMES, type GraphicsQuality } from '@/game/store/appStore';
import { KEYBIND_GROUPS, codeLabel, rebindState } from '@/game/data/keybinds';

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
        onClick={() => setListening(true)}
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

export default function OptionsStack() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const resetKeybinds = useAppStore((s) => s.resetKeybinds);
  const pop = useAppStore((s) => s.pop);

  return (
    <div className="kk-screen kk-screen-metal">
      <div className="kk-screen-pad">
        <div className="kk-screen-head">
          <h2>OPTIONS</h2>
          <span className="rule" />
          <span className="hint">Esc to close</span>
        </div>

        <div className="kk-opt-grid">
          {/* ---- left column ---- */}
          <div className="kk-opt-col">
            <div>
              <div className="kk-sec-label">Sound</div>
              <div className="kk-opt-rows">
                <Slider label="Master volume" value={settings.masterVolume} min={0} max={1} step={0.05}
                  onChange={(v) => update({ masterVolume: v })} />
                <Slider label="Effects" value={settings.sfxVolume} min={0} max={1} step={0.05}
                  onChange={(v) => update({ sfxVolume: v })} />
                <Slider label="Music &amp; ambience" value={settings.musicVolume} min={0} max={1} step={0.05}
                  onChange={(v) => update({ musicVolume: v })} />
              </div>
            </div>

            <div>
              <div className="kk-sec-label">Controls</div>
              <div className="kk-opt-rows">
                <Slider label="Mouse sensitivity" value={settings.mouseSensitivity} min={0.1} max={1.5} step={0.05}
                  onChange={(v) => update({ mouseSensitivity: v })} format={(v) => v.toFixed(2)} />
                <Switch label="Invert Y axis" on={settings.invertY} onChange={(v) => update({ invertY: v })} />
              </div>
            </div>

            <div>
              <div className="kk-sec-label">World</div>
              <div className="kk-opt-rows">
                <Slider label="Day length" value={settings.dayLengthMin} min={4} max={30} step={1}
                  onChange={(v) => update({ dayLengthMin: v })} format={(v) => `${v}m`} />
              </div>
            </div>

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
          </div>

          {/* ---- right column ---- */}
          <div className="kk-opt-col">
            <div>
              <div className="kk-sec-label">Graphics</div>
              <div className="kk-opt-rows">
                <Slider label="Field of view" value={settings.fov} min={60} max={100} step={1}
                  onChange={(v) => update({ fov: v })} format={(v) => String(v)} />
                <Switch label="Shadows" on={settings.shadows} onChange={(v) => update({ shadows: v })} />
                <div className="kk-opt-row">
                  <span className="name">Quality preset</span>
                  <span className="kk-seg">
                    {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                      <button
                        key={q}
                        className={settings.graphicsQuality === q ? 'on' : ''}
                        onClick={() => update({ graphicsQuality: q, shadows: q !== 'low' })}
                      >
                        {q}
                      </button>
                    ))}
                  </span>
                </div>
                <Switch
                  label="Colourblind-friendly minimap"
                  on={settings.colorblindMode}
                  onChange={(v) => update({ colorblindMode: v })}
                />
                <div className="kk-opt-note">
                  Low turns off panel blur as well as shadows — worth it on integrated graphics.
                </div>
              </div>
            </div>

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
          </div>
        </div>

        <div className="kk-screen-actions">
          <button className="kk-btn-quiet" onClick={pop} style={{ marginLeft: 'auto' }}>Back</button>
        </div>
      </div>
    </div>
  );
}
