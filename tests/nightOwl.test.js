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
      service.loadEvents(events);

      const breakWindow = service.getBreakWindow();

      expect(breakWindow.isSafe).toBe(true);
    });

    it('should report NOT safe right after a goal', () => {
      const events = [
        { type: 'goal', player: 'Haaland', minute: 44, timestamp: Date.now() - 30 * 1000 },
      ];
      service.loadEvents(events);

      const breakWindow = service.getBreakWindow();

      expect(breakWindow.isSafe).toBe(false);
    });
  });

  describe('Catch-up summary', () => {
    it('should include missed events in catch-up request', () => {
      const events = [
        { type: 'goal', player: 'Lewandowski', minute: 12, timestamp: Date.now() - 20 * 60 * 1000 },
        { type: 'yellow_card', player: 'Casemiro', minute: 18, timestamp: Date.now() - 15 * 60 * 1000 },
        { type: 'substitution', player: 'Griezmann', minute: 25, timestamp: Date.now() - 10 * 60 * 1000 },
      ];
      service.loadEvents(events);

      const sleepStart = Date.now() - 25 * 60 * 1000;
      const summary = service.getCatchUpSummary(sleepStart);

      expect(summary.missedEvents).toBeDefined();
      expect(summary.missedEvents.length).toBeGreaterThanOrEqual(1);
      expect(summary.missedEvents.some((e) => e.type === 'goal')).toBe(true);
    });

    it('should return empty missed events when nothing was missed', () => {
      const events = [
        { type: 'pass', player: 'Xavi', minute: 5, timestamp: Date.now() - 60 * 60 * 1000 },
      ];
      service.loadEvents(events);

      const summary = service.getCatchUpSummary(Date.now() + 1000);

      expect(summary.missedEvents).toHaveLength(0);
    });
  });

  describe('Micro quiz', () => {
    it('should generate quiz using recent events', () => {
      const events = [
        { type: 'goal', player: 'Mbappé', minute: 33, timestamp: Date.now() - 2 * 60 * 1000 },
        { type: 'yellow_card', player: 'Foden', minute: 35, timestamp: Date.now() - 1 * 60 * 1000 },
      ];
      service.loadEvents(events);

      const quiz = service.generateMicroQuiz();

      expect(quiz).toBeDefined();
      expect(quiz.question).toBeDefined();
      expect(quiz.options).toBeDefined();
      expect(quiz.options.length).toBeGreaterThanOrEqual(2);
    });

    it('should return null quiz when no recent events exist', () => {
      service.loadEvents([]);

      const quiz = service.generateMicroQuiz();

      expect(quiz).toBeNull();
    });
  });
});
