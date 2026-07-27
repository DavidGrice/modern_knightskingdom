// Emits public/assets/collision.json — real per-piece collision volumes
// derived from each model's OWN geometry instead of its bounding box.
//
// Why: an arch is a 4.3m-tall box as far as the bbox is concerned, so the
// game stopped the player dead in front of an opening they could see
// straight through. Answering "can we ignore the bbox and use the raw OBJ?":
// yes — but a per-frame trimesh raycast is far more than this movement code
// needs, so the geometry is voxelised HERE, at asset-prep time, and merged
// into a handful of axis-aligned boxes. Runtime stays cheap AABB tests while
// the shape becomes real.
//
// Surface voxelisation is enough for collision: the player cannot pass
// through a shell, and an opening simply has no shell in it.
import fs from 'node:fs';
import path from 'node:path';

const RES = 'd:/CODING/THREEJS/knightskingdom/knightskingdom/resources';
const EXT = `${RES}/model_files/extracted`;
const OUT = new URL('../public/assets', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** target voxel size in metres; clamped by MIN/MAX cells per axis */
const CELL = 0.22;
const MIN_CELLS = 2;
const MAX_CELLS = 20;
/** a piece whose occupancy is at least this dense is effectively solid —
 *  emitting boxes for it would only cost memory, so it keeps the bbox */
const SOLID_RATIO = 0.86;

function parseObj(file) {
  const verts = [];
  const tris = [];
  const txt = fs.readFileSync(file, 'utf8');
  for (const line of txt.split('\n')) {
    if (line.startsWith('v ')) {
      const p = line.split(/\s+/);
      verts.push([+p[1], +p[2], +p[3]]);
    } else if (line.startsWith('f ')) {
      const idx = line.slice(2).trim().split(/\s+/).map((tok) => {
        const i = parseInt(tok.split('/')[0], 10);
        return i < 0 ? verts.length + i : i - 1;
      });
      for (let i = 1; i + 1 < idx.length; i++) tris.push([idx[0], idx[i], idx[i + 1]]);
    }
  }
  return { verts, tris };
}

/** Apply the exact normalisation PropModel does at runtime: flip upright
 *  (rotation.x = PI, which negates Y and Z), scale to the declared height,
 *  centre on X/Z and ground at y=0. */
function normalise(verts, targetHeight) {
  const p = verts.map(([x, y, z]) => [x, -y, -z]);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const [x, y, z] of p) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const s = targetHeight / ((maxY - minY) || 1);
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  return p.map(([x, y, z]) => [(x - cx) * s, (y - minY) * s, (z - cz) * s]);
}

/** mark every voxel a triangle passes through, by barycentric sampling at
 *  roughly half a cell — dense enough that no cell a face crosses is missed */
function voxelise(verts, tris, dims, size, origin) {
  const [nx, ny, nz] = dims;
  const grid = new Uint8Array(nx * ny * nz);
  const at = (i, j, k) => (i * ny + j) * nz + k;
  const put = (x, y, z) => {
    const i = Math.min(nx - 1, Math.max(0, Math.floor((x - origin[0]) / size[0])));
    const j = Math.min(ny - 1, Math.max(0, Math.floor((y - origin[1]) / size[1])));
    const k = Math.min(nz - 1, Math.max(0, Math.floor((z - origin[2]) / size[2])));
    grid[at(i, j, k)] = 1;
  };
  const cell = Math.min(size[0], size[1], size[2]);
  for (const [a, b, c] of tris) {
    const A = verts[a], B = verts[b], C = verts[c];
    if (!A || !B || !C) continue;
    const eAB = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    const eAC = Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]);
    const steps = Math.min(64, Math.max(2, Math.ceil(Math.max(eAB, eAC) / (cell * 0.5))));
    for (let u = 0; u <= steps; u++) {
      for (let v = 0; u + v <= steps; v++) {
        const w0 = 1 - (u + v) / steps, w1 = u / steps, w2 = v / steps;
        put(
          A[0] * w0 + B[0] * w1 + C[0] * w2,
          A[1] * w0 + B[1] * w1 + C[1] * w2,
          A[2] * w0 + B[2] * w1 + C[2] * w2,
        );
      }
    }
  }
  return grid;
}

/**
 * Fill enclosed interiors.
 *
 * Surface voxelisation marks only the shell, which leaves a solid wall
 * hollow inside. That is harmless for blocking (you cannot reach the cavity
 * without crossing a face) but it fragments badly: the greedy merge sees two
 * thin plates instead of one slab, so a plain castle wall came out as 44
 * boxes and the keep and tower blew past the box cap entirely and fell back
 * to their bounding boxes.
 *
 * Flood the empty space inward from the grid boundary; anything empty that
 * the flood never reached is enclosed, so fill it. A genuine opening — an
 * arch, a gateway, a breach — connects to the outside and stays empty, which
 * is exactly the distinction this whole file exists to make.
 */
function fillInteriors(grid, dims) {
  const [nx, ny, nz] = dims;
  const at = (i, j, k) => (i * ny + j) * nz + k;
  const outside = new Uint8Array(grid.length);
  const stack = [];
  const push = (i, j, k) => {
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return;
    const n = at(i, j, k);
    if (grid[n] || outside[n]) return;
    outside[n] = 1;
    stack.push(i, j, k);
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) { push(i, j, 0); push(i, j, nz - 1); }
    for (let k = 0; k < nz; k++) { push(i, 0, k); push(i, ny - 1, k); }
  }
  for (let j = 0; j < ny; j++) {
    for (let k = 0; k < nz; k++) { push(0, j, k); push(nx - 1, j, k); }
  }
  while (stack.length) {
    const k = stack.pop(); const j = stack.pop(); const i = stack.pop();
    push(i + 1, j, k); push(i - 1, j, k);
    push(i, j + 1, k); push(i, j - 1, k);
    push(i, j, k + 1); push(i, j, k - 1);
  }
  for (let n = 0; n < grid.length; n++) if (!grid[n] && !outside[n]) grid[n] = 1;
  return grid;
}

/** Greedy box merge: grow along X, then Z, then Y, so a wall becomes one
 *  slab rather than a few hundred cubes. */
function mergeBoxes(grid, dims) {
  const [nx, ny, nz] = dims;
  const at = (i, j, k) => (i * ny + j) * nz + k;
  const used = new Uint8Array(grid.length);
  const boxes = [];
  for (let j = 0; j < ny; j++) {
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        if (!grid[at(i, j, k)] || used[at(i, j, k)]) continue;
        let i2 = i;
        while (i2 + 1 < nx && grid[at(i2 + 1, j, k)] && !used[at(i2 + 1, j, k)]) i2++;
        let k2 = k;
        grow: while (k2 + 1 < nz) {
          for (let ii = i; ii <= i2; ii++) {
            if (!grid[at(ii, j, k2 + 1)] || used[at(ii, j, k2 + 1)]) break grow;
          }
          k2++;
        }
        let j2 = j;
        growY: while (j2 + 1 < ny) {
          for (let ii = i; ii <= i2; ii++) {
            for (let kk = k; kk <= k2; kk++) {
              if (!grid[at(ii, j2 + 1, kk)] || used[at(ii, j2 + 1, kk)]) break growY;
            }
          }
          j2++;
        }
        for (let ii = i; ii <= i2; ii++) {
          for (let jj = j; jj <= j2; jj++) {
            for (let kk = k; kk <= k2; kk++) used[at(ii, jj, kk)] = 1;
          }
        }
        boxes.push([i, j, k, i2, j2, k2]);
      }
    }
  }
  return boxes;
}

// ---- find every OBJ the extraction has, by basename ------------------------
const objIndex = new Map();
(function idx(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) idx(p);
    else if (f.endsWith('.obj') && !objIndex.has(f.slice(0, -4))) objIndex.set(f.slice(0, -4), p);
  }
})(`${EXT}/pak_models/warehouse`);
(function idx(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isFile() && f.endsWith('.obj') && !objIndex.has(f.slice(0, -4))) {
      objIndex.set(f.slice(0, -4), p);
    }
  }
})(`${EXT}/models`);

// ---- the catalog: id -> { modelBasename, size } ----------------------------
const src = fs.readFileSync(new URL('../src/game/data/buildables.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'utf8');
const entries = [];
for (const m of src.matchAll(/id: '([^']+)'[\s\S]{0,400}?model: `\$\{\w+\}\/([^`]+)\.glb`[\s\S]{0,300}?size: \[([^\]]+)\]/g)) {
  const [, id, model, size] = m;
  // The OBJ index is keyed by BASENAME, but a hand-authored catalog entry's
  // model path carries its folder (`buildings/mc007`, `scenery/l248900`).
  // Looking that up whole missed 13 of 37 pieces — including the castle
  // wall, tower, gate and keep, i.e. exactly the ones a player leans on —
  // and they silently fell back to a bounding box while everything else got
  // real geometry. Strip the folder, same as the generated list already does.
  entries.push({ id, model: model.split('/').pop(), size: size.split(',').map(Number) });
}
const generated = JSON.parse(fs.readFileSync(
  new URL('../src/game/data/bricks.generated.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'utf8',
));
for (const g of generated) {
  const base = (g.model ?? '').split('/').pop()?.replace(/\.glb$/, '');
  if (base) entries.push({ id: g.id, model: base, size: g.size });
}

const out = {};
let solid = 0, missing = 0, done = 0;
for (const e of entries) {
  const file = objIndex.get(e.model);
  if (!file) { missing++; continue; }
  const [sx, sy, sz] = e.size;
  let parsed;
  try { parsed = parseObj(file); } catch { missing++; continue; }
  if (!parsed.tris.length) { missing++; continue; }
  const verts = normalise(parsed.verts, sy);
  const dims = [sx, sy, sz].map((d) => Math.min(MAX_CELLS, Math.max(MIN_CELLS, Math.round(d / CELL))));
  const size = [sx / dims[0], sy / dims[1], sz / dims[2]];
  const origin = [-sx / 2, 0, -sz / 2];
  const grid = fillInteriors(voxelise(verts, parsed.tris, dims, size, origin), dims);
  const filled = grid.reduce((a, v) => a + v, 0);
  const ratio = filled / grid.length;
  if (process.env.KK_DEBUG && process.env.KK_DEBUG.split(',').includes(e.id)) {
    console.log(`[dbg] ${e.id} dims=${dims} filled=${filled}/${grid.length} ratio=${ratio.toFixed(3)} boxes=${mergeBoxes(grid, dims).length}`);
  }
  if (ratio >= SOLID_RATIO || filled === 0) { solid++; continue; }
  const boxes = mergeBoxes(grid, dims).map(([i, j, k, i2, j2, k2]) => ({
    cx: +(origin[0] + (i + (i2 - i + 1) / 2) * size[0]).toFixed(3),
    cy: +(origin[1] + (j + (j2 - j + 1) / 2) * size[1]).toFixed(3),
    cz: +(origin[2] + (k + (k2 - k + 1) / 2) * size[2]).toFixed(3),
    hx: +(((i2 - i + 1) * size[0]) / 2).toFixed(3),
    hy: +(((j2 - j + 1) * size[1]) / 2).toFixed(3),
    hz: +(((k2 - k + 1) * size[2]) / 2).toFixed(3),
  }));
  // A piece that shatters into a swarm of little boxes costs more to test
  // than it saves in fidelity. 48 is generous on purpose: an AABB test is a
  // handful of compares and only buildings near the player are ever tested,
  // so the arches (25 boxes) are well worth having while a fully ruined wall
  // (65) keeps its hand-authored two-pillar rule instead.
  if (boxes.length > 48) { solid++; continue; }
  out[e.id] = boxes;
  done++;
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/collision.json`, JSON.stringify(out));
const bytes = fs.statSync(`${OUT}/collision.json`).size;
console.log(
  `${OUT}/collision.json <- ${done} pieces with real volumes `
  + `(${solid} left as bbox: solid or too fragmented, ${missing} had no OBJ), ${(bytes / 1024).toFixed(1)} KB`,
);
