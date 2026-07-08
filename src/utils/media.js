/**
 * Media URL resolver.
 *
 * To keep the git repository under the 10 MB submission limit, the bulky match /
 * stadium / crowd videos are hosted as GitHub Release assets (a free CDN) instead
 * of being committed. Only `/videos/<name>.mp4` paths are ever accepted — the same
 * strict whitelist the rest of the app enforces — so a caller can never be tricked
 * into loading an arbitrary origin.
 *
 * The single demo clip used by the AI player-ID / Gemini Vision feature stays in
 * the repo and is served same-origin: a cross-origin <video> taints the canvas and
 * blocks the pixel-level frame capture that vision relies on.
 */
export const VIDEO_BASE =
  'https://github.com/prataykarali/vantage-football/releases/download/media-v1';

// Kept in-repo (same-origin) so the vision canvas capture is not CORS-tainted.
const LOCAL_VIDEOS = new Set(['football-goal-1.mp4']);

const VIDEO_PATH_RE = /^\/videos\/([-\w.]+\.mp4)$/i;

/**
 * Map a whitelisted `/videos/<name>.mp4` path to its real URL.
 * Local demo clips resolve same-origin; everything else resolves to the release CDN.
 *
 * @param {string} path e.g. "/videos/stadium-wide.mp4"
 * @returns {string|null} resolved URL, or null if `path` is not a whitelisted clip.
 */
export function resolveVideo(path) {
  const match = VIDEO_PATH_RE.exec(String(path || '').trim());
  if (!match) return null;
  const file = match[1];
  if (file.includes('..')) return null; // defence-in-depth against path traversal
  return LOCAL_VIDEOS.has(file) ? `/videos/${file}` : `${VIDEO_BASE}/${file}`;
}
