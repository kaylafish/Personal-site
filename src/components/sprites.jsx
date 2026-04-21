import React from 'react';

// Small decorative SVG sprites that sprinkle around the site.
// Each sprite is absolutely-positioned; colors follow currentColor so they
// adopt whatever --ink or --accent wrapper they sit inside.

function Sprite({ kind, className = '', style = {} }) {
  const S = SPRITES[kind];
  if (!S) return null;
  return (
    <span className={`sprite sprite-${kind} ${className}`} style={style} aria-hidden="true">
      {S}
    </span>
  );
}

const SPRITES = {
  orbit: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(-18 24 24)" />
      <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" />
      <circle cx="40" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  ),
  satellite: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="20" y="20" width="8" height="8" fill="currentColor" stroke="none"/>
      <rect x="6" y="22" width="12" height="4" fill="none"/>
      <rect x="30" y="22" width="12" height="4" fill="none"/>
      <line x1="24" y1="20" x2="24" y2="10"/>
      <circle cx="24" cy="8" r="2" fill="currentColor" stroke="none"/>
      <path d="M34 36 Q38 32 42 34" />
      <path d="M36 40 Q40 36 44 38" opacity="0.5"/>
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M24 6 C30 14, 32 22, 32 30 L24 34 L16 30 C16 22, 18 14, 24 6 Z"/>
      <circle cx="24" cy="20" r="3" fill="currentColor" stroke="none"/>
      <path d="M16 30 L12 40 L20 36" fill="currentColor" stroke="none" opacity="0.7"/>
      <path d="M32 30 L36 40 L28 36" fill="currentColor" stroke="none" opacity="0.7"/>
      <path d="M22 38 L24 44 L26 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  stick: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M38 6 L18 30 C14 34, 14 40, 20 42 L26 42" />
      <circle cx="30" cy="42" r="3" fill="currentColor" stroke="none"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z"/>
    </svg>
  ),
  asterisk: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="12" y1="4" x2="12" y2="20"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
      <line x1="18" y1="6" x2="6" y2="18"/>
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12 Q20 4, 34 12 T46 12" />
      <path d="M40 7 L46 12 L40 17"/>
    </svg>
  ),
  squiggle: (
    <svg viewBox="0 0 80 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 6 Q10 1, 20 6 T40 6 T60 6 T78 6" />
    </svg>
  ),
  dashedline: (
    <svg viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4">
      <path d="M2 10 C20 0, 50 20, 98 10"/>
    </svg>
  ),
  plane: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M4 24 L44 10 L32 28 L26 26 L22 34 L18 26 L4 24 Z" fill="currentColor" fillOpacity="0.1"/>
      <path d="M26 26 L32 28"/>
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>
  ),
  ring: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  ),
};

export default Sprite;
