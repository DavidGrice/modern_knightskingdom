'use client';
// CLN-28 · the viewmodel's procedural props, moved verbatim out of Viewmodel.tsx: the tool meshes no mold
// exists for (or that stand in while a real mold loads) and the three shield poses.
import RealShield from '../../character/RealShield';

export function Axe() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.4, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.33, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.03]} />
        <meshStandardMaterial color="#c2c6ce" metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
  );
}

// Procedural builder's mallet — no dedicated hammer mold exists in the
// extraction, same "procedural where the original has no equivalent" rule
// as the pickaxe/rod (Wave 34: the axe now has a real mold — weaponParts).
export function Hammer() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.38, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 8]} />
        <meshStandardMaterial color="#8a6234" roughness={0.85} />
      </mesh>
    </group>
  );
}

export function Pickaxe() {
  return (
    <group>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.42, 8]} />
        <meshStandardMaterial color="#6b4a2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.045, 0.3, 6]} />
        <meshStandardMaterial color="#8a8a90" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Rod() {
  return (
    <group rotation-x={-0.35}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.012, 0.02, 0.75, 6]} />
        <meshStandardMaterial color="#7a5a34" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.66, -0.02]}>
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
    </group>
  );
}

export function Crossbow() {
  return (
    <group rotation-x={-1.35}>
      {/* stock */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.05, 0.42, 0.06]} />
        <meshStandardMaterial color="#5d3d20" roughness={0.85} />
      </mesh>
      {/* bow arms */}
      <mesh position={[0, 0.34, 0]} rotation-z={Math.PI / 2}>
        <boxGeometry args={[0.03, 0.4, 0.03]} />
        <meshStandardMaterial color="#3a3a40" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* string */}
      <mesh position={[-0.1, 0.28, 0]} rotation-z={0.45}>
        <cylinderGeometry args={[0.006, 0.006, 0.24, 4]} />
        <meshStandardMaterial color="#d8d0b8" />
      </mesh>
      <mesh position={[0.1, 0.28, 0]} rotation-z={-0.45}>
        <cylinderGeometry args={[0.006, 0.006, 0.24, 4]} />
        <meshStandardMaterial color="#d8d0b8" />
      </mesh>
      {/* loaded bolt */}
      <mesh position={[0, 0.3, 0.01]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 5]} />
        <meshStandardMaterial color="#8a6234" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Sword() {
  return (
    <group>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.02, 0.024, 0.14, 8]} />
        <meshStandardMaterial color="#3a3a40" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.165, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <meshStandardMaterial color="#c8a43c" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.05, 0.48, 0.016]} />
        <meshStandardMaterial color="#c9ccd4" metalness={0.75} roughness={0.25} />
      </mesh>
    </group>
  );
}

function ShieldFace() {
  return (
    <>
      <mesh>
        <boxGeometry args={[0.34, 0.44, 0.04]} />
        <meshStandardMaterial color="#9aa0aa" metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position-z={0.015}>
        <boxGeometry args={[0.26, 0.34, 0.02]} />
        <meshStandardMaterial color="#b03a2e" roughness={0.7} />
      </mesh>
      <mesh position-z={0.035}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#c8a43c" metalness={0.7} roughness={0.3} />
      </mesh>
    </>
  );
}

export function BlockShield() {
  return (
    // +Math.PI from the third-person ArmShield's outward-facing angle: the
    // wielder's own eyes see the INSIDE of a raised shield (the arm strap/
    // hook), not the painted lion face an enemy in front of them would see.
    <group rotation={[0.1, 0.5 + Math.PI, 0]}>
      <RealShield fallback={<ShieldFace />} />
    </group>
  );
}

/** A crafted shield used to only ever appear while actively blocking — owning
 *  one did nothing to the view otherwise. Carried at rest on the off-hand
 *  arm instead, angled down and in rather than raised flat to the camera, so
 *  it reads as "carried" and not "about to block." */
export function CarriedShield() {
  return (
    <group position={[0, -0.1, 0.05]} rotation={[0.55, 2.35, 0.35]} scale={0.7}>
      <RealShield fallback={<ShieldFace />} />
    </group>
  );
}
