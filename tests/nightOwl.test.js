import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NightOwlService } from '../src/services/nightOwl.js';

// Mock Vibration API
vi.stubGlobal('navigator', {
  vibrate: vi.fn(() => true),
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

describe('NightOwlService', () => {
  let service;

  beforeEach(() => {
    service = new NightOwlService();
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Big Moment alerts', () => {
    it('should fire alert on goal event', () => {
      const event = { type: 'goal', player: 'Messi', minute: 23 };
      const alert = service.checkBigMoment(event);

      expect(alert.shouldAlert).toBe(true);
      expect(alert.priority).toBe('high');
    });

    it('should fire alert on red_card event', () => {
      const event = { type: 'red_card', player: 'Ramos', minute: 67 };
      const alert = service.checkBigMoment(event);

      expect(alert.shouldAlert).toBe(true);
    });

    it('should fire alert on penalty_awarded event', () => {
      const event = { type: 'penalty_awarded', player: 'Salah', minute: 80 };
      const alert = service.checkBigMoment(event);

      expect(alert.shouldAlert).toBe(true);
    });

    it('should NOT fire alert on pass event', () => {
      const event = { type: 'pass', player: 'Kroos', minute: 15 };
      const alert = service.checkBigMoment(event);

      expect(alert.shouldAlert).toBe(false);
    });

    it('should NOT fire alert on possession event', () => {
      const event = { type: 'possession', team: 'Barcelona', value: 65, minute: 30 };
      const alert = service.checkBigMoment(event);

      expect(alert.shouldAlert).toBe(false);
    });

    it('should NOT fire alert on corner event', () => {
      const event = { type: 'corner', team: 'Liverpool', minute: 42 };
      const alert = service.checkBigMoment(event);

      expect(alert.shouldAlert).toBe(false);
    });
  });

  describe('Break window', () => {
    it('should report safe when no key events in last 5 minutes', () => {
      const events = [
        { type: 'pass', player: 'Pedri', minute: 20, timestamp: Date.now() - 6 * 60 * 1000 },
        { type: 'possession', team: 'Spain', minute: 22, timestamp: Date.now() - 7 * 60 * 1000 },
      ];
      service.eventsList = events;

      const breakWindow = service.isBreakSafe();

      expect(breakWindow.safe).toBe(true);
    });

    it('should report NOT safe right after a goal', () => {
      const events = [
        { type: 'goal', player: 'Haaland', minute: 44, timestamp: Date.now() - 30 * 1000 },
      ];
      service.eventsList = events;

      const breakWindow = service.isBreakSafe();

      expect(breakWindow.safe).toBe(false);
    });
  });
});
