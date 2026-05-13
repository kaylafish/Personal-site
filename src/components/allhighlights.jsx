import React from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Reveal } from './reveal.jsx';
import VideoEmbed from './videoembed.jsx';
import VideoModal from './videomodal.jsx';

// ============================================================================
// HIGHLIGHTS ARCHIVE — EDIT THIS LIST WHEN YOU ADD VIDEOS
// ----------------------------------------------------------------------------
// Each entry uses ONE of:
//   videoId   — Cloudflare Stream UID  (from Cloudflare dashboard → Stream)
//   youtubeId — YouTube video ID       (the part after ?v= in the YouTube URL)
//
// Leave both blank to show a placeholder card.
//
// Example entries:
//   { videoId: '31c9291ab41fac05f02f2b3136cb956a', title: 'Season Highlights', ... }
//   { youtubeId: 'dQw4w9WgXcQ', title: 'Goals of the Season', ... }
// ============================================================================
const ALL_HIGHLIGHTS = [
  { youtubeId: 'M2QuJuKaG_o', title: 'Recruiting highlight Reel', meta: '2025 · 3:42', featured: true, note: 'FULL REEL' }
];

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

function AllHighlights({ onBack }) {
  const [filter, setFilter] = React.useState('All');
  const [copiedId, setCopiedId] = React.useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const cats = ['All', 'Reels', 'Games', 'Skills', 'Training'];
  const shown = filter === 'All' ? ALL_HIGHLIGHTS : ALL_HIGHLIGHTS.filter(h => h.kind === filter);

  // ?v=  → Cloudflare Stream UID
  // ?yt= → YouTube video ID
  const activeVideoId  = searchParams.get('v');
  const activeYoutubeId = searchParams.get('yt');
  const activeVideo = activeVideoId
    ? ALL_HIGHLIGHTS.find(h => h.videoId === activeVideoId)
    : activeYoutubeId
    ? ALL_HIGHLIGHTS.find(h => h.youtubeId === activeYoutubeId)
    : null;

  const openVideo = ({ videoId, youtubeId }) => {
    if (youtubeId) navigate(`${pathname}?yt=${youtubeId}`);
    else navigate(`${pathname}?v=${videoId}`);
  };
  const closeVideo = () => navigate(pathname, { replace: true });

  const copyLink = ({ videoId, youtubeId }, e) => {
    e.stopPropagation();
    const param = youtubeId ? `yt=${youtubeId}` : `v=${videoId}`;
    const url = `${window.location.origin}/highlights?${param}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(videoId || youtubeId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <>
      {activeVideo && (
        <VideoModal
          videoId={activeVideo.videoId}
          youtubeId={activeVideo.youtubeId}
          title={activeVideo.title}
          onClose={closeVideo}
        />
      )}

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
            {shown.map((h, i) => {
              const hasVideo = h.videoId || h.youtubeId;
              const cardId = h.videoId || h.youtubeId;
              return (
                <div
                  key={i}
                  className={`hl-card ${h.layout || ''}`}
                  style={{ animation: `pageIn 0.6s ${i * 40}ms both` }}
                >
                  <VideoEmbed
                    videoId={h.videoId}
                    youtubeId={h.youtubeId}
                    title={h.title}
                    onPlay={hasVideo ? openVideo : undefined}
                  />

                  {hasVideo && (
                    <button
                      className={`hl-share-btn ${copiedId === cardId ? 'copied' : ''}`}
                      onClick={(e) => copyLink({ videoId: h.videoId, youtubeId: h.youtubeId }, e)}
                      aria-label="Copy link to this video"
                      title={copiedId === cardId ? 'Copied!' : 'Copy link'}
                      type="button"
                    >
                      {copiedId === cardId ? '✓' : <LinkIcon />}
                    </button>
                  )}

                  <div className="badge">{h.badge}</div>
                  <div className="meta">
                    <div className="title">{h.title}</div>
                    <div className="sub">{h.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="view-all" onClick={onBack}>
            <span className="arr">←</span> Back to field hockey
          </button>
        </div>
      </div>
    </>
  );
}

export default AllHighlights;
export { ALL_HIGHLIGHTS };
