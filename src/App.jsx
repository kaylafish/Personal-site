import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Nav from './components/nav.jsx';
import Hero from './components/hero.jsx';
import Experience from './components/experience.jsx';
import Projects from './components/projects.jsx';
import Education from './components/education.jsx';
import Skills from './components/skills.jsx';
import Contact from './components/contact.jsx';
import FieldHockey from './components/fieldhockey.jsx';
import AllProjects from './components/allprojects.jsx';
import AllHighlights from './components/allhighlights.jsx';
import Scrollspy from './components/scrollspy.jsx';

const HOME_SECTIONS = [
  { id: 'top',        label: 'Top' },
  { id: 'experience', label: 'Work' },
  { id: 'projects',   label: 'Projects' },
  { id: 'education',  label: 'Education' },
  { id: 'skills',     label: 'Skills' },
  { id: 'contact',    label: 'Contact' },
];
const FH_SECTIONS = [
  { id: 'fh-top',         label: 'Top' },
  { id: 'fh-films',       label: 'Film' },
  { id: 'fh-about',       label: 'About' },
  { id: 'fh-recruiting',  label: 'Recruiting' },
];

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function HomePage({ cardStyle }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="page">
        <Hero />
        <Experience />
        <Projects cardStyle={cardStyle} onViewAll={() => navigate('/projects')} />
        <Education />
        <Skills />
        <Contact />
      </div>
      <Scrollspy sections={HOME_SECTIONS} />
    </>
  );
}

function ProjectsPage() {
  const navigate = useNavigate();
  return <AllProjects onBack={() => navigate('/')} />;
}

function FieldHockeyPage() {
  const navigate = useNavigate();
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
  const navigate = useNavigate();
  return <AllHighlights onBack={() => navigate('/fieldhockey')} />;
}

function Shell() {
  const site = window.SITE || {};
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
      <ScrollToTopOnRouteChange />
      <Nav theme={theme} setTheme={setTheme} />
      <Routes>
        <Route path="/" element={<HomePage cardStyle={site.cardStyle} />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/fieldhockey" element={<FieldHockeyPage />} />
        <Route path="/highlights" element={<HighlightsPage />} />
        <Route path="*" element={<HomePage cardStyle={site.cardStyle} />} />
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
