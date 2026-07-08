/**
 * Night Owl Mode Panel
 */
export class NightOwlPanel {
  constructor(containerEl, nightOwlService) {
    this.containerEl = containerEl;
    this.nightOwlService = nightOwlService;
  }

  render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="night-owl-panel">
        <div class="night-owl-status">
          <div class="night-owl-status__icon">🦉</div>
          <div>
            <div class="night-owl-status__text">Night Owl Mode</div>
            <div class="night-owl-status__sub">Designed for 2AM viewers — alerts, catch-ups, break timers</div>
          </div>
        </div>

        <div style="background: linear-gradient(135deg, rgba(0,255,102,0.06), rgba(0,0,0,0.4)); border: 1px solid rgba(0, 255, 102, 0.15); padding: 14px; border-radius: var(--radius-md); font-size: 0.8rem; margin-bottom: var(--space-md); line-height: 1.5;">
          <h4 style="font-family: var(--font-heading); color: var(--accent-green); font-size: 0.95rem; margin-bottom: 6px; letter-spacing: 0.04em;">⚽ THE HUMAN STORY</h4>
          <p style="color: var(--text-primary); font-style: italic;">
            "For the fan in Kolkata watching at 2 AM. You love football, but the world's infrastructure wasn't built for your timezone, your language, or your accessibility needs. VANTAGE is built for you."
          </p>
        </div>

        <button id="btn-break-check" class="action-btn action-btn--primary" style="width: 100%; justify-content: center; margin-bottom: var(--space-md);">
          <span>☕</span> Check Break Window
        </button>

        <div id="night-owl-alert-area"></div>

        <div class="catch-up-card">
          <div class="catch-up-card__title">📋 Catch-Up Checkpoint</div>
          <div id="catchup-summary-content" class="catch-up-card__text">
            Click "Catch Up" in the toolbar to generate an AI summary of what you missed.
          </div>
        </div>

        <div id="night-owl-micro-quizzes" style="margin-top: var(--space-sm);"></div>
      </div>
    `;

    this.containerEl.querySelector('#btn-break-check')?.addEventListener('click', () => this.checkBreakWindow());
  }

  activate() {
    this.render();
  }

  deactivate() {
    if (this.containerEl) {
      this.containerEl.innerHTML = `
        <div style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: var(--space-sm);">☀️</div>
          <p>Night Owl Mode is off</p>
          <p style="font-size: 0.8rem; margin-top: var(--space-xs);">Toggle it from the header to activate</p>
        </div>
      `;
    }
  }

  showBigMomentAlert(event) {
    const alertArea = this.containerEl?.querySelector('#night-owl-alert-area');
    if (!alertArea) return;

    const labels = { goal: '⚽ GOAL!', red_card: '🟥 RED CARD!', penalty_awarded: '⚠️ PENALTY!' };
    const label = labels[event.type] || '🔔 BIG MOMENT';

    alertArea.innerHTML = `
      <div class="alert-banner">
        ${label} ${event.minute}' — ${event.details || ''}
      </div>
    `;
  }

  checkBreakWindow() {
    const alertArea = this.containerEl?.querySelector('#night-owl-alert-area');
    if (!alertArea || !this.nightOwlService) return;

    const status = this.nightOwlService.isBreakSafe();
    if (status.safe) {
      alertArea.innerHTML = `
        <div class="break-timer">
          <div class="break-timer__icon">🟢</div>
          <div>
            <div class="break-timer__text">Safe for a 4-min break!</div>
            <div class="break-timer__sub">${status.reason}</div>
          </div>
        </div>
      `;
    } else {
      alertArea.innerHTML = `
        <div class="break-timer" style="background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.2);">
          <div class="break-timer__icon">🔴</div>
          <div>
            <div class="break-timer__text" style="color: var(--accent-red);">Don't step away!</div>
            <div class="break-timer__sub">${status.reason}</div>
          </div>
        </div>
      `;
    }
  }

  showCatchUpSummary(data) {
    const el = this.containerEl?.querySelector('#catchup-summary-content');
    if (!el) return;
    el.innerHTML = `<p style="white-space: pre-line; color: var(--text-primary);">${data.summary}</p>`;
  }
}
