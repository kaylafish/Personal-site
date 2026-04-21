import React from 'react';

// Fixed vertical rail on the right showing which section of the page is
// currently in view. Click a dot to jump there. Hidden on narrow viewports
// via CSS (see .scrollspy media query in styles.css).
//
// Pass `sections` as [{ id: 'experience', label: 'Work' }, ...].
// Each id must match the id="" of a <section> or <header> on the page.

export default function Scrollspy({ sections }) {
  const [activeId, setActiveId] = React.useState(sections[0]?.id);

  React.useEffect(() => {
    if (!sections || sections.length === 0) return;

    const elements = sections
      .map(s => document.getElementById(s.id))
      .filter(Boolean);

    if (elements.length === 0) return;

    // Track how much of each section is visible; pick the most-visible one.
    const visibility = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio);
        }
        let bestId = null;
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
        }
        if (bestId && bestRatio > 0) setActiveId(bestId);
      },
      {
        // Trigger bands at 0/25/50/75/100 % so the "most visible" pick is stable.
        threshold: [0, 0.25, 0.5, 0.75, 1],
        // Shrink the viewport slightly at the top so the nav bar doesn't count.
        rootMargin: '-80px 0px -40% 0px',
      }
    );

    elements.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const goTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="scrollspy" aria-label="Section navigation">
      <ul>
        {sections.map(s => (
          <li key={s.id} className={activeId === s.id ? 'active' : ''}>
            <a href={`#${s.id}`} onClick={goTo(s.id)} aria-label={s.label}>
              <span className="dot" aria-hidden="true" />
              <span className="label">{s.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
