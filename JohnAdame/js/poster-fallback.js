export function buildVintagePosterSvgDataUri({ title = 'Cinema Show', year = '1940s', movieNumber = null } = {}) {
  const numBadge = movieNumber ? `#${movieNumber}` : 'WWII';
  const cleanTitle = (title || 'Feature Film').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanYear = (year || '1940s').replace(/&/g, '&amp;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="300" height="450">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2d3748" />
        <stop offset="100%" stop-color="#1a202c" />
      </linearGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#f6e05e" />
        <stop offset="100%" stop-color="#d69e2e" />
      </linearGradient>
    </defs>
    <rect width="300" height="450" fill="url(#bg)" rx="8" />
    <rect x="12" y="12" width="276" height="426" fill="none" stroke="#4a5568" stroke-width="2" stroke-dasharray="4 4" rx="6" />
    <circle cx="150" cy="110" r="45" fill="#2d3748" stroke="url(#gold)" stroke-width="2" />
    <text x="150" y="118" font-family="sans-serif" font-size="28" fill="#f6e05e" text-anchor="middle" font-weight="bold">📽️</text>
    <rect x="100" y="175" width="100" height="24" rx="12" fill="url(#gold)" />
    <text x="150" y="191" font-family="sans-serif" font-size="12" fill="#1a202c" text-anchor="middle" font-weight="bold">${numBadge}</text>
    <text x="150" y="240" font-family="Georgia, serif" font-size="18" fill="#ffffff" text-anchor="middle" font-weight="bold">
      ${cleanTitle.length > 26 ? cleanTitle.slice(0, 24) + '...' : cleanTitle}
    </text>
    <text x="150" y="270" font-family="sans-serif" font-size="14" fill="#a0aec0" text-anchor="middle">${cleanYear}</text>
    <line x1="60" y1="310" x2="240" y2="310" stroke="#4a5568" stroke-width="1" />
    <text x="150" y="340" font-family="sans-serif" font-size="11" fill="#cbd5e0" text-anchor="middle" letter-spacing="2">WAR DEPARTMENT</text>
    <text x="150" y="360" font-family="sans-serif" font-size="10" fill="#718096" text-anchor="middle">MOTION PICTURE SERVICE</text>
  </svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function resolvePosterSrc(urlOrMovie, movieNumber = null) {
  if (!urlOrMovie) {
    return buildVintagePosterSvgDataUri({ movieNumber });
  }
  if (typeof urlOrMovie === 'string') {
    if (urlOrMovie === 'N/A' || urlOrMovie.trim() === '') {
      return buildVintagePosterSvgDataUri({ movieNumber });
    }
    return urlOrMovie;
  }
  if (typeof urlOrMovie === 'object') {
    const url = urlOrMovie.posterUrl;
    if (url && url !== 'N/A' && url.startsWith('http')) {
      return url;
    }
    return buildVintagePosterSvgDataUri({
      title: urlOrMovie.title,
      year: urlOrMovie.year,
      movieNumber: movieNumber || urlOrMovie.movieNumber
    });
  }
  return buildVintagePosterSvgDataUri();
}
