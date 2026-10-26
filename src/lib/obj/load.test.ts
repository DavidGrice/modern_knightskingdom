import { beforeEach, describe, expect, it, vi } from 'vitest';

// both loaders stand in, recording every call; what each `load` does is set per test
const R = vi.hoisted(() => ({
  calls: [] as string[],
  mtl: { ok: true } as { ok: boolean },
  obj: { ok: true, throwInCallback: false } as { ok: boolean; throwInCallback: boolean },
  group: { isGroup: true, userData: {} as Record<string, unknown> },
}));
vi.mock('three/examples/jsm/loaders/MTLLoader.js', () => ({
  MTLLoader: class {
    setPath(p: string) { R.calls.push(`mtl.setPath ${p}`); return this; }
    setResourcePath(p: string) { R.calls.push(`mtl.setResourcePath ${p}`); return this; }
    load(f: string, onLoad: (m: unknown) => void, _p: unknown, onError: (e: unknown) => void) {
      R.calls.push(`mtl.load ${f}`);
      if (R.mtl.ok) onLoad({ preload: () => R.calls.push('materials.preload') }); else onError(new Error('no mtl'));
    }
    loadAsync(f: string) { R.calls.push(`mtl.loadAsync ${f}`); return R.mtl.ok ? Promise.resolve({ preload: () => R.calls.push('materials.preload') }) : Promise.reject(new Error('no mtl')); }
  },
}));
vi.mock('three/examples/jsm/loaders/OBJLoader.js', () => ({
  OBJLoader: class {
    setMaterials() { R.calls.push('obj.setMaterials'); return this; }
    setPath(p: string) { R.calls.push(`obj.setPath ${p}`); return this; }
    load(f: string, onLoad: (g: unknown) => void, _p: unknown, onError: (e: unknown) => void) {
      R.calls.push(`obj.load ${f}`);
      if (!R.obj.ok) { onError(new Error('no obj')); return; }
      // three's OBJLoader routes an error thrown by onLoad to onError
      try { onLoad(R.group); } catch (e) { onError(e); }
    }
    loadAsync(f: string) { R.calls.push(`obj.loadAsync ${f}`); return R.obj.ok ? Promise.resolve(R.group) : Promise.reject(new Error('no obj')); }
  },
}));
const { loadObjMtl, loadObjOptionalMtl } = await import('./load');

beforeEach(() => { R.calls = []; R.mtl.ok = true; R.obj.ok = true; R.group.userData = {}; });

describe('loadObjMtl', () => {
  it('makes the calls every copy of it made, in their order', async () => {
    const g = await loadObjMtl('/assets/x/', 'l123');
    expect(g).toBe(R.group);
    expect(R.calls).toEqual([
      'mtl.setPath /assets/x/', 'mtl.setResourcePath /assets/x/', 'mtl.load l123.mtl',
      'materials.preload', 'obj.setMaterials', 'obj.setPath /assets/x/', 'obj.load l123.obj',
    ]);
  });

  it("runs onLoaded inside the OBJ's own callback, and resolves with what it returns", async () => {
    const out = await loadObjMtl('/b/', 'f', (g) => { R.calls.push('onLoaded'); (g as unknown as typeof R.group).userData.donorId = 'f'; return 42; });
    expect(out).toBe(42);
    expect(R.calls.slice(-2)).toEqual(['obj.load f.obj', 'onLoaded']);
    expect(R.group.userData.donorId).toBe('f');
  });

  it('rejects on a missing MTL, a missing OBJ, or an onLoaded that throws (the loader routes that to its error path)', async () => {
    R.mtl.ok = false;
    await expect(loadObjMtl('/b/', 'f')).rejects.toThrow('no mtl');
    R.mtl.ok = true; R.obj.ok = false;
    await expect(loadObjMtl('/b/', 'f')).rejects.toThrow('no obj');
    R.obj.ok = true;
    await expect(loadObjMtl('/b/', 'f', () => { throw new Error('bad rig'); })).rejects.toThrow('bad rig');
  });
});

describe('loadObjOptionalMtl', () => {
  it("makes the workshop's calls: no resource path, materials only when the MTL came", async () => {
    expect(await loadObjOptionalMtl('/sets/', 's1')).toBe(R.group);
    expect(R.calls).toEqual(['mtl.setPath /sets/', 'mtl.loadAsync s1.mtl', 'materials.preload', 'obj.setMaterials', 'obj.setPath /sets/', 'obj.loadAsync s1.obj']);
  });

  it('loads the OBJ bare when the MTL is missing, and is null when the OBJ is', async () => {
    R.mtl.ok = false;
    expect(await loadObjOptionalMtl('/sets/', 's1')).toBe(R.group);
    expect(R.calls).not.toContain('obj.setMaterials');
    R.obj.ok = false;
    expect(await loadObjOptionalMtl('/sets/', 's1')).toBeNull();
  });
});
