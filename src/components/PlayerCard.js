/**
 * Player Zoom Card — shows player info with photo, stats, fun fact
 */
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

    const confClass = playerData.isUncertain ? 'confidence-tag--low' : 'confidence-tag--high';
    const confLabel = playerData.isUncertain
      ? `Uncertain (${Math.round(playerData.confidence * 100)}%) — Nearest Match`
      : `High Confidence (${Math.round(playerData.confidence * 100)}%)`;

    const playerImages = {
      'Lionel Messi': '/images/messi-like.jpg',
      'Kylian Mbappé': '/images/mbappe-like.jpg',
      'Ángel Di María': '/images/match-action.jpg',
    };

    const imgSrc = playerImages[playerData.player] || '/images/football-icon.jpg';

    contentEl.innerHTML = `
      <div class="player-card__photo">
        <img src="${imgSrc}" alt="${playerData.player}" class="player-card__img" loading="lazy" />
      </div>
      <div class="player-card__header">
        <div class="player-card__flag">${playerData.nationalityFlag || '🌐'}</div>
        <h3 class="player-card__name">${playerData.player}</h3>
        <p class="player-card__position">${playerData.position} · ${playerData.nationality}</p>
        <span class="confidence-tag ${confClass}">${confLabel}</span>
      </div>
      <div class="player-card__stats">
        <div>
          <div class="stat-val">${playerData.stats?.goals ?? 0}</div>
          <div class="stat-lbl">Goals</div>
        </div>
        <div>
          <div class="stat-val">${playerData.stats?.assists ?? 0}</div>
          <div class="stat-lbl">Assists</div>
        </div>
        <div>
          <div class="stat-val">${playerData.stats?.passes ?? 0}</div>
          <div class="stat-lbl">Passes</div>
        </div>
      </div>
      <div class="player-card__fun-fact">
        <strong>Fun Fact:</strong> ${playerData.funFact}
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
      contentEl.innerHTML = `<p style="color: var(--accent-red); text-align: center;">${msg}</p>`;
    }
    this.containerEl.hidden = false;
  }

  hide() {
    if (this.containerEl) this.containerEl.hidden = true;
  }
}
