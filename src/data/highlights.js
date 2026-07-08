/**
 * Real match highlights + live stream configuration.
 *
 * These are REAL, publicly-embeddable YouTube videos from FIFA / official
 * broadcasters (verified embeddable via YouTube oEmbed). To refresh them, paste
 * any `youtube.com/watch?v=<ID>` link's ID below — no API key required.
 *
 * We intentionally do NOT re-host match footage. Everything here is an official
 * YouTube embed, which is the only legally-clean way to show real highlights.
 */

/**
 * @typedef {Object} Highlight
 * @property {string} type      Card accent: goal | penalty | shot | save
 * @property {string} title     Human-readable clip title
 * @property {string} match     Fixture label
 * @property {string} minute    Optional minute/label badge
 * @property {string} youtubeId Public, embeddable YouTube video ID
 */

/** @type {Highlight[]} */
export const REAL_HIGHLIGHTS = [
  { type: 'goal', title: 'Argentina 3–3 France — The Greatest Final Ever', match: 'FIFA World Cup 2022 Final', minute: 'FT', youtubeId: 'agrGb25mJzs' },
  { type: 'goal', title: 'Argentina 3–2 Cabo Verde — Extended Highlights', match: 'FIFA World Cup 2026™', minute: 'AET', youtubeId: 'hzvEZ2Vxb94' },
  { type: 'shot', title: 'Paraguay vs France — Round of 16 Highlights', match: 'FIFA World Cup 2026™ · R16', minute: 'FT', youtubeId: '2ANrnnZEE6c' },
  { type: 'goal', title: 'Mexico vs England — Round of 16 Highlights', match: 'FIFA World Cup 2026™ · R16', minute: 'FT', youtubeId: 'n7cA4k6TJbs' },
];

/** Build the standard embeddable player URL for a YouTube video/live ID. */
export function youtubeEmbedUrl(id, { autoplay = false, muted = true } = {}) {
  const safeId = String(id || '').replace(/[^\w-]/g, '');
  return `https://www.youtube.com/embed/${safeId}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}&rel=0&playsinline=1`;
}

/** High-quality thumbnail poster for a YouTube video ID. */
export function youtubeThumb(id) {
  const safeId = String(id || '').replace(/[^\w-]/g, '');
  return `https://i.ytimg.com/vi/${safeId}/hqdefault.jpg`;
}

/**
 * Live stream source for the featured match.
 *
 * There is no controllable live World Cup feed we can legally re-host, so this
 * defaults to an official FIFA embed as a placeholder "stream". At real match
 * time, swap `LIVE_STREAM_YOUTUBE_ID` for the broadcaster's live video ID (or
 * paste one into the "Embed YouTube Link" box on the Live page).
 */
export const LIVE_STREAM_YOUTUBE_ID = 'hzvEZ2Vxb94';
