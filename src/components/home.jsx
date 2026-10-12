import React from 'react';
import Hero, { SLIDES, SLIDE_MS } from './hero.jsx';
import GlassBar from './glassbar.jsx';
import Intro from './intro.jsx';
import Toolkit from './toolkit.jsx';
import Projects from './projects.jsx';
import More from './more.jsx';
import Resume from './resume.jsx';
import Contact from './contact.jsx';
import { useGlassTheme, useScrollFrame } from './motion.jsx';

// Thin bar along the bottom edge showing how far down the page you are.
function ProgressBar() {
  const ref = React.useRef(null);
  useScrollFrame(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    ref.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  });
  return <div className="g-progress" aria-hidden="true"><div ref={ref} /></div>;
}

function Home() {
  // The slideshow lives here because the hero photos and the glass slab's
  // slide row both follow it.
  const [idx, setIdx] = React.useState(0);
  const [ready, setReady] = React.useState(false);
  const timer = React.useRef(0);

  const startTimer = React.useCallback(() => {
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), SLIDE_MS);
  }, []);

  React.useEffect(() => {
    startTimer();
    const t = setTimeout(() => setReady(true), 80);
    return () => { clearInterval(timer.current); clearTimeout(t); };
  }, [startTimer]);

  useGlassTheme();

  return (
    <div className="glass">
      <GlassBar idx={idx} ready={ready} onSlide={(i) => { setIdx(i); startTimer(); }} />
      <main>
        <Hero idx={idx} ready={ready} />
        <Intro />
        <Toolkit />
        <Projects />
        <More />
        <Resume />
        <Contact />
      </main>
      <ProgressBar />
    </div>
  );
}

export default Home;
