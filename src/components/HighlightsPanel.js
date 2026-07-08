/**
 * Highlights Panel — shows key match moments with video thumbnails
 */
import { IMAGE_BASE, resolveVideo, VIDEO_BASE } from '../utils/media.js';

export class HighlightsPanel {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this._onClick = null;
  }

  render(events) {
    if (!this.containerEl) return;

    const keyEvents = events.filter(e =>
      e.isKeyMoment || e.type === 'goal' || e.type === 'penalty_awarded' ||
      e.type === 'red_card' || e.type === 'shot' || e.type === 'substitution'
    );

    const videoThumbs = {
      goal: `${VIDEO_BASE}/highlight-goal.mp4`,
      penalty_awarded: `${VIDEO_BASE}/football-goal-2.mp4`,
      red_card: `${VIDEO_BASE}/match-action.mp4`,
      shot: `${VIDEO_BASE}/highlight-shot.mp4`,
      substitution: `${VIDEO_BASE}/football-match-2.mp4`,
      foul: `${VIDEO_BASE}/football-match-1.mp4`,
    };

    const imageThumbs = {
      goal: `${IMAGE_BASE}/crowd-fans.jpg`,
      penalty_awarded: `${IMAGE_BASE}/stadium-night.jpg`,
      red_card: `${IMAGE_BASE}/match-action.jpg`,
      shot: `${IMAGE_BASE}/pitch-green.jpg`,
      substitution: `${IMAGE_BASE}/stadium-aerial.jpg`,
    };

    this.containerEl.innerHTML = `
      <div class="highlights-panel" role="list" aria-label="Match highlights">
        <div style="margin-bottom: var(--space-sm); font-size: 0.8rem; color: var(--text-muted);">
          ${keyEvents.length} key moments — tap to replay with AI commentary
        </div>
        ${keyEvents.map(ev => `
          <div class="highlight-card highlight-card--${ev.type}" role="listitem" tabindex="0" data-event-id="${ev.id}" aria-label="${ev.minute} minute: ${ev.details}">
            <div class="highlight-card__thumb">
              <video class="highlight-video-thumb" muted loop preload="none" playsinline aria-hidden="true"
                data-src="${videoThumbs[ev.type] || `${VIDEO_BASE}/match-action.mp4`}"
                poster="${imageThumbs[ev.type] || `${IMAGE_BASE}/pitch-green.jpg`}">
              </video>
            </div>
            <div class="highlight-card__body">
              <div class="highlight-card__time">${ev.minute}'</div>
              <div class="highlight-card__content">
                <div class="highlight-card__type">${this._typeLabel(ev.type)}</div>
                <div class="highlight-card__desc">${ev.details}</div>
                ${ev.player ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${ev.player} · ${ev.team}</div>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Hover to play video preview
    this.containerEl.querySelectorAll('.highlight-card').forEach(card => {
      const video = card.querySelector('video');
      if (!video) return;

      card.addEventListener('mouseenter', () => {
        if (video.dataset.src && !video.src) {
          const resolved = resolveVideo(video.dataset.src);
          if (resolved) video.src = resolved;
        }
        video.play().catch(() => {});
      });

      card.addEventListener('mouseleave', () => {
        video.pause();
        video.currentTime = 0;
      });

      // Click handler
      const handler = () => {
        const id = parseInt(card.dataset.eventId, 10);
        const event = events.find(e => e.id === id);
        if (event && this._onClick) this._onClick(event);
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') handler(); });
    });
  }

  onHighlightClick(fn) {
    this._onClick = fn;
  }

  _typeLabel(type) {
    const labels = {
      goal: '⚽ Goal',
      penalty_awarded: '⚠️ Penalty',
      red_card: '🟥 Red Card',
      yellow_card: '🟨 Yellow Card',
      shot: '🎯 Shot',
      substitution: '🔄 Substitution',
      foul: '⚡ Foul',
      corner: '🚩 Corner',
      half_time: '⏱️ Half Time',
      extra_time: '⏰ Extra Time',
      penalty_shootout: '🥅 Shootout',
      kickoff: '🏁 Kickoff',
      second_half: '🔄 Second Half',
      possession: '📊 Possession',
    };
    return labels[type] || type;
  }
}
