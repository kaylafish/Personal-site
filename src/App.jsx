import React from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import Nav from './components/nav.jsx';
import Home from './components/home.jsx';
import FieldHockey from './components/fieldhockey.jsx';
import AllProjects from './components/allprojects.jsx';
import ProjectPage from './components/projectpage.jsx';
import AllHighlights from './components/allhighlights.jsx';
import Scrollspy from './components/scrollspy.jsx';
import { usePageNavigate } from './components/pagelink.jsx';

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
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
