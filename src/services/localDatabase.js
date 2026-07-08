const DB_KEY = 'vantage_local_database';

const DEFAULT_DATA = {
  session: {
    questionsAnswered: 0,
    correctAnswers: 0,
    categoryTotals: {},
  },
  quizHistory: [],
  leaderboard: null,
};

export class LocalDatabase {
  static read() {
    if (typeof localStorage === 'undefined') {
      return { ...DEFAULT_DATA };
    }

    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? { ...DEFAULT_DATA, ...JSON.parse(raw) } : { ...DEFAULT_DATA };
    } catch (error) {
      console.warn('Local database read failed; using defaults.', error);
      return { ...DEFAULT_DATA };
    }
  }

  static write(patch) {
    const next = { ...this.read(), ...patch };
    if (typeof localStorage === 'undefined') {
      return next;
    }

    try {
      localStorage.setItem(DB_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('Local database write failed.', error);
    }
    return next;
  }

  static patch(patch) {
    return this.write(patch);
  }

  static saveSession(session) {
    return this.write({ session });
  }

  static saveLeaderboard(leaderboard) {
    return this.write({ leaderboard });
  }

  static addQuizResult(result) {
    const data = this.read();
    const quizHistory = [result, ...(data.quizHistory || [])].slice(0, 50);
    return this.write({ quizHistory });
  }
}
