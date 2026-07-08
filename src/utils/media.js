/**
 * Media URL resolver.
 *
 * Media assets live in the separate vantage-football release, not in this repo.
 * Only known asset-style paths are converted, so callers cannot load arbitrary
 * origins through these helpers.
 */
export const MEDIA_BASE = 'https://github.com/prataykarali/vantage-football/releases/download/media-v1';
export const VIDEO_BASE = MEDIA_BASE;
export const IMAGE_BASE = MEDIA_BASE;

export const IMAGE_ASSETS = {
  metlife: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop',
  sofi: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=800&auto=format&fit=crop',
  azteca: 'https://images.unsplash.com/photo-1504150559411-a4778a0d4112?q=80&w=800&auto=format&fit=crop',
  bcPlace: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=800&auto=format&fit=crop',
};

const VIDEO_PATH_RE = /^\/videos\/([-\w.]+\.mp4)$/i;

/**
 * Map a known video asset path to its release URL.
 *
 * @param {string} path asset path or release URL
 * @returns {string|null} resolved URL, or null if `path` is not a whitelisted clip.
 */
export function resolveVideo(path) {
  const text = String(path || '').trim();
  if (text.startsWith(`${VIDEO_BASE}/`) && /\.mp4($|\?)/i.test(text)) return text;
  const match = VIDEO_PATH_RE.exec(text);
  if (!match) return null;
  const file = match[1];
  if (file.includes('..')) return null; // defence-in-depth against path traversal
  return `${VIDEO_BASE}/${file}`;
}

export function resolveImage(key) {
  return IMAGE_ASSETS[key] || IMAGE_ASSETS.metlife;
}
