import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { allPages, headFor } from './src/routemeta.js';

// Writes dist/projects/<slug>.html (and projects.html, fieldhockey.html, …):
// copies of index.html with that page's title, canonical and share card.
// Cloudflare Pages serves /projects/<slug> from projects/<slug>.html, so link
// previews get the right card; every other path still falls back to
// index.html.
function pageHtml() {
  let outDir;
  return {
    name: 'page-html',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const index = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      for (const page of allPages()) {
        if (page.path === '/') continue;
        const file = path.join(outDir, `${page.path.slice(1)}.html`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, headFor(index, page));
      }
    },
  };
}

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
  plugins: [react(), pageHtml(), gzipModels()],
  server: { port: 5173 },
  // Hashed bundles get their own folder so public/_headers can cache them
  // forever without touching /assets, which holds the unhashed photos.
  build: { assetsDir: '_app' },
});
