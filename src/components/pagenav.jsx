import React from 'react';
import { useLocation } from 'react-router-dom';
import { getProject } from '../data/projects.js';
import { ResumeLink } from './glassbar.jsx';
import { PageLink } from './pagelink.jsx';
import { goBackTo, previousPath } from '../transitions.js';

// The glass navbar on /projects and the project pages: the same bar the home
// page's slab turns into, morphing as you go.
//   /projects    links collapse; "/ Projects" and "← Back" grow in
//   a project    the crumb becomes "/ Projects / <title>"
// Arriving from the home page, it starts in the home layout and morphs from
// there. Everything moves with max-width and opacity (home.css).

const LINKS = [['Work', '/#work'], ['Projects', '/#projects'], ['Education', '/#education'], ['Contact', '/#contact']];

function PageNav() {
  const { pathname } = useLocation();
  const slug = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const project = slug ? getProject(decodeURIComponent(slug)) : null;
  const target = project ? 'project' : 'all';

  // One frame in the home layout when coming from home, then the real one.
  const [mode, setMode] = React.useState(() => (previousPath() === '/' ? 'home' : target));
  React.useEffect(() => {
    if (mode === target) return undefined;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setMode(target)));
    return () => cancelAnimationFrame(raf);
  }, [mode, target]);
  // Keep the last title while the crumb collapses.
  const [title, setTitle] = React.useState('');
  React.useEffect(() => {
    if (project) setTitle(`${project.title} ${project.titleItalic || ''}`.trim());
  }, [project]);

  const back = (e) => {
    e.preventDefault();
    if (mode === 'project') {
      // Back to wherever the project was opened from; /projects if it was
      // opened directly.
      const prev = previousPath();
      if (prev && prev !== '/' && prev !== '/projects') window.history.back();
      else goBackTo(prev === '/' ? '/' : '/projects');
    } else {
      goBackTo('/');
    }
  };
  const toAll = (e) => { e.preventDefault(); goBackTo('/projects'); };
  const toHome = (e) => {
    if (mode !== 'all' || previousPath() !== '/') return; // plain link
    e.preventDefault();
    goBackTo('/');
  };

  return (
    <header className={`g-pnav is-${mode}`}>
      <div className="g-pnav-left">
        <PageLink to="/" className="g-pnav-name" onClick={toHome}>Mikayla Fisher</PageLink>
        <span className="g-pnav-crumb g-pnav-crumb-all" inert={mode === 'home' ? '' : undefined}>
          <span>/</span>
          {mode === 'project'
            ? <a href="/projects" onClick={toAll}>Projects</a>
            : <span aria-current="page">Projects</span>}
        </span>
        <span className="g-pnav-crumb g-pnav-crumb-proj" aria-hidden={mode !== 'project'}>
          <span>/</span><span aria-current="page">{title}</span>
        </span>
      </div>
      <div className="g-pnav-right">
        <nav className="g-pnav-links" aria-label="Main" inert={mode === 'home' ? undefined : ''}>
          {LINKS.map(([label, to]) => <PageLink key={label} to={to}>{label}</PageLink>)}
        </nav>
        <a href={mode === 'project' ? '/projects' : '/'} className="g-pnav-back" onClick={back} inert={mode === 'home' ? '' : undefined}>
          ← Back
        </a>
        <ResumeLink className="g-pill g-pnav-resume">Résumé ↗</ResumeLink>
      </div>
    </header>
  );
}

export default PageNav;
