import * as THREE from 'three';

/** Parametric 3D heart surface points for particle convergence. */
export function generateHeartPoints3D(count: number, scale = 1): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const u = Math.random() * Math.PI;
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const layer = 0.85 + Math.sin(u) * 0.15;
    points.push(
      new THREE.Vector3(
        hx * 0.012 * scale * layer,
        hy * 0.012 * scale * layer,
        (Math.random() - 0.5) * 0.08 * scale
      )
    );
  }
  return points;
}

export function createHeartLatheGeometry(): THREE.LatheGeometry {
  const profile: THREE.Vector2[] = [];
  for (let t = 0; t <= Math.PI * 2; t += 0.08) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    profile.push(new THREE.Vector2(x * 0.012, y * 0.012));
  }
  return new THREE.LatheGeometry(profile, 64);
}

export function createHeartMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x5c1830,
    emissive: 0x1a0810,
    emissiveIntensity: 0.22,
    metalness: 0.12,
    roughness: 0.38,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    transparent: true,
    opacity: 0.96,
    side: THREE.DoubleSide
  });
}
