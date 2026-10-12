import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

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

// Loads a meshopt GLB from /public/models. Production builds also write a
// gzipped copy of each model next to it (<name>.glb.gz, see vite.config.js),
// because Cloudflare likely doesn't compress .glb files by itself. That copy is
// 2 to 3x smaller and is unpacked here with DecompressionStream; the plain
// .glb is the fallback (dev server, older browsers, anything unexpected).
// onProgress gets 0..1 when the server sends a length.
const GZ = !import.meta.env.DEV && typeof DecompressionStream !== 'undefined';

async function fetchBytes(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress?.(Math.min(1, got / total));
  }
  const out = new Uint8Array(got);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

const isGzip = (b) => b[0] === 0x1f && b[1] === 0x8b;
const isGlb = (b) => b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46; // "glTF"

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function loadModel(src, onProgress) {
  let bytes = null;
  if (GZ) {
    try {
      bytes = await fetchBytes(`${src}.gz`, onProgress);
      // A server that already decoded it hands back the plain GLB.
      if (isGzip(bytes)) bytes = await gunzip(bytes);
      if (!isGlb(bytes)) bytes = null; // e.g. the SPA's index.html for a missing file
    } catch (err) {
      bytes = null;
    }
  }
  if (!bytes) bytes = await fetchBytes(src, onProgress);
  const base = src.slice(0, src.lastIndexOf('/') + 1);
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer, base);
}
