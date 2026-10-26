'use client';
// CLN-29 · the reduced rig's joints: their names, the order they are built and driven in, and which each hangs from.

export type RigJoint = 'head' | 'body' | 'hips' | 'leftarm' | 'rightarm' | 'leftleg' | 'rightleg';
export const JOINTS: RigJoint[] = ['head', 'body', 'hips', 'leftarm', 'rightarm', 'leftleg', 'rightleg'];

export const JOINT_PARENT: Record<RigJoint, RigJoint | null> = {
  hips: null, body: 'hips', head: 'body',
  leftarm: 'body', rightarm: 'body', leftleg: 'hips', rightleg: 'hips',
};
