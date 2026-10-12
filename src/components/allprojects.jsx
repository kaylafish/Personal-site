import React from 'react';
import { PROJECTS, projectPath } from '../data/projects.js';
import { openProject } from '../transitions.js';
import { ProgressBar } from './home.jsx';
import { useGlassTheme } from './motion.jsx';

// /projects: a sticky left rail with a year timeline, and a grid of tiles,
// newest first. The featured project is the big tile. Arriving from the home
// page, the floating cards fly into these tiles (transitions.js), so tile
// images carry data-pt-tile and the rest builds in around them (data-build).

const UNDATED = 'Year to add';
const titleOf = (p) => `${p.title} ${p.titleItalic || ''}`.trim();

// Newest first; within a year, the most recently added first.
const NEWEST = PROJECTS
  .map((p, i) => ({ p, i }))
  .sort((a, b) => (b.p.year || '0').localeCompare(a.p.year || '0') || b.i - a.i)
  .map(({ p }) => p);

function yearGroups() {
  const out = [];
  NEWEST.forEach((p) => {
    const y = p.year || UNDATED;
    const g = out.find((o) => o.y === y);
    if (g) g.n += 1; else out.push({ y, n: 1 });
  });
  return out;
}

function open(slug) {
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new-tab clicks
    e.preventDefault();
    openProject(slug, e.currentTarget.querySelector('[data-pt-tile]'));
  };
}

function Tile({ project }) {
  const muted = !project.cover;
  return (
    <a href={projectPath(project.slug)} onClick={open(project.slug)} className={`g-tile ${muted ? 'is-muted' : ''}`}>
      <div className="g-tile-img" data-pt-tile={project.slug}>
        {project.cover && <img src={project.cover} alt={project.coverAlt} />}
      </div>
      <div className="g-tile-meta" data-build="" style={{ '--b': 2 }}>
        <span>{titleOf(project)}</span>
        <span className="g-card-year">{project.year || '—'}</span>
      </div>
    </a>
  );
}

function AllProjects() {
  useGlassTheme();
  const featured = NEWEST.find((p) => p.featured);
  const rest = NEWEST.filter((p) => p !== featured);

  return (
    <div className="glass g-all">
      <main className="g-all-main" data-pt-page="">
        <aside className="g-all-rail">
          <div className="g-all-head" data-build="" style={{ '--b': 0 }}>
            <span className="g-eyebrow">Projects</span>
            <h1 className="g-all-title">All <em>projects.</em></h1>
            <span className="g-hand-note g-all-note">(newest first)</span>
          </div>
          <ol className="g-years" data-build="" style={{ '--b': 1 }}>
            {yearGroups().map(({ y, n }) => (
              <li key={y} className={y === UNDATED ? 'is-undated' : ''}>
                <span className="g-years-y">{y}</span>
                <span className="g-years-n">{n} {n === 1 ? 'project' : 'projects'}</span>
              </li>
            ))}
          </ol>
        </aside>

        <div className="g-tiles">
          {featured && (
            <a href={projectPath(featured.slug)} onClick={open(featured.slug)} className="g-tile g-tile-feat">
              <div className="g-tile-img" data-pt-tile={featured.slug}>
                <img src={featured.cover} alt={featured.coverAlt} />
                <div className="g-tile-feat-cap" data-build="" style={{ '--b': 2 }}>
                  <span className="g-tile-feat-eyebrow">
                    Featured · {featured.featured}{featured.year ? ` · ${featured.year}` : ''}
                  </span>
                  <span className="g-tile-feat-title">{featured.title} <em>{featured.titleItalic}</em></span>
                  <span className="g-tile-feat-sum">{featured.summary}</span>
                </div>
              </div>
            </a>
          )}
          {rest.map((p) => <Tile key={p.slug} project={p} />)}
        </div>
      </main>
      <ProgressBar />
    </div>
  );
}

export default AllProjects;
