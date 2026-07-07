/**
 * Next Match Panel Component
 * Displays countdown timer, matchup analysis, and weather details.
 */
export class NextMatchPanel {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.timerInterval = null;
  }

  render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="next-match-panel animate-fade-in">
        <div class="next-match-card">
          <div class="next-match-badge">NEXT CLASH</div>
          <div class="next-match-vs">
            <div class="next-match-team">
              <span style="font-size: 2.2rem;">🇬🇧</span>
              <span>Man United</span>
            </div>
            <div class="next-match-middle-vs">VS</div>
            <div class="next-match-team">
              <span style="font-size: 2.2rem;">🇬🇧</span>
              <span>Liverpool</span>
            </div>
          </div>
          <div class="countdown-timer" id="next-match-countdown">00d 00h 00m 00s</div>
        </div>

        <h3 class="panel-subtitle" style="margin-top: var(--space-xl);">Pre-Match Intel</h3>
        <div class="intel-grid">
          <div class="intel-card">
            <div class="intel-card__title">🏟️ Stadium</div>
            <div class="intel-card__value">Old Trafford</div>
          </div>
          <div class="intel-card">
            <div class="intel-card__title">🌡️ Weather</div>
            <div class="intel-card__value">18°C Clear Sky</div>
          </div>
          <div class="intel-card">
            <div class="intel-card__title">🚗 Gate Congestion</div>
            <div class="intel-card__value text-accent">Minimal (5m)</div>
          </div>
          <div class="intel-card">
            <div class="intel-card__title">🚇 Closest Metro</div>
            <div class="intel-card__value">Trafford Bar (M)</div>
          </div>
        </div>

        <div style="margin-top: var(--space-xl); display: flex; gap: var(--space-sm);">
          <button id="btn-notify-match" class="btn btn--primary btn--md" style="flex: 1; border-radius: var(--radius-md);">
            🔔 Remind Me
          </button>
          <button id="btn-h2h-stats" class="btn btn--glass btn--md" style="flex: 1; border-radius: var(--radius-md);">
            📊 Form Guide
          </button>
        </div>
      </div>
    `;

    this._startTimer();

    this.containerEl.querySelector('#btn-notify-match')?.addEventListener('click', () => {
      alert('Notification reminder set for Manchester United vs Liverpool clash!');
    });
  }

  _startTimer() {
    const timerEl = this.containerEl.querySelector('#next-match-countdown');
    if (!timerEl) return;

    // Set countdown to 1 day, 6 hours from now
    const targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        timerEl.textContent = 'MATCH LIVE';
        clearInterval(this.timerInterval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      timerEl.textContent = `${days}d ${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    };

    updateTimer();
    this.timerInterval = setInterval(updateTimer, 1000);
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
