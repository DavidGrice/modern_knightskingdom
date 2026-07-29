'use client';
// 3a · Title & Sign In — Millennium Chrome, per the UI handoff pack.
// A moulded chrome plaque for the wordmark, one lime primary
// ("Enter the Kingdom"), and the guest path kept as a quiet secondary
// rather than a second equal-weight button.
import { useState } from 'react';
import { useAppStore } from '@/game/store/appStore';
import KkIcon from '../ui/KkIcon';

export default function AuthStack() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const setUser = useAppStore((s) => s.setUser);
  const setGuest = useAppStore((s) => s.setGuest);
  const resetTo = useAppStore((s) => s.resetTo);
  // one shared theme now, not the mockup's fixed "title = chrome" pick —
  // see kk-screens.css's own header for the full story
  const uiTheme = useAppStore((s) => s.settings.uiTheme);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !data?.user) {
      setError(data?.error ?? 'Could not reach the castle gates. Try again.');
      return;
    }
    const me = await fetch('/api/auth/me').then((r) => r.json()).catch(() => null);
    setUser(data.user, !!me?.hasSave);
    resetTo('menu');
  }

  function playAsGuest() {
    setUser(null);
    setGuest(true);
    resetTo('menu');
  }

  return (
    <div className={`kk-screen kk-title-screen kk-screen-${uiTheme}`}>
      <div className="kk-title-sky" />
      <div className="kk-plaque">
        <div className="kk-plaque-word">KNIGHTS&apos; KINGDOM</div>
        <div className="kk-plaque-rule">
          <span />
          <span className="kk-plaque-tag">From peasant to paladin</span>
          <span />
        </div>
      </div>

      <div className="kk-signin">
        <div className="kk-signin-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'on' : ''}
            onClick={() => { setMode('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'on' : ''}
            onClick={() => { setMode('register'); setError(''); }}
          >
            Create Account
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="kk-field">
            <div className="kk-field-label">Name</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              maxLength={20}
              aria-label="Name"
            />
          </div>
          <div className="kk-field">
            <div className="kk-field-label">Secret word</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={64}
              aria-label="Secret word"
            />
          </div>
          <div className="kk-signin-error">{error}</div>
          <button className="kk-primary" type="submit" disabled={busy || !username || !password}>
            <KkIcon name="k-keep" size={17} />
            {busy ? 'Entering…' : mode === 'login' ? 'Enter the Kingdom' : 'Swear the Oath'}
          </button>
        </form>
        <button type="button" className="kk-secondary" onClick={playAsGuest}>
          Play as guest <span className="dim">— local save</span>
        </button>
      </div>

      <div className="kk-version">v0.4 · Next.js · React · three.js</div>
    </div>
  );
}
