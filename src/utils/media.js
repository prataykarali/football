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

const VIDEO_PATH_RE = /^\/videos\/([-\w.]+\.mp4)$/i;
const IMAGE_PATH_RE = /^\/images\/([-\w.]+\.(?:jpe?g|png|webp|avif|gif))$/i;

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


