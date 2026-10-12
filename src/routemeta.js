import { PROJECTS, getProject } from './data/projects.js';

// Tab title, description and share card for each page. Used twice: in the
// browser as you move between pages (App.jsx), and at build time to write a
// copy of index.html per page (vite.config.js), because LinkedIn, iMessage
// and Slack read the HTML without running any JavaScript.

export const SITE_URL = 'https://mikayla.space';
const NAME = 'Mikayla Fisher';
const HOME = {
  path: '/',
  title: `${NAME} — Aerospace Engineering`,
  description: 'Portfolio of Mikayla Fisher — B.S. Aerospace Engineering, Worcester Polytechnic Institute (class of 2030). Projects, research, and field hockey.',
  image: '/assets/og-card.jpg',
  imageAlt: 'Mikayla Fisher, aerospace engineering, mikayla.space',
};

const projectMeta = (p) => {
  const name = `${p.title} ${p.titleItalic}`;
  return {
    path: `/projects/${p.slug}`,
    title: `${name} · ${NAME}`,
    description: p.summary,
    image: `/assets/og/${p.slug}.jpg`,
    imageAlt: p.coverAlt || name,
  };
};

const PAGES = [
  HOME,
  { ...HOME, path: '/projects', title: `Projects · ${NAME}`, description: `Everything Mikayla Fisher has built: rockets, robots and physics experiments.` },
  { ...HOME, path: '/fieldhockey', title: `Field hockey · ${NAME}`, description: 'Mikayla Fisher, field hockey: film, background and recruiting details.' },
  { ...HOME, path: '/highlights', title: `Highlights · ${NAME}`, description: 'Field hockey highlight clips from Mikayla Fisher.' },
  ...PROJECTS.map(projectMeta),
];

// Every page, for the build step.
export const allPages = () => PAGES;

// The page a pathname belongs to; unknown paths get the home page's.
export function metaFor(pathname) {
  const p = pathname.replace(/(.)\/+$/, '$1').toLowerCase();
  const m = p.match(/^\/projects\/([^/]+)$/);
  if (m) {
    const project = getProject(decodeURIComponent(m[1]));
    return project ? projectMeta(project) : PAGES[1];
  }
  return PAGES.find((pg) => pg.path === p) || HOME;
}

// index.html's head with one page's tags swapped in.
export function headFor(html, page) {
  const url = SITE_URL + (page.path === '/' ? '/' : page.path);
  const img = SITE_URL + page.image;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const set = (re, val) => { html = html.replace(re, (_, a, b) => `${a}${esc(val)}${b}`); };
  set(/(<title>)[^<]*(<\/title>)/, page.title);
  set(/(<meta name="description" content=")[^"]*(")/, page.description);
  set(/(<meta property="og:title" content=")[^"]*(")/, page.title);
  set(/(<meta property="og:description" content=")[^"]*(")/, page.description);
  set(/(<meta property="og:url" content=")[^"]*(")/, url);
  set(/(<meta property="og:image" content=")[^"]*(")/, img);
  set(/(<meta property="og:image:alt" content=")[^"]*(")/, page.imageAlt);
  set(/(<meta name="twitter:title" content=")[^"]*(")/, page.title);
  set(/(<meta name="twitter:description" content=")[^"]*(")/, page.description);
  set(/(<meta name="twitter:image" content=")[^"]*(")/, img);
  set(/(<meta name="twitter:image:alt" content=")[^"]*(")/, page.imageAlt);
  set(/(<link rel="canonical" href=")[^"]*(")/, url);
  return html;
}
