import { LocalDatabase } from './localDatabase.js';

/**
 * Crowd Pulse Quiz Service
 */

export class CrowdPulseService {
  constructor(matchFeed) {
    this.matchFeed = matchFeed;
    this.history = [];
    this.activeQuestion = null;
    this.userScore = 0;
    this.userStreak = 0;
    const saved = LocalDatabase.read();
    this.leaderboard = saved.leaderboard || [
      { id: 'p1', name: 'KolkataFan2am', score: 140, streak: 4, correctCount: 12 },
      { id: 'p2', name: 'MessiMagic10', score: 125, streak: 2, correctCount: 11 },
      { id: 'p3', name: 'TacticalGuru', score: 110, streak: 0, correctCount: 9 },
      { id: 'p4', name: 'NightOwl_ARG', score: 95, streak: 1, correctCount: 8 },
      { id: 'p5', name: 'You (Fan)', score: 0, streak: 0, correctCount: 0 }
    ];
    const user = this.leaderboard.find(p => p.id === 'p5');
    if (user) {
      this.userScore = user.score;
      this.userStreak = user.streak;
    }
    this.syncLeaderboard();
  }

  async syncLeaderboard() {
    try {
      const response = await fetch('/api/leaderboard');
      if (response.ok) {
        this.leaderboard = await response.json();
        LocalDatabase.saveLeaderboard(this.leaderboard);
        const user = this.leaderboard.find(p => p.id === 'p5');
        if (user) {
          this.userScore = user.score;
          this.userStreak = user.streak;
        }
      }
    } catch (e) {
      console.warn('Real-time database sync failed, using offline mock data');
    }
  }

  setActiveQuestion(q) {
    if (!q) {
      this.activeQuestion = null;
      return;
    }

    const hasKnownAnswer = Number.isInteger(q.correctIndex) || q.correctAnswer !== undefined;
    const correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : null;
    const formatted = {
      id: q.id || `q_${Date.now()}`,
      text: q.text || q.question || 'Who will score next?',
      question: q.text || q.question || 'Who will score next?',
      options: q.options || ['Option A', 'Option B'],
      correctAnswer: q.correctAnswer ?? (hasKnownAnswer && q.options ? q.options[correctIndex || 0] : null),
      correctIndex,
      groundedEvent: q.groundedEvent || 'Match play'
    };
    this.activeQuestion = formatted;
  }

  getActiveQuestion() {
    return this.activeQuestion;
  }

  async generateQuestionFromApi(recentEvents = []) {
    if (!recentEvents || recentEvents.length === 0) {
      return null;
    }

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: recentEvents.map((event) => ({
            type: String(event.type || 'match_event'),
            minute: Number(event.minute || 0),
            player: String(event.player || event.team || 'Unknown'),
            team: String(event.team || 'Unknown'),
            details: String(event.details || event.type || 'Match event'),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Quiz API returned ${response.status}`);
      }

      const question = await response.json();
      this.setActiveQuestion(question);
      return this.activeQuestion;
    } catch (error) {
      console.warn('AI quiz generation failed, using local fallback', error);
      return this.generateQuestion(recentEvents);
    }
  }

  generateQuestion(recentEvents = []) {
    if (!recentEvents || recentEvents.length === 0) {
      return null;
    }

    const firstEvent = recentEvents[0];
    const player = firstEvent.player || firstEvent.team || 'Player';
    const text = `${player} involved in ${firstEvent.type} — score in next 5 min?`;

    const q = {
      id: `q_${Date.now()}`,
      text,
      question: text,
      options: ['Yes', 'No'],
      correctAnswer: 'Yes',
      correctIndex: 0,
      groundedEvent: `${firstEvent.type} by ${player}`
    };

    this.setActiveQuestion(q);
    return q;
  }

  submitAnswer(questionId, answer) {
    if (!this.activeQuestion || this.activeQuestion.id !== questionId) {
      return { error: 'Unknown or expired question ID', success: false };
    }

    const q = this.activeQuestion;
    let isCorrect = false;

    if (q.correctIndex === null && q.correctAnswer === null) {
      isCorrect = true;
    } else if (typeof answer === 'number') {
      isCorrect = answer === q.correctIndex || q.options[answer] === q.correctAnswer;
    } else {
      isCorrect = answer === q.correctAnswer;
    }

    let pointsAwarded = 0;
    if (isCorrect) {
      this.userStreak++;
      pointsAwarded = 10 + (this.userStreak > 2 ? 5 : 0);
      this.userScore += pointsAwarded;
    } else {
      this.userStreak = 0;
    }

    const result = {
      questionId: q.id,
      question: q,
      userAnswer: answer,
      selectedOption: answer,
      correct: isCorrect,
      isCorrect
    };
    this.history.push(result);
    LocalDatabase.addQuizResult({ ...result, answeredAt: Date.now() });

    this.updateLeaderboard('p5', isCorrect, pointsAwarded);

    this.activeQuestion = null; // Clear active question after submission

    return {
      success: true,
      correct: isCorrect,
      isCorrect,
      pointsAwarded,
      correctAnswer: q.correctAnswer
    };
  }

  getScore() {
    return this.userScore;
  }

  async updateLeaderboard(playerId, isCorrect, points = 10) {
    const player = this.leaderboard.find(p => p.id === playerId);
    if (!player) return;

    if (isCorrect) {
      player.streak++;
      player.correctCount++;
      player.score += points;
    } else {
      player.streak = 0;
    }

    this.leaderboard.sort((a, b) => b.score - a.score);
    LocalDatabase.saveLeaderboard(this.leaderboard);

    try {
      await fetch('/api/leaderboard/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: player.id,
          score: player.score,
          streak: player.streak,
          correctCount: player.correctCount
        })
      });
    } catch (e) {
      console.warn('Real-time database sync failed, using local fallback');
    }
  }

  getLeaderboard() {
    return [...this.leaderboard];
  }

  getHistory() {
    return [...this.history];
  }
}
