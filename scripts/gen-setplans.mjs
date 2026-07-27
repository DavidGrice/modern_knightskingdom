// Emits src/game/data/setPlans.generated.json — a build ORDER for every
// Knights' Kingdom set the extraction actually ships a model for.
//
// Why this exists (see ROADMAP, "The workshop"): the game's meshes are not
// brick-accurate — `oc4807` is 11 named objects where the retail set is tens
// of parts — so a brick-by-brick build of the real set needs LDraw models we
// do not have. What the extraction DOES give is each set already broken into
// sub-assemblies (`oc6098-1 … -7`, `b1 … b3` is King Leo's Castle in ten
// modules, and the set notes say it is built from "recombinable segments"),
// each of those carrying named objects. That is a real two-level hierarchy:
// set → module → part.
//
// The build ORDER is not in the files, so it is derived here from the one
// thing that is always true of a physical build: nothing rests on nothing.
// Parts are sorted bottom-up by the height of their base, ties broken
// centre-out, so each step lands on something already placed. It will not
// match LEGO's printed step grouping — but it is buildable, which is what the
// mechanic needs, and it costs no new assets.
import fs from 'node:fs';

const RES = 'd:/CODING/THREEJS/knightskingdom/knightskingdom/resources';
const MODELS = `${RES}/model_files/extracted/models`;
const OUT = new URL('../src/game/data/setPlans.generated.json', import.meta.url)
  .pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * The sets the extraction ships models for, and which models make them up.
 * Ordered as the set builds: base and frame first, then what stands on it.
 * (The `-n` / `bn` suffixes are the extraction's own decomposition.)
 */
const SETS = [
  { set: '1289', name: 'Small Catapult', faction: 'bull', modules: ['oc1289'] },
  { set: '4801', name: 'Defence Archer', faction: 'lion', modules: ['oc4801'] },
  { set: '4806', name: 'Axe Cart', faction: 'bull', modules: ['oc4806', 'oc4806b1', 'oc4806b2', 'oc4806b3'] },
  { set: '4807', name: 'Fire Attack', faction: 'bull', modules: ['oc4807'] },
  { set: '6032', name: 'Catapult Crusher', faction: 'bull', modules: ['oc6032', 'oc6032b1', 'oc6032b2', 'oc6032b3', 'oc6032b4'] },
  { set: '6094', name: 'Guarded Treasury', faction: 'mixed', modules: ['oc6094-1', 'oc6094-2', 'oc6094b5'] },
  { set: '6095', name: 'Royal Joust', faction: 'mixed', modules: ['oc6095-1', 'oc6095-2', 'oc6095b3', 'oc6095b4', 'oc6095b5'] },
  { set: '6096', name: "Bull's Attack", faction: 'bull', modules: ['oc6096-1', 'oc6096-2', 'oc6096-3', 'oc6096-4', 'oc6096-5', 'oc6096b3', 'oc6096b4', 'oc6096b5'] },
  { set: '6098', name: "King Leo's Castle", faction: 'lion', modules: ['oc6098-1', 'oc6098-2', 'oc6098-3', 'oc6098-4', 'oc6098-5', 'oc6098-6', 'oc6098-7', 'oc6098b1', 'oc6098b2', 'oc6098b3'] },
];

/** every module is normalised to this height when its parts are measured, so
 *  the numbers here are directly comparable to what the game renders */
const NORM_HEIGHT = 2;

/** Split an OBJ into its `o` objects, keeping each one's vertices. */
function parseObjects(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const verts = [];
  const objects = [];
  let cur = null;
  for (const line of txt.split('\n')) {
    if (line.startsWith('o ')) {
      cur = { name: line.slice(2).trim(), idx: [] };
      objects.push(cur);
    } else if (line.startsWith('v ')) {
      const p = line.split(/\s+/);
      verts.push([+p[1], +p[2], +p[3]]);
    } else if (line.startsWith('f ') && cur) {
      for (const tok of line.slice(2).trim().split(/\s+/)) {
        const i = parseInt(tok.split('/')[0], 10);
        cur.idx.push(i < 0 ? verts.length + i : i - 1);
      }
    }
  }
  return { verts, objects };
}

/** the exact normalisation PropModel does: flip upright (rotation.x = PI,
 *  which negates Y and Z), scale to a target height, centre X/Z, ground at 0 */
function measure(file) {
  const { verts, objects } = parseObjects(file);
  if (!objects.length) return null;
  const p = verts.map(([x, y, z]) => [x, -y, -z]);
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  for (const v of p) {
    for (let a = 0; a < 3; a++) {
      if (v[a] < lo[a]) lo[a] = v[a];
      if (v[a] > hi[a]) hi[a] = v[a];
    }
  }
  const s = NORM_HEIGHT / ((hi[1] - lo[1]) || 1);
  const cx = (lo[0] + hi[0]) / 2;
  const cz = (lo[2] + hi[2]) / 2;
  const at = (v) => [(v[0] - cx) * s, (v[1] - lo[1]) * s, (v[2] - cz) * s];

  const parts = [];
  for (const o of objects) {
    if (!o.idx.length) continue;
    let plo = [Infinity, Infinity, Infinity];
    let phi = [-Infinity, -Infinity, -Infinity];
    for (const i of o.idx) {
      const v = at(p[i]);
      for (let a = 0; a < 3; a++) {
        if (v[a] < plo[a]) plo[a] = v[a];
        if (v[a] > phi[a]) phi[a] = v[a];
      }
    }
    const r = (n) => +n.toFixed(3);
    parts.push({
      name: o.name,
      baseY: r(plo[1]),
      topY: r(phi[1]),
      cx: r((plo[0] + phi[0]) / 2),
      cz: r((plo[2] + phi[2]) / 2),
      // rough volume, used to price a step in bricks
      vol: r(Math.max(0.001, (phi[0] - plo[0]) * (phi[1] - plo[1]) * (phi[2] - plo[2]))),
    });
  }
  return parts;
}

/**
 * Bottom-up, then centre-out. A physical build goes up: the base plate before
 * the wall, the wall before the battlement. Within a course, working out from
 * the middle keeps each new piece next to something already standing rather
 * than starting a second island.
 */
function buildOrder(parts) {
  return [...parts].sort((a, b) => {
    // 5cm bands, so parts on the same course are treated as one course rather
    // than being ordered by float noise
    const ba = Math.round(a.baseY / 0.05);
    const bb = Math.round(b.baseY / 0.05);
    if (ba !== bb) return ba - bb;
    const da = Math.hypot(a.cx, a.cz);
    const db = Math.hypot(b.cx, b.cz);
    if (Math.abs(da - db) > 0.02) return da - db;
    return a.name.localeCompare(b.name);
  });
}

const out = { generated: new Date().toISOString(), sets: {} };
let totalSteps = 0;
for (const s of SETS) {
  const modules = [];
  for (const asset of s.modules) {
    const file = `${MODELS}/${asset}.obj`;
    if (!fs.existsSync(file)) { console.warn(`  ! missing ${asset}.obj`); continue; }
    const parts = measure(file);
    if (!parts || !parts.length) { console.warn(`  ! no objects in ${asset}.obj`); continue; }
    const ordered = buildOrder(parts);
    modules.push({ asset, steps: ordered });
    totalSteps += ordered.length;
  }
  out.sets[s.set] = { name: s.name, faction: s.faction, modules };
  const n = modules.reduce((t, m) => t + m.steps.length, 0);
  console.log(`${s.set} ${s.name}: ${modules.length} modules, ${n} steps`);
}
fs.writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
console.log(`\n${OUT}\n${Object.keys(out.sets).length} sets, ${totalSteps} steps total`);
