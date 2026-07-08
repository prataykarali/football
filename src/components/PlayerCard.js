/**
 * Player Zoom Card — shows player info with photo, stats, fun fact
 */
import { escapeHTML } from '../utils/dom.js';

export class PlayerCard {
  constructor(containerEl) {
    this.containerEl = containerEl;
  }

  render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="player-card" role="dialog" aria-label="Player Information" tabindex="-1">
        <button class="player-card__close" aria-label="Close card">×</button>
        <div id="player-card-content"></div>
      </div>
    `;

    this.containerEl.querySelector('.player-card__close')?.addEventListener('click', () => this.hide());
  }

  show(sceneData) {
    if (!this.containerEl) return;
    const contentEl = this.containerEl.querySelector('#player-card-content');
    if (!contentEl) return;

    const safeHome = escapeHTML(sceneData.homeTeam || 'Unknown');
    const safeAway = escapeHTML(sceneData.awayTeam || 'Unknown');
    const safeScore = escapeHTML(sceneData.score || 'unknown');
    const safeMinute = escapeHTML(sceneData.minute || 'unknown');
    const safeInFocus = escapeHTML(sceneData.inFocus || 'Player in focus');
    const safePhase = escapeHTML(sceneData.phase || 'open play');
    const safeFunFact = escapeHTML(sceneData.funFact || 'No extra context available for this frame.');

    // A named player is only shown when Gemini could legibly identify one.
    const named = sceneData.player && sceneData.player !== 'Unknown'
      ? escapeHTML(sceneData.player) : null;

    const safeConfidence = Number.isFinite(Number(sceneData.confidence)) ? Number(sceneData.confidence) : 0;
    const notConfigured = sceneData.source === 'not-configured';
    const isUncertain = Boolean(sceneData.isUncertain) || safeConfidence < 0.7;
    const confClass = isUncertain ? 'confidence-tag--low' : 'confidence-tag--high';
    const confLabel = notConfigured
      ? 'AI vision unavailable'
      : `${isUncertain ? 'Reading' : 'Clear read'} · ${Math.round(safeConfidence * 100)}% confidence`;

    contentEl.innerHTML = `
      <div class="player-card__header">
        <div class="vision-read__eyebrow">🔍 AI Vision Read</div>
        <h3 class="player-card__name">${safeHome} <span class="vision-read__score">${safeScore}</span> ${safeAway}</h3>
        <p class="player-card__position">Match clock · ${safeMinute}</p>
        <span class="confidence-tag ${confClass}">${escapeHTML(confLabel)}</span>
      </div>
      <div class="vision-read__rows">
        <div class="vision-read__row">
          <span class="vision-read__key">In focus</span>
          <span class="vision-read__val">${named ? `<strong>${named}</strong> — ` : ''}${safeInFocus}</span>
        </div>
        <div class="vision-read__row">
          <span class="vision-read__key">Phase</span>
          <span class="vision-read__val">${safePhase}</span>
        </div>
      </div>
      <div class="player-card__fun-fact">
        <strong>What Gemini sees:</strong> ${safeFunFact}
      </div>
    `;

    this.containerEl.hidden = false;
  }

  showLoading() {
    if (!this.containerEl) return;
    const contentEl = this.containerEl.querySelector('#player-card-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 24px;">
          <div class="spinner" style="margin: 0 auto 16px;"></div>
          <p style="color: var(--text-secondary);">Analyzing camera frame with Gemini Vision...</p>
        </div>
      `;
    }
    this.containerEl.hidden = false;
  }

  showError(msg) {
    if (!this.containerEl) return;
    const contentEl = this.containerEl.querySelector('#player-card-content');
    if (contentEl) {
      contentEl.innerHTML = `<p style="color: var(--accent-red); text-align: center;">${escapeHTML(msg)}</p>`;
    }
    this.containerEl.hidden = false;
  }

  _safeStat(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.round(number);
  }

  hide() {
    if (this.containerEl) this.containerEl.hidden = true;
  }
}
