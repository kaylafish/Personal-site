import React from 'react';

// Lazy-load video embed supporting both Cloudflare Stream and YouTube.
// The iframe is not created until the user clicks the poster thumbnail.
//
// Props:
//   videoId   — Cloudflare Stream UID  (e.g. "31c9291ab41fac05f...")
//   youtubeId — YouTube video ID       (e.g. "dQw4w9WgXcQ")
//   title     — aria-label + iframe title
//   poster    — optional thumbnail URL override
//   onPlay    — optional callback({ videoId, youtubeId }). When provided,
//               clicking the poster fires this instead of playing inline.
//               Used by AllHighlights / FieldHockey to open the modal.
//
// Supply exactly one of videoId or youtubeId. If neither is provided
// a placeholder card is rendered so the grid layout stays intact.
export default function VideoEmbed({ videoId, youtubeId, title, poster, onPlay }) {
  const [playing, setPlaying] = React.useState(false);
  const hasVideo = videoId || youtubeId;

  // No video yet → placeholder
  if (!hasVideo) {
    return (
      <div className="thumb thumb-placeholder" aria-label={title || 'Video coming soon'}>
        <div className="play" />
      </div>
    );
  }

  // Poster thumbnail
  const posterUrl = poster || (
    youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
      : `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg?time=1s&height=720`
  );

  const handleClick = () => {
    if (onPlay) onPlay({ videoId, youtubeId });
    else setPlaying(true);
  };

  if (!playing) {
    return (
      <button
        type="button"
        className="thumb thumb-poster"
        onClick={handleClick}
        aria-label={`Play ${title || 'video'}`}
      >
        <img
          src={posterUrl}
          alt={title || 'Video thumbnail'}
          className="thumb-poster-img"
          loading="lazy"
        />
        <div className="play" />
        {youtubeId && (
          <span className="yt-badge" aria-hidden="true">
            <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
              <rect width="16" height="11" rx="2.5" fill="#FF0000"/>
              <path d="M6.5 3.5l4 2-4 2V3.5z" fill="#fff"/>
            </svg>
          </span>
        )}
      </button>
    );
  }

  const iframeSrc = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`
    : `https://iframe.videodelivery.net/${videoId}?autoplay=true&muted=false&preload=auto`;

  const iframeAllow = youtubeId
    ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    : 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';

  return (
    <div className="thumb thumb-iframe">
      <iframe
        src={iframeSrc}
        loading="lazy"
        allow={iframeAllow}
        allowFullScreen
        title={title || 'Video'}
      />
    </div>
  );
}
