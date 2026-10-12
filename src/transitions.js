// ============================================================================
// PAGE TRANSITIONS: home ↔ /projects ↔ a project page
// ----------------------------------------------------------------------------
// Claude Design's "2a" choreography. Everything that moves between pages
// (flying cards, the frosted sheet) lives in a fixed layer on <body>, outside
// React, so it survives the route change underneath it.
//
//   fly      home "See all projects" → /projects: every floating card flies
//            into its tile. Back sends them floating again.
//   sheet    card or tile → project page: the card lifts in glass, a frosted
//            sheet spreads from it, the card lands in the project's hero.
//            Back plays it in reverse.
//
// Pages mark what takes part:
//   data-pt-field="<slug>"   a card image in the home field
//   data-pt-tile="<slug>"    a tile image on /projects
//   data-pt-hero             the project page's hero, when it's an image
//   data-pt-title            the project page's title, where the card's
//                            caption lands when there's no hero to land in
//   data-pt-page             content that fades out as a page leaves
//   data-build (+ --b: n)    content that fades and rises in, n × 80 ms late
//
// Browsers without the View Transitions API (Firefox, for now) and visitors
// who prefer reduced motion get the plain instant change, as before.
// Browser Back / Forward between these pages plays the same reverse motion:
// the popstate listener below holds the router back until the lead-in has run.
// ============================================================================
import { PROJECTS, getProject } from './data/projects.js';

const D = 600;                               // base duration
const EASE = 'cubic-bezier(.2,.7,.2,1)';
const FLY_EASE = 'cubic-bezier(.5,0,.15,1)';
const STAGGER = 40;                          // ms between flying cards
const BUILD_MS = 640 + 3 * 80;               // longest data-build animation

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const canAnimate = () => typeof document !== 'undefined' && !!document.startViewTransition && !reduced();

const html = () => document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ---------------------------------------------------------------------------
// Router bridge. App.jsx registers navigate() and reports every committed
// location; the engine waits on those reports to know the new page is in.
// ---------------------------------------------------------------------------
let routerNavigate = null;
let pendingCommit = null;           // { resolve, onCommit }
let currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
const pathsByIdx = {};              // history idx → pathname, for "where does Back go?"

export function registerNavigate(fn) { routerNavigate = fn; }

// Called from a layout effect after each route commit, before paint.
export function locationCommitted(pathname) {
  currentPath = pathname;
  const idx = window.history.state?.idx;
  if (typeof idx === 'number') pathsByIdx[idx] = pathname;
  if (pendingCommit) {
    const { resolve, onCommit } = pendingCommit;
    pendingCommit = null;
    if (onCommit) onCommit();
    resolve();
  }
}

// Runs fn (which changes the route) and resolves once the new page is in the
// DOM. onCommit runs in the same layout effect, before the browser paints.
function routeChange(fn, onCommit) {
  return new Promise((resolve) => {
    pendingCommit = { resolve, onCommit };
    fn();
    // Safety net: never hang if the route didn't actually change.
    setTimeout(() => { if (pendingCommit?.resolve === resolve) locationCommitted(currentPath); }, 1500);
  });
}

// The path Back would land on, if the previous entry is one of ours.
export function previousPath() {
  const idx = window.history.state?.idx;
  return typeof idx === 'number' && idx > 0 ? pathsByIdx[idx - 1] ?? null : null;
}

// Notes the scroll position on the current history entry so Back can return
// to it (ScrollManager in App.jsx reads location.state.scrollY).
function rememberScroll() {
  const st = window.history.state || {};
  window.history.replaceState({ ...st, usr: { ...(st.usr || {}), scrollY: window.scrollY } }, '');
}

const isProjectPath = (p) => /^\/projects\/[^/]+\/?$/.test(p);
const slugOf = (p) => decodeURIComponent(p.replace(/\/+$/, '').split('/').pop());
const norm = (p) => p.replace(/(.)\/+$/, '$1');

// ---------------------------------------------------------------------------
// Overlay layer and geometry
// ---------------------------------------------------------------------------
let busy = false;
let layer = null;
let cleanups = [];

function getLayer() {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'pt-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

// On-screen box of an element, with any rotation from its ancestors' (or
// its own) transforms pulled out as an angle. getBoundingClientRect gives the
// axis-aligned box around the rotated element, whose centre is still the
// element's centre; offsetWidth/Height give the unrotated size.
function boxOf(el) {
  const r = el.getBoundingClientRect();
  const w = el.offsetWidth || r.width, h = el.offsetHeight || r.height;
  let rot = 0;
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const t = getComputedStyle(n).transform;
    if (t && t !== 'none') {
      const m = new DOMMatrix(t);
      rot += (Math.atan2(m.b, m.a) * 180) / Math.PI;
    }
  }
  return { x: r.left + r.width / 2 - w / 2, y: r.top + r.height / 2 - h / 2, w, h, rot };
}

const onScreen = (b) => b && b.y + b.h > 0 && b.y < window.innerHeight && b.x + b.w > 0 && b.x < window.innerWidth;

function place(el, b, extra = {}) {
  Object.assign(el.style, {
    left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`,
    transform: `translateY(${extra.dy || 0}px) rotate(${b.rot || 0}deg) scale(${extra.s ?? 1})`,
  });
  if (extra.rad != null) el.style.borderRadius = `${extra.rad}px`;
}

const trans = (props, ms, ease = EASE, delay = 0) =>
  props.map((p) => `${p} ${Math.round(ms)}ms ${ease} ${Math.round(delay)}ms`).join(',');

function hide(el) {
  if (!el) return;
  el.style.visibility = 'hidden';
  cleanups.push(() => { el.style.visibility = ''; });
}

// A flying copy of a card's image.
function flyer(project, box, rad) {
  const el = document.createElement('div');
  el.className = 'pt-fly';
  if (project?.coverFit === 'contain') el.classList.add('g-drawing');
  if (project?.cover) {
    const img = document.createElement('img');
    img.src = project.cover;
    img.alt = '';
    el.appendChild(img);
  }
  place(el, box, { rad });
  getLayer().appendChild(el);
  return el;
}

// The lifted glass card used by the sheet transition: image, title and a sheen.
function glassCard(project, box, rad) {
  const el = document.createElement('div');
  el.className = 'pt-card';
  el.innerHTML = '<img alt=""><div class="pt-card-fade"></div>'
    + '<div class="pt-card-text"><span></span><span></span></div><div class="pt-card-sheen"></div>';
  const img = el.querySelector('img');
  if (project.cover) img.src = project.cover; else img.remove();
  if (project.coverFit === 'contain') el.classList.add('g-drawing');
  const [sub, title] = el.querySelectorAll('.pt-card-text span');
  sub.textContent = project.kind || '';
  fillTitle(title, project);
  place(el, box, { rad });
  getLayer().appendChild(el);
  return el;
}

// "FRC <em>REBUILT</em>", as the pages set it.
function fillTitle(el, project) {
  el.textContent = `${project.title} `;
  if (project.titleItalic) {
    const em = document.createElement('em');
    em.textContent = project.titleItalic;
    el.appendChild(em);
  }
}

// The project's name on its own, for pages whose hero isn't there to land
// in (a 3D model still loading, a hero below the fold). It flies between the
// card's caption and the page's title.
function titleClone(project) {
  const el = document.createElement('div');
  el.className = 'pt-title';
  fillTitle(el, project);
  getLayer().appendChild(el);
  return el;
}

// Where a title clone sits to cover el, a text element: scaled to its font
// size and aligned the way its text is.
function titleSpot(clone, el) {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const s = parseFloat(cs.fontSize) / 32;
  const w = clone.offsetWidth * s;
  const h = clone.offsetHeight * s;
  const x = cs.textAlign === 'center' ? r.left + (r.width - w) / 2 : r.left;
  return { x, y: r.top + Math.max(0, (Math.min(r.height, parseFloat(cs.lineHeight) || r.height) - h) / 2), s };
}

function placeTitle(el, spot) {
  Object.assign(el.style, { left: `${spot.x}px`, top: `${spot.y}px`, transform: `scale(${spot.s})` });
}

// The page's hero, if it's there to land in right away: an image (not a
// model that has yet to load) with at least half of it on screen.
function landingHero() {
  const el = document.querySelector('[data-pt-hero]');
  if (!el) return null;
  const b = boxOf(el);
  const seen = Math.min(b.y + b.h, window.innerHeight) - Math.max(b.y, 0);
  return seen >= Math.min(b.h, window.innerHeight) * 0.5 ? b : null;
}

function sheetEl(box, rad) {
  const el = document.createElement('div');
  el.className = 'pt-sheet';
  el.innerHTML = '<div class="pt-sheet-sheen"></div>';
  place(el, box, { rad });
  el.style.opacity = '0';
  getLayer().appendChild(el);
  return el;
}

const viewport = () => ({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight, rot: 0 });

// Old page fades over 180 ms. The class comes off as the new page commits.
function leavePage() { html().classList.add('pt-leave'); }

function startBuild(cls = 'pt-build') {
  html().classList.remove('pt-leave');
  html().classList.add(cls);
  setTimeout(() => html().classList.remove(cls), BUILD_MS);
}

function begin() {
  busy = true;
  html().classList.add('pt-busy');
}

function finish() {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  if (layer) layer.replaceChildren();
  html().classList.remove('pt-busy', 'pt-leave', 'pt-hold');
  busy = false;
}

// Something went wrong mid-transition: put everything back.
function bail(err) {
  finish();
  if (err) console.error(err); // eslint-disable-line no-console
}

// ---------------------------------------------------------------------------
// 1. Home field ↔ /projects tiles
// ---------------------------------------------------------------------------
// change() performs the route change; it's either a router navigate or the
// held-back Back / Forward.
async function fly(forward, change) {
  begin();
  try {
    const from = forward ? '[data-pt-field]' : '[data-pt-tile]';
    const to = forward ? 'data-pt-tile' : 'data-pt-field';
    // Field order, newest first, which is also the order the field fills in.
    const order = [...PROJECTS].reverse().map((p) => p.slug);
    const items = [...document.querySelectorAll(from)]
      .map((el) => ({ el, slug: el.getAttribute(forward ? 'data-pt-field' : 'data-pt-tile') }))
      .filter((it) => getProject(it.slug))
      .sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));

    const radOf = (el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16;
    const clones = items.map((it) => {
      const b = boxOf(it.el);
      const c = flyer(getProject(it.slug), b, radOf(it.el));
      hide(it.el);
      return { ...it, c };
    });

    leavePage();
    if (!forward) html().classList.add('pt-hold'); // field holds still until the cards land
    await wait(forward ? 180 : D * 0.18);

    await routeChange(change, () => {
      startBuild(forward ? 'pt-build' : 'pt-build-fade');
      if (!forward) html().classList.add('pt-arrive');
      if (!forward && !window.history.state?.usr?.scrollY) {
        // Opened /projects directly: bring the field into view to land in.
        const more = document.getElementById('more');
        if (more) window.scrollTo({ top: more.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' });
      }
    });
    await frame();
    // Coming home, wait for the field's first drift frame so the cards are
    // measured where they'll actually be (more.jsx).
    const drifts = !forward && !window.matchMedia('(max-width: 799px)').matches;
    for (let n = 0; drifts && n < 8 && !document.querySelector('.g-field[data-live]'); n++) await frame();

    let last = 0;
    clones.forEach((it, i) => {
      const dest = document.querySelector(`[${to}="${CSS.escape(it.slug)}"]`);
      if (!dest) { it.c.style.transition = `opacity ${D * 0.3}ms ease`; it.c.style.opacity = '0'; return; }
      hide(dest);
      const b = boxOf(dest);
      const delay = i * STAGGER;
      it.c.style.transition = trans(['left', 'top', 'width', 'height', 'transform', 'border-radius'], D * 0.8, FLY_EASE, delay);
      place(it.c, b, { rad: radOf(dest) });
      last = Math.max(last, delay);
    });
    await wait(D * 0.8 + last + 30);
    finish();
    setTimeout(() => html().classList.remove('pt-arrive'), 500);
  } catch (err) { bail(err); }
}

// ---------------------------------------------------------------------------
// 2. Card / tile ↔ project page (glass sheet + hero)
// ---------------------------------------------------------------------------
async function sheetOpen(slug, originEl, change) {
  const project = getProject(slug);
  begin();
  try {
    const o = boxOf(originEl);
    const rad = parseFloat(getComputedStyle(originEl).borderTopLeftRadius) || 16;
    const card = glassCard(project, o, rad);
    const sheet = sheetEl(o, rad);
    hide(originEl);
    await frame();

    // Lift: scale 1.04, rise 10 px, straighten, gain glass.
    card.style.transition = trans(['transform', 'box-shadow', 'background'], D * 0.28);
    card.classList.add('is-glass');
    place(card, { ...o, rot: 0 }, { s: 1.04, dy: -10 });
    sheet.style.transition = trans(['opacity'], D * 0.18);
    sheet.style.opacity = '1';

    // Sheet: grows from the card to fill the viewport.
    setTimeout(() => {
      sheet.style.transition = trans(['left', 'top', 'width', 'height', 'border-radius', 'transform'], D * 0.32);
      place(sheet, viewport(), { rad: 0 });
    }, D * 0.15);
    setTimeout(leavePage, D * 0.2);

    // Swap.
    await wait(D * 0.42);
    await routeChange(change, () => startBuild());
    await frame();

    const h = landingHero();
    const titleEl = document.querySelector('[data-pt-title]');
    sheet.style.transition = trans(['opacity'], D * 0.45, 'ease');
    sheet.style.opacity = '0';

    if (h || !titleEl) {
      // Land: the card flies into the hero; the sheet clears.
      const to = h || { x: o.x, y: o.y, w: o.w, h: o.h, rot: 0 };
      card.style.transition = trans(['left', 'top', 'width', 'height', 'transform', 'border-radius'], D * 0.42);
      place(card, { ...to, rot: 0 }, { rad: 24 });

      // Settle: glass and opacity go to 0, revealing the real hero.
      await wait(D * 0.42);
      card.style.transition = trans(['opacity', 'box-shadow', 'background'], D * 0.22, 'ease');
      card.classList.remove('is-glass');
      card.style.opacity = '0';
      await wait(D * 0.24);
    } else {
      // No hero to land in yet: the glass clears, and only the card's
      // title flies on, into the page's title.
      const caption = card.querySelector('.pt-card-text span:last-child');
      const clone = titleClone(project);
      const r = caption.getBoundingClientRect();
      placeTitle(clone, { x: r.left, y: r.top, s: r.width / clone.offsetWidth });
      card.querySelector('.pt-card-text').style.visibility = 'hidden';
      hide(titleEl);
      await frame();
      clone.style.transition = trans(['left', 'top', 'transform'], D * 0.5);
      placeTitle(clone, titleSpot(clone, titleEl));
      card.style.transition = trans(['opacity', 'transform'], D * 0.36, 'ease');
      card.style.opacity = '0';
      place(card, { ...o, rot: 0 }, { s: 1.12, dy: -10 });

      await wait(D * 0.5);
      cleanups.forEach((fn) => fn()); // real title back under the copy
      cleanups = [];
      clone.style.transition = trans(['opacity'], D * 0.22, 'ease');
      clone.style.opacity = '0';
      await wait(D * 0.24);
    }
    finish();
  } catch (err) { bail(err); }
}

async function sheetClose(slug, toPath, change) {
  const project = getProject(slug);
  begin();
  try {
    const h = landingHero();
    const titleEl = document.querySelector('[data-pt-title]');
    const byTitle = !h && !!titleEl;
    const sheet = sheetEl(viewport(), 0);
    let card = null;
    let clone = null;
    if (byTitle) {
      // Reverse of the title-only arrival: the title lifts off the page.
      clone = titleClone(project);
      placeTitle(clone, titleSpot(clone, titleEl));
      hide(titleEl);
    } else if (h) {
      card = glassCard(project, { ...h, rot: 0 }, 24);
      card.style.opacity = '0';
    }
    // With neither, it's the reverse of a plain glass fade: the glass comes
    // in and the card only appears at the far end.
    await frame();

    // The sheet fades in over the page; the hero lifts out as a glass card.
    sheet.style.transition = trans(['opacity'], D * 0.28, 'ease');
    sheet.style.opacity = '1';
    if (card) {
      card.style.transition = trans(['transform', 'box-shadow', 'background', 'opacity'], D * 0.28);
      card.classList.add('is-glass');
      card.style.opacity = '1';
      place(card, { ...h, rot: 0 }, { s: 1.04 });
    }
    setTimeout(leavePage, D * 0.2);

    await wait(D * 0.42);
    const toProjects = norm(toPath) === '/projects';
    await routeChange(change, () => {
      startBuild(toProjects ? 'pt-build' : 'pt-build-fade');
      if (!toProjects) html().classList.add('pt-arrive');
    });
    await frame();

    // The card flies back to its card or tile; the sheet shrinks into it.
    const target = document.querySelector(toProjects
      ? `[data-pt-tile="${CSS.escape(slug)}"]`
      : `[data-pt-field="${CSS.escape(slug)}"]`);
    const t = target && boxOf(target);
    if (onScreen(t)) {
      cleanups.forEach((fn) => fn());
      cleanups = [];
      hide(target);
      const rad = parseFloat(getComputedStyle(target).borderTopLeftRadius) || 16;
      const props = ['left', 'top', 'width', 'height', 'transform', 'border-radius'];
      sheet.style.transition = trans(props, D * 0.42);
      place(sheet, t, { rad });
      if (!card) {
        // The glass card gathers at the target (and the title, if it lifted
        // off the page, drops into its caption).
        card = glassCard(project, t, rad);
        card.classList.add('is-glass');
        card.style.opacity = '0';
        const text = card.querySelector('.pt-card-text');
        const r = text.lastElementChild.getBoundingClientRect();
        if (clone) text.style.visibility = 'hidden';
        await frame();
        card.style.transition = trans(['opacity'], D * 0.3, 'ease');
        card.style.opacity = '1';
        if (clone) {
          clone.style.transition = trans(['left', 'top', 'transform'], D * 0.42);
          placeTitle(clone, { x: r.left, y: r.top, s: r.width / clone.offsetWidth });
        }
        await wait(D * 0.42);
        text.style.visibility = '';
        if (clone) clone.remove();
      } else {
        card.style.transition = trans(props, D * 0.42);
        place(card, t, { rad });
        await wait(D * 0.42);
      }
      card.style.transition = trans(['opacity', 'box-shadow', 'background'], D * 0.22, 'ease');
      card.classList.remove('is-glass');
      sheet.style.transition = trans(['opacity'], D * 0.22, 'ease');
      sheet.style.opacity = '0';
      // Reveal the real card underneath as the copy fades.
      cleanups.forEach((fn) => fn());
      cleanups = [];
      card.style.opacity = '0';
      await wait(D * 0.24);
    } else {
      // Nowhere on screen to land (e.g. the project was opened from the
      // home page's story): just let the glass clear.
      [card, clone, sheet].forEach((el) => {
        if (!el) return;
        el.style.transition = trans(['opacity'], D * 0.42, 'ease');
        el.style.opacity = '0';
      });
      await wait(D * 0.44);
    }
    finish();
    setTimeout(() => html().classList.remove('pt-arrive'), 500);
  } catch (err) { bail(err); }
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------
const push = (to) => () => { rememberScroll(); routerNavigate(to); };

// Card in the home field or tile on /projects → its project page.
export function openProject(slug, originEl) {
  const to = `/projects/${slug}`;
  if (!canAnimate() || busy || !originEl || !routerNavigate) { rememberScroll(); routerNavigate?.(to); return false; }
  sheetOpen(slug, originEl, push(to));
  return true;
}

// Home "See all projects" → /projects.
export function openAllProjects() {
  if (!canAnimate() || busy || !routerNavigate) { rememberScroll(); routerNavigate?.('/projects'); return; }
  fly(true, push('/projects'));
}

// "← Back" and the "Projects" crumb. Goes back through history when the
// previous page is where we're headed, so scroll comes back too; otherwise
// navigates there. Either way the reverse motion plays.
export function goBackTo(toPath) {
  const prev = previousPath();
  if (prev && norm(prev) === norm(toPath)) { window.history.back(); return; }
  const from = norm(currentPath);
  if (!canAnimate() || busy || !routerNavigate) { routerNavigate?.(toPath); return; }
  if (isProjectPath(from)) sheetClose(slugOf(from), toPath, push(toPath));
  else if (from === '/projects' && norm(toPath) === '/') fly(false, push('/'));
  else routerNavigate(toPath);
}

// Browser Back / Forward. Registered before the router's own listener (see
// main.jsx), so it can hold the router back while the lead-in plays, then
// hand it the same event.
let replaying = false;
function onPopState(e) {
  if (replaying) return;
  const to = norm(window.location.pathname);
  const from = norm(currentPath);
  if (to === from || !canAnimate() || !routerNavigate) return;
  if (busy) { finish(); return; } // let the router have it straight away

  const run = (fn) => {
    e.stopImmediatePropagation();
    const state = e.state;
    fn(() => {
      replaying = true;
      try { window.dispatchEvent(new PopStateEvent('popstate', { state })); } finally { replaying = false; }
    });
  };

  if (from === '/' && to === '/projects') run((go) => fly(true, go));
  else if (from === '/projects' && to === '/') run((go) => fly(false, go));
  else if (isProjectPath(from) && (to === '/' || to === '/projects')) run((go) => sheetClose(slugOf(from), to, go));
  else if ((from === '/' || from === '/projects') && isProjectPath(to)) {
    const slug = slugOf(to);
    const origin = document.querySelector(from === '/'
      ? `[data-pt-field="${CSS.escape(slug)}"]`
      : `[data-pt-tile="${CSS.escape(slug)}"]`);
    if (origin && onScreen(boxOf(origin))) run((go) => sheetOpen(slug, origin, go));
  } else {
    // Any other Back / Forward gets the same crossfade as a link click.
    run((go) => {
      const t = document.startViewTransition(() => routeChange(go));
      t.ready.catch(() => {});
      t.finished.catch(() => {});
    });
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', onPopState);
  // ScrollManager restores scroll itself. Left to the browser, it would jump
  // the old page before the Back animation had a chance to run.
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
}
