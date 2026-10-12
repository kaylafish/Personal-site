import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePageNavigate } from './pagelink.jsx';
import { projectPath } from '../data/projects.js';

// A project's card and its page hero share this name, so the browser morphs
// one into the other during the page transition.
export const transitionName = (slug) => `project-${slug}`;

// Opens a project page, first noting how far down the current page is so
// that Back returns to the same spot (see ScrollManager in App.jsx).
export function useOpenProject() {
  const navigate = useNavigate();
  const pageNavigate = usePageNavigate();
  const location = useLocation();
  // transition:false is for callers that run their own animation first.
  return (slug, { transition = true } = {}) => {
    navigate(location.pathname + location.search, {
      replace: true,
      state: { ...location.state, scrollY: window.scrollY },
    });
    (transition ? pageNavigate : navigate)(projectPath(slug));
  };
}

// Cover image, title and year. Used by the "and so much more" field and
// the /projects grid.
function ProjectCard({ project }) {
  const open = useOpenProject();
  return (
    <a
      href={projectPath(project.slug)}
      className="g-card"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let new-tab clicks through
        e.preventDefault();
        open(project.slug);
      }}
    >
      <div className="g-card-img" style={{ viewTransitionName: transitionName(project.slug) }}>
        <img src={project.cover} alt={project.coverAlt} loading="lazy" />
      </div>
      <div className="g-card-meta">
        <span>{project.title} {project.titleItalic}</span>
        <span className="g-card-year">{project.year}</span>
      </div>
    </a>
  );
}

export default ProjectCard;
