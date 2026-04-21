import React from 'react';
import { Reveal } from './reveal.jsx';
import VideoEmbed from './videoembed.jsx';

// ============================================================================
// HIGHLIGHTS ARCHIVE — EDIT THIS LIST WHEN YOU ADD VIDEOS
// ----------------------------------------------------------------------------
// For each entry, paste the Cloudflare Stream video UID into `videoId`.
// Find the UID in your Cloudflare dashboard → Stream → the video's details.
// It looks like: "31c9291ab41fac05f02f2b3136cb956a"
// Leave videoId blank ('' or omit) for videos that haven't been uploaded yet —
// those cards will still render as placeholders.
// ============================================================================
const ALL_HIGHLIGHTS = [
  { videoId: '', title: 'Season Highlights',    sub: '2025 · 3:42',       badge: 'FULL REEL', kind: 'Reels',    layout: 'spotlight' },
  { videoId: '', title: 'Goals of the Season',  sub: '2025 · 2:10',       badge: 'REEL',      kind: 'Reels' },
  { videoId: '', title: 'Regionals · Semifinals', sub: '11·08·25 · 0:54', badge: 'CLIP',      kind: 'Games' },
  { videoId: '', title: 'Defensive Cuts',       sub: '10·22·25 · 1:18',   badge: 'CLIP',      kind: 'Skills',   layout: 'wide' },
  { videoId: '', title: 'Corner Plays',         sub: '10·04·25 · 0:48',   badge: 'CLIP',      kind: 'Skills' },
  { videoId: '', title: 'Penalty Corners',      sub: '2025 · 1:02',       badge: 'DRILL',     kind: 'Skills' },
  { videoId: '', title: 'vs. Rival High',       sub: '09·28·25 · 1:30',   badge: 'GAME',      kind: 'Games' },
  { videoId: '', title: 'Pre-Season Camp',      sub: '08·15·25 · 2:14',   badge: 'TRAINING',  kind: 'Training' },
  { videoId: '', title: 'Season Highlights',    sub: '2024 · 3:08',       badge: 'FULL REEL', kind: 'Reels',    layout: 'wide' },
  { videoId: '', title: 'Midfield Transitions', sub: '2024 · 1:40',       badge: 'SKILLS',    kind: 'Skills' },
  { videoId: '', title: 'vs. District Rivals',  sub: '10·12·24 · 1:22',   badge: 'GAME',      kind: 'Games' },
  { videoId: '', title: 'Summer Club Reel',     sub: '2024 · 2:48',       badge: 'CLUB',      kind: 'Reels' },
];

function AllHighlights({ onBack }) {
  const [filter, setFilter] = React.useState('All');
  const cats = ['All', 'Reels', 'Games', 'Skills', 'Training'];
  const shown = filter === 'All' ? ALL_HIGHLIGHTS : ALL_HIGHLIGHTS.filter(h => h.kind === filter);

  return (
    <div className="page" data-screen-label="All Highlights">
      <header className="archive-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 24 }}>Field Hockey · Film Archive</div>
          <h1><Reveal>All</Reveal> <Reveal delay={100}><em>highlights</em>.</Reveal></h1>
        </div>
        <div className="meta">
          <span className="big">{ALL_HIGHLIGHTS.length}</span>
          clips · 2024 — 2025<br/>
          updated weekly in-season<br/>
          sorted ↓ by recency
        </div>
      </header>

      <div className="archive-filter">
        <span className="filter-label">Filter ·</span>
        {cats.map(c => (
          <button key={c} className={`chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="archive-body">
        <div className="highlights-grid">
          {shown.map((h, i) => (
            <div key={i} className={`hl-card ${h.layout || ''}`} style={{ animation: `pageIn 0.6s ${i * 40}ms both` }}>
              <VideoEmbed videoId={h.videoId} title={h.title} />
              <div className="badge">{h.badge}</div>
              <div className="meta">
                <div className="title">{h.title}</div>
                <div className="sub">{h.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="view-all" onClick={onBack}>
          <span className="arr">←</span> Back to field hockey
        </button>
      </div>
    </div>
  );
}

export default AllHighlights;
export { ALL_HIGHLIGHTS };
