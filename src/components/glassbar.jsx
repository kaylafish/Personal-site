import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import { SLIDES } from './hero.jsx';
import { clamp, lerp, easeInOutCubic, go, useScrollFrame, useViewport } from './motion.jsx';

// The liquid-glass slab that holds the hero copy and, as the page scrolls,
// morphs into the centred navbar. One fixed element; its box, the name and
// the glass layers are all driven by scroll position.

const NAME_FS = 76;        // px the name is set at; scaled with transforms
// px the name lands at in the navbar; smaller on narrow phones so it clears
// the buttons on the right.
const navNameFs = (vw) => (vw < 360 ? 16 : vw < 400 ? 18 : 20);

// The refraction is an SVG filter used as a backdrop-filter, which only
// Chromium supports. Everything else gets a plain blur.
const SVG_GLASS = typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent);

function geometry({ vw, vh, mob }) {
  const slab = mob
    ? { L: 14, T: Math.round(vh * 0.3), W: vw - 28, H: Math.round(vh * 0.7) - 14, R: 32 }
    : { L: 40, T: 40, W: Math.round(Math.min(560, Math.max(460, vw * 0.34))), H: vh - 80, R: 40 };
  const nw = Math.round(Math.min(vw - 28, Math.max(720, vw * 0.5)));
  const nav = { L: Math.round((vw - nw) / 2), T: 12, W: nw, H: 68, R: 34 };
  return { slab, nav, pad: mob ? 28 : 40 };
}

// Displacement map for a rounded rect: red/green encode a vector pointing
// inward across the bezel, falling off as (1 - d/bezel)^2.2.
function glassMap(w, h, r, bezel) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const im = ctx.createImageData(w, h);
  const D = im.data;
  const hw = w / 2, hh = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      let sd, nx, ny;
      if (qx > 0 && qy > 0) {
        const L = Math.hypot(qx, qy);
        sd = L - r; nx = (qx / L) * Math.sign(px); ny = (qy / L) * Math.sign(py);
      } else if (qx > qy) { sd = qx - r; nx = Math.sign(px); ny = 0; }
      else { sd = qy - r; nx = 0; ny = Math.sign(py); }
      const d = -sd;
      const a = d <= 0 ? 1 : d < bezel ? Math.pow(1 - d / bezel, 2.2) : 0;
      const i = (y * w + x) * 4;
      D[i] = 128 - nx * a * 127; D[i + 1] = 128 - ny * a * 127; D[i + 2] = 128; D[i + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  return c.toDataURL();
}

// Blur, then displace three times at slightly different strengths for R, G
// and B (a chromatic fringe), screen them back together and saturate.
const CHANNELS = [
  ['r',  1.0, '1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'],
  ['g',  1.1, '0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0'],
  ['bl', 1.2, '0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0'],
];
function GlassFilter({ id, map, w, h, scale, blur, imgRef }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="b" />
      <feImage ref={imgRef} href={map} x="0" y="0" width={w} height={h} preserveAspectRatio="none" result="m" />
      {CHANNELS.map(([key, k, matrix]) => (
        <React.Fragment key={key}>
          <feDisplacementMap in="b" in2="m" scale={scale * k} xChannelSelector="R" yChannelSelector="G" result={`d${key}`} />
          <feColorMatrix in={`d${key}`} type="matrix" values={matrix} result={key} />
        </React.Fragment>
      ))}
      <feBlend in="r" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="bl" mode="screen" result="rgb" />
      <feColorMatrix in="rgb" type="saturate" values="1.5" />
    </filter>
  );
}

// The download attribute saves the PDF rather than opening it in a tab.
function ResumeLink({ className, children }) {
  return <a href={RESUME_URL} download={RESUME_FILENAME} className={className}>{children}</a>;
}

function GlassBar({ idx, ready, onSlide }) {
  const vp = useViewport();
  const g = React.useMemo(() => geometry(vp), [vp]);
  const { slab, nav, pad } = g;

  const barRef = React.useRef(null);
  const mRef = React.useRef(null);
  const fRef = React.useRef(null);
  const slabImgRef = React.useRef(null);
  const navImgRef = React.useRef(null);
  const topRef = React.useRef(null);
  const bottomRef = React.useRef(null);
  const navRef = React.useRef(null);
  // Phones: the section links live in a menu under the bar.
  const [menu, setMenu] = React.useState(false);
  React.useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!e.target.closest?.('.g-nav-menu, .g-nav-sheet')) setMenu(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', onKey); };
  }, [menu]);
  const goMenu = (id) => (e) => { setMenu(false); go(id)(e); };

  // Natural width of each word at NAME_FS, re-measured once fonts load.
  const [nameW, setNameW] = React.useState({ m: 340, f: 290 });
  React.useLayoutEffect(() => {
    let live = true;
    const measure = () => {
      if (!live || !mRef.current || !fRef.current) return;
      const m = mRef.current.offsetWidth, f = fRef.current.offsetWidth;
      setNameW((prev) => (prev.m === m && prev.f === f ? prev : { m, f }));
    };
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    return () => { live = false; };
  }, [vp]);

  const maps = React.useMemo(() => (SVG_GLASS ? {
    slab: glassMap(slab.W, slab.H, slab.R, 64),
    nav: glassMap(nav.W, nav.H, nav.R, 26),
  } : null), [slab.W, slab.H, slab.R, nav.W, nav.H, nav.R]);

  // Name scale in the slab: fit the width, and keep the two lines within
  // 30% of the slab's height.
  const s0 = Math.min(1.25, (slab.W - pad * 2) / Math.max(nameW.m, nameW.f, 1), (slab.H * 0.3) / (2 * NAME_FS));
  const s1 = navNameFs(vp.vw) / NAME_FS;
  const heroTop = pad + NAME_FS * s0 * 2 + 26;

  useScrollFrame(() => {
    const bar = barRef.current;
    if (!bar) return;
    const y = window.scrollY;
    const p = clamp(y / (vp.vh * 0.6));             // slab -> navbar
    const e = easeInOutCubic(p);
    const q = clamp((y - vp.vh * 0.85) / (vp.vh * 0.5)); // navbar over plain background

    const W = lerp(slab.W, nav.W, e), H = lerp(slab.H, nav.H, e);
    const s = bar.style;
    s.left = `${lerp(slab.L, nav.L, e)}px`;
    s.top = `${lerp(slab.T, nav.T, e)}px`;
    s.width = `${W}px`;
    s.height = `${H}px`;
    s.borderRadius = `${lerp(slab.R, nav.R, e)}px`;
    s.boxShadow = `0 ${lerp(30, 10, q)}px ${lerp(70, 30, q)}px rgba(0,12,30,${lerp(0.4, 0.18, q)}),`
      + `0 4px 14px rgba(0,12,30,${lerp(0.22, 0.06, q)})`;

    const heroOp = clamp(1 - p * 2.6);
    const navOp = clamp((p - 0.55) / 0.45);
    s.setProperty('--hero-op', heroOp);
    s.setProperty('--nav-op', navOp);
    s.setProperty('--slab-glass', 1 - clamp((p - 0.25) / 0.5));
    s.setProperty('--rim', lerp(1, 0.28, q));
    s.setProperty('--tint', lerp(1, 0.55, q));
    topRef.current.inert = bottomRef.current.inert = heroOp <= 0.2;
    navRef.current.inert = navOp <= 0.5;
    if (navOp <= 0.5) setMenu(false);

    const ns = lerp(s0, s1, e);
    mRef.current.style.transform =
      `translate(${lerp(pad, 26, e)}px,${lerp(pad, 24, e)}px) scale(${ns})`;
    fRef.current.style.transform =
      `translate(${lerp(pad, 26 + nameW.m * s1 + 7, e)}px,${lerp(pad + NAME_FS * s0, 24, e)}px) scale(${ns})`;

    // The displacement maps stretch with the box while it morphs.
    [slabImgRef.current, navImgRef.current].forEach((n) => {
      if (n) { n.setAttribute('width', W); n.setAttribute('height', H); }
    });
  }, [g, vp.vh, nameW, s0, maps]);

  return (
    <>
      {maps && (
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <defs>
            <GlassFilter id="g-slab" map={maps.slab} w={slab.W} h={slab.H} scale={130} blur={5} imgRef={slabImgRef} />
            <GlassFilter id="g-nav" map={maps.nav} w={nav.W} h={nav.H} scale={64} blur={2.5} imgRef={navImgRef} />
          </defs>
        </svg>
      )}

      <header
        ref={barRef}
        className={`g-bar ${ready ? 'is-ready' : ''} ${maps ? 'has-svg-glass' : ''}`}
        style={{ '--pad': `${pad}px`, '--hero-top': `${heroTop}px` }}
      >
        <div className="g-bar-layer g-bar-glass g-bar-glass-slab" />
        <div className="g-bar-layer g-bar-glass g-bar-glass-nav" />
        <div className="g-bar-layer g-bar-tint" />
        <div className="g-bar-layer g-bar-fill" />
        <div className="g-bar-layer g-bar-rim" />

        <h1 className="g-name">
          <a href="#top" onClick={go('top')}>
            <span ref={mRef}>Mikayla</span>{' '}
            <span ref={fRef}>Fisher</span>
          </a>
        </h1>

        <div ref={topRef} className="g-slab-block g-slab-top">
          <div className="g-slab-eyebrow">Aerospace Engineering · WPI ’30</div>
          {slab.H >= 620 && (
            <p className="g-slab-lede">
              I'm working toward guidance, navigation &amp; control, and building
              competition robots and rockets in the meantime.
            </p>
          )}
        </div>

        <div ref={bottomRef} className="g-slab-block g-slab-bottom">
          <div className="g-slab-cta">
            <a href="#projects" onClick={go('projects')} className="g-pill g-pill-solid">See projects</a>
            <ResumeLink className="g-pill g-pill-outline">Résumé ↗</ResumeLink>
          </div>
          {slab.H >= 440 && (
            <div className="g-slab-slides">
              <div className="g-slab-slide">
                <div className="g-slab-slide-num">{`0${idx + 1} / 0${SLIDES.length}`}</div>
                <div className="g-slab-slide-label">{SLIDES[idx].label}</div>
              </div>
              <div className="g-dots">
                {SLIDES.map((sl, i) => (
                  <button
                    key={sl.src}
                    type="button"
                    className={i === idx ? 'is-on' : ''}
                    aria-label={sl.label}
                    aria-current={i === idx ? 'true' : undefined}
                    onClick={() => onSlide(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <nav ref={navRef} className="g-nav" aria-label="Main">
          <div className="g-nav-links">
            <a href="#work" onClick={go('work')}>Work</a>
            <a href="#projects" onClick={go('projects')}>Projects</a>
            <a href="#education" onClick={go('education')}>Education</a>
            <a href="#contact" onClick={go('contact')}>Contact</a>
          </div>
          <button type="button" className="g-nav-menu" aria-label="Sections" aria-expanded={menu}
            aria-controls="g-nav-sheet" onClick={() => setMenu((m) => !m)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menu ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <ResumeLink className="g-pill g-nav-resume">Résumé ↗</ResumeLink>
        </nav>
      </header>
      {menu && (
        <nav id="g-nav-sheet" className="g-nav-sheet" aria-label="Sections">
          <a href="#projects" onClick={goMenu('projects')}>Projects</a>
          <a href="#work" onClick={goMenu('work')}>Work</a>
          <a href="#education" onClick={goMenu('education')}>Education</a>
          <a href="#contact" onClick={goMenu('contact')}>Contact</a>
          <ResumeLink className="g-nav-sheet-resume">Résumé (PDF) ↗</ResumeLink>
        </nav>
      )}
    </>
  );
}

export default GlassBar;
export { ResumeLink };
