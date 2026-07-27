# Brick/set catalog audit (Phase 18)

How the game's building pieces were validated against real LEGO Creator:
Knights' Kingdom (2000) parts, and what came of it.

## Methodology

The extraction at `resources/model_files/extracted/ldraw/*.mpd` (sibling repo,
`knightskingdom/knightskingdom`) is ground truth: 264 files, one per catalog
model, each an LDraw multi-part document. Two kinds:

- **Real part references** — a single `1 <color> <matrix> <partnum>.dat` line
  (or a handful of them for a small assembly). 160 of the 264 are purely this;
  32 more mix a few real-part lines with some custom trim. These are the
  small "Brick"/"Scenery"/"Weapon" catalog items — genuine official LEGO
  elements, identifiable by their real design ID.
- **Custom baked geometry** — raw `3 .../4 ...` triangle/quad soup with no
  part reference at all. 72 of the 264 (the "Castle"/"Building" category
  items like `mc001`-`mc010`) are entirely this: bespoke multi-piece
  structures the original game's artists modeled directly (a whole wall or
  tower as one asset) rather than assembling from individual bricks. There's
  no official part number to look up for these — the right validation is
  matching real-world proportions to the intended use (wide-and-thin for a
  wall, square-footprint for a tower), the same way the stonewall/tower fix
  below was done.

`model_catalog.json` / `model_pipeline/model_metadata.generated.json` give
each model's real raw bounding box. `scripts/prepare-assets.mjs`'s generated
brick catalog (`src/game/data/bricks.generated.json`, ~140 pieces across
`basic/`, `castle/`, `cylindrical/`, `slim/`, `tiles/`, `wedge/`,
`windows_doors/`, `arches/`, `castle_accessories/`) already derives its
`size` directly from that real bbox data (scaled by a fixed mm-to-world
factor) — so that whole bulk catalog is correct by construction and didn't
need auditing. Only the **hand-authored** `CRAFTED` entries in
`src/game/data/buildables.ts` (typed `size` by eye) were at risk, and were
audited one at a time: compare the declared `size` against the real bbox
scaled to match declared height (the same rule `PropModel`/
`useNormalizedProp` actually renders with) — a mismatch there means the
collision/footprint silently diverges from what's drawn.

## Findings

| Buildable | Model | Real part | Status |
|---|---|---|---|
| `stonewall` (Castle Wall) | `mc007` | custom-baked wall panel | **Fixed pre-Phase-18-audit**: was `02_l3013600` (real part 30136, a deep block 2x its width, not a wall) |
| `tower` (Watch Tower) | `mc003` | custom-baked turret | **Fixed pre-Phase-18-audit**: was `04_l609100` (not tower-shaped) |
| `shield` (Equipment) | `minifigkingleo01` obj `044_shape22` | n/a (posed-donor mesh) | **Fixed this pass**: was `022_shape10`, which is Leo's torso block (dead-center over the hips, torso-sized) — `044_shape22` sits at the off-hand, sized like his head, no arm of its own |
| `palisade` (Palisade Wall) | `l607900` | [6079 "Fence 1 x 8 x 2⅔"](https://www.bricklink.com/v2/catalog/catalogitem.page?P=6079) | **Fixed this pass**: was `00_l407000` ([4070 "Brick, Modified 1 x 1 with Headlight"](https://rebrickable.com/parts/4070/brick-special-1-x-1-with-headlight/) — a tiny utility brick with a round socket face, stretched into a "wall" with visible gaps between segments). Now reuses the same real fence piece as `fence`, at wall height. |
| `plant` (Palm Plant) | `l625500` | [6255 "Plant, 1 x 1 x ⅔ - 3 Large Leaves"](https://rebrickable.com/parts/6255/plant-1-x-1-x-23-3-large-leaves/) | **Fixed this pass**: right piece, wrong scale — a low frond cluster stretched to 1.6m tall rendered as two giant blades off a stub. Re-sized to its own real (short, wide) proportions. |
| `workbench` (Workbench) | `l301500` | 3015 (a wooden storage crate/box, exact modern name unconfirmed) | **Fixed this pass**: footprint tightened from a 2×2 square to the real ~1.1×1.5 box ratio. Piece itself is a crate, not a bench — acceptable as a rustic stand-in, no better crate/bench asset found in this catalog. |
| `gate` (Castle Gate) | `06_l318500` | [3185 "Fence Lattice 1 x 4 x 2"](https://rebrickable.com/parts/3185/fence-lattice-1-x-4-x-2/) | **Reviewed, no change**: a real X-lattice fence piece, commonly reused as a portcullis/gate in official castle sets — thematically correct. |
| `barrel` | `l248900` | [2489 "Container, Barrel 2 x 2 x 2"](https://rebrickable.com/parts/2489/barrel-2-x-2-x-2/) | **Reviewed, no change**: exact match. |
| `tree` (Garden Tree) | `l243500` | 2435 "Plant, Tree Pine Small 2 x 2 x 4" | **Reviewed, no change**: exact match. |
| `flowerbed` | `l374100` | 3741 "Plant Flower Stem with Stud and 3 Stems" | **Reviewed, minor footprint slack** (declared box ~2x the real model's linear size) — not visually broken, left as-is. |
| `fence` (Wooden Fence) | `l607900` | 6079 "Fence 1 x 8 x 2⅔" | **Reviewed, no change**: exact match, correct proportions. |
| `keep` (Grand Keep) | `mc001` | custom-baked | **Reviewed, no change**: proportions check out. |

## Regenerating the full 264-item raw data

```js
// from the sibling extraction repo root
const catalog = require('./resources/model_files/extracted/catalog/model_catalog.json').models;
// cross-reference each catalog.id against ldraw/<id>.mpd — a pure `1 <color> ... <part>.dat`
// line is a real part reference; `3 .../4 ...` lines are custom baked geometry.
```

This covers everything currently wired into the game. The other ~110 raw
catalog models not yet used by any buildable (mostly `Brick`/`Minifigure`/
`Vehicle`/`Animal`/`Dragon` category items) haven't been individually
identified — future phases pulling in new pieces should re-run this same
cross-reference before trusting a hand-picked `size`.
