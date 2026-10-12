import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PROJECTS, getProject, projectModel, projectPath } from '../data/projects.js';
import { transitionName } from './projectcard.jsx';
import { MOBILE_QUERY, useGlassTheme, useScrollFrame } from './motion.jsx';
import { PageLink } from './pagelink.jsx';
import ResearchPage from './researchpage.jsx';

// /projects/<slug>: the "datasheet" page. One template for every project,
// driven by its entry in data/projects.js.

const ModelViewer = React.lazy(() => import('./modelviewer.jsx'));
const pad2 = (n) => String(n).padStart(2, '0');

// Height of the page hero, shared with the home page's photo-expands
// transition so its last frame lines up. Mirrors .g-pp-hero in home.css.
export const heroHeight = () => (window.matchMedia(MOBILE_QUERY).matches ? window.innerHeight * 0.6 : 700);

// Small, muted syntax colouring: comments, strings, numbers and keywords.
const TOKEN = /(#.*$|\/\/.*$)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?)\b|\b(def|return|if|elif|else|for|while|in|class|import|from|as|const|let|var|function|void|int|float|double|bool|auto|public|private|static|new|true|false|True|False|None|null|self|this)\b/gm;
function highlight(code) {
  const out = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const kind = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
    out.push(<span key={m.index} className={`g-tok-${kind}`}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  out.push(code.slice(last));
  return out;
}

function Block({ block, num }) {
  switch (block.type) {
    case 'text':
      return <p className={`g-pp-text ${block.todo ? 'is-todo' : ''}`}>{block.body}</p>;
    case 'facts':
      return (
        <dl className="g-pp-rows">
          {block.rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd className={r.todo ? 'is-todo' : ''}>{r.value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'figure':
      return (
        <figure className="g-pp-figure">
          <div className="g-pp-figure-frame">
            {block.src && <img src={block.src} alt={block.caption || block.title} loading="lazy" />}
          </div>
          <figcaption>Fig. {num} · {block.caption}</figcaption>
        </figure>
      );
    case 'code':
      return <pre className={`g-pp-code ${block.todo ? 'is-todo' : ''}`}><code>{highlight(block.code)}</code></pre>;
    case 'notes':
      return (
        <div className="g-pp-notes">
          {block.items.map((n) => (
            <div key={n.label}>
              <span>{n.label}</span>
              <p className={n.todo ? 'is-todo' : ''}>{n.body}</p>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

// Projects with their own bespoke page (page: '...' in data/projects.js).
const CUSTOM_PAGES = { research: ResearchPage };

function ProjectPage() {
  const { slug } = useParams();
  const Custom = CUSTOM_PAGES[getProject(slug)?.page];
  return Custom ? <Custom key={slug} /> : <Datasheet key={slug} slug={slug} />;
}

function Datasheet({ slug }) {
  useGlassTheme();
  const project = getProject(slug);
  const blockRefs = React.useRef([]);
  const [active, setActive] = React.useState(0);
  const [tocOpen, setTocOpen] = React.useState(false);

  // The block whose top has crossed 40% of the viewport is the current one.
  useScrollFrame(() => {
    const line = window.innerHeight * 0.4;
    let at = 0;
    blockRefs.current.forEach((el, i) => {
      if (el && el.getBoundingClientRect().top < line) at = i;
    });
    setActive(at);
  }, [slug]);

  // Arriving from the home page's story, the expanded photo is still on
  // screen (see projects.jsx). Fade it out to reveal the real hero.
  React.useEffect(() => {
    const overlay = document.querySelector('.g-expand');
    if (!overlay) return;
    overlay.style.transition = 'opacity .5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 520);
  }, [slug]);

  if (!project) return <Navigate to="/projects" replace />;

  const model = projectModel(project);
  const current = Math.min(active, project.blocks.length - 1);
  const next = PROJECTS[(PROJECTS.indexOf(project) + 1) % PROJECTS.length];
  const goTo = (i) => {
    const el = blockRefs.current[i];
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' });
    setTocOpen(false);
  };

  return (
    <div className="glass g-pp">
      <PageLink to="/projects" className="g-glass-pill g-back-pill">← All projects</PageLink>

      <nav className={`g-pp-toc ${tocOpen ? 'is-open' : ''}`} aria-label="Contents">
        <button type="button" className="g-pp-toc-head" onClick={() => setTocOpen((o) => !o)} aria-expanded={tocOpen}>
          <span>Contents</span>
          <span className="g-pp-toc-current">{pad2(current + 1)} · {project.blocks[current].title}</span>
        </button>
        <div className="g-pp-toc-list">
          {project.blocks.map((b, i) => (
            <button key={i} type="button" className={i === current ? 'is-on' : ''} onClick={() => goTo(i)}>
              <span>{pad2(i + 1)}</span>{b.title}
            </button>
          ))}
        </div>
      </nav>

      <main>
        <header className={`g-pp-hero ${model ? 'is-3d' : ''}`} style={{ viewTransitionName: transitionName(project.slug) }}>
          {model ? (
            <React.Suspense fallback={null}>
              <ModelViewer key={project.slug} hero {...model} />
            </React.Suspense>
          ) : (
            <>
              <img src={project.hero.src} alt={project.coverAlt} />
              <div className="g-pp-hero-fade" />
            </>
          )}
          <div className="g-pp-title">
            <div className="g-pp-title-top">
              <span>{project.kind}</span>
              <h1>{project.title} <em>{project.titleItalic}</em></h1>
            </div>
            {project.facts.map((f) => (
              <div key={f.label} className="g-pp-title-cell">
                <span>{f.label}</span>
                <span>{f.value}</span>
              </div>
            ))}
          </div>
        </header>

        <div className="g-pp-body">
          {project.links.length > 0 && (
            <div className="g-pp-links">
              {project.links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="g-glass-pill">{l.label} ↗</a>
              ))}
            </div>
          )}

          {project.blocks.map((b, i) => (
            <section key={i} ref={(el) => { blockRefs.current[i] = el; }} className="g-pp-block">
              <div className="g-pp-block-head">
                <span>{pad2(i + 1)}</span>
                <h2>{b.title}</h2>
              </div>
              <Block block={b} num={pad2(i + 1)} />
            </section>
          ))}

          <PageLink to={projectPath(next.slug)} className="g-pp-next">
            <img src={next.cover} alt="" loading="lazy" />
            <div className="g-pp-next-fade" />
            <div className="g-pp-next-text">
              <span>Next project</span>
              <span>{next.title} <em>{next.titleItalic}</em> →</span>
            </div>
          </PageLink>
        </div>
      </main>
    </div>
  );
}

export default ProjectPage;
