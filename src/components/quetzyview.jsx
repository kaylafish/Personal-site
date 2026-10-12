import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prefersReducedMotion } from './motion.jsx';
import { disposeTree, partKey as key } from './threeutil.js';

// Quetzy (FRC 4255, 2023) for the top of its project page (quetzypage.jsx),
// on a transparent canvas. Ported from Claude Design's quetzy-view.js; loaded
// lazily, so three.js stays out of the main bundle.
//
// The page drives it with props; it eases to each new state on its own:
//   focus   '' for the hero, or 'drive' | 'arm' | 'intake': the camera
//           frames that subsystem and the others fade back
//   yaw     camera angle around the robot
//   shift   moves the robot right by this share of the width
//   lift    moves it up by this share of the height (phones, above the text)
// On load the robot starts exploded and assembles itself. onProgress gets
// the download as 0–1; onLoaded fires once it's on screen.
//
// The GLB is the Onshape export (Z-up, palette texture), simplified to
// 0.3 mm per part. Subsystems are found by name.

const grpOf = (n) => {
  const k = key(n);
  return /drivetrain/.test(k) ? 'drive' : /0200arm|arm1$/.test(k) ? 'arm' : /intake/.test(k) ? 'intake' : 'misc';
};
const FOCI = ['', 'drive', 'arm', 'intake'];
const MAG = { drive: 0, arm: 0.55, intake: 0.7, misc: 0.3 };
const HARDWARE = /screw|bolt|nut|washer|rivet|shcs|bhcs|fhcs|nutstrip|bearing|spacer/;

// Float copy of an attribute (meshopt stores them quantized).
function toFloat(at, size) {
  const f = new Float32Array(at.count * size);
  for (let i = 0; i < at.count; i++) {
    f[i * size] = at.getX(i);
    f[i * size + 1] = at.getY(i);
    if (size === 3) f[i * size + 2] = at.getZ(i);
  }
  return new THREE.BufferAttribute(f, size);
}

// Merge-ready copy of a geometry in world space: indexed (32-bit), float
// position/normal/uv only.
function prep(geo, M) {
  const g = geo.clone();
  if (!g.index) {
    const n = g.attributes.position.count, ix = new Uint32Array(n);
    for (let i = 0; i < n; i++) ix[i] = i;
    g.setIndex(new THREE.BufferAttribute(ix, 1));
  }
  Object.keys(g.attributes).forEach((a) => { if (a !== 'position' && a !== 'normal' && a !== 'uv') g.deleteAttribute(a); });
  ['position', 'normal', 'uv'].forEach((a) => {
    const at = g.attributes[a];
    if (at && (at.normalized || at.isInterleavedBufferAttribute || !(at.array instanceof Float32Array))) g.setAttribute(a, toFloat(at, a === 'uv' ? 2 : 3));
  });
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  g.morphAttributes = {};
  g.clearGroups();
  g.applyMatrix4(M);
  if (!(g.index.array instanceof Uint32Array)) g.setIndex(new THREE.BufferAttribute(new Uint32Array(g.index.array), 1));
  return g;
}

class QuetzyStage {
  constructor(host, src, cb) {
    this.host = host;
    this.cb = cb;
    this.want = { focus: '', yaw: 0.8, shift: 0, lift: 0 };
    this.cur = { explode: 1, yaw: 0.8, shift: 0, lift: 0, f: FOCI.map((x, i) => (i ? 0 : 1)) };

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the palette's hues (boosted in the shader below). Lit
    // lower than Design's mockup, like the hydro and Magnus pages, so the
    // robot sits back on the dark page.
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.75;
    r.domElement.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.45;
    this.scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a2230, 0.3));
    const dl = new THREE.DirectionalLight(0xdfe9ff, 0.9);
    dl.position.set(2, 4, 3);
    this.scene.add(dl);
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    this.hold = new THREE.Group();
    this.scene.add(this.hold);

    this.ro = new ResizeObserver(() => this.size());
    this.ro.observe(host);
    this.size();

    // Only draw while the canvas is on screen and the tab is visible.
    this.visible = true;
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.wake(); });
    this.io.observe(host);
    this.onVis = () => this.wake();
    document.addEventListener('visibilitychange', this.onVis);

    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(src, (g) => {
      if (this.dead) { disposeTree(g.scene); return; }
      this.setup(g.scene);
      disposeTree(g.scene);
      if (prefersReducedMotion()) this.cur.explode = 0;
      this.sig = null;
      this.cb.onLoaded?.();
    }, (e) => {
      if (e.total) this.cb.onProgress?.(e.loaded / e.total);
    }, (err) => { console.warn('Quetzy model failed to load', err); this.cb.onError?.(); });
    this.raf = 0;
    this.last = 0;
    this.wake();
  }
  set(next) { Object.assign(this.want, next); }
  wake() {
    if (this.dead || this.raf || !this.visible || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }
  tick = (now) => {
    this.raf = 0;
    if (this.dead || !this.visible || document.hidden) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.frame(dt);
    this.raf = requestAnimationFrame(this.tick);
  };
  size() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.sig = null;
  }
  // Rotate the Z-up export upright, sit it on the floor, and merge it into
  // one mesh per subsystem and material, skipping fasteners and anything
  // under 6 mm, so hundreds of draw calls become a few dozen.
  setup(sc) {
    sc.rotation.x = -Math.PI / 2;
    sc.updateMatrixWorld(true);
    const b0 = new THREE.Box3().setFromObject(sc), c0 = b0.getCenter(new THREE.Vector3());
    sc.position.sub(new THREE.Vector3(c0.x, b0.min.y, c0.z));
    sc.updateMatrixWorld(true);

    // The subsystem assemblies, and the meshes that sit outside all of them.
    const groups = [];
    const find = (n) => { if (n !== sc && grpOf(n.name) !== 'misc') { groups.push(n); return; } n.children.forEach(find); };
    find(sc);
    const inGroup = (n) => { for (let q = n; q; q = q.parent) if (groups.includes(q)) return true; return false; };
    const extras = [];
    sc.traverse((n) => { if (n.isMesh && !inGroup(n)) extras.push(n); });
    const bbs = groups.map((gp) => new THREE.Box3().setFromObject(gp));
    const nearest = (p) => {
      let bi = 0, bd = Infinity;
      bbs.forEach((b, i) => { const d = b.distanceToPoint(p); if (d < bd) { bd = d; bi = i; } });
      return groups[bi];
    };
    this.parts = groups.map((gp) => ({ n: gp, grp: grpOf(gp.name) }));
    const byNode = new Map(this.parts.map((o) => [o.n, o]));
    // Fasteners, up to the subsystem itself: "drivetrain" contains "rivet".
    const isHw = (m) => {
      for (let n = m; n && !groups.includes(n); n = n.parent) if (HARDWARE.test(key(n.name))) return true;
      return false;
    };

    const buckets = new Map();
    const add = (o, mat, geo) => {
      const k = o.grp + '|' + mat.uuid;
      if (!buckets.has(k)) buckets.set(k, { o, mat, gs: [] });
      buckets.get(k).gs.push(geo);
    };
    const mw = new THREE.Matrix4(), im = new THREE.Matrix4(), p = new THREE.Vector3();
    const take = (m, o) => {
      if (!m.geometry || isHw(m)) return;
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const rad = m.geometry.boundingSphere.radius;
      if (m.isInstancedMesh) {
        for (let i = 0; i < m.count; i++) {
          m.getMatrixAt(i, im);
          mw.multiplyMatrices(m.matrixWorld, im);
          if (rad * mw.getMaxScaleOnAxis() < 0.006) continue;
          add(o || byNode.get(nearest(p.setFromMatrixPosition(mw))), m.material, prep(m.geometry, mw));
        }
      } else {
        if (rad * m.matrixWorld.getMaxScaleOnAxis() < 0.006) return;
        add(o || byNode.get(nearest(new THREE.Box3().setFromObject(m).getCenter(p))), m.material, prep(m.geometry, m.matrixWorld));
      }
    };
    this.parts.forEach((o) => o.n.traverse((m) => { if (m.isMesh) take(m, o); }));
    extras.forEach((m) => take(m, null));

    this.meshes = [];
    const mats = new Map();
    this.parts.forEach((o) => { o.g = new THREE.Group(); this.hold.add(o.g); });
    buckets.forEach(({ o, mat, gs }) => {
      let geo = null;
      try { geo = gs.length > 1 ? mergeGeometries(gs, false) : gs[0]; } catch (e) { /* fall back to separate meshes */ }
      const list = geo ? [geo] : gs;
      if (geo && gs.length > 1) gs.forEach((x) => x.dispose());
      const mt = mat.clone();
      mt.emissive = new THREE.Color(0);
      // The palette texture: crisp swatches, no mip blur between them.
      if (mt.map && !mats.has(mat.map)) {
        const t = mat.map.clone();
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.NearestFilter;
        t.magFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        t.needsUpdate = true;
        mats.set(mat.map, t);
      }
      if (mt.map) mt.map = mats.get(mat.map);
      mt.envMapIntensity = 0.4;
      mt.roughness = 0.75;
      mt.metalness = 0;
      // Saturation 1.6×, contrast 1.25×.
      mt.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 c = diffuseColor.rgb; float l = dot(c, vec3(.2126, .7152, .0722)); c = mix(vec3(l), c, 1.6); c = (c - .18) * 1.25 + .18; diffuseColor.rgb = clamp(c, 0., 1.); }`);
      };
      list.forEach((gg) => {
        const mm = new THREE.Mesh(gg, mt);
        mm.userData.o = o;
        o.g.add(mm);
        this.meshes.push(mm);
      });
    });

    const all = new THREE.Box3();
    this.parts.forEach((o) => { o.box = new THREE.Box3().setFromObject(o.g); all.union(o.box); });
    this.R = all.getSize(new THREE.Vector3()).length() / 2;
    const ctr = all.getCenter(new THREE.Vector3());
    this.parts.forEach((o) => {
      const d = o.box.getCenter(new THREE.Vector3()).sub(ctr);
      d.y = Math.abs(d.y) * 0.6 + 0.2 * this.R;
      if (d.length() < 1e-4) d.set(0, 1, 0);
      o.off = d.normalize().multiplyScalar(this.R * MAG[o.grp]);
    });
    this.frames = FOCI.map((f) => {
      const b = f ? this.parts.filter((o) => o.grp === f).reduce((a, o) => a.union(o.box), new THREE.Box3()) : all;
      return { c: b.getCenter(new THREE.Vector3()), s: b.getSize(new THREE.Vector3()) };
    });
    this.lastF = null;
  }
  frame(dt) {
    const { want: v, cur: c } = this;
    // Frame-rate independent eases: camera and focus, and the assembly.
    const k = 1 - Math.pow(0.02, dt), kx = 1 - Math.pow(0.3, dt);
    if (this.parts) {
      c.explode += (0 - c.explode) * kx;
      if (c.explode < 0.001) c.explode = 0;
    }
    c.yaw += (v.yaw - c.yaw) * k;
    c.shift += (v.shift - c.shift) * k;
    c.lift += (v.lift - c.lift) * k;
    c.f = c.f.map((x, i) => {
      const t = FOCI[i] === v.focus ? 1 : 0, y = x + (t - x) * k;
      return Math.abs(y - t) < 0.002 ? t : y;
    });
    if (this.parts) {
      this.parts.forEach((o) => o.g.position.copy(o.off).multiplyScalar(c.explode));
      // The focused subsystem stays solid and the rest fade back. Opacity
      // only changes in steps, so materials aren't touched every frame.
      const fk = c.f.map((x) => x.toFixed(2)).join();
      if (fk !== this.lastF) {
        this.lastF = fk;
        this.meshes.forEach((m) => {
          const { o } = m.userData;
          let op = 0;
          FOCI.forEach((f, i) => { if (c.f[i]) op += c.f[i] * (!f || o.grp === f ? 1 : 0.08); });
          op = Math.min(1, op);
          m.visible = op > 0.01;
          const tr = op < 0.99;
          if (m.material.transparent !== tr) { m.material.transparent = tr; m.material.needsUpdate = true; }
          m.material.opacity = op;
          m.material.depthWrite = !tr;
        });
      }
    }
    // Camera: a weighted blend of the focus framings.
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, asp = w / h;
    const th = Math.tan(15 * Math.PI / 180);
    const tg = new THREE.Vector3();
    let dist = 1;
    if (this.frames) {
      dist = 0;
      this.frames.forEach((fr, i) => {
        const wt = c.f[i];
        if (!wt) return;
        tg.addScaledVector(fr.c, wt);
        const hz = Math.max(fr.s.x, fr.s.z);
        dist += wt * Math.max(fr.s.y / 2 / th, hz / 2 / (th * asp)) * (i ? 1.9 : 2.7 + c.explode * 0.7);
      });
    }
    dist *= 1 + c.lift; // lifted above the text, the robot also steps back
    const pitch = 0.32;
    this.cam.position.set(
      Math.sin(c.yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      Math.cos(c.yaw) * Math.cos(pitch) * dist,
    ).add(tg);
    this.cam.lookAt(tg);
    this.cam.setViewOffset(w, h, -c.shift * w, h * (c.lift - 0.15 * c.f[0]), w, h);
    // Skip the draw when nothing moved.
    const sig = [c.explode, c.yaw, c.shift, c.lift, ...c.f, w, h].map((x) => x.toFixed(4)).join() + !!this.parts;
    if (sig === this.sig) return;
    this.sig = sig;
    this.renderer.render(this.scene, this.cam);
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    disposeTree(this.hold);
    this.envMap.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function QuetzyView({ src, focus, yaw, shift, lift = 0, onProgress, onLoaded, onError, className }) {
  const host = React.useRef(null);
  const stage = React.useRef(null);
  const cb = React.useRef({});
  cb.current.onProgress = onProgress;
  cb.current.onLoaded = onLoaded;
  cb.current.onError = onError;

  React.useEffect(() => {
    let s;
    // No WebGL (blocked, or an old device): the page still works without
    // the model.
    try { s = new QuetzyStage(host.current, src, cb.current); } catch (err) {
      console.warn('Quetzy model unavailable', err);
      cb.current.onError?.();
      return undefined;
    }
    stage.current = s;
    return () => { s.dispose(); stage.current = null; };
  }, [src]);

  React.useEffect(() => {
    stage.current?.set({ focus, yaw, shift, lift });
  }, [focus, yaw, shift, lift, src]);

  return <div ref={host} className={className} aria-hidden="true" />;
}

export default QuetzyView;
