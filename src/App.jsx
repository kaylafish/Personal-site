import React from 'react';
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

export default function App() {
  const site = window.SITE || {};
  const [page, setPage] = React.useState(() => {
    try { return localStorage.getItem('mf_page') || 'home'; } catch (e) { return 'home'; }
  });
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
    document.documentElement.style.setProperty('--fh-accent', site.fieldHockeyAccent || '#4a7c3e');
    if (site.primaryAccent) {
      document.documentElement.style.setProperty('--accent', site.primaryAccent);
      document.documentElement.style.setProperty('--accent-soft',
        `color-mix(in oklab, ${site.primaryAccent} 18%, var(--paper))`);
    }
    document.documentElement.style.setProperty('--font-scale', site.fontScale || 1);
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('mf_theme', theme); } catch (e) {}
  }, [theme]);

  React.useEffect(() => {
    try { localStorage.setItem('mf_page', page); } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

  React.useEffect(() => {
    window.__navTo = (p) => setPage(p);
  }, []);

  return (
    <>
      <Nav page={page} onNav={setPage} theme={theme} setTheme={setTheme} />

      {page === 'home' && (
        <React.Fragment key="home">
          <div className="page">
            <Hero />
            <Experience />
            <Projects cardStyle={site.cardStyle} onViewAll={() => setPage('projects')} />
            <Education />
            <Skills />
            <Contact />
          </div>
          <Scrollspy sections={HOME_SECTIONS} />
        </React.Fragment>
      )}

      {page === 'projects' && (
        <AllProjects key="projects" onBack={() => setPage('home')} />
      )}

      {page === 'fh' && (
        <React.Fragment key="fh">
          <FieldHockey onViewAll={() => setPage('highlights')} />
          <footer style={{ maxWidth: 1280, margin: '0 auto' }}>
            <span>© 2026 Mikayla Fisher</span>
            <span>Field hockey · v1.0</span>
          </footer>
          <Scrollspy sections={FH_SECTIONS} />
        </React.Fragment>
      )}

      {page === 'highlights' && (
        <AllHighlights key="highlights" onBack={() => setPage('fh')} />
      )}
    </>
  );
}
