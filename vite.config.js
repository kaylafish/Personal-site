import fs from 'node:fs';
import path from 'node:path';
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

export default defineConfig({
  plugins: [react(), pageHtml()],
  server: { port: 5173 },
});
