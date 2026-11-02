import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CARD_KEY_TOLERANCE, cutOutCardMaterial, keyOutCardBackground } from './cardCutout';

const WHITE = [255, 255, 255], RED = [255, 0, 0], GREEN = [20, 120, 30], DARK = [10, 60, 20];

/** a w×h RGBA image: `key` everywhere, with `paint` laid over it ([x, y, colour] per pixel) */
function card(w: number, h: number, key: number[], paint: [number, number, number[]][] = []): Uint8Array {
  const px = new Uint8Array(w * h * 4);
  for (let k = 0; k < px.length; k += 4) px.set([...key, 255], k);
  for (const [x, y, c] of paint) px.set([...c, 255], (y * w + x) * 4);
  return px;
}
const at = (px: Uint8Array, w: number, x: number, y: number) => [...px.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)];

describe('keyOutCardBackground', () => {
  it('cuts a white card out round its tree, and only there', () => {
    // a 4×4 card, the tree a 2×2 block in the middle
    const px = card(4, 4, WHITE, [[1, 1, GREEN], [2, 1, GREEN], [1, 2, GREEN], [2, 2, GREEN]]);
    expect(keyOutCardBackground(px)).toBe(12);
    expect(at(px, 4, 0, 0)[3]).toBe(0);
    expect(at(px, 4, 3, 3)[3]).toBe(0);
    expect(at(px, 4, 1, 1)).toEqual([...GREEN, 255]);
  });

  it('keys whatever colour the corner is: a red card keeps its white and green, and a gap inside the tree is cut too', () => {
    // the red that shows between a conifer's tiers is the same key, away from the border
    const px = card(5, 5, RED, [[1, 1, GREEN], [2, 1, WHITE], [3, 1, GREEN], [1, 3, GREEN], [3, 3, GREEN]]);
    const cut = keyOutCardBackground(px);
    expect(cut).toBe(25 - 5);
    expect(at(px, 5, 2, 2)[3]).toBe(0); // the gap in the middle
    expect(at(px, 5, 2, 1)).toEqual([...WHITE, 255]); // white is not the key here
  });

  it('fills what it cuts with the mean colour kept, so filtering at the edge does not fringe it with the key', () => {
    const px = card(4, 1, WHITE, [[1, 0, GREEN], [2, 0, DARK]]);
    keyOutCardBackground(px);
    const mean = [15, 90, 25];
    expect(at(px, 4, 0, 0)).toEqual([...mean, 0]);
    expect(at(px, 4, 3, 0)).toEqual([...mean, 0]);
  });

  it('takes a decoder-shifted background as key, but not a colour past the tolerance', () => {
    const near = [255 - CARD_KEY_TOLERANCE / 2, 255, 255 - CARD_KEY_TOLERANCE / 2];
    const past = [255 - CARD_KEY_TOLERANCE, 255, 254];
    const px = card(3, 1, WHITE, [[1, 0, near], [2, 0, past]]);
    expect(keyOutCardBackground(px)).toBe(2);
    expect(at(px, 3, 2, 0)[3]).toBe(255);
  });
});

describe('cutOutCardMaterial', () => {
  /** a card material as the GLTF loader leaves one: an opaque map, flipY off, sRGB */
  function cardMaterial() {
    const map = new THREE.DataTexture(card(4, 4, WHITE, [[1, 1, GREEN], [2, 2, GREEN]]), 4, 4);
    map.flipY = false;
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    return { map, material: new THREE.MeshStandardMaterial({ map }) };
  }

  it('alpha-tests the material on a cut-out copy of its map, set up the way the map was', () => {
    const { map, material } = cardMaterial();
    cutOutCardMaterial(material);
    expect(material.alphaTest).toBe(0.5);
    expect(material.transparent).toBe(false);
    const cut = material.map as THREE.DataTexture;
    expect(cut).not.toBe(map);
    expect(cut.isDataTexture).toBe(true);
    expect([cut.flipY, cut.colorSpace, cut.wrapS, cut.minFilter, cut.generateMipmaps])
      .toEqual([false, THREE.SRGBColorSpace, THREE.RepeatWrapping, THREE.LinearMipmapLinearFilter, true]);
    const data = cut.image.data as Uint8Array;
    expect([cut.image.width, cut.image.height]).toEqual([4, 4]);
    expect(at(data, 4, 0, 0)[3]).toBe(0);
    expect(at(data, 4, 1, 1)).toEqual([...GREEN, 255]);
    // the original pixels are left alone
    expect(at(map.image.data as Uint8Array, 4, 0, 0)).toEqual([...WHITE, 255]);
  });

  it('does nothing the second time, as the bake shares its materials with every clone', () => {
    const { material } = cardMaterial();
    cutOutCardMaterial(material);
    const first = material.map;
    cutOutCardMaterial(material);
    expect(material.map).toBe(first);
    expect(at(first!.image.data as Uint8Array, 4, 1, 1)).toEqual([...GREEN, 255]);
  });

  it('leaves a material with no map alone', () => {
    const material = new THREE.MeshStandardMaterial({ color: 0x336633 });
    cutOutCardMaterial(material);
    expect([material.alphaTest, material.transparent, material.map]).toEqual([0, false, null]);
  });
});
