import * as THREE from 'three';

// Helpers shared by the scripted 3D tours (coyneview, hydroview, quetzyview,
// launcherview, robotexplode).

// Onshape part and assembly names, normalised for matching: lowercase, no
// "Occurrence of", letters and digits only.
export const partKey = (n) => (n || '').toLowerCase().replace(/occurrence.?of.?/, '').replace(/[^a-z0-9]/g, '');

// Float copy of an attribute. meshopt stores positions and normals
// quantized, and merging or transforming them needs floats.
export function toFloat(attr) {
  const n = attr.itemSize, out = new Float32Array(attr.count * n);
  for (let i = 0; i < attr.count; i++) {
    out[i * n] = attr.getX(i);
    if (n > 1) out[i * n + 1] = attr.getY(i);
    if (n > 2) out[i * n + 2] = attr.getZ(i);
    if (n > 3) out[i * n + 3] = attr.getW(i);
  }
  return new THREE.BufferAttribute(out, n);
}

// Frees a loaded model's geometry, materials and textures.
export function disposeTree(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    [].concat(o.material).forEach((m) => {
      Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
  });
}
