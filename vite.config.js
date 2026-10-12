import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Writes a gzipped copy of every model (dist/models/x.glb.gz) for
// loadModel() in src/components/threeutil.js to fetch instead of the .glb.
function gzipModels() {
  let outDir;
  return {
    name: 'gzip-models',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    closeBundle() {
      const dir = path.join(outDir, 'models');
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.glb')) continue;
        const src = fs.readFileSync(path.join(dir, f));
        fs.writeFileSync(path.join(dir, `${f}.gz`), zlib.gzipSync(src, { level: 9 }));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), gzipModels()],
  server: { port: 5173 },
  // Hashed bundles get their own folder so public/_headers can cache them
  // forever without touching /assets, which holds the unhashed photos.
  build: { assetsDir: '_app' },
});
