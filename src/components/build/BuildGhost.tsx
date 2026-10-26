'use client';
// CLN-27 · what the build view draws over the ground, out of BuildController.tsx: the single-piece ghost (footprint,
// the rising box and its wireframe, the facing arrow and tick, the freeform ring, the wall-connect seam, the stack
// marker), the run being drawn, the demolish marquee and the pieces it would take, the dig patch, and a blueprint's
// pieces. Every value it draws from is worked out by BuildController and handed in; it decides nothing itself.
import * as THREE from 'three';
import { BUILDABLE_BY_ID } from '@/game/data/buildables';
import { WATER_BANK } from '@/game/waterworks';
import type { GameState } from '@/game/store/gameStore';
import type { PlacedBuilding } from '@/game/types';

export interface BuildGhostProps {
  activeType: string | null;
  def: (typeof BUILDABLE_BY_ID)[string] | null;
  ghost: { x: number; z: number } | null;
  rowCells: { x: number; z: number }[];
  gyaw: number;
  gy: number;
  gsx: number;
  gsz: number;
  gh: number;
  valid: boolean;
  useScale: number;
  moving: GameState['movingBuilding'];
  placeFrac: number;
  ghostEdges: THREE.EdgesGeometry;
  isCorner: boolean;
  freeform: boolean;
  linkedTo: PlacedBuilding | null;
  rowPreview: { x: number; z: number; y: number; ok: boolean }[];
  marquee: GameState['demolishRect'];
  marqueeHits: PlacedBuilding[];
  waterRect: GameState['digRect'];
  waterEval: ReturnType<GameState['digPreview']>;
  blueprintEval: ReturnType<GameState['evalBlueprintPlacement']> | null;
  blueprintAffordable: boolean;
}

export default function BuildGhost({
  activeType, def, ghost, rowCells, gyaw, gy, gsx, gsz, gh, valid, useScale, moving, placeFrac, ghostEdges, isCorner,
  freeform, linkedTo, rowPreview, marquee, marqueeHits, waterRect, waterEval, blueprintEval, blueprintAffordable,
}: BuildGhostProps) {
  return (
    <>
      {/* single-piece placement ghost — rotation-y matches the real piece's
          own rotation-y (Buildings.tsx/PropModel.tsx), applied to the
          model's true unswapped footprint, so a rotated ghost actually
          turns instead of only ever showing gsx/gsz swapped on a fixed
          axis-aligned box. Hidden while a run is being drawn: the run's own
          per-cell ghosts below already include the anchor cell. */}
      {activeType && def && ghost && rowCells.length === 0 && (
        <group position={[ghost.x, 0, ghost.z]}>
          <group rotation-y={gyaw}>
            {/* footprint — deliberately OUTSIDE the scaled group below and
                always drawn at the catalogue's real 1x size: this plane is
                what evalPlacement/collisionBoxesFor actually test, so it has
                to stay honest about what you can walk through/build against
                regardless of how big or small the visual next to it looks
                (see PlacedBuilding.scale's own comment). */}
            <mesh rotation-x={-Math.PI / 2} position-y={gy + 0.07}>
              <planeGeometry args={[gsx, gsz]} />
              <meshBasicMaterial color={valid ? '#42d95e' : '#e04434'} transparent opacity={0.55} depthWrite={false} />
            </mesh>
            {/* Wave 51 (C6) · the scaled VISUAL — box + wireframe, the two
                things a freeform resize actually changes what you SEE.
                Positioned at the piece's own base elevation (gy) with the
                resize applied as this group's OWN scale, so it grows/shrinks
                from that base exactly the way a real scaled PropModel grows
                from its own grounded local origin (PropModel.tsx) — never up
                off the ground or down into it. */}
            <group position-y={gy} scale={useScale}>
              {/* while hold-to-place is in progress, the box itself rises from
                  the ground toward full height — the footprint plane above
                  stays full-size the whole time so the landing spot is always
                  clear, only the "it's coming into being" cue animates */}
              <mesh position-y={(gh * (!moving && placeFrac > 0 ? 0.12 + 0.88 * placeFrac : 1)) / 2}>
                <boxGeometry args={[gsx, gh * (!moving && placeFrac > 0 ? 0.12 + 0.88 * placeFrac : 1), gsz]} />
                <meshBasicMaterial color={valid ? '#42d95e' : '#e04434'} transparent opacity={0.42 + 0.28 * placeFrac} depthWrite={false} />
              </mesh>
              {/* crisp wireframe of the FULL final volume — the translucent box
                  above animates its height while a hold is in progress, so on
                  its own it never shows the finished silhouette. Drawn at full
                  size regardless, so you always see exactly what you're
                  committing to. */}
              <lineSegments position-y={gh / 2} geometry={ghostEdges}>
                <lineBasicMaterial color={valid ? '#d8ffe2' : '#ffd8d2'} transparent opacity={0.9} depthTest={false} />
              </lineSegments>
            </group>
            {/* Facing arrow: which way the piece actually points, so rotating
                with R is no longer guesswork.
                It sits on local **−Z**, not +Z. Every model is normalised by
                PropModel with `rotation.x = Math.PI` to stand it upright,
                and that flip MIRRORS Z — so a piece whose front faces +Z in
                the source file renders facing −Z in the world. The arrow used
                to be drawn at +Z and therefore pointed at the back of every
                wall, a consistent 180° disagreement. */}
            {!isCorner && (
              <mesh position={[0, gy + 0.12, -(gsz / 2 + 1.1)]} rotation-x={-Math.PI / 2}>
                <coneGeometry args={[0.55, 1.5, 4]} />
                <meshBasicMaterial color={valid ? '#eaffc9' : '#ffc9c9'} transparent opacity={0.95} depthTest={false} />
              </mesh>
            )}
            {/* a matching tick ON the piece's own front face, so the facing
                still reads when the arrow is off-screen or behind geometry */}
            {!isCorner && (
            <mesh position={[0, gy + gh / 2, -(gsz / 2 + 0.02)]}>
              <planeGeometry args={[Math.min(gsx * 0.5, 1.2), 0.14]} />
              <meshBasicMaterial color={valid ? '#eaffc9' : '#ffc9c9'} transparent opacity={0.95} depthTest={false} side={THREE.DoubleSide} />
            </mesh>
            )}
          </group>
          {/* Wave 9 · freeform marker: a piece off the lattice looks exactly
              like one on it from above, so the mode says so on the ghost
              itself rather than only on the rail. */}
          {freeform && (
            <mesh rotation-x={-Math.PI / 2} position-y={gy + 0.1}>
              <ringGeometry args={[Math.max(gsx, gsz) / 2 + 0.25, Math.max(gsx, gsz) / 2 + 0.45, 24]} />
              <meshBasicMaterial color="#7fd4ff" transparent opacity={0.85} depthTest={false} />
            </mesh>
          )}
          {/* wall-connect joint: a gold seam drawn ON the shared edge, so
              "this piece is joined to that one" is something you can see
              before you commit rather than something you infer afterwards.
              Outside the rotated group — the seam is a world-space mark
              between two centres, not a feature of the piece. */}
          {linkedTo && (
            <mesh
              position={[(linkedTo.x - ghost.x) / 2, gy + 0.14, (linkedTo.z - ghost.z) / 2]}
              rotation-x={-Math.PI / 2}
            >
              <planeGeometry args={[0.7, 0.7]} />
              <meshBasicMaterial color="#e8c141" transparent opacity={0.95} depthTest={false} />
            </mesh>
          )}
          {/* stack elevation marker */}
          {gy > 0.05 && (
            <mesh position-y={gy / 2}>
              <boxGeometry args={[0.06, gy, 0.06]} />
              <meshBasicMaterial color="#e8c141" transparent opacity={0.8} depthWrite={false} />
            </mesh>
          )}
        </group>
      )}
      {/* Wave 9 · the run being drawn. One footprint + wireframe per segment,
          each answering for itself, so a run that outgrows the materials or
          walks into a tree shows exactly where it will stop BEFORE the button
          comes up. */}
      {activeType && def && rowPreview.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation-y={gyaw}>
          <mesh rotation-x={-Math.PI / 2} position-y={p.y + 0.07}>
            <planeGeometry args={[gsx, gsz]} />
            <meshBasicMaterial color={p.ok ? '#42d95e' : '#e04434'} transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <lineSegments position-y={p.y + gh / 2} geometry={ghostEdges}>
            <lineBasicMaterial color={p.ok ? '#d8ffe2' : '#ffd8d2'} transparent opacity={0.85} depthTest={false} />
          </lineSegments>
        </group>
      ))}
      {/* Wave 9 · the demolish marquee: the patch itself, plus a red cage
          around every piece it would take. The cage is the real feedback —
          a rectangle on the ground says nothing about the wall whose far end
          happens to poke into it. */}
      {marquee && (
        <group>
          <mesh
            position={[(marquee.minX + marquee.maxX) / 2, 0.05, (marquee.minZ + marquee.maxZ) / 2]}
            rotation-x={-Math.PI / 2}
          >
            <planeGeometry args={[marquee.maxX - marquee.minX, marquee.maxZ - marquee.minZ]} />
            <meshBasicMaterial color="#e04434" transparent opacity={0.22} depthWrite={false} />
          </mesh>
          {marqueeHits.map((b) => {
            const bdef = BUILDABLE_BY_ID[b.type];
            if (!bdef) return null;
            return (
              <mesh
                key={b.id}
                position={[b.x, (b.y ?? 0) + bdef.size[1] / 2, b.z]}
                rotation-y={b.yaw ?? (b.rot * Math.PI) / 2}
              >
                <boxGeometry args={[bdef.size[0], bdef.size[1], bdef.size[2]]} />
                <meshBasicMaterial color="#ff5a44" transparent opacity={0.34} depthWrite={false} />
              </mesh>
            );
          })}
        </group>
      )}
      {/* Wave 12 · the dig patch: the bank it would throw up (the outer, sandy
          rectangle) and the water itself inside it, so what you are dragging
          out is the shape that will actually be there — and red the moment the
          patch is refused, with the rail carrying the reason. A `fill` patch
          reads sandy throughout: it is ground coming back, not water. */}
      {waterRect && (
        <group position={[(waterRect.minX + waterRect.maxX) / 2, 0, (waterRect.minZ + waterRect.maxZ) / 2]}>
          <mesh rotation-x={-Math.PI / 2} position-y={0.05}>
            <planeGeometry args={[
              waterRect.maxX - waterRect.minX + WATER_BANK * 2,
              waterRect.maxZ - waterRect.minZ + WATER_BANK * 2,
            ]} />
            <meshBasicMaterial
              color={waterEval.problem ? '#e04434' : '#c9b878'}
              transparent opacity={0.42} depthWrite={false}
            />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.09}>
            <planeGeometry args={[waterRect.maxX - waterRect.minX, waterRect.maxZ - waterRect.minZ]} />
            <meshBasicMaterial
              color={waterEval.problem ? '#8a2a20' : waterEval.mode === 'fill' ? '#a08a50' : '#3fa8d8'}
              transparent opacity={0.6} depthWrite={false}
            />
          </mesh>
        </group>
      )}
      {/* blueprint ghost — one box+footprint per piece, each individually
          colored so an out-of-region or unlocked-elsewhere piece reads as
          red without failing the whole stamp silently */}
      {blueprintEval && blueprintEval.pieces.map((p, i) => {
        const pdef = BUILDABLE_BY_ID[p.type];
        const pyaw = (p.rot * Math.PI) / 2;
        const psx = pdef?.size[0] ?? 1;
        const psz = pdef?.size[2] ?? 1;
        const ph = pdef?.size[1] ?? 1;
        const pieceOk = p.valid && blueprintAffordable;
        const riseFrac = placeFrac > 0 ? 0.12 + 0.88 * placeFrac : 1;
        return (
          <group key={i} position={[p.x, 0, p.z]}>
            <group rotation-y={pyaw}>
              <mesh position-y={p.y + (ph * riseFrac) / 2}>
                <boxGeometry args={[psx, ph * riseFrac, psz]} />
                <meshBasicMaterial color={pieceOk ? '#42d95e' : '#e04434'} transparent opacity={0.42 + 0.28 * placeFrac} depthWrite={false} />
              </mesh>
              <mesh rotation-x={-Math.PI / 2} position-y={p.y + 0.07}>
                <planeGeometry args={[psx, psz]} />
                <meshBasicMaterial color={pieceOk ? '#42d95e' : '#e04434'} transparent opacity={0.55} depthWrite={false} />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}
