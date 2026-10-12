import React from 'react';
import { clamp, go, useScrollFrame } from './motion.jsx';

// ============================================================================
// HERO SLIDESHOW — EDIT THIS LIST TO CHANGE THE PHOTOS BEHIND THE GLASS
// ----------------------------------------------------------------------------
// label / cap show in the slab's slide row and the bottom-right caption.
// pos is an optional object-position for crops that need it.
// ============================================================================
const SLIDES = [
  { src: '/assets/quetzy.webp',   alt: 'FRC 2023 robot at the MHS Open House',      label: 'FRC 2023 Charged Up!',   cap: 'MHS Open House' },
  { src: '/assets/rebuilt.webp',  alt: 'FRC 2026 REBUILT robot during testing',      label: 'FRC 2026 REBUILT robot', cap: 'Robot undergoing testing' },
  { src: '/assets/campus.webp',   alt: 'WPI campus',                                 label: 'WPI, class of 2030',     cap: 'Worcester, MA' },
  { src: '/assets/portrait.webp', alt: 'Mikayla Fisher',                             label: "That's me",              cap: 'Mikayla Fisher', pos: '50% 30%' },
];
const SLIDE_MS = 5500;

function Hero({ idx, ready }) {
  const secRef = React.useRef(null);
  const photosRef = React.useRef(null);
  const dimRef = React.useRef(null);

  // Only fetch a photo once it's the current or the next slide.
  const [seen, setSeen] = React.useState(0);
  React.useEffect(() => { setSeen((s) => Math.max(s, idx)); }, [idx]);

  useScrollFrame(() => {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const sy = Math.min(y, vh * 1.2);
    photosRef.current.style.transform = `translate3d(0,${sy * 0.35}px,0)`;
    dimRef.current.style.opacity = clamp(sy / vh) * 0.6;
    // Matches the slab content's fade (see glassbar.jsx).
    secRef.current.style.setProperty('--hero-op', clamp(1 - clamp(y / (vh * 0.6)) * 2.6));
  });

  return (
    <section id="top" ref={secRef} className={`g-hero ${ready ? 'is-ready' : ''}`}>
      <div ref={photosRef} className="g-hero-photos">
        {SLIDES.map((s, i) => (
          <div key={s.src} className={`g-slide ${i === idx ? 'is-on' : ''}`}>
            {(i <= seen + 1 || i === idx) && (
              <img
                src={s.src}
                alt={s.alt}
                style={s.pos ? { objectPosition: s.pos } : undefined}
                fetchpriority={i === 0 ? 'high' : undefined}
              />
            )}
          </div>
        ))}
      </div>
      <div ref={dimRef} className="g-hero-dim" />
      <div className="g-hero-fade" />

      <button type="button" className="g-cue" onClick={go('intro')} aria-label="Scroll down">
        <span>Scroll</span>
        <span className="g-cue-ring">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      <div className="g-hero-cap">
        <div>{SLIDES[idx].label}</div>
        <div className="g-hero-cap-sub">{SLIDES[idx].cap}</div>
      </div>
    </section>
  );
}

export default Hero;
export { SLIDES, SLIDE_MS };
