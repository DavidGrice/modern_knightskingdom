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

That push is the last manual step. `auto-pr.yml` opens the PR for you (title
and body filled from your commit), and arms auto-merge on it in the same run
— it squash-merges the moment CI is green and the branch is conflict-free,
and waits if it is not. Nothing merges on a red check, and nothing merges
with a conflict — you resolve it and it proceeds. Pushing again to the same
branch (another commit, a fix) does not open a second PR; it just updates
the one already open.

If you ever open a PR by hand instead (the web UI, `gh pr create`), that
still works too — `auto-merge.yml` arms it the same way.

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

`.github/workflows/ci.yml`, on Ubuntu, on the push itself (not just the PR —
see below):

1. **Branch name** — the pattern above.
2. **Typecheck** — `tsc --noEmit`. There is no ESLint config in this project,
   so `tsc` under `strict: true` *is* the linter.
3. **Build** — `next build`.

This passes without `public/assets/`, because the extracted models, textures
and sounds are runtime fetches from `public/`, not build inputs. The catalog
JSON that *is* a build input lives in `src/game/data/*.generated.json` and is
committed.

**Why CI triggers on `push`, not only on the PR being opened:** `auto-pr.yml`
opens the PR using the default `GITHUB_TOKEN`, and GitHub has a hard
loop-prevention rule — an event caused by `GITHUB_TOKEN` does not trigger
other workflow runs. So the usual `pull_request: opened` trigger never fires
for a PR opened this way. Running CI on `push` instead uses your own
credentials, which are not subject to that rule, and GitHub matches a
required status check by *(commit SHA, check name)*, not by which event
produced it — so the push-triggered result still satisfies the PR once it
exists for that same commit. You do not need to think about any of this; it
is why the automation works, not something you have to act on.

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

**Settings > Rules > Rulesets** — the ruleset is called
`auto-merge-with-claude`, targets the default branch (`main`), enforcement
**Active**, bypass list empty:
- ✅ Restrict deletions
- ✅ Block force pushes
- ✅ Require a pull request before merging — Required approvals: **0**
  (a solo repo cannot approve its own PR, so anything higher deadlocks; the
  CI check is the gate instead)
- ✅ Require status checks to pass:
  - `Typecheck & build`
  - `Branch name`

**Deliberately OFF: "Require branches to be up to date before merging."** On
with more than one PR open, every one of them needs an *Update branch* click
and a full CI re-run each time `main` moves. Off, a PR can merge having been
tested against a slightly older `main` — the exposure is a *semantic* conflict
(two branches that pass alone and break together), which git will not flag as
a text conflict because there isn't one. At one PR in flight that risk is
negligible. **Turn it on if you start stacking parallel work.**

Note the ruleset's name describes the workflow it supports, not what it does:
it is the branch protection. The auto-merge behaviour itself lives in
`.github/workflows/auto-merge.yml`.
