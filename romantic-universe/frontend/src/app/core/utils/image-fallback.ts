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

export function tryNextImageUrl(currentUrl: string, seen = new Set<string>()): string | null {
  const candidates = getImageFallbacks(currentUrl);
  const next = candidates.find(candidate => !seen.has(candidate));
  if (!next) return null;

  seen.add(next);
  return next;
}
