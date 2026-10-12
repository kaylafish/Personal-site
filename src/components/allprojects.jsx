import React from 'react';
import { PROJECTS } from '../data/projects.js';
import { Rv, useGlassTheme } from './motion.jsx';
import { PageLink } from './pagelink.jsx';
import ProjectCard from './projectcard.jsx';

// /projects: every project as a plain grid of cards, newest first.
function AllProjects() {
  useGlassTheme();
  return (
    <div className="glass g-all">
      <PageLink to="/" className="g-glass-pill g-back-pill">← Home</PageLink>
      <main className="g-all-main">
        <header className="g-sec-head">
          <span className="g-eyebrow">Projects · {String(PROJECTS.length).padStart(2, '0')}</span>
          <h1 className="g-h2">All <em>projects.</em></h1>
        </header>
        <div className="g-all-grid">
          {[...PROJECTS].reverse().map((p, i) => (
            <Rv key={p.slug} delay={(i % 3) * 90}>
              <ProjectCard project={p} />
            </Rv>
          ))}
        </div>
      </main>
    </div>
  );
}

export default AllProjects;
