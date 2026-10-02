'use client';
// CLN-28 · the first-person longbow, moved verbatim out of Viewmodel.tsx.
import RealWeapon from '../../character/RealWeapon';

// H29/H33 · A REAL longbow. The rig lab found the mold on John of Mayne
// (`minifigjohnmayne01` → role `bow`), together with the `arrow` he carries,
// so the draw nocks an actual arrow instead of a hand-built stand-in.
//
// The bowstring is still procedural, and honestly so: it is a LEGO mold and
// there is no string in the plastic. It is drawn between the two limb tips
// and pulled back with the draw, which is what sells the motion.
export function Longbow({ draw }: { draw: number }) {
  const pull = 0.02 + draw * 0.26;      // how far the nock travels toward you
  const limb = 0.42;                    // half the bow's height, for the string
  return (
    <group>
      {/* K56 · the bow and the arrow were BOTH inside one rotated group, so
          the arrow inherited the bow's cross-body turn and ended up aimed
          back at the player while the bow's belly faced outward — the two
          read as swapped. They are siblings now: the bow keeps its
          cross-body presentation, and the arrow is aimed downrange in the
          MOUNT's own frame, independent of however the bow is turned (see
          the arrow's own group below for which axis "downrange" ended up
          being, re-measured 2026-07-29). */}
      <group rotation={[0.1, -Math.PI / 2, 0]}>
      <RealWeapon
        id="bow"
        fallback={(
          <mesh rotation-z={0.5}>
            <cylinderGeometry args={[0.014, 0.02, 0.34, 6]} />
            <meshStandardMaterial color="#6b4a2a" roughness={0.85} />
          </mesh>
        )}
      />
      {/* string: two segments meeting at the nock, so it forms a real V as
          it is drawn rather than sliding about as one straight bar */}
      {[1, -1].map((side) => {
        const dx = -pull;
        const dy = side * limb;
        const len = Math.hypot(dx, dy);
        return (
          <mesh
            key={side}
            position={[dx / 2, dy / 2, 0]}
            rotation-z={Math.atan2(dy, dx) - Math.PI / 2}
          >
            <cylinderGeometry args={[0.004, 0.004, len, 4]} />
            <meshStandardMaterial color="#e8ddc0" />
          </mesh>
        );
      })}
      </group>
      {/* the nocked arrow: pointing DOWNRANGE (+X, this mount's own forward
          once rotated), riding back toward the archer along -X as the draw
          deepens. Re-measured 2026-07-29: the arrow's own rest orientation
          (see loadWeapon('arrow')) is +Y like every other real mold, but a
          quarter-turn onto -Z (what K56 shipped) points it along the
          camera's OWN forward axis — which looks right on paper but is
          exactly wrong on screen: pointing straight into the depth the
          camera is already looking down foreshortens it to a barely-visible
          sliver, which is what "lies vertically alongside the bow rather
          than downrange" actually looked like. A quarter-turn onto ±X
          instead keeps the shaft ACROSS the view, visibly running from the
          string out to the reticle the way a nocked arrow actually reads. */}
      <group position={[-pull, 0, 0]} rotation-z={-Math.PI / 2}>
        <RealWeapon id="arrow" scale={0.85} fallback={null} />
      </group>
    </group>
  );
}
