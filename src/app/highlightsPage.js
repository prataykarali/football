import { escapeHTML } from '../utils/dom.js';
import { REAL_HIGHLIGHTS, youtubeEmbedUrl, youtubeThumb } from '../data/highlights.js';

export const highlightsPageMethods = {
  _initHighlightsPage() {
    const container = document.getElementById('highlights-grid');
    if (!container) return;
    this._renderHighlights(container, REAL_HIGHLIGHTS);
  },

  /**
   * Render real, official YouTube highlight embeds. Cards show a lightweight
   * thumbnail until clicked (no iframe is loaded until the user plays it), which
   * keeps the page fast and avoids autoplaying several videos at once.
   */
  _renderHighlights(container, highlights) {
    container.innerHTML = highlights.map((h, i) => {
      const safeType = this._safeHighlightType(h.type);
      const id = String(h.youtubeId || '').replace(/[^\w-]/g, '');
      const poster = youtubeThumb(id);
      const title = escapeHTML(h.title || 'Match highlight');
      const match = escapeHTML(h.match || 'Football match');
      const minute = escapeHTML(h.minute || '');
      return `
      <div class="highlight-card highlight-card--${safeType}" data-yt="${id}" data-idx="${i}" style="opacity:1;transform:none;">
        <div class="highlight-card__video-wrap" style="position:relative;width:100%;height:180px;overflow:hidden;border-radius:var(--radius-md) var(--radius-md) 0 0;background:#000;cursor:pointer;">
          <img class="hl-thumb" src="${escapeHTML(poster)}" alt="${title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;" />
          <div class="hl-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);transition:background 0.3s;">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="white" opacity="0.92"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <span style="position:absolute;bottom:8px;right:8px;font-size:0.6rem;font-weight:700;letter-spacing:0.05em;color:#fff;background:rgba(0,0,0,0.6);padding:2px 6px;border-radius:4px;">▶ YOUTUBE</span>
        </div>
        <div class="highlight-card__body">
          <div class="highlight-card__type">${safeType.toUpperCase()}</div>
          <div class="highlight-card__title">${title}</div>
          <div class="highlight-card__meta">
            <span>${match}</span>
            <span>${minute}</span>
          </div>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.highlight-card').forEach(card => {
      const wrap = card.querySelector('.highlight-card__video-wrap');
      const overlay = card.querySelector('.hl-overlay');

      wrap?.addEventListener('mouseenter', () => { if (overlay) overlay.style.background = 'rgba(0,0,0,0.15)'; });
      wrap?.addEventListener('mouseleave', () => { if (overlay && !card.dataset.playing) overlay.style.background = 'rgba(0,0,0,0.35)'; });

      wrap?.addEventListener('click', () => {
        const id = card.dataset.yt;
        if (!id || card.dataset.playing) return;
        card.dataset.playing = 'true';
        wrap.innerHTML = `
          <iframe src="${escapeHTML(youtubeEmbedUrl(id, { autoplay: true, muted: false }))}"
            title="Match highlight"
            style="width:100%;height:100%;border:0;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen loading="lazy"></iframe>`;
      });
    });
  },

  _safeHighlightType(type = '') {
    const safe = String(type).toLowerCase();
    return ['goal', 'penalty', 'red', 'shot', 'save'].includes(safe) ? safe : 'goal';
  }

  // ─── PREDICTIONS PAGE ───────────────────────────────────
};
