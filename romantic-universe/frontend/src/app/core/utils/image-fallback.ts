export function getImageFallbacks(url: string): string[] {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  if (lower.endsWith('.png')) {
    return [trimmed, trimmed.replace(/\.png$/i, '.jpg'), trimmed.replace(/\.png$/i, '.jpeg')];
  }

  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return [trimmed, trimmed.replace(/\.(jpe?g)$/i, '.png')];
  }

  return [trimmed];
}

/** Elegant SVG placeholder when personal photos are not yet in assets. */
export function placeholderImageDataUrl(label = 'Photo'): string {
  const safe = label.replace(/[<>&"']/g, '').slice(0, 32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1a1218"/>
        <stop offset="100%" stop-color="#2d1f28"/>
      </linearGradient>
    </defs>
    <rect width="400" height="500" fill="url(#g)"/>
    <circle cx="200" cy="210" r="72" fill="none" stroke="#c9a0a8" stroke-opacity="0.35" stroke-width="1.5"/>
    <text x="200" y="330" text-anchor="middle" fill="#f5f0e8" fill-opacity="0.45" font-family="Georgia, serif" font-size="18">${safe}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Try each candidate URL; return the first that loads, else an SVG placeholder. */
export function resolveAccessibleImageUrl(url: string, label = 'Photo'): Promise<string> {
  const candidates = expandImageCandidates(url);
  if (!candidates.length) {
    return Promise.resolve(placeholderImageDataUrl(label));
  }

  return new Promise(resolve => {
    const tryNext = (index: number): void => {
      const candidate = candidates[index];
      if (!candidate) {
        resolve(placeholderImageDataUrl(label));
        return;
      }

      const img = new Image();
      img.onload = () => resolve(candidate);
      img.onerror = () => tryNext(index + 1);
      img.src = candidate;
    };

    tryNext(0);
  });
}

function expandImageCandidates(url: string): string[] {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const ordered: string[] = [];

  const add = (candidate: string): void => {
    const value = candidate.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    ordered.push(value);
  };

  for (const candidate of getImageFallbacks(trimmed)) {
    add(candidate);
  }

  const siteGalleryMatch = trimmed.match(/\/assets\/sites\/[^/]+\/gallery\/(.+)$/i);
  if (siteGalleryMatch) {
    add(`/assets/images/gallery/${siteGalleryMatch[1]}`);
  }

  const legacyGalleryMatch = trimmed.match(/\/assets\/images\/gallery\/(.+)$/i);
  if (legacyGalleryMatch) {
    add(`/assets/sites/kavi/gallery/${legacyGalleryMatch[1]}`);
  }

  return ordered;
}
