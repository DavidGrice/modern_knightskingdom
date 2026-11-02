// Wave 62.4 · colour-keyed "card" sprites: a tree or a grass tuft printed on a flat background (white, pure red or
// grey), which the original 2000 game drew with that background keyed out. The textures carry no alpha channel at all
// (checked in the destination bakes and in the original extraction alike: spr171-183, spr191 and spr197 are 3-channel
// PNGs), and the background is ONE exact colour that also fills the gaps between a conifer's tiers. A material drawn
// from one as it is shows the tree on an opaque rectangle; this gives it the cut-out the background stood for.
//
// Keyed by the caller — never applied to every texture with a plain border: decals and backdrops (a shield on black,
// a LEGO stud on white, the stone strips on green) have one too, and must stay as they are.
import * as THREE from 'three';

/** how far (|dr| + |dg| + |db|) a pixel may stray from the key and still be background. The sprites' backgrounds are
 *  exact; this only absorbs a decoder's colour conversion. */
export const CARD_KEY_TOLERANCE = 24;

/**
 * Key a card's background out of its RGBA pixels, in place. The key is the corner pixel's colour (every card sprite's
 * border is all background). Each pixel within `CARD_KEY_TOLERANCE` of it gets alpha 0 and the mean colour of the
 * pixels kept, so the texels that filtering blends into the cut-out's edge stay the tree's colour instead of fringing
 * it white or red. Returns how many pixels were cut.
 */
export function keyOutCardBackground(rgba: Uint8Array | Uint8ClampedArray): number {
  const [kr, kg, kb] = [rgba[0], rgba[1], rgba[2]];
  const isKey = (k: number) => Math.abs(rgba[k] - kr) + Math.abs(rgba[k + 1] - kg) + Math.abs(rgba[k + 2] - kb) <= CARD_KEY_TOLERANCE;
  let r = 0, g = 0, b = 0, kept = 0;
  for (let k = 0; k < rgba.length; k += 4) {
    if (isKey(k)) continue;
    r += rgba[k]; g += rgba[k + 1]; b += rgba[k + 2]; kept++;
  }
  const fill = kept ? [Math.round(r / kept), Math.round(g / kept), Math.round(b / kept)] : [kr, kg, kb];
  let cut = 0;
  for (let k = 0; k < rgba.length; k += 4) {
    if (!isKey(k)) continue;
    rgba[k] = fill[0]; rgba[k + 1] = fill[1]; rgba[k + 2] = fill[2]; rgba[k + 3] = 0;
    cut++;
  }
  return cut;
}

type Pixels = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

/** a texture image's RGBA pixels: a DataTexture's as they are (copied), anything drawable read back through a canvas */
function pixelsOf(image: unknown): Pixels {
  const px = image as Partial<Pixels>;
  if (px.data && px.width && px.height) return { data: new Uint8Array(px.data), width: px.width, height: px.height };
  const source = image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const read = ctx.getImageData(0, 0, source.width, source.height);
  return { data: new Uint8Array(read.data.buffer), width: read.width, height: read.height };
}

/**
 * Cut a card material's background out: its map becomes a copy with the key turned to alpha 0, alpha-tested at 0.5
 * and not blended (so it sorts and writes depth like any opaque mesh, and its shadow cuts out too). The copy is a
 * DataTexture rather than a canvas because a canvas premultiplies alpha and would lose the fill colour under the cut;
 * every other setting (flipY, colour space, wrapping, filtering) is copied from the original map, so the image lands
 * on the mesh exactly as before. Marked on the material, so a second pass over the same (shared) material is a no-op.
 */
export function cutOutCardMaterial(material: THREE.MeshStandardMaterial): void {
  const map = material.map;
  if (!map || material.userData.cardCutout) return;
  const { data, width, height } = pixelsOf(map.image);
  keyOutCardBackground(data);
  const cut = new THREE.DataTexture().copy(map);
  cut.source = new THREE.Source({ data, width, height });
  cut.format = THREE.RGBAFormat;
  cut.type = THREE.UnsignedByteType;
  cut.needsUpdate = true;
  material.map = cut;
  material.alphaTest = 0.5;
  material.transparent = false;
  material.userData.cardCutout = true;
  material.needsUpdate = true;
}
