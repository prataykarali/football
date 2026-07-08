import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app.js';

function createElementStub() {
  return {
    textContent: '',
    style: {},
    src: '',
  };
}

function stubDocument(ids) {
  const elements = new Map(ids.map((id) => [id, createElementStub()]));
  vi.stubGlobal('document', {
    getElementById: vi.fn((id) => elements.get(id) || null),
  });
  return elements;
}

describe('App timers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the official live match timer visible and ticking', () => {
    const elements = stubDocument(['live-score-timer', 'live-score-minute']);
    const app = new App();

    app._startRealLiveClock({
      status: {
        clock: '12:34',
        isLive: true,
      },
    });

    expect(elements.get('live-score-minute').textContent).toBe('12\'');
    expect(elements.get('live-score-timer').textContent).toBe('12:34');

    vi.advanceTimersByTime(2000);

    expect(elements.get('live-score-timer').textContent).toBe('12:34');
    app.destroy();
  });

  it('does not leave the live scoreboard timer blank for upcoming official matches', () => {
    const elements = stubDocument([
      'live-score-numbers',
      'live-score-minute',
      'live-score-timer',
      'live-home-name',
      'live-away-name',
      'live-home-flag',
      'live-away-flag',
      'live-home-logo',
      'live-away-logo',
      'live-match-venue',
    ]);
    const app = new App();

    app._applyRealMatchToUI({
      date: '2026-07-08T16:00:00Z',
      venue: 'MetLife Stadium',
      status: {
        isLive: false,
        isFinished: false,
      },
      homeTeam: {
        name: 'Argentina',
        abbreviation: 'ARG',
        score: 0,
      },
      awayTeam: {
        name: 'Egypt',
        abbreviation: 'EGY',
        score: 0,
      },
    });

    expect(elements.get('live-score-minute').textContent).toBe('KICKOFF IN');
    expect(elements.get('live-score-timer').textContent).toBe('CALCULATING KICKOFF...');
    expect(elements.get('live-score-timer').style.color).toBe('var(--accent-amber)');
  });

  it('clears managed intervals on destroy', () => {
    const app = new App();
    const tick = vi.fn();

    app._startManagedInterval('test', tick, 1000);
    vi.advanceTimersByTime(1000);
    expect(tick).toHaveBeenCalledTimes(1);

    app.destroy();
    vi.advanceTimersByTime(1000);

    expect(tick).toHaveBeenCalledTimes(1);
  });
});
