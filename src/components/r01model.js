import * as THREE from 'three';

// Procedural stand-in for the R01 rocket, used by modelviewer.jsx for any
// chapter with model: { builtin: 'r01' }. Once the real CAD export exists,
// drop the GLB in /public/models and point the chapter at it instead; this
// file can then be deleted.
//
// Returns { model, parts }. Each part rests at userData.base and travels
// userData.off when fully exploded.

const R = 0.027; // body tube radius, metres

export function buildRocket() {
  const mat = (color, roughness, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const M = {
    body: mat(0x6a3fa0, 0.42, 0.05),
    white: mat(0xefedf3, 0.38),
    pcb: mat(0x2f7d4a, 0.55),
    chute: mat(0xe8742c, 0.85),
    casing: mat(0xd8d0bf, 0.6),
    dark: mat(0x3a3a40, 0.45, 0.3),
    wood: mat(0xc8a57a, 0.75),
  };
  const v = (x, y) => new THREE.Vector2(x, y);
  const mesh = (geo, material) => new THREE.Mesh(geo, material);
  const ring = (r0, r1, h, material, segments = 40) =>
    mesh(new THREE.LatheGeometry([v(r0, 0), v(r1, 0), v(r1, h), v(r0, h), v(r0, 0)], segments), material);
  const tube = (r, len, material) => ring(r - 0.0012, r, len, material, 48);

  // Each part rests at `y` and travels `off` when fully exploded.
  const parts = [];
  const model = new THREE.Group();
  const part = (y, off, build) => {
    const g = new THREE.Group();
    build(g);
    g.userData.base = new THREE.Vector3(0, y, 0);
    g.userData.off = new THREE.Vector3(...off);
    parts.push(g);
    model.add(g);
  };

  part(-0.01, [0, 0, 0], (g) => { // motor
    g.add(mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.124, 32).translate(0, 0.062, 0), M.casing));
    g.add(mesh(new THREE.CylinderGeometry(0.0147, 0.0147, 0.03, 32).translate(0, 0.07, 0), M.body));
    g.add(mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.008, 24).translate(0, -0.004, 0), M.dark));
  });
  part(0, [0, 0.13, 0], (g) => { // motor mount
    g.add(tube(0.0158, 0.15, M.casing));
    [0.01, 0.13].forEach((y) => {
      const m = ring(0.0158, R - 0.0013, 0.004, M.wood);
      m.position.y = y;
      g.add(m);
    });
  });
  part(0, [0, 0.24, 0], (g) => { // lower body, fins, launch lug
    g.add(tube(R, 0.34, M.body));
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(0.056, -0.012); s.lineTo(0.056, 0.036); s.lineTo(0, 0.1); s.lineTo(0, 0);
    const fin = new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false }).translate(0, 0, -0.0015);
    for (let i = 0; i < 3; i++) {
      const f = mesh(fin, M.body);
      f.position.set(R - 0.0005, 0.012, 0);
      const pivot = new THREE.Group();
      pivot.rotation.y = (i * Math.PI * 2) / 3;
      pivot.add(f);
      g.add(pivot);
    }
    const lug = tube(0.003, 0.05, M.white);
    lug.position.set(0, 0.16, R + 0.003);
    g.add(lug);
  });
  part(0.30, [0, 0.37, 0], (g) => { // avionics bay
    g.add(tube(R - 0.0013, 0.10, M.casing));
    g.add(mesh(new THREE.CylinderGeometry(R + 0.0002, R + 0.0002, 0.025, 48).translate(0, 0.0525, 0), M.white));
  });
  part(0.305, [0.1, 0.37, 0], (g) => { // flight computer
    g.add(mesh(new THREE.BoxGeometry(0.032, 0.085, 0.003).translate(0, 0.045, 0), M.pcb));
    g.add(mesh(new THREE.BoxGeometry(0.014, 0.014, 0.003).translate(0, 0.06, 0.003), M.dark));
    g.add(mesh(new THREE.BoxGeometry(0.024, 0.03, 0.01).translate(0, 0.022, -0.0065), M.dark));
  });
  part(0.44, [-0.1, 0.54, 0], (g) => { // parachute
    g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.075, 32).translate(0, 0.0375, 0), M.chute));
  });
  part(0.365, [0, 0.54, 0], (g) => { // upper body
    g.add(tube(R, 0.30, M.body));
  });
  part(0.625, [0, 0.74, 0], (g) => { // nose cone
    const pts = [v(0, 0), v(R - 0.0014, 0), v(R - 0.0014, 0.04)];
    const h = 0.17;
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      pts.push(v(Math.max(0.0001, R * Math.pow(1 - t * t, 0.62)), 0.04 + t * h));
    }
    g.add(mesh(new THREE.LatheGeometry(pts, 48), M.white));
  });

  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { model, parts };
}
