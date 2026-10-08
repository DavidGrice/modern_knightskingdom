import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// The loader itself is real. What it loads from is stood in for: the rig lab's chart (a `flag` for any asset named
// "zz-charted…", none for anything else) and the two file loaders — what the files of the next asset turn out to be
// is set per test in `NEXT`.
const NEXT = vi.hoisted(() => ({ files: 'no-mtl' as 'no-mtl' | 'no-obj' | 'empty' | 'flag' }));
vi.mock('./rigParts', () => ({
  loadPartRoles: async () => ({}),
  partRolesFor: (id: string | undefined) => (id?.startsWith('zz-charted') ? { '001_cloth': 'flag' } : null),
}));
vi.mock('three/examples/jsm/loaders/MTLLoader.js', () => ({
  MTLLoader: class {
    setPath() {}
    setResourcePath() {}
    load(_url: string, loaded: (materials: { preload(): void }) => void, _progress: unknown, failed: (e: unknown) => void) {
      if (NEXT.files === 'no-mtl') failed(new Error('404'));
      else loaded({ preload() {} });
    }
  },
}));
vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({
  OBJLoader: class {
    setMaterials() {}
    setPath() {}
    load(_url: string, loaded: (group: THREE.Group) => void, _progress: unknown, failed: (e: unknown) => void) {
      if (NEXT.files === 'no-obj') { failed(new Error('404')); return; }
      const group = new THREE.Group();
      if (NEXT.files === 'flag') {
        // as the exporter leaves a model: up is -Y. A pole five units tall, and above it — further down -Y — a
        // cloth, off to one side
        const pole = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 4).translate(0, -2.5, 0), new THREE.MeshPhongMaterial());
        pole.name = '000_pole';
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.2).translate(1, -5.5, 0), new THREE.MeshPhongMaterial());
        cloth.name = '001_cloth';
        group.add(pole, cloth);
      }
      loaded(group);
    }
  },
}));

import { hasAnimatedRig, loadRiggedProp } from './propRig';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
const warnings = () => vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('loadRiggedProp, when there is no rig to load', () => {
  it('for an asset the lab has not charted: resolves null and, in development, says which asset and why — once', async () => {
    const warn = warnings();
    expect(await loadRiggedProp('zz-uncharted', 3.2)).toBeNull();
    expect(warn.mock.calls).toEqual([['[propRig] "zz-uncharted" will not be drawn: the rig lab charted no parts for it (/assets/rigs/part_roles.json)']]);
    // the same asset at the same height is one cached load: asked again, it is not reported again
    expect(await loadRiggedProp('zz-uncharted', 3.2)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('for a charted asset whose MTL, or whose OBJ, does not load: the same, naming the file', async () => {
    const warn = warnings();
    NEXT.files = 'no-mtl';
    expect(await loadRiggedProp('zz-charted-no-mtl', 2)).toBeNull();
    NEXT.files = 'no-obj';
    expect(await loadRiggedProp('zz-charted-no-obj', 2)).toBeNull();
    expect(warn.mock.calls).toEqual([
      ['[propRig] "zz-charted-no-mtl" will not be drawn: its OBJ did not load (/assets/props/objrig/zz-charted-no-mtl.obj)'],
      ['[propRig] "zz-charted-no-obj" will not be drawn: its OBJ did not load (/assets/props/objrig/zz-charted-no-obj.obj)'],
    ]);
  });

  it('for a charted asset whose OBJ holds no mesh: the same', async () => {
    NEXT.files = 'empty';
    const warn = warnings();
    expect(await loadRiggedProp('zz-charted-empty', 2)).toBeNull();
    expect(warn.mock.calls).toEqual([['[propRig] "zz-charted-empty" will not be drawn: its OBJ holds no mesh']]);
  });

  it('keeps quiet in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    NEXT.files = 'no-mtl';
    const warn = warnings();
    expect(await loadRiggedProp('zz-uncharted-in-production', 3.2)).toBeNull();
    expect(await loadRiggedProp('zz-charted-no-mtl-in-production', 2)).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('loadRiggedProp, when there is one', () => {
  it('hands back the model stood upright at the height asked for, each charted part a group pivoted at its own middle, and says nothing', async () => {
    NEXT.files = 'flag';
    const warn = warnings();
    const rig = (await loadRiggedProp('zz-charted-flag', 3))!;
    // the cloth is the charted part; whatever the chart does not name is the body
    expect(Object.keys(rig.parts).sort()).toEqual(['body', 'flag']);
    rig.group.updateMatrixWorld(true);
    const whole = new THREE.Box3().setFromObject(rig.group);
    const flag = new THREE.Box3().setFromObject(rig.parts.flag);
    // six units tall as exported, three metres as asked, standing on the ground
    expect(whole.min.y).toBeCloseTo(0, 9);
    expect(whole.max.y).toBeCloseTo(3, 9);
    // upright: the cloth, furthest down -Y in the export, is the top half metre
    expect(flag.min.y).toBeCloseTo(2.5, 9);
    expect(flag.max.y).toBeCloseTo(3, 9);
    // pivoted: the part's group sits at the middle of its own geometry, which is centred on it
    expect(rig.parts.flag.position.toArray()).toEqual([1, -5.5, 0]);
    const mesh = rig.parts.flag.children[0] as THREE.Mesh;
    mesh.geometry.computeBoundingBox();
    const middle = mesh.geometry.boundingBox!.getCenter(new THREE.Vector3());
    expect(middle.length()).toBeCloseTo(0, 9);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('hasAnimatedRig', () => {
  it('is the chart naming a moving part — it says nothing about whether the OBJ is there to be loaded', () => {
    expect(hasAnimatedRig('zz-charted-no-mtl')).toBe(true);
    expect(hasAnimatedRig('zz-uncharted')).toBe(false);
    expect(hasAnimatedRig(undefined)).toBe(false);
  });
});
