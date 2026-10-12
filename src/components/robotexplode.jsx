import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { easeInOutCubic, prefersReducedMotion } from './motion.jsx';

// The REBUILT robot for the top of its project page (rebuiltpage.jsx), on a
// transparent canvas so the page shows through. Loaded lazily, so three.js
// stays out of the main bundle.
//
// The page drives it with props; it eases to each new state on its own:
//   explode   0 or 1: the subsystems come apart (directions in `subsystems`)
//   focus     a subsystem's node name: the camera moves to it and the rest
//             fade to 7%; '' for the whole robot
//   spin      turntable speed, radians per second
//   shift     moves the robot left by this share of the width
//   lift      moves the robot up by this share of the height
// On load every subsystem and part starts exploded, holds 0.5 s, then
// assembles over 1.8 s.
//
// The GLB is the Onshape export (Z-up, meshopt, GPU instancing). Its
// subsystems are the top assembly's children.

// Helper nodes in the export that aren't part of the robot.
const SKIP = /origin.?cube|robot.?battery|game.?piece/i;
// GLTFLoader turns spaces into underscores.
const norm = (name) => String(name).replace(/[\s_]+/g, ' ').trim();
const clamp01 = (v) => Math.min(1, Math.max(0, v));
// Parts move SPREAD × robot size per unit of a subsystem's explode distance.
const SPREAD = 0.32;

// Average brightness of the texture under a mesh (the export colours parts
// through one palette texture), or null if it can't be read.
function textureLum(mesh, cache) {
  const map = mesh.material.map;
  const uv = mesh.geometry?.attributes.uv;
  if (!map || !uv || !map.image) return null;
  let px = cache.img === map.image ? cache : null;
  if (!px) {
    try {
      const im = map.image;
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(im, 0, 0);
      px = Object.assign(cache, { img: im, w: c.width, h: c.height, d: ctx.getImageData(0, 0, c.width, c.height).data });
    } catch (e) { return null; }
  }
  const u = uv.getX(0), v = uv.getY(0);
  const ix = Math.min(px.w - 1, Math.max(0, Math.floor(u * px.w)));
  const iy = Math.min(px.h - 1, Math.max(0, Math.floor((map.flipY ? 1 - v : v) * px.h)));
  const o = (iy * px.w + ix) * 4;
  const c = mesh.material.color || { r: 1, g: 1, b: 1 };
  return (px.d[o] / 255 * c.r + px.d[o + 1] / 255 * c.g + px.d[o + 2] / 255 * c.b) / 3;
}

function disposeTree(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    [].concat(o.material).forEach((m) => {
      Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
  });
}

class RobotStage {
  constructor(host, { src, subsystems }) {
    this.host = host;
    this.plan = Object.fromEntries(subsystems.map((s) => [norm(s.node), s.explode]));
    this.want = { explode: 0, focus: '', spin: 0.1, shift: 0, lift: 0 };
    this.cur = { explode: 0, shift: 0, lift: 0, cam: null, tgt: null };
    this.ang = 0.7;
    // Seconds since the model appeared; drives the assemble-on-load.
    this.age = prefersReducedMotion() ? 99 : 0;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.domElement.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    const key = new THREE.DirectionalLight(0xdfe9ff, 1.6);
    key.position.set(3, 5, 4);
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0x9bb8ff, 0x0b111b, 0.6));
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

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
      if (this.dead) disposeTree(g.scene);
      else this.setup(g.scene);
    }, undefined, (err) => console.warn('REBUILT model failed to load', err));

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
  }

  setup(root) {
    this.root = root;
    this.scene.add(root);
    // The robot itself is the first assembly under the export's wrapper
    // nodes; hide the loose helper parts around it.
    let main = root;
    while (main.children.length === 1 && !main.isMesh) main = main.children[0];
    main.children.forEach((n) => { if (n.isMesh || !n.children.length) n.visible = false; });
    main.traverse((n) => { if (SKIP.test(n.name || '') && !/^assembly/i.test(n.name || '')) n.visible = false; });
    main.traverse((n) => { if (n.isInstancedMesh) n.computeBoundingBox(); });

    // Onshape exports Z-up. Stand it on the ground at the origin.
    root.rotation.x = -Math.PI / 2;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true);
    const size = box.getSize(new THREE.Vector3());
    root.position.sub(box.getCenter(new THREE.Vector3()));
    root.position.y += size.y / 2;
    root.updateMatrixWorld(true);

    let top = main.children.find((n) => /assembly/i.test(n.name || '')) || main;
    main.children.forEach((n) => { if (n !== top) n.visible = false; });
    while (top.children.length === 1) top = top.children[0];

    const texCache = {};
    this.subs = top.children.filter((n) => !SKIP.test(n.name || '') && n.children.length > 4).map((n) => {
      const b = new THREE.Box3().setFromObject(n);
      const bc = b.getCenter(new THREE.Vector3());
      // Each part's own direction out from its subsystem's middle, for the
      // assemble-on-load.
      const kids = n.children.map((k) => {
        const d = new THREE.Box3().setFromObject(k).getCenter(new THREE.Vector3()).sub(bc);
        if (d.length() < 1e-4) d.set(0, 1, 0);
        return { o: k, p0: k.position.clone(), d: d.normalize() };
      });
      const mats = [];
      n.traverse((m) => {
        if (!m.isMesh) return;
        m.material = m.material.clone();
        m.material.transparent = true;
        // Dark polycarbonate shows as tinted glass.
        const lum = textureLum(m, texCache);
        if (lum != null && lum < 0.08) {
          m.material.userData.base = 0.35;
          m.material.metalness = 0.2;
          m.material.roughness = 0.15;
        }
        mats.push(m.material);
      });
      return { n, name: norm(n.name), p0: n.position.clone(), size: b.getSize(new THREE.Vector3()).length(), kids, mats, op: 1 };
    });

    // Recentre on what's left visible.
    const b2 = new THREE.Box3().setFromObject(root, true);
    const c2 = b2.getCenter(new THREE.Vector3()), s2 = b2.getSize(new THREE.Vector3());
    root.position.x -= c2.x;
    root.position.z -= c2.z;
    root.position.y -= b2.min.y;
    root.updateMatrixWorld(true);
    this.R = Math.max(s2.x, s2.y, s2.z);

    // Explode directions: straight up or down, or horizontally out from the
    // middle with a slight rise.
    this.subs.forEach((s) => {
      const c = new THREE.Box3().setFromObject(s.n, true).getCenter(new THREE.Vector3());
      const plan = this.plan[s.name];
      s.dir = new THREE.Vector3(c.x, 0, c.z);
      if (s.dir.length() < 1e-3) s.dir.set(0, 0, 1);
      s.dir.normalize();
      s.mag = 1;
      if (!plan) { s.dir.y = 0.05; return; }
      const [way, dist] = plan;
      if (way === 'out') { s.dir.y = 0.2; s.dir.normalize(); } else s.dir.set(0, way === 'down' ? -1 : 1, 0);
      s.mag = dist / SPREAD;
    });

    // Anything that isn't in a subsystem fades out with the unfocused ones.
    const owned = new Set(this.subs.flatMap((s) => s.mats));
    this.loose = [];
    root.traverse((m) => {
      if (!m.isMesh || owned.has(m.material)) return;
      m.material = m.material.clone();
      m.material.transparent = true;
      this.loose.push(m.material);
    });
  }

  frame(dt) {
    if (!this.root) { this.renderer.render(this.scene, this.cam); return; }
    const { want, cur, R } = this;
    // Frame-rate independent ease toward each target.
    const k = 1 - Math.pow(0.02, dt);
    cur.explode += (want.explode - cur.explode) * k;
    if (want.explode === 0 && cur.explode < 0.002) cur.explode = 0;
    this.age += dt;
    const intro = 1 - easeInOutCubic(clamp01((this.age - 0.5) / 1.8));

    const f = want.focus ? this.subs.findIndex((s) => s.name === norm(want.focus)) : -1;
    this.subs.forEach((s, i) => {
      const on = f < 0 || f === i;
      s.n.position.copy(s.p0).addScaledVector(s.dir, Math.max(cur.explode, intro) * R * SPREAD * s.mag);
      if (intro > 0 || !s.settled) {
        s.kids.forEach((q) => q.o.position.copy(q.p0).addScaledVector(q.d, intro * s.size * 0.3));
        s.settled = intro === 0;
      }
      s.op += ((on ? 1 : 0.07) - s.op) * k;
      s.mats.forEach((m) => {
        const o = s.op * (m.userData.base || 1);
        m.opacity = o;
        m.depthWrite = o > 0.5;
      });
    });
    this.loose.forEach((m) => { m.opacity = f < 0 ? 1 : 0.05; });
    this.root.updateMatrixWorld(true);

    // Camera: orbit the focused subsystem, or the whole robot.
    let tgt, dist;
    if (f >= 0) {
      const b = new THREE.Box3().setFromObject(this.subs[f].n);
      tgt = b.getCenter(new THREE.Vector3());
      dist = b.getSize(new THREE.Vector3()).length() * 1.5;
    } else {
      tgt = new THREE.Vector3(0, R * 0.54, 0);
      dist = R * (2.9 + cur.explode * 0.7);
    }
    // Portrait screens pull back so the robot still fits across.
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    if (w < h) dist *= Math.pow(h / w, 0.75);
    this.ang += dt * (want.spin || 0.12);
    const elev = f >= 0 ? 0.45 : 0.26;
    const pos = new THREE.Vector3(Math.sin(this.ang) * dist + tgt.x, tgt.y + dist * elev, Math.cos(this.ang) * dist + tgt.z);
    if (!cur.cam) { cur.cam = pos.clone(); cur.tgt = tgt.clone(); }
    cur.cam.lerp(pos, k * 0.8);
    cur.tgt.lerp(tgt, k * 0.8);

    cur.shift += (want.shift - cur.shift) * k;
    cur.lift += (want.lift - cur.lift) * k;
    this.cam.setViewOffset(w, h, -cur.shift * w, cur.lift * h, w, h);
    this.cam.position.copy(cur.cam);
    this.cam.lookAt(cur.tgt);
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    if (this.root) disposeTree(this.root);
    this.envMap.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function RobotExplode({ src, subsystems, explode, focus, spin, shift, lift, className }) {
  const host = React.useRef(null);
  const stage = React.useRef(null);
  React.useEffect(() => {
    const s = new RobotStage(host.current, { src, subsystems });
    stage.current = s;
    return () => { s.dispose(); stage.current = null; };
  }, [src, subsystems]);
  React.useEffect(() => {
    stage.current?.set({ explode, focus, spin, shift, lift });
  }, [explode, focus, spin, shift, lift, src, subsystems]);
  return <div ref={host} className={className} aria-hidden="true" />;
}

export default RobotExplode;
