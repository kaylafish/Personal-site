import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Reveal, RevealWords } from './reveal.jsx';
import Sprite from './sprites.jsx';

function Hero() {
  const navigate = useNavigate();
  const [time, setTime] = React.useState('');
  React.useEffect(() => {
    const tick = () => {
      const d = new Date();
      const opts = { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' };
      setTime(d.toLocaleTimeString('en-US', opts));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="hero" id="top">
      <div className="hero-sprites" aria-hidden="true">
        <Sprite kind="orbit" className="s1 spin" />
        <Sprite kind="asterisk" className="s2 twinkle" />
        <Sprite kind="squiggle" className="s3" />
        <Sprite kind="satellite" className="s4 drift" />
      </div>

      <div className="hero-kicker mono">
        <div className="loc">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13z"/>
            <circle cx="12" cy="9" r="3"/>
          </svg>
          Worcester, MA · {time || '—'} EST
        </div>
        <div>Portfolio · 2026 / 01</div>
      </div>

      <div className="hero-marquee">
        N 42°16′N<br/>
        W 71°48′W<br/>
        EL. 480 FT
      </div>

      <h1 className="hero-title">
        <Reveal><span className="line">Mikayla</span></Reveal>
        <Reveal delay={150}><span className="line">Fisher,</span></Reveal>
        <Reveal delay={300}><span className="line flourish">aerospace</span></Reveal>
        <Reveal delay={450}><span className="line">engineer.</span></Reveal>
      </h1>

      <div className="hero-portrait">
        <Reveal delay={200}>
          <figure>
            <img src="/assets/portrait.webp" alt="Mikayla Fisher" />
          </figure>
        </Reveal>
      </div>

      <div className="hero-sub">
        <p className="hero-bio">
          <RevealWords text="Pursuing a B.S. in Aerospace Engineering at Worcester Polytechnic Institute, class of 2030. Focused on the trajectory toward graduate study in" />
          {' '}<em>Guidance, Navigation &amp; Control</em>.
        </p>

        <div className="hero-meta">
          <div className="label">Currently</div>
          <div className="val">Senior @ Monterey High School - Incoming @ WPI ’30</div>
          <div className="label" style={{ marginTop: 10 }}>Interests</div>
          <div className="val">GNC · Orbital Mechanics · Autonomy</div>
        </div>

        <div className="hero-meta">
          <div className="label">Field Hockey</div>
          <div className="val">Forward ·{' '}
            <a href="/fieldhockey" onClick={(e) => { e.preventDefault(); navigate('/fieldhockey'); }}
               style={{ textDecoration: 'underline', textUnderlineOffset: 4 }}>
              see highlights →
            </a>
          </div>
        </div>
      </div>

      <div className="hero-ticker">
        <span>◉ TRACKING · AZ 127.4° · EL 18.2°</span>
        <span>SYS NOMINAL <span className="dot"></span> T+0 · 00:00:00</span>
        <span>SCROLL TO ENTER<span className="scroll-arrow"><Sprite kind="arrow"/></span></span>
      </div>
    </header>
  );
}

export default Hero;
