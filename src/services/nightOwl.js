/**
 * Night Owl Service — The 2AM Problem Solver
 */

export class NightOwlService {
  constructor(matchFeed) {
    this.matchFeed = matchFeed;
    this.isActive = false;
    this.bigMomentCallbacks = new Set();
    this.breakTimer = null;
    this.eventsList = [];

    if (this.matchFeed) {
      this.matchFeed.onAny((event) => this._onEvent(event));
    }
  }

  activate() {
    this.isActive = true;
  }

  deactivate() {
    this.isActive = false;
    this.cancelBreakTimer();
  }

  clearEvents() {
    this.eventsList = [];
  }

  onBigMoment(callback) {
    this.bigMomentCallbacks.add(callback);
  }

  checkBigMoment(event) {
    const isBig = event.isKeyMoment || ['goal', 'red_card', 'penalty_awarded'].includes(event.type);
    return {
      shouldAlert: isBig,
      priority: event.type === 'goal' ? 'high' : 'normal'
    };
  }

  _onEvent(event) {
    this.eventsList.push(event);
    const alert = this.checkBigMoment(event);

    if (alert.shouldAlert) {
      this.triggerVibration([200, 100, 200, 100, 400]);
      this.bigMomentCallbacks.forEach(cb => cb(event));
    }
  }

  triggerVibration(pattern = [200, 100, 200]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore
      }
    }
  }

  async generateCatchUp(events, language = 'en') {
    try {
      const response = await fetch('/api/catchup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, language })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }

    const keyEvents = events.filter(e => e.isKeyMoment || ['goal', 'penalty_awarded', 'red_card'].includes(e.type));
    const summary = keyEvents.length > 0
      ? keyEvents.map(e => `${e.minute}' — ${e.details}`).join('\n')
      : 'Quiet period with no major incidents.';

    return {
      summary,
      keyMoments: keyEvents.map(e => ({ minute: e.minute, description: e.details }))
    };
  }

  isBreakSafe() {
    if (this.eventsList.length > 0) {
      const last = this.eventsList[this.eventsList.length - 1];
      const ts = last.timestamp || Date.now();
      if (['goal', 'penalty_awarded', 'red_card'].includes(last.type) && (Date.now() - ts < 60000)) {
        return {
          safe: false,
          confidence: 0.95,
          estimatedSafeMinutes: 0,
          reason: 'High momentum! Key moment occurred recently.'
        };
      }
    }

    return {
      safe: true,
      confidence: 0.85,
      estimatedSafeMinutes: 4,
      reason: 'Safe to step away — midfield possession phase with low goal probability.'
    };
  }

  startBreakTimer(minutes = 4, onTick, onComplete) {
    this.cancelBreakTimer();
    let secondsLeft = minutes * 60;

    this.breakTimer = setInterval(() => {
      secondsLeft--;
      if (onTick) onTick(secondsLeft);

      if (secondsLeft <= 0) {
        this.cancelBreakTimer();
        this.triggerVibration([500, 200, 500]);
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  cancelBreakTimer() {
    if (this.breakTimer) {
      clearInterval(this.breakTimer);
      this.breakTimer = null;
    }
  }
}
