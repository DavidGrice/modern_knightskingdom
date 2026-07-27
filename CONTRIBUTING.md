# Working on this repo

`main` is protected. Nothing lands on it except through a pull request that
passes CI.

## The loop

```bash
git switch main && git pull
git switch -c feature/npc-ai-phase-2      # see naming below

# ... work, commit ...

npm run verify                            # same checks CI runs — do this first
git push -u origin feature/npc-ai-phase-2
```

Then open a PR (`gh pr create --fill`, or the link git prints after the push).
Auto-merge arms itself: the PR squash-merges the moment CI is green and the
branch is conflict-free, and waits if it is not. Nothing merges on a red
check, and nothing merges with a conflict — you resolve it and it proceeds.

## Branch naming — enforced by CI

`<type>/<slug>`, lowercase slug:

| Type | For |
|---|---|
| `feature/` | new capability |
| `enhancement/` | improving something that already works |
| `bugfix/` | fixing broken behaviour |
| `chore/` | tooling, deps, CI, housekeeping |
| `docs/` | documentation only |

A branch that does not match fails the `Branch name` check before anything
else runs.

## What CI actually checks

`.github/workflows/ci.yml`, on Ubuntu:

1. **Branch name** — the pattern above.
2. **Typecheck** — `tsc --noEmit`. There is no ESLint config in this project,
   so `tsc` under `strict: true` *is* the linter.
3. **Build** — `next build`.

This passes without `public/assets/`, because the extracted models, textures
and sounds are runtime fetches from `public/`, not build inputs. The catalog
JSON that *is* a build input lives in `src/game/data/*.generated.json` and is
committed.

## What CI does NOT check: the smoke tests

**The browser smoke tests do not run in CI, and cannot without a self-hosted
runner.** Four independent reasons:

1. `scripts/` is untracked — the tests are not in the repo.
2. `public/assets/` is untracked, so a CI checkout renders a blank world and
   anything past character creation fails on a missing minifig.
3. `playwright-core` is not a declared dependency.
4. The tests launch Chrome from a hardcoded Windows path with
   `--enable-unsafe-swiftshader`.

All four are only satisfied on the development machine. So:

**Smoke tests are a local pre-merge step, run by you, on the machine that has
the assets.** State the result in the PR description. `.github/workflows/
smoke.yml` is ready to run them on a self-hosted Windows runner if you ever
want that — it is manual-trigger only so it never puts a spurious red X on a
PR. Its header has the setup steps.

```bash
npx next dev -p 3789          # in one terminal
node scripts/smoke131.mjs     # in another
```

Two things that will waste your time otherwise: headless SwiftShader renders
at roughly 8 fps and the game clamps `dt` to 0.05/frame, so **real elapsed
time is about 2.4x game time** — a slow test is usually correct, not broken.
And `npx next build` against a `.next` that a running `next dev` still has
open corrupts its incremental chunks; kill the dev server first.

## Local guard rails (optional but recommended)

```bash
git config core.hooksPath .githooks
```

That enables `.githooks/pre-push`, which refuses a direct push to `main` and
runs the typecheck before letting a branch push through. It is a convenience,
not the enforcement — the enforcement is the ruleset on GitHub. Skip it once
with `git push --no-verify` if you genuinely need to.

## One-time GitHub settings

These cannot be configured from the repo; they are account-side. Without
them, auto-merge merges PRs instantly, which is just pushing to `main` with
extra steps.

**Settings > General > Pull Requests**
- ✅ Allow auto-merge
- ✅ Allow squash merging (and, if you like, uncheck merge commits + rebase)
- ✅ Automatically delete head branches

**Settings > Rules > Rulesets > New branch ruleset**
- Target: `main` (Include default branch)
- ✅ Restrict deletions
- ✅ Block force pushes
- ✅ Require a pull request before merging — Required approvals: **0**
  (a solo repo cannot approve its own PR; the CI check is the gate)
- ✅ Require status checks to pass, and add:
  - `Typecheck & build`
  - `Branch name`
- ✅ Require branches to be up to date before merging

Set **Enforcement status: Active**. As repo owner you may still hold a bypass
— that is fine, it is a guard rail, not a lock.
