// Copies the assets the game uses from the Knights' Kingdom extraction into public/assets,
// and converts the global runtime palette (.pal) to JSON for the character creator.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RES = 'd:/CODING/THREEJS/knightskingdom/knightskingdom/resources';
const EXT = `${RES}/model_files/extracted`;
const OUT = new URL('../public/assets', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function cpDir(src, dest, filter = () => true) {
  fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    if (fs.statSync(s).isDirectory()) continue;
    if (!filter(f)) continue;
    fs.copyFileSync(s, path.join(dest, f));
    n++;
  }
  console.log(`${dest} <- ${n} files`);
}

// ---- minifigs: OBJ+MTL (named body-part objects) + thumbnails + shared textures ----
const MINIFIG_SRC = `${EXT}/pak_models/warehouse/main_interface/minifigures_animals`;
cpDir(MINIFIG_SRC, `${OUT}/minifigs`, (f) => /^minifig.*\.(obj|mtl|png)$/.test(f));
cpDir(`${MINIFIG_SRC}/textures`, `${OUT}/minifigs/textures`);

// ---- character creator: face + torso-crest thumbnails, extracted per donor
// (see src/game/data/minifigs.ts FACE_OPTIONS/CREST_OPTIONS) — one flat 64×64
// decal each, identified by walking each donor's OBJ for the object matched
// by name (head / body) and resolving its *textured* material (some objects
// list a plain-color material too; take whichever usemtl has a map_Kd).
const MTEX = `${MINIFIG_SRC}/textures`;
function texForObject(objFile, mtlFile, namePattern) {
  const mtlTxt = fs.readFileSync(mtlFile, 'utf8');
  const texByMat = {};
  for (const block of mtlTxt.split(/\nnewmtl /)) {
    const mat = block.split('\n')[0].trim();
    const m = block.match(/map_Kd\s+(\S+)/);
    if (m) texByMat[mat] = m[1].replace(/^textures\//, '');
  }
  const objTxt = fs.readFileSync(objFile, 'utf8');
  let curName = null;
  const matsByObj = {};
  for (const line of objTxt.split('\n')) {
    if (line.startsWith('o ')) { curName = line.slice(2).trim(); matsByObj[curName] ??= []; }
    else if (line.startsWith('usemtl ') && curName) matsByObj[curName].push(line.slice(7).trim());
  }
  for (const [name, mats] of Object.entries(matsByObj)) {
    if (!namePattern.test(name)) continue;
    for (const mat of mats) if (texByMat[mat]) return texByMat[mat];
  }
  return null;
}
const CREATOR_DONORS = [
  'minifigkingleo00', 'minifigqueenleonora00', 'minifigrichardstrong00', 'minifigjohnmayne00',
  'minifigprincessstorm00', 'minifigcedricbull00', 'minifiggilbertbad00', 'minifigweezil00',
];
fs.mkdirSync(`${OUT}/creator/faces`, { recursive: true });
fs.mkdirSync(`${OUT}/creator/crests`, { recursive: true });
for (const id of CREATOR_DONORS) {
  const objFile = `${MINIFIG_SRC}/${id}.obj`, mtlFile = `${MINIFIG_SRC}/${id}.mtl`;
  const face = texForObject(objFile, mtlFile, /head/i);
  const crest = texForObject(objFile, mtlFile, /body|torso/i);
  if (face) fs.copyFileSync(`${MTEX}/${face}`, `${OUT}/creator/faces/${id}.png`);
  if (crest) fs.copyFileSync(`${MTEX}/${crest}`, `${OUT}/creator/crests/${id}.png`);
}
console.log(`${OUT}/creator/faces + crests <- ${CREATOR_DONORS.length} donors`);

// ---- props (GLB + thumbnail PNG) ----
const propSets = {
  scenery: `${EXT}/pak_models/warehouse/main_interface/scenery`,
  castle: `${EXT}/pak_models/warehouse/workshop/castle_components`,
  castle_accessories: `${EXT}/pak_models/warehouse/workshop/castle_accessories`,
  windows_doors: `${EXT}/pak_models/warehouse/workshop/windows_doors_fences`,
  basic: `${EXT}/pak_models/warehouse/workshop/basic`,
  buildings: `${EXT}/pak_models/warehouse/main_interface/buildings`,
  // previously uncopied workshop folders — real distinct castle/build pieces
  // (arches, towers, roof slopes, tiles, trim) that were sitting unused in
  // the extraction while the build menu only ever offered plain bricks/walls.
  arches: `${EXT}/pak_models/warehouse/workshop/arches`,
  cylindrical: `${EXT}/pak_models/warehouse/workshop/cylindrical`,
  slim: `${EXT}/pak_models/warehouse/workshop/slim`,
  tiles: `${EXT}/pak_models/warehouse/workshop/tiles`,
  wedge: `${EXT}/pak_models/warehouse/workshop/wedge`,
};
for (const [name, src] of Object.entries(propSets)) {
  cpDir(src, `${OUT}/props/${name}`, (f) => /\.(glb|png)$/.test(f));
}
// ---- creatures (wildlife) ----
fs.mkdirSync(`${OUT}/props/creatures`, { recursive: true });
for (const id of ['l254600', 'l3010300', 'l3010301', 'l7339200', 'l7339211']) {
  const s = `${EXT}/pak_models/warehouse/main_interface/minifigures_animals/${id}.glb`;
  if (fs.existsSync(s)) fs.copyFileSync(s, `${OUT}/props/creatures/${id}.glb`);
}
// the Dragon's two wing poses (flat models folder) — l7517400 also ships its
// OBJ+MTL: the GLB is one merged unnamed mesh, but the OBJ keeps the per-part
// `o` names that the Grok rig lab's l7517400_rig.json maps to bones
// (wing_L/wing_R/tail/head…), which DragonOmen.tsx slices for a REAL
// articulated wing flap (AI wave 2).
for (const id of ['l7517400', 'l7517401']) {
  fs.copyFileSync(`${EXT}/models/${id}.glb`, `${OUT}/props/creatures/${id}.glb`);
}
for (const ext of ['obj', 'mtl']) {
  fs.copyFileSync(`${EXT}/models/l7517400.${ext}`, `${OUT}/props/creatures/l7517400.${ext}`);
}
// the dragon MTL's one map_Kd (its eye sprite) — without it every siege
// spams a 404 for textures/spr001_128x128.png
fs.mkdirSync(`${OUT}/props/creatures/textures`, { recursive: true });
fs.copyFileSync(`${EXT}/models/textures/spr001_128x128.png`, `${OUT}/props/creatures/textures/spr001_128x128.png`);
console.log(`${OUT}/props/creatures <- copied`);
fs.copyFileSync(`${EXT}/models/c3_cannon.glb`, `${OUT}/props/cannon.glb`);
// siege/training machines and the axes device (LEGO-first asset pass)
for (const id of ['oc6095-2', 'oc4806', 'oc4807']) {
  fs.copyFileSync(`${EXT}/models/${id}.glb`, `${OUT}/props/${id}.glb`);
}

// the oc6095b3 model whole: a two-horse team yoked to a shared tow-bar,
// carrying a chest between them plus a pair of axes — used as-is for the
// traveling merchant's "cart" (see Merchant.tsx's Cart()).
fs.copyFileSync(`${EXT}/models/oc6095b3.glb`, `${OUT}/props/oc6095b3.glb`);

// ---- prop parts: OBJ+MTL sources we extract named sub-objects from at
// runtime (see src/lib/propParts.ts) — e.g. the treasure chest bundled
// inside the oc6095b3 jousting-set model alongside unrelated horse gear.
fs.mkdirSync(`${OUT}/props/parts/textures`, { recursive: true });
for (const ext of ['obj', 'mtl']) {
  fs.copyFileSync(`${EXT}/models/oc6095b3.${ext}`, `${OUT}/props/parts/oc6095b3.${ext}`);
}
for (const tex of ['spr001_128x128.png', 'spr126_128x128.png', 'spr127_128x128.png']) {
  fs.copyFileSync(`${EXT}/models/textures/${tex}`, `${OUT}/props/parts/textures/${tex}`);
}
console.log(`${OUT}/props/parts <- oc6095b3 (chest)`);

// ---- water: the original draws water as a runtime plane using this
// greyscale caustic-ripple sprite (tinted blue via material color, UV-
// scrolled each frame — see Terrain.tsx's pond), plus a waterfall cascade
// strip for future streams/waterfalls (not yet wired to anything).
fs.mkdirSync(`${OUT}/textures/water`, { recursive: true });
for (const tex of ['spr199_256x256.png', 'spr203_64x128.png']) {
  fs.copyFileSync(`${EXT}/models/textures/${tex}`, `${OUT}/textures/water/${tex}`);
}
console.log(`${OUT}/textures/water <- spr199 (ripple), spr203 (waterfall)`);

// ---- the road surface (K59). The 32x32 baseplates I first used for the
// path (l4109610-13) are GRASS plates — sampling them shows 35-67% green and
// no stone at all, which is why the road read wrong. spr177 is the trodden
// ground the Tourney Grounds bake (template-02) uses for its arena floor:
// the game's own road surface, 100% stone/earth tones.
fs.mkdirSync(`${OUT}/textures/ground`, { recursive: true });
for (const tex of ['spr177_128x128.png', 'spr176_32x32.png']) {
  const src = `${EXT}/pak_models/warehouse/worlds/templates/textures/${tex}`;
  const alt = `${EXT}/models/textures/${tex}`;
  const from = fs.existsSync(src) ? src : (fs.existsSync(alt) ? alt : null);
  if (from) fs.copyFileSync(from, `${OUT}/textures/ground/${tex}`);
}
console.log(`${OUT}/textures/ground <- road surface`);

// ---- J50 · fire. The flame billboards the castle and catapult models carry
// sample spr010: a 1024x64 strip of 32 flame frames on black. That strip IS
// the game's fire, so every torch, campfire and hearth plays it rather than
// growing its own cones.
fs.mkdirSync(`${OUT}/textures/fx`, { recursive: true });
for (const tex of ['spr010_1024x64.png']) {
  fs.copyFileSync(`${EXT}/models/textures/${tex}`, `${OUT}/textures/fx/${tex}`);
}
console.log(`${OUT}/textures/fx <- spr010 (32-frame flame)`);

// ---- UI materials: the dark-ages chrome (globals.css) tiles the original
// game's own rough-hewn castle stone-wall sprite behind every panel.
fs.mkdirSync(`${OUT}/textures/ui`, { recursive: true });
for (const tex of ['spr187_256x256.png']) {
  fs.copyFileSync(`${EXT}/models/textures/${tex}`, `${OUT}/textures/ui/${tex}`);
}
console.log(`${OUT}/textures/ui <- spr187 (castle stone)`);

// extra scenery only present in the flat models folder (trees/rocks variants)
fs.mkdirSync(`${OUT}/props/scenery`, { recursive: true });
for (const id of ['l606400', 'l606500', 'l607900', 'l625500']) {
  const s = `${EXT}/models/${id}.glb`;
  if (fs.existsSync(s)) fs.copyFileSync(s, `${OUT}/props/scenery/${id}.glb`);
}

// ---- sounds (renamed to friendly names) ----
const soundMap = {
  'snd000_Environmentals_Bird_1.wav': 'bird1.wav',
  'snd001_Environmentals_Bird_2.wav': 'bird2.wav',
  'snd002_Environmentals_Bird_3.wav': 'bird3.wav',
  'snd003_Bricks_Link.wav': 'brick_link.wav',
  'snd004_Bricks_Collide.wav': 'brick_collide.wav',
  'snd005_Bricks_Connect.wav': 'brick_connect.wav',
  'snd012_Action_Sword_Swish.wav': 'sword_swish.wav',
  'snd026_Action_Door_Open.wav': 'door_open.wav',
  'snd032_Minifigures_Step.wav': 'step.wav',
  'snd057_Action_Collision.wav': 'thud.wav',
  'snd059_Action_Flame_Crackling.wav': 'flame.wav',
  'snd068_Action_Treasure_Open.wav': 'treasure.wav',
  'snd078_Action_Lock_Unlock.wav': 'unlock.wav',
  'snd086_Environmentals_Wind_1.wav': 'wind1.wav',
  'snd087_Environmentals_Wind_2.wav': 'wind2.wav',
  'snd090_Environmentals_Owl_Hoot.wav': 'owl.wav',
  'snd091_Action_Horn.wav': 'horn.wav',
  'snd042_Minifigures_KL_Greeting.wav': 'greeting_king.wav',
  'snd075_Minifigures_GenG_Random.wav': 'villager.wav',
  'snd006_Environmentals_Rain.wav': 'rain.wav',
  'snd089_Environmentals_Lightning.wav': 'lightning.wav',
  'snd055_Action_Bat_Screech.wav': 'bat.wav',
  'snd054_Action_Falcon_Squawk.wav': 'falcon.wav',
  'snd076_Horses_Whinny.wav': 'whinny.wav',
  'snd077_Horses_Graze.wav': 'graze.wav',
  'snd049_Minifigures_Skeleton.wav': 'skeleton.wav',
  'snd053_Minifigures_CB_War_Cry.wav': 'warcry.wav',
  'snd052_Horses_Canter.wav': 'canter.wav',
  'snd022_Action_Cannon_Fire.wav': 'cannon.wav',
  'snd021_Action_Explosion.wav': 'explosion.wav',
  'snd034_Minifigures_QL_Greeting.wav': 'greeting_queen.wav',
  'snd036_Minifigures_RS_Greeting.wav': 'greeting_richard.wav',
  'snd030_Minifigures_JM_Greeting.wav': 'greeting_john.wav',
  'snd047_Minifigures_PS_Greeting.wav': 'greeting_storm.wav',
  'snd018_Action_Crossbow_Fire.wav': 'crossbow.wav',
  'snd008_Action_Longbow_Fire.wav': 'longbow.wav',
  'snd020_Action_Drawbridge.wav': 'drawbridge.wav',
  'snd066_Action_Portcullis_Open.wav': 'portcullis.wav',
  'snd040_Minifigures_GB_Greeting.wav': 'greeting_gilbert.wav',
  'snd041_Minifigures_GB_Random.wav': 'random_gilbert.wav',
  'snd038_Minifigures_W_Greeting.wav': 'greeting_weezil.wav',
  'snd039_Minifigures_W_Random.wav': 'random_weezil.wav',
  'snd044_Minifigures_CB_Greeting.wav': 'greeting_cedric.wav',
  'snd045_Minifigures_CB_Random.wav': 'random_cedric.wav',
  'snd048_Minifigures_PS_Random.wav': 'random_storm.wav',
  'snd046_Minifigures_PS_Collision.wav': 'collision_storm.wav',
};
fs.mkdirSync(`${OUT}/sounds`, { recursive: true });
for (const [src, dst] of Object.entries(soundMap)) {
  fs.copyFileSync(`${EXT}/sounds/${src}`, `${OUT}/sounds/${dst}`);
}
console.log(`${OUT}/sounds <- ${Object.keys(soundMap).length} files`);

// ---- lore voice clips: curated lines from the 371-line challenge/tutorial
// voice-over bank (pak/system/challenges), reused as NPC dialogue-tree lines
// (see src/game/data/npcs.ts loreLines) — not the whole bank, just the lines
// that are genuine in-character speech rather than "click this button" UI
// instruction, which wouldn't make sense outside the original tutorial.
const loreMap = {
  'challenge1/c1s01t1a.wav': 'lore_richard_greet.wav',
  'challenge1/c1s01t2a.wav': 'lore_richard_reassure.wav',
  'challenge1/c1s01t2c.wav': 'lore_richard_friendsfoes.wav',
  'challenge1/c1s04t1a.wav': 'lore_richard_cedric.wav',
  'challenge6/c6s05t5d.wav': 'lore_richard_farewell.wav',
  'challenge1/c1s04t2a.wav': 'lore_leo_castle.wav',
  'challenge1/c1s04t2b.wav': 'lore_leo_cedric1.wav',
  'challenge1/c1s04t2c.wav': 'lore_leo_cedric2.wav',
  'challenge1/c1s04t4a.wav': 'lore_queen_husband.wav',
  'challenge1/c1s04t4b.wav': 'lore_queen_self.wav',
  'challenge1/c1s04t4c.wav': 'lore_queen_daughter.wav',
};
fs.mkdirSync(`${OUT}/sounds/lore`, { recursive: true });
for (const [src, dst] of Object.entries(loreMap)) {
  fs.copyFileSync(`${EXT}/pak/system/challenges/sounds/${src}`, `${OUT}/sounds/lore/${dst}`);
}
console.log(`${OUT}/sounds/lore <- ${Object.keys(loreMap).length} files`);

// ---- animations (original SMO tracks as JSON) ----
const anims = [
  'anim_r_restpose', 'anim_c_walk', 'anim_c_run', 'anim_r_greet1', 'anim_r_regalwave',
  'anim_c_pleased', 'anim_c_angry', 'anim_c_confused', 'anim_c_think',
  'anim_c_surprisejump', 'anim_g_swordswish', 'anim_c_attention',
  // Knight/Paladin ceremony (King Leo's gestures, see game/store gameStore's beginCeremony)
  'anim_r_gesturepullsword', 'anim_r_congratulate',
  // jousting duel vs Richard (his stagger reaction on a landed hit)
  'anim_g_fallbackward',
];
fs.mkdirSync(`${OUT}/anims`, { recursive: true });
for (const a of anims) {
  fs.copyFileSync(`${EXT}/animations/${a}.json`, `${OUT}/anims/${a}.json`);
}
console.log(`${OUT}/anims <- ${anims.length} files`);

// ---- skybox ----
cpDir(`${EXT}/pak/warehouse/worlds/skyboxes/grass`, `${OUT}/sky/grass`);

// ---- generated brick catalog: real proportions from the extraction metadata ----
// world scale: a real minifig is ~40mm and ours is 1.75m -> 0.04375 world units per mm
const MM_TO_WORLD = 0.04375;
const STUD = 8 * MM_TO_WORLD; // one LEGO stud pitch (8mm) in world units
const metaPath = `${RES}/model_pipeline/model_metadata.generated.json`;
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const metaById = Object.fromEntries(meta.models.map((m) => [m.id, m]));
// ids already exposed as hand-crafted buildables — skip to avoid duplicates
// ids already exposed as hand-crafted buildables, or used as fixed world
// dressing — skip so the catalog never lists the same mesh twice
const HAND_MADE = new Set([
  '00_l407000', '02_l3013600', '04_l609100', '06_l318500',
  // the castle set, all hand-authored with tuned footprints and costs
  'mc001', 'mc002', 'mc003', 'mc004', 'mc005', 'mc006', 'mc007', 'mc008', 'mc009', 'mc010',
  // scenery already wired to specific buildables (workbench, bed, fence…)
  'l301500', 'l248900', 'l374100', 'l243500', 'l607900', 'l625500',
  // and the banner, which is its own buildable
  '18_l7196300',
]);
const brickCats = [
  { cat: 'bricks', folder: 'basic', label: 'Brick', costItem: 'plank' },
  { cat: 'decor', folder: 'windows_doors', label: 'Window/Door', costItem: 'plank' },
  { cat: 'decor', folder: 'castle_accessories', label: 'Ornament', costItem: 'stone' },
  // castle_components are wall/corner/crenellation sections, not generic
  // "castle pieces" — their own category so players can actually browse walls.
  { cat: 'walls', folder: 'castle', label: 'Wall Section', costItem: 'stone' },
  { cat: 'decor', folder: 'arches', label: 'Arch', costItem: 'stone' },
  { cat: 'castle', folder: 'cylindrical', label: 'Tower Piece', costItem: 'stone' },
  { cat: 'decor', folder: 'slim', label: 'Trim', costItem: 'plank' },
  { cat: 'decor', folder: 'tiles', label: 'Tile', costItem: 'plank' },
  { cat: 'castle', folder: 'wedge', label: 'Roof Slope', costItem: 'plank' },
  // F22 · the last two folders the catalog never reached. `buildings` holds
  // the rest of the castle set beside the hand-authored walls; `scenery` is
  // the world dressing (crates, barrels, plants) that was copied for props
  // but never offered as something you could place yourself.
  { cat: 'castle', folder: 'buildings', label: 'Castle Piece', costItem: 'stone' },
  { cat: 'decor', folder: 'scenery', label: 'Scenery', costItem: 'wood' },
];
const generated = [];
for (const { cat, folder, label, costItem } of brickCats) {
  const dir = `${OUT}/props/${folder}`;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.glb')) continue;
    const id = f.replace('.glb', '');
    if (HAND_MADE.has(id)) continue;
    const m = metaById[id];
    if (!m) continue;
    const [sx, sy, sz] = m.bbox.size.map((v) => v * MM_TO_WORLD);
    const studsX = Math.max(1, Math.round(sx / STUD));
    const studsZ = Math.max(1, Math.round(sz / STUD));
    const vol = sx * sy * sz;
    generated.push({
      id: `gen_${id}`,
      name: `${label} ${studsX}×${studsZ}`,
      cat,
      model: `/assets/props/${folder}/${id}.glb`,
      thumb: `/assets/props/${folder}/${id}.png`,
      size: [Number(sx.toFixed(3)), Number(sy.toFixed(3)), Number(sz.toFixed(3))],
      cost: { [costItem]: Math.max(1, Math.min(6, Math.round(vol * 1.2))) },
    });
  }
}
const genOut = new URL('../src/game/data/bricks.generated.json', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
fs.writeFileSync(genOut, JSON.stringify(generated, null, 1));
console.log(`${genOut} <- ${generated.length} generated pieces`);

// ---- global runtime palette (CREATO~2.PAL): 'PALT' magic + RGB triples at magic+16 ----
const pal = fs.readFileSync(`${EXT}/xvr/creator2000.pal`);
if (pal.toString('ascii', 0, 4) !== 'PALT') throw new Error('bad palette magic');
const colors = [];
for (let i = 0; i < 256; i++) {
  const o = 16 + i * 3;
  colors.push([pal[o], pal[o + 1], pal[o + 2]]);
}
fs.writeFileSync(`${OUT}/palette.json`, JSON.stringify({ colors }));
console.log(`${OUT}/palette.json <- 256 colors`);

// ---- chroma-key thumbnails: every piece/prop/portrait PNG in the extraction
// is a render against a pure (0,255,0) green screen, not a real transparent
// background — the build menu and dialogue portraits were showing a flat
// green box behind every icon. Key the green out to real alpha, with a
// despill pass (pull the green channel down to the other channels' max on
// partially-keyed edge pixels) so keyed edges don't keep a green fringe.
async function keyOutGreen(file) {
  const img = sharp(file);
  const { width, height } = await img.metadata();
  const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const excess = g - Math.max(r, b);
    if (excess > 0) {
      data[i + 3] = Math.max(0, 255 - excess * 3);
      data[i + 1] = Math.max(r, b);
    }
  }
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(file);
}

function findPngs(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) findPngs(p, out);
    else if (f.endsWith('.png')) out.push(p);
  }
  return out;
}

const thumbTargets = [
  ...findPngs(`${OUT}/props`),
  ...fs.readdirSync(`${OUT}/minifigs`).filter((f) => f.endsWith('.png')).map((f) => `${OUT}/minifigs/${f}`),
];
for (const p of thumbTargets) await keyOutGreen(p);
console.log(`${OUT}/props + minifigs <- chroma-keyed ${thumbTargets.length} thumbnail PNGs`);

// ---- rig part maps: the Grok/Blender lab's HUMAN-VERIFIED shape->role maps.
// Each reports/rigs/<id>_rig.json lists every mesh in a donor by its raw OBJ
// object name (`orig`, e.g. "034_shape17") together with the body-part role it
// actually is ("torso", "arm_L", "halberd", "shield", ...). That replaces the
// runtime SPATIAL GUESSING in src/lib/minifigRig.ts, which could not tell a
// held halberd from an arm. Consolidated into one small file so the game does
// one fetch instead of ~30.
const RIG_SRC = 'd:/CODING/THREEJS/knightskingdom/knightskingdom/grok/blender/movie/07082026/reports/rigs';
if (fs.existsSync(RIG_SRC)) {
  const maps = {};
  let nParts = 0;
  for (const f of fs.readdirSync(RIG_SRC)) {
    if (!/_rig\.json$/.test(f)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(RIG_SRC, f), 'utf8')); } catch { continue; }
    const id = doc.asset_id || f.replace(/_rig\.json$/, '');
    const parts = {};
    for (const p of doc.parts ?? []) {
      if (!p?.orig || !p?.role) continue;
      parts[p.orig] = p.role;
      nParts++;
    }
    if (Object.keys(parts).length) {
      maps[id] = { rigClass: doc.rigClass ?? null, status: doc.rig_status ?? doc.status ?? null, parts };
    }
  }
  fs.mkdirSync(`${OUT}/rigs`, { recursive: true });
  fs.writeFileSync(`${OUT}/rigs/part_roles.json`, JSON.stringify(maps));
  console.log(`${OUT}/rigs/part_roles.json <- ${Object.keys(maps).length} rigs, ${nParts} labelled parts`);
} else {
  console.log(`(skipped rig maps — ${RIG_SRC} not found)`);
}

// ---- lab capability data + the assets it describes ------------------------
// PAK_CAPABILITY_OVERRIDES.json is the lab's hand-curated, human-VERIFIED
// answer sheet for what each asset actually is: what it's made of, whether you
// can stand on it, whether it's destructible, which hand holds the sword,
// whether it's a siege engine that fires, an explosive that damages walls, a
// mountable horse. The game used to hardcode all of that per-buildable.
const REPORTS = 'd:/CODING/THREEJS/knightskingdom/knightskingdom/grok/blender/movie/07082026/reports';
const CAPS_SRC = `${REPORTS}/PAK_CAPABILITY_OVERRIDES.json`;
if (fs.existsSync(CAPS_SRC)) {
  const raw = JSON.parse(fs.readFileSync(CAPS_SRC, 'utf8'));
  const caps = {};
  for (const [id, entry] of Object.entries(raw)) {
    if (id === '_comment' || !entry || typeof entry !== 'object') continue;
    const c = entry.capabilities;
    if (!c) continue;
    caps[id] = {
      kind: c.kind ?? null,
      displayName: c.displayName ?? id,
      rigClass: c.rigClass ?? null,
      rigStatus: c.rigStatus ?? null,
      traits: c.traits ?? {},
      interaction: c.interaction ?? {},
      sockets: c.sockets ?? {},
    };
  }
  fs.writeFileSync(`${OUT}/rigs/capabilities.json`, JSON.stringify(caps));
  console.log(`${OUT}/rigs/capabilities.json <- ${Object.keys(caps).length} verified assets`);

  // copy every GLB the lab describes that the game doesn't already ship —
  // siege engines, explosives and the extra horse/dragon variants all live in
  // the extraction's flat models/ folder and were simply never pulled across
  const MODELS = `${EXT}/models`;
  const LAB_OUT = `${OUT}/props/lab`;
  fs.mkdirSync(LAB_OUT, { recursive: true });
  let copied = 0;
  const existing = new Set();
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.glb')) existing.add(f.slice(0, -4));
    }
  };
  walk(`${OUT}/props`);
  for (const [id, cap] of Object.entries(caps)) {
    if (existing.has(id)) continue;
    // minifig GLBs are useless to us: that export drops the per-part `o`
    // names the rig depends on, which is why minifigs load from OBJ+MTL
    if (cap.kind === 'minifig' || id.startsWith('minifig') || id.startsWith('c6_')) continue;
    for (const ext of ['glb', 'png']) {
      const src = `${MODELS}/${id}.${ext}`;
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, `${LAB_OUT}/${id}.${ext}`);
        if (ext === 'glb') copied++;
      }
    }
  }
  console.log(`${LAB_OUT} <- ${copied} lab-described models the game was missing`);

  // ---- thumbnails for the lab-described pieces ----------------------------
  // The loop above `continue`s as soon as a model already exists under
  // props/, which is true for all nine siege engines and three explosives —
  // so their PNGs were never copied and the build menu 404'd on every one.
  // They also do not live beside the models: the thumbnails are under
  // pak_models/warehouse/<section>/<category>/<id>.png. Index that tree once
  // and pull across a thumbnail for every id the catalog can show, keying
  // the green screen out here because the global chroma pass already ran.
  const WAREHOUSE = `${EXT}/pak_models/warehouse`;
  const thumbIndex = new Map();
  if (fs.existsSync(WAREHOUSE)) {
    const idx = (dir) => {
      for (const f of fs.readdirSync(dir)) {
        const p2 = path.join(dir, f);
        if (fs.statSync(p2).isDirectory()) idx(p2);
        else if (f.endsWith('.png') && !thumbIndex.has(f.slice(0, -4))) {
          thumbIndex.set(f.slice(0, -4), p2);
        }
      }
    };
    idx(WAREHOUSE);
  }
  let labThumbs = 0;
  for (const id of Object.keys(caps)) {
    const dest = `${LAB_OUT}/${id}.png`;
    if (fs.existsSync(dest)) continue;
    const src = thumbIndex.get(id);
    if (!src) continue;
    fs.copyFileSync(src, dest);
    await keyOutGreen(dest);
    labThumbs++;
  }
  console.log(`${LAB_OUT} <- ${labThumbs} chroma-keyed thumbnails (${thumbIndex.size} indexed)`);

  // ---- OBJ sources for ANIMATED props -------------------------------------
  // The GLB export of these props is unusable for rigging: it drops every
  // node/mesh name AND merges primitives by material, so neither name- nor
  // index-matching can recover which mesh is the catapult arm. The OBJ keeps
  // the per-object `o` names the lab's rig maps key on (exactly the reason
  // minifigs already load from OBJ+MTL). Their MTLs are pure glit palette
  // colours with no texture references, so OBJ+MTL is self-contained.
  const RIGGED_OBJ = [
    'oc6096-4', 'oc6032b2', 'oc1289', 'oc6096-3', 'oc6096b3',  // catapults / throwers
    'oc4806b2', 'oc4806b3', 'oc4801', 'oc6096b4',              // turrets
    '18_l7196300',                                             // war banner
    'oc4806', 'oc4807',                                        // the carts (wheels)
    // the six horses: the lab verified a full four-leg rig on every one
    // (body + leg_upper/leg_lower ×4 + head + tail), so they can actually
    // walk and graze instead of sliding about frozen
    'l7339200', 'l7339211', 'l7339212', 'l7339221', 'l7339231', 'l7339232',
    // The workshop (Block M): every module of every set the extraction ships
    // a model for. These have to come from the OBJ, not the GLB — the GLB
    // merges primitives by material and drops the per-object `o` names, and
    // the whole mechanic is placing one NAMED part at a time.
    'oc1289', 'oc4801', 'oc4806', 'oc4806b1', 'oc4806b2', 'oc4806b3', 'oc4807', 'oc6032', 'oc6032b1', 'oc6032b2', 'oc6032b3', 'oc6032b4', 'oc6094-1', 'oc6094-2', 'oc6094b5', 'oc6095-1', 'oc6095-2', 'oc6095b3', 'oc6095b4', 'oc6095b5', 'oc6096-1', 'oc6096-2', 'oc6096-3', 'oc6096-4', 'oc6096-5', 'oc6096b3', 'oc6096b4', 'oc6096b5', 'oc6098-1', 'oc6098-2', 'oc6098-3', 'oc6098-4', 'oc6098-5', 'oc6098-6', 'oc6098-7', 'oc6098b1', 'oc6098b2', 'oc6098b3',
  ];
  const OBJRIG_OUT = `${OUT}/props/objrig`;
  fs.mkdirSync(OBJRIG_OUT, { recursive: true });
  let objN = 0;
  for (const id of RIGGED_OBJ) {
    for (const ext of ['obj', 'mtl']) {
      const src = `${MODELS}/${id}.${ext}`;
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, `${OBJRIG_OUT}/${id}.${ext}`);
        if (ext === 'obj') objN++;
      }
    }
  }
  // the MTLs reference `textures/spr*.png` relative to themselves — without
  // these the rigged props render untextured (404s in the console, flat
  // colour where the source had a painted panel)
  const objTex = new Set();
  for (const f of fs.readdirSync(OBJRIG_OUT).filter((f) => f.endsWith('.mtl'))) {
    for (const m of fs.readFileSync(`${OBJRIG_OUT}/${f}`, 'utf8').matchAll(/^map_\w+\s+(\S+)/gm)) {
      objTex.add(m[1].split('\\').join('/'));
    }
  }
  let texN = 0;
  for (const rel of objTex) {
    const src = `${MODELS}/${rel}`;
    const dest = `${OBJRIG_OUT}/${rel}`;
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    texN++;
  }
  console.log(`${OBJRIG_OUT} <- ${objN} OBJ sources + ${texN} textures for animated props`);
} else {
  console.log(`(skipped capabilities — ${CAPS_SRC} not found)`);
}
console.log('done');
