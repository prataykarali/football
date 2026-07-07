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

  show(playerData) {
    if (!this.containerEl) return;
    const contentEl = this.containerEl.querySelector('#player-card-content');
    if (!contentEl) return;

    const safePlayer = escapeHTML(playerData.player || 'Unknown player');
    const safePosition = escapeHTML(playerData.position || 'Position unknown');
    const safeNationality = escapeHTML(playerData.nationality || 'Nationality unknown');
    const safeFlag = escapeHTML(playerData.nationalityFlag || '🌐');
    const safeFunFact = escapeHTML(playerData.funFact || 'No extra context available for this frame.');
    const safeStats = {
      goals: this._safeStat(playerData.stats?.goals),
      assists: this._safeStat(playerData.stats?.assists),
      passes: this._safeStat(playerData.stats?.passes),
    };
    const safeConfidence = Number.isFinite(Number(playerData.confidence)) ? Number(playerData.confidence) : 0;
    const isUncertain = Boolean(playerData.isUncertain) || safeConfidence < 0.7;
    const confClass = isUncertain ? 'confidence-tag--low' : 'confidence-tag--high';
    const confLabel = isUncertain
      ? `Uncertain (${Math.round(safeConfidence * 100)}%) — Nearest match context`
      : `High Confidence (${Math.round(safeConfidence * 100)}%)`;

    const playerImages = {
      'Lionel Messi': '/images/messi-like.jpg',
      'Kylian Mbappé': '/images/mbappe-like.jpg',
      'Ángel Di María': '/images/match-action.jpg',
    };

    const imgSrc = playerImages[playerData.player] || '/images/football-icon.jpg';

    contentEl.innerHTML = `
      <div class="player-card__photo">
        <img src="${imgSrc}" alt="${safePlayer}" class="player-card__img" loading="lazy" />
      </div>
      <div class="player-card__header">
        <div class="player-card__flag">${safeFlag}</div>
        <h3 class="player-card__name">${safePlayer}</h3>
        <p class="player-card__position">${safePosition} · ${safeNationality}</p>
        <span class="confidence-tag ${confClass}">${escapeHTML(confLabel)}</span>
      </div>
      <div class="player-card__stats">
        <div>
          <div class="stat-val">${safeStats.goals}</div>
          <div class="stat-lbl">Goals</div>
        </div>
        <div>
          <div class="stat-val">${safeStats.assists}</div>
          <div class="stat-lbl">Assists</div>
        </div>
        <div>
          <div class="stat-val">${safeStats.passes}</div>
          <div class="stat-lbl">Passes</div>
        </div>
      </div>
      <div class="player-card__fun-fact">
        <strong>Context:</strong> ${safeFunFact}
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
