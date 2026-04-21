import React from 'react';

function Nav({ page, onNav, theme, setTheme }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const goTo = (target) => (e) => {
    e.preventDefault();
    setOpen(false);
    if (target.startsWith('#')) {
      if (page !== 'home') {
        onNav('home');
        setTimeout(() => {
          const el = document.querySelector(target);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
      } else {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      onNav(target);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const toggleTheme = () => setTheme(theme === 'ink' ? 'cream' : 'ink');
  const isDark = theme === 'ink';

  const ThemeToggle = ({ className = '' }) => (
    <button
      className={`theme-toggle ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''} ${open ? 'menu-open' : ''}`}>
      <a href="#top" onClick={goTo('home')} className="nav-brand">
        <span className="dot"></span>
        Mikayla <em>Fisher</em>
      </a>

      <button
        className="nav-burger"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span></span><span></span><span></span>
      </button>

      <div className={`nav-links ${open ? 'open' : ''}`}>
        <a href="#work" onClick={goTo('#experience')}>Work</a>
        <a
          href="#projects"
          onClick={(e) => { e.preventDefault(); setOpen(false); onNav('projects'); }}
          className={page === 'projects' ? 'active' : ''}
        >
          Projects
        </a>
        <a href="#education" onClick={goTo('#education')}>Education</a>
        <a
          href="#fieldhockey"
          onClick={goTo('fh')}
          className={page === 'fh' || page === 'highlights' ? 'active' : ''}
        >
          Field Hockey
        </a>

        <span className="nav-divider"></span>

        <div className="nav-social">
          <a href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span className="social-label">GitHub</span>
          </a>
          <a href="https://linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span className="social-label">LinkedIn</span>
          </a>
          <ThemeToggle />
        </div>

        <a href="#resume" onClick={(e) => { e.preventDefault(); setOpen(false); }} className="cta">Résumé ↗</a>
      </div>

      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
    </nav>
  );
}

export default Nav;
