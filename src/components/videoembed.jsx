import React from 'react';

// Cloudflare Stream iframe with lazy-load-on-click.
// We don't load the iframe until the user clicks the poster — avoids
// loading N players on the highlights archive page.
//
// videoId  — the Cloudflare Stream video UID (e.g. "31c9291ab41fac05f...")
// title    — used for the <iframe title> and aria-label
// poster   — optional override URL for the thumbnail; otherwise Cloudflare's
//            auto-generated thumbnail is used.
export default function VideoEmbed({ videoId, title, poster }) {
  const [playing, setPlaying] = React.useState(false);

  // No video uploaded yet → render a plain placeholder so layout stays intact.
  if (!videoId) {
    return (
      <div className="thumb thumb-placeholder" aria-label={title || 'Video coming soon'}>
        <div className="play" />
      </div>
    );
  }

  const posterUrl = poster
    || `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg?time=1s&height=720`;

  if (!playing) {
    return (
      <button
        type="button"
        className="thumb thumb-poster"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title || 'video'}`}
        style={{ backgroundImage: `url(${posterUrl})` }}
      >
        <div className="play" />
      </button>
    );
  }

  return (
    <div className="thumb thumb-iframe">
      <iframe
        src={`https://iframe.videodelivery.net/${videoId}?autoplay=true&muted=false&preload=auto`}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        title={title || 'Highlight video'}
      />
    </div>
  );
}
