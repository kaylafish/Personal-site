// Helpers shared by the scripted 3D tours (coyneview, hydroview, quetzyview,
// launcherview, robotexplode).

// Onshape part and assembly names, normalised for matching: lowercase, no
// "Occurrence of", letters and digits only.
export const partKey = (n) => (n || '').toLowerCase().replace(/occurrence.?of.?/, '').replace(/[^a-z0-9]/g, '');

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
