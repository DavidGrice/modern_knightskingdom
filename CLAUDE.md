# Project instructions for Claude Code (and any spawned agent working in this repo)

## Mandatory: browser automation for live/Playwright testing

This project is verified live via real, GPU-rendered Chrome (never a stubbed/mocked
DOM) — see `ROADMAP.md`'s own per-wave verification entries. Every agent that drives a
browser against `npm run dev` in this repo (implement/verify/fix passes, ad hoc smoke
scripts, anything using Playwright or `playwright-core`) MUST launch it so it cannot
touch the real machine's mouse pointer or make audible sound. This has directly and
repeatedly disrupted the user's own concurrent work (the OS mouse pointer snapping to
the top-left corner of the screen, and hearing the game's own sound effects/music) —
treat both as hard requirements, not nice-to-haves.

**Required launch flags, every time, no exceptions:**

```
--headless=new
--use-angle=d3d11
--mute-audio
```

- `--headless=new` is the primary fix for the mouse-pointer hijack. Do NOT rely on
  `--window-position=-32000,-32000` (an older convention used in this project's own
  history) as the sole mitigation — a real, headed OS window can still have its
  position clamped back on-screen by Windows itself (this has been observed landing at
  the top-left corner of the primary display), and/or Chrome's CDP-driven synthetic
  mouse input can still move the real system cursor even when the window itself is
  off-screen. True headless mode creates no OS-level window at all, which removes the
  hijack risk structurally rather than just relocating it.
- `--mute-audio` unconditionally silences all audio output from the browser regardless
  of what the page does — required on every launch, no exceptions, so the user never
  hears sound effects/music from a background test run.
- `--use-angle=d3d11` is kept because this project's own real-texture screenshot
  requirement (see the memory note this file summarizes: SwiftShader software
  rendering flattens textures) needs a real GPU backend, not the software fallback.
  **Open question, not yet confirmed**: whether `--headless=new` combined with
  `--use-angle=d3d11` actually renders through real ANGLE/D3D11 on this machine, or
  silently falls back to SwiftShader the way old headless mode always did. The first
  agent that needs a real look-and-feel screenshot under this new flag combination
  should verify this directly (e.g. screenshot a known-textured surface and confirm it
  isn't flattened) and update this file with the result. If it DOES fall back to
  SwiftShader, screenshot-quality verification may need a different approach — ask
  before falling back to a headed, off-screen window, since that reintroduces the
  mouse-hijack risk this file exists to prevent.

**If headless truly cannot render what a specific check needs** (last resort only,
and say so explicitly in your own report rather than silently downgrading): a headed,
off-screen window is the fallback, but it still needs `--mute-audio`, still needs
`--window-position` set far off every real monitor's bounds, and the agent should
explicitly warn that this mode has a known, observed history of still disrupting the
user's mouse — so avoid it unless a real, specific screenshot need forces it, and
prefer running it only briefly rather than for a whole verification session.

Always confirm no other dev server/build is already running in the same worktree
before starting a new one (a known project gotcha: running `npm run build` while
`npm run dev` is still live in the same worktree corrupts `.next`).
