import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import Nav from './components/nav.jsx';
import Home from './components/home.jsx';
import FieldHockey from './components/fieldhockey.jsx';
import AllProjects from './components/allprojects.jsx';
import ProjectPage from './components/projectpage.jsx';
import AllHighlights from './components/allhighlights.jsx';
import Scrollspy from './components/scrollspy.jsx';
import PageNav from './components/pagenav.jsx';
import { usePageNavigate } from './components/pagelink.jsx';
import { getProject } from './data/projects.js';
import { locationCommitted, registerNavigate } from './transitions.js';
import { SITE_URL, metaFor } from './routemeta.js';

const FH_SECTIONS = [
  { id: 'fh-top',         label: 'Top' },
  { id: 'fh-films',       label: 'Film' },
  { id: 'fh-about',       label: 'About' },
  { id: 'fh-recruiting',  label: 'Recruiting' },
];

// New pages open at the top. Going Back to a page that noted its scroll
// position before leaving (see useOpenProject) returns to that spot.
function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  React.useLayoutEffect(() => {
    const saved = navType === 'POP' ? location.state?.scrollY : null;
    // 'instant', not 'auto': styles.css sets scroll-behavior: smooth, and a
    // page shouldn't open mid-scroll from wherever the last one was.
    window.scrollTo({ top: saved ?? 0, behavior: 'instant' });
  }, [location.pathname]);
  return null;
}

// Keeps the tab title, canonical URL and share tags in step with the page.
// The build writes the same tags into each page's HTML (vite.config.js).
function HeadManager() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    const page = metaFor(pathname);
    const url = SITE_URL + (page.path === '/' ? '/' : page.path);
    const set = (sel, attr, val) => { const el = document.head.querySelector(sel); if (el) el.setAttribute(attr, val); };
    document.title = page.title;
    set('meta[name="description"]', 'content', page.description);
    set('link[rel="canonical"]', 'href', url);
    set('meta[property="og:url"]', 'content', url);
    set('meta[property="og:title"]', 'content', page.title);
    set('meta[property="og:description"]', 'content', page.description);
    set('meta[property="og:image"]', 'content', SITE_URL + page.image);
  }, [pathname]);
  return null;
}

// Lets transitions.js change routes and know when a new page is in the DOM.
// Rendered after <Routes> so its layout effect runs once the page's own have.
function TransitionBridge() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  React.useLayoutEffect(() => { registerNavigate(navigate); }, [navigate]);
  React.useLayoutEffect(() => { locationCommitted(pathname); }, [pathname]);
  // Arriving from the home page's story, its photo has grown to fill the top
  // of the screen (see projects.jsx). Fade it out to reveal the new page.
  // Done here so no page can forget it.
  React.useEffect(() => {
    const overlay = document.querySelector('.g-expand');
    if (!overlay) return;
    overlay.style.transition = 'opacity .5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 520);
  }, [pathname]);
  return null;
}

// /projects and the datasheet project pages share one navbar, kept mounted
// between them so it can morph. Bespoke project pages bring their own.
function usesPageNav(pathname) {
  const p = pathname.replace(/(.)\/+$/, '$1');
  if (p === '/projects') return true;
  const m = p.match(/^\/projects\/([^/]+)$/);
  const project = m && getProject(decodeURIComponent(m[1]));
  return !!project && !project.page;
}

function FieldHockeyPage() {
  const navigate = usePageNavigate();
  return (
    <>
      <FieldHockey onViewAll={() => navigate('/highlights')} />
      <footer style={{ maxWidth: 1280, margin: '0 auto' }}>
        <span>© 2026 Mikayla Fisher</span>
        <span>Field hockey · v1.0</span>
      </footer>
      <Scrollspy sections={FH_SECTIONS} />
    </>
  );
}

function HighlightsPage() {
  const navigate = usePageNavigate();
  return <AllHighlights onBack={() => navigate('/fieldhockey')} />;
}

const LEGACY_ROUTES = ['/fieldhockey', '/highlights'];

function Shell() {
  const site = window.SITE || {};
  const { pathname } = useLocation();
  const [theme, setTheme] = React.useState(() => {
    try {
      const saved = localStorage.getItem('mf_theme');
      if (saved === 'cream' || saved === 'ink') return saved;
    } catch (e) {}
    if (typeof window !== 'undefined' && window.matchMedia
        && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'ink';
    }
    return site.theme || 'cream';
  });

  React.useEffect(() => {
    document.documentElement.setAttribute('data-system', site.system || 'editorial');
    if (site.primaryAccent) {
      document.documentElement.style.setProperty('--accent', site.primaryAccent);
      document.documentElement.style.setProperty('--accent-soft',
        `color-mix(in oklab, ${site.primaryAccent} 18%, var(--paper))`);
    }
    document.documentElement.style.setProperty('--font-scale', site.fontScale || 1);
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Field-hockey accent is theme-aware: configured value for light,
    // a brighter teal for dark mode so it's actually visible.
    const fhLight = site.fieldHockeyAccent || '#4a7c3e';
    const fhDark = '#5fc8d6';
    document.documentElement.style.setProperty('--fh-accent', theme === 'ink' ? fhDark : fhLight);
    try { localStorage.setItem('mf_theme', theme); } catch (e) {}
  }, [theme]);

  return (
    <>
      <ScrollManager />
      <HeadManager />
      {usesPageNav(pathname) && <PageNav />}
      {/* The glass pages (home, projects) bring their own navigation. */}
      {LEGACY_ROUTES.includes(pathname.replace(/\/+$/, '')) && <Nav theme={theme} setTheme={setTheme} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<AllProjects />} />
        <Route path="/projects/:slug" element={<ProjectPage />} />
        <Route path="/fieldhockey" element={<FieldHockeyPage />} />
        <Route path="/highlights" element={<HighlightsPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <TransitionBridge />
    </>
  );
}

// Last line of defence: a page that throws shows a way out instead of a blank
// screen. The 3D viewers have their own boundaries (modelfallback.jsx).
class AppErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error(err); } // eslint-disable-line no-console
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="g-app-error">
        <p>Something went wrong loading this page.</p>
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}

// After a new deploy, an open tab still asks for the old build's code files,
// which no longer exist. Reload once to pick up the new build; the guard
// stops a reload loop when the network itself is down.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => {
    try {
      const last = +sessionStorage.getItem('mf_reloaded') || 0;
      if (Date.now() - last < 30000) return;
      sessionStorage.setItem('mf_reloaded', String(Date.now()));
    } catch (err) { return; }
    e.preventDefault();
    window.location.reload();
  });
}

export default function App() {
  return (
    // Synchronous route updates: the page transitions need the new page in
    // the DOM as soon as they navigate.
    <BrowserRouter unstable_useTransitions={false}>
      <AppErrorBoundary>
        <Shell />
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
