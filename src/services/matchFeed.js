/**
 * Simulated Real-Time Match Event Feed
 */

export class MatchFeed {
  constructor(events = [], speed = 10) {
    this.events = events;
    this.speed = speed;
    this.currentIndex = 0;
    this.listeners = new Map();
    this.anyListeners = new Set();
    this.timer = null;
    this.eventLog = [];
    this.isRunning = false;
    this.score = { home: 0, away: 0 };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._scheduleNext();
  }

  pause() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  stop() {
    this.pause();
    this.currentIndex = 0;
    this.eventLog = [];
    this.score = { home: 0, away: 0 };
  }

  resume() {
    this.start();
  }

  setSpeed(newSpeed) {
    this.speed = Math.max(1, newSpeed);
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  onAny(callback) {
    this.anyListeners.add(callback);
  }

  offAny(callback) {
    this.anyListeners.delete(callback);
  }

  getEventLog() {
    return [...this.eventLog];
  }

  getMatchMinute() {
    if (this.eventLog.length === 0) return 0;
    return this.eventLog[this.eventLog.length - 1].minute;
  }

  getCurrentState() {
    return {
      minute: this.getMatchMinute(),
      score: { ...this.score },
      recentEvents: this.eventLog.slice(-5)
    };
  }

  _scheduleNext() {
    if (!this.isRunning || this.currentIndex >= this.events.length) return;

    const event = this.events[this.currentIndex];
    const prevMinute = this.currentIndex > 0 ? this.events[this.currentIndex - 1].minute : 0;
    const minDiff = Math.max(0.5, event.minute - prevMinute);

    // Calculate delay in ms based on speed (1 min simulated = 60s / speed)
    const delay = Math.max(800, (minDiff * 60 * 1000) / this.speed);

    this.timer = setTimeout(() => {
      this._emitEvent(event);
      this.currentIndex++;
      this._scheduleNext();
    }, delay);
  }

  _emitEvent(event) {
    // Update internal score
    if (event.type === 'goal') {
      if (event.team === 'ARG') this.score.home++;
      else if (event.team === 'FRA') this.score.away++;
    }

    this.eventLog.push(event);

    // Notify listeners
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach(cb => cb(event));
    }

    this.anyListeners.forEach(cb => cb(event));
  }

  destroy() {
    this.pause();
    this.listeners.clear();
    this.anyListeners.clear();
    this.eventLog = [];
  }
}
