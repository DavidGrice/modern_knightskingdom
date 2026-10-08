import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

// The component called as a plain function: a ref is a plain object, the frame loop is collected instead of
// subscribed, and what it draws through is a name — so what it returns is plain data to read.
const RT = vi.hoisted(() => ({ frames: [] as ((state: unknown, dt: number) => void)[] }));
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), useRef: (value: unknown) => ({ current: value }) }));
vi.mock('@react-three/fiber', () => ({ useFrame: (cb: (state: unknown, dt: number) => void) => { RT.frames.push(cb); } }));
vi.mock('../world/PropModel', () => ({ default: 'PropModel' }));
vi.mock('../world/TemplateWorld', () => ({ homeGroundY: (x: number, z: number) => 0.5 + 0.01 * x + 0.02 * z }));

import { Suspense } from 'react';
import RaiderLadder from './RaiderLadder';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { useGameStore } from '@/game/store/gameStore';
import { raiderLadderState } from '@/game/raiderLadder';

interface El { type: unknown; props: { ref: { current: THREE.Group | null }; visible?: boolean; fallback?: unknown; children: El; url?: string; height?: number } }
/** the component's root element, with a real group behind its ref, and its one frame callback */
function mount() {
  RT.frames.length = 0;
  const root = (RaiderLadder as unknown as () => El)();
  const group = new THREE.Group();
  group.visible = root.props.visible !== false;
  root.props.ref.current = group;
  return { root, group, frame: (dt = 1 / 60) => RT.frames[0]({}, dt) };
}

beforeEach(() => {
  useGameStore.setState({ paused: false });
  Object.assign(raiderLadderState, { active: false, x: 0, z: 0, hp: 22, wrecked: false, wreckT: 0, planted: false, baseX: 0, baseZ: 0, baseYaw: 0, climbers: [] });
});

describe("the raiders' siege ladder", () => {
  it('is drawn from the model of the Siege Stair the player can place, at its height', () => {
    const { root } = mount();
    const boundary = root.props.children;
    const drawn = boundary.props.children;
    const stair = BUILDABLE_BY_ID['oc6096-5'];
    expect(stair.name).toBe('Siege Stair');
    // through PropModel — never through RiggedProp, which draws nothing for an asset the rig lab has not charted
    expect(drawn.type).toBe('PropModel');
    expect({ url: drawn.props.url, height: drawn.props.height }).toEqual({ url: stair.model, height: stair.size[1] });
    expect({ url: drawn.props.url, height: drawn.props.height }).toEqual({ url: '/assets/props/buildings/oc6096-5.glb', height: 3.2 });
  });

  it('loads behind a boundary of its own, and starts out hidden', () => {
    const { root } = mount();
    expect(root.type).toBe('group');
    expect(root.props.visible).toBe(false);
    // a model still loading must never suspend the boundary the whole homestead simulates under
    expect(root.props.children.type).toBe(Suspense);
    expect(root.props.children.props.fallback).toBeNull();
  });

  it('stays hidden while there is no ladder in play, and stands where its record says once there is', () => {
    const { group, frame } = mount();
    frame();
    expect(group.visible).toBe(false);
    Object.assign(raiderLadderState, { active: true, planted: true, x: 3, z: 4, baseX: 3, baseZ: 4, baseYaw: 1.2 });
    frame();
    expect(group.visible).toBe(true);
    expect(group.position.toArray()).toEqual([3, 0.5 + 0.03 + 0.08, 4]);
    expect([group.rotation.x, group.rotation.y, group.rotation.z]).toEqual([0, 1.2, 0]);
    raiderLadderState.active = false;
    frame();
    expect(group.visible).toBe(false);
  });

  it('tips over when wrecked, lies six seconds and is gone', () => {
    const { group, frame } = mount();
    Object.assign(raiderLadderState, { active: true, planted: true, x: 3, z: 4, baseX: 3, baseZ: 4, baseYaw: 1.2, hp: 0, wrecked: true, wreckT: 0 });
    frame(2); // a long frame counts for a twentieth of a second, no more
    expect(raiderLadderState.wreckT).toBe(0.05);
    for (let i = 0; i < 8; i++) frame(0.05); // 0.45 s in all: half of the 0.9 s it takes to tip
    expect(raiderLadderState.wreckT).toBeCloseTo(0.45, 12);
    expect(group.visible).toBe(true);
    // half tipped: 0.3 of its 0.6 radians over, sunk half of its 0.15 m, still facing the wall
    expect([group.rotation.x, group.rotation.y]).toEqual([0, 1.2]);
    expect(group.rotation.z).toBeCloseTo(0.3, 12);
    expect(group.position.y).toBeCloseTo(0.5 + 0.03 + 0.08 - 0.075, 12);
    raiderLadderState.wreckT = 5.96875; // (thirty-seconds of a second: exact in binary)
    frame(0.03125); // six seconds exactly: still lying there, fully tipped
    expect([raiderLadderState.wreckT, group.visible, raiderLadderState.active]).toEqual([6, true, true]);
    expect(group.rotation.z).toBeCloseTo(0.6, 12);
    frame(0.03125);
    expect([group.visible, raiderLadderState.active]).toEqual([false, false]);
  });

  it('walks straight for its base and plants itself there; the pause menu holds it still', () => {
    const { group, frame } = mount();
    // five metres off, three east and four south of it
    Object.assign(raiderLadderState, { active: true, planted: false, x: 0, z: 0, baseX: 3, baseZ: 4, baseYaw: 0 });
    useGameStore.setState({ paused: true });
    frame(0.05);
    expect([raiderLadderState.x, raiderLadderState.z, group.visible]).toEqual([0, 0, false]);
    useGameStore.setState({ paused: false });
    frame(0.05); // 1.1 m/s for a twentieth of a second: 0.055 m, three fifths of it east and four fifths south
    expect(raiderLadderState.x).toBeCloseTo(0.033, 12);
    expect(raiderLadderState.z).toBeCloseTo(0.044, 12);
    expect(raiderLadderState.planted).toBe(false);
    expect([group.position.x, group.position.z]).toEqual([raiderLadderState.x, raiderLadderState.z]);
    // 0.31 m short of the base it still walks; within 0.3 m it is there
    Object.assign(raiderLadderState, { x: 3, z: 3.69 });
    frame(0.01);
    expect(raiderLadderState.z).toBeCloseTo(3.701, 12);
    expect(raiderLadderState.planted).toBe(false);
    frame(0.01);
    expect([raiderLadderState.x, raiderLadderState.z, raiderLadderState.planted]).toEqual([3, 4, true]);
    expect([group.position.x, group.position.z]).toEqual([3, 4]);
  });

  it('wrecked on its way in, it walks no further', () => {
    const { frame } = mount();
    Object.assign(raiderLadderState, { active: true, planted: false, x: 0, z: 0, baseX: 3, baseZ: 4, baseYaw: 0, hp: 0, wrecked: true, wreckT: 0 });
    frame(0.05);
    frame(0.05);
    expect([raiderLadderState.x, raiderLadderState.z, raiderLadderState.planted]).toEqual([0, 0, false]);
  });
});
