import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrowdPulseService } from '../src/services/crowdPulse.js';

// Mock fetch globally
global.fetch = vi.fn();

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
global.localStorage = localStorageMock;

describe('CrowdPulseService', () => {
  let service;

  beforeEach(() => {
    service = new CrowdPulseService();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Question generation', () => {
    it('should generate questions that reference grounded events', () => {
      const events = [
        { type: 'goal', player: 'Salah', minute: 22, team: 'Liverpool' },
        { type: 'yellow_card', player: 'Bruno', minute: 30, team: 'Man United' },
      ];

      const question = service.generateQuestion(events);

      expect(question).toBeDefined();
      expect(question.text).toBeDefined();
      expect(question.id).toBeDefined();
      // Question should reference something from the events
      const questionReferencesEvent = events.some(
        (e) =>
          question.text.includes(e.player) ||
          question.text.includes(e.team) ||
          question.groundedEvent !== undefined
      );
      expect(questionReferencesEvent || question.groundedEvent).toBeTruthy();
    });

    it('should return null when no events provided', () => {
      const question = service.generateQuestion([]);

      expect(question).toBeNull();
    });

    it('should include answer options in generated question', () => {
      const events = [
        { type: 'goal', player: 'Kane', minute: 15, team: 'Bayern' },
      ];

      const question = service.generateQuestion(events);

      expect(question.options).toBeDefined();
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Answer submission', () => {
    it('should record correct answer submission', () => {
      const questionId = 'q-001';
      service.setActiveQuestion({
        id: questionId,
        text: 'Who scored?',
        correctAnswer: 'Salah',
        options: ['Salah', 'Mane', 'Firmino'],
      });

      const result = service.submitAnswer(questionId, 'Salah');

      expect(result.correct).toBe(true);
      expect(result.pointsAwarded).toBeGreaterThan(0);
    });

    it('should record incorrect answer submission', () => {
      const questionId = 'q-002';
      service.setActiveQuestion({
        id: questionId,
        text: 'Who got the yellow card?',
        correctAnswer: 'Bruno',
        options: ['Bruno', 'Rashford', 'Shaw'],
      });

      const result = service.submitAnswer(questionId, 'Rashford');

      expect(result.correct).toBe(false);
    });

    it('should reject answer for unknown question ID', () => {
      const result = service.submitAnswer('nonexistent-q', 'SomeAnswer');

      expect(result.error).toBeDefined();
    });
  });

  describe('Leaderboard scoring', () => {
    it('should award +10 points for correct answer', () => {
      const questionId = 'q-010';
      service.setActiveQuestion({
        id: questionId,
        text: 'Who scored the penalty?',
        correctAnswer: 'Kane',
        options: ['Kane', 'Saka', 'Sterling'],
      });

      const initialScore = service.getScore();
      service.submitAnswer(questionId, 'Kane');
      const newScore = service.getScore();

      expect(newScore - initialScore).toBe(10);
    });

    it('should apply streak bonus for consecutive correct answers', () => {
      // Answer 3 questions correctly in a row
      const questions = [
        { id: 'q-s1', text: 'Q1?', correctAnswer: 'A', options: ['A', 'B'] },
        { id: 'q-s2', text: 'Q2?', correctAnswer: 'B', options: ['A', 'B'] },
        { id: 'q-s3', text: 'Q3?', correctAnswer: 'A', options: ['A', 'B'] },
      ];

      const scores = [];
      questions.forEach((q) => {
        service.setActiveQuestion(q);
        const result = service.submitAnswer(q.id, q.correctAnswer);
        scores.push(result.pointsAwarded);
      });

      // Third answer should have streak bonus (more than base 10)
      expect(scores[2]).toBeGreaterThan(scores[0]);
    });

    it('should reset streak on incorrect answer', () => {
      // Correct, correct, wrong, correct
      const questions = [
        { id: 'q-r1', text: 'Q1?', correctAnswer: 'A', options: ['A', 'B'] },
        { id: 'q-r2', text: 'Q2?', correctAnswer: 'B', options: ['A', 'B'] },
        { id: 'q-r3', text: 'Q3?', correctAnswer: 'A', options: ['A', 'B'] },
        { id: 'q-r4', text: 'Q4?', correctAnswer: 'B', options: ['A', 'B'] },
      ];

      service.setActiveQuestion(questions[0]);
      service.submitAnswer('q-r1', 'A'); // correct
      service.setActiveQuestion(questions[1]);
      service.submitAnswer('q-r2', 'B'); // correct
      service.setActiveQuestion(questions[2]);
      service.submitAnswer('q-r3', 'B'); // wrong — streak resets

      service.setActiveQuestion(questions[3]);
      const result = service.submitAnswer('q-r4', 'B'); // correct, but streak=1

      // Points should be base (10), no streak bonus
      expect(result.pointsAwarded).toBe(10);
    });
  });

  describe('History tracking', () => {
    it('should track past questions in history', () => {
      service.setActiveQuestion({
        id: 'q-h1',
        text: 'Who scored?',
        correctAnswer: 'Messi',
        options: ['Messi', 'Neymar'],
      });
      service.submitAnswer('q-h1', 'Messi');

      const history = service.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].questionId).toBe('q-h1');
      expect(history[0].userAnswer).toBe('Messi');
      expect(history[0].correct).toBe(true);
    });

    it('should maintain order in history', () => {
      const questions = [
        { id: 'q-o1', text: 'Q1?', correctAnswer: 'A', options: ['A', 'B'] },
        { id: 'q-o2', text: 'Q2?', correctAnswer: 'B', options: ['A', 'B'] },
      ];

      questions.forEach((q) => {
        service.setActiveQuestion(q);
        service.submitAnswer(q.id, q.correctAnswer);
      });

      const history = service.getHistory();
      expect(history[0].questionId).toBe('q-o1');
      expect(history[1].questionId).toBe('q-o2');
    });
  });

  describe('Active question management', () => {
    it('should set and retrieve active question', () => {
      const question = {
        id: 'q-a1',
        text: 'Next scorer?',
        correctAnswer: 'Haaland',
        options: ['Haaland', 'De Bruyne', 'Foden'],
      };

      service.setActiveQuestion(question);
      const active = service.getActiveQuestion();

      expect(active).toBeDefined();
      expect(active.id).toBe('q-a1');
    });

    it('should clear active question after submission', () => {
      service.setActiveQuestion({
        id: 'q-c1',
        text: 'Who got red?',
        correctAnswer: 'Ramos',
        options: ['Ramos', 'Pique'],
      });

      service.submitAnswer('q-c1', 'Ramos');
      const active = service.getActiveQuestion();

      expect(active).toBeNull();
    });
  });
});
