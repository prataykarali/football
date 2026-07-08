import { SAMPLE_MATCH_EVENTS } from '../data/sampleMatch.js';
import { LocalDatabase } from '../services/localDatabase.js';
import { Toast } from '../components/Toast.js';
import { escapeHTML, setHTML } from '../utils/dom.js';

export const predictionsPageMethods = {
  _initPredictionsPage() {
    const main = document.getElementById('predictions-main');
    const sidebar = document.getElementById('predictions-sidebar');
    if (!main || !sidebar) return;

    const predictions = [
      { home: '🇪🇸', homeName: 'Barcelona', away: '🇪🇸', awayName: 'Real Madrid', homePct: 45, drawPct: 25, awayPct: 30, league: 'La Liga' },
      { home: '🇬🇧', homeName: 'Man United', away: '🇬🇧', awayName: 'Liverpool', homePct: 30, drawPct: 25, awayPct: 45, league: 'Premier League' },
      { home: '🇩🇪', homeName: 'Bayern', away: '🇩🇪', awayName: 'Dortmund', homePct: 55, drawPct: 20, awayPct: 25, league: 'Bundesliga' },
      { home: '🇫🇷', homeName: 'PSG', away: '🇫🇷', awayName: 'Marseille', homePct: 60, drawPct: 20, awayPct: 20, league: 'Ligue 1' },
    ];

    const activeQuestion = this.crowdPulseService?.getActiveQuestion();
    const liveQuizQuestion = activeQuestion ? {
      id: activeQuestion.id,
      q: activeQuestion.question,
      opts: activeQuestion.options,
      correct: activeQuestion.correctIndex,
      isPrediction: activeQuestion.correctIndex === null,
      source: activeQuestion.groundedEvent,
    } : null;

    const quizQuestions = liveQuizQuestion ? [liveQuizQuestion] : [
      { q: 'Who scored the fastest World Cup final hat-trick?', opts: ['Kylian Mbappe', 'Geoff Hurst', 'Pele', 'Ronaldo'], correct: 0 },
      { q: 'Which player has the most Ballon d\'Or awards?', opts: ['Cristiano Ronaldo', 'Lionel Messi', 'Michel Platini', 'Johan Cruyff'], correct: 1 },
      { q: 'What is the highest-scoring World Cup final ever?', opts: ['1958 (5-2)', '2022 (3-3)', '1970 (4-1)', '1966 (4-2)'], correct: 1 },
      { q: 'Which country has won the most World Cups?', opts: ['Germany', 'Italy', 'Brazil', 'Argentina'], correct: 2 },
      { q: 'Who holds the record for most goals in a calendar year?', opts: ['Cristiano Ronaldo', 'Gerd Muller', 'Lionel Messi', 'Pele'], correct: 2 },
    ];

    if (!Number.isInteger(this._currentQuizIdx)) this._currentQuizIdx = 0;
    if (!Number.isInteger(this._quizScore)) this._quizScore = 0;
    if (this._currentQuizIdx > quizQuestions.length) this._currentQuizIdx = 0;

    const renderQuiz = (idx) => {
      const q = quizQuestions[idx];
      if (!q) return `
        <div class="quiz-card" style="opacity:1;transform:none;text-align:center;padding:var(--space-2xl);">
          <div style="font-size:2rem;margin-bottom:var(--space-md);">🏆</div>
          <div class="quiz-question">Quiz Complete!</div>
          <div style="font-size:1.1rem;color:var(--accent-green);font-weight:700;margin-bottom:var(--space-md);">${this._quizScore}/${quizQuestions.length} Correct</div>
          <button class="btn btn--primary btn--sm" id="btn-restart-quiz">Play Again</button>
        </div>
      `;
      const safeQuestion = escapeHTML(q.q || 'Match prediction');
      const safeSource = escapeHTML(q.source || '');
      const safeOptions = Array.isArray(q.opts) ? q.opts.map((opt) => escapeHTML(opt)) : [];
      return `
        <div class="quiz-card" style="opacity:1;transform:none;">
          <div class="quiz-meta">${q.isPrediction ? '🧠 LIVE AI PREDICTION' : `🧠 CROWD PULSE QUIZ · Question ${idx + 1}/${quizQuestions.length}`} · Score: ${this._quizScore}</div>
          <div class="quiz-question">${safeQuestion}</div>
          ${safeSource ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-sm);">Grounded in: ${safeSource}</div>` : ''}
          <div class="quiz-options" id="quiz-options-container">
            ${safeOptions.map((opt, i) => `<button class="quiz-opt-btn" data-answer="${i}">${opt}</button>`).join('')}
          </div>
        </div>
      `;
    };

    setHTML(main, `
      <div class="prediction-card" style="margin-bottom:var(--space-xl);opacity:1;transform:none;">
        <div class="prediction-card__header">
          <div class="prediction-card__title">Match Predictions</div>
          <div class="prediction-card__badge">AI Powered</div>
        </div>
        ${predictions.map(p => `
          <div class="prediction-match">
            <div class="prediction-match__team">
              <span class="prediction-match__flag">${p.home}</span>
              <span>${p.homeName}</span>
            </div>
            <div class="prediction-match__vs">VS</div>
            <div class="prediction-match__team">
              <span>${p.awayName}</span>
              <span class="prediction-match__flag">${p.away}</span>
            </div>
          </div>
          <div class="prediction-bar">
            <div class="prediction-bar__home" style="width:${p.homePct}%"></div>
            <div class="prediction-bar__draw" style="width:${p.drawPct}%"></div>
            <div class="prediction-bar__away" style="width:${p.awayPct}%"></div>
          </div>
          <div class="prediction-labels">
            <div class="prediction-label"><span>${p.homePct}%</span> ${p.homeName}</div>
            <div class="prediction-label"><span>${p.drawPct}%</span> Draw</div>
            <div class="prediction-label"><span>${p.awayPct}%</span> ${p.awayName}</div>
          </div>
          <div style="margin-bottom:var(--space-lg);"></div>
        `).join('')}
      </div>

      <div id="quiz-area">
        <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-md);">
          <button class="btn btn--primary btn--sm" id="btn-generate-ai-quiz">
            <span>Generate AI Question</span>
          </button>
        </div>
        ${renderQuiz(this._currentQuizIdx)}
      </div>
    `);

    // Event delegation for quiz
    if (this._predictionsClickHandler) {
      main.removeEventListener('click', this._predictionsClickHandler);
    }
    this._predictionsClickHandler = async (e) => {
      const generateBtn = e.target.closest('#btn-generate-ai-quiz');
      if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        const seedEvents = this.matchFeed?.getEventLog?.().slice(-5);
        const events = seedEvents?.length ? seedEvents : SAMPLE_MATCH_EVENTS.slice(0, 8);
        const question = await this.crowdPulseService.generateQuestionFromApi(events);
        Toast.show({
          message: question ? 'AI quiz ready.' : 'Could not generate AI quiz.',
          type: question ? 'success' : 'danger',
          duration: 2500,
        });
        this._currentQuizIdx = 0;
        this._quizScore = 0;
        this._initPredictionsPage();
        return;
      }

      const btn = e.target.closest('.quiz-opt-btn');
      if (btn && !btn.disabled) {
        const currentQuestion = quizQuestions[this._currentQuizIdx];
        const selected = parseInt(btn.dataset.answer, 10);
        const correct = currentQuestion?.correct;
        const isPrediction = currentQuestion?.isPrediction || correct === null;
        const isCorrect = isPrediction || selected === correct;

        if (isCorrect) this._quizScore++;
        this.sessionData.questionsAnswered++;
        if (isCorrect) this.sessionData.correctAnswers++;
        this.sessionData.categoryTotals.quiz = (this.sessionData.categoryTotals.quiz || 0) + 1;
        LocalDatabase.saveSession(this.sessionData);
        if (currentQuestion?.id && this.crowdPulseService?.getActiveQuestion()?.id === currentQuestion.id) {
          this.crowdPulseService.submitAnswer(currentQuestion.id, selected);
        }

        main.querySelectorAll('.quiz-opt-btn').forEach(b => {
          b.disabled = true;
          b.style.opacity = '0.4';
          b.style.cursor = 'default';
        });
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1.02)';
        btn.classList.add(isCorrect ? 'quiz-opt-btn--correct' : 'quiz-opt-btn--wrong');

        // Highlight correct answer
        if (!isCorrect && Number.isInteger(correct)) {
          main.querySelectorAll('.quiz-opt-btn')[correct].style.opacity = '1';
          main.querySelectorAll('.quiz-opt-btn')[correct].classList.add('quiz-opt-btn--correct');
        }

        Toast.show({
          message: isPrediction ? '✅ Prediction locked in!' : isCorrect ? '✅ Correct!' : `❌ Wrong! The answer was: ${quizQuestions[this._currentQuizIdx].opts[correct]}`,
          type: isPrediction || isCorrect ? 'success' : 'danger',
          duration: 3000
        });

        // Next question after delay
        setTimeout(() => {
          this._currentQuizIdx++;
          const quizArea = document.getElementById('quiz-area');
          if (quizArea) {
            setHTML(quizArea, renderQuiz(this._currentQuizIdx));
          }
        }, 2000);
      }

      // Restart quiz
      const restartBtn = e.target.closest('#btn-restart-quiz');
      if (restartBtn) {
        this._currentQuizIdx = 0;
        this._quizScore = 0;
        const quizArea = document.getElementById('quiz-area');
        if (quizArea) setHTML(quizArea, renderQuiz(0));
      }
    };
    main.addEventListener('click', this._predictionsClickHandler);

    const leaderboard = (this.crowdPulseService?.getLeaderboard?.() || []).map((player, idx) => ({
      rank: idx + 1,
      name: player.name,
      score: player.score,
      accuracy: player.correctCount ? `${Math.min(99, Math.round((player.correctCount / Math.max(player.correctCount + 3, 1)) * 100))}%` : '0%',
      isYou: player.id === 'p5',
    }));
    const history = LocalDatabase.read().quizHistory || [];

    setHTML(sidebar, `
      <div class="db-card motion-fade-in" style="border:1px solid var(--accent-green);border-radius:var(--radius-lg);padding:var(--space-md);margin-bottom:var(--space-md);background:rgba(8,217,115,0.04);">
        <div class="leaderboard__title" style="margin-bottom:var(--space-sm);">⚡ Live Status</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);">
            <span style="font-size:0.82rem;color:var(--text-secondary);">Next AI Quiz</span>
            <span id="quiz-countdown" style="font-weight:700;font-size:0.85rem;color:var(--accent-green);font-family:var(--font-heading);letter-spacing:0.04em;">READY</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);">
            <span style="font-size:0.82rem;color:var(--text-secondary);">Eco-Points</span>
            <span id="eco-points-status" style="font-weight:700;font-size:0.85rem;color:var(--accent-green);font-family:var(--font-heading);letter-spacing:0.04em;">${this.sustainabilityService ? this.sustainabilityService.getPoints() : 0} PTS</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);">
            <span style="font-size:0.82rem;color:var(--text-secondary);">Commentary</span>
            <span id="commentary-status" style="font-weight:700;font-size:0.85rem;color:var(--accent-blue);font-family:var(--font-heading);letter-spacing:0.04em;">LIVE</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:var(--radius-sm);">
            <span style="font-size:0.82rem;color:var(--text-secondary);">Match Feed</span>
            <span id="feed-status" style="font-weight:700;font-size:0.85rem;color:var(--accent-amber);font-family:var(--font-heading);letter-spacing:0.04em;">${this.matchStarted ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
        </div>
      </div>
      <div class="db-card motion-fade-in">
        <div class="leaderboard__title">Local Database</div>
        <div class="db-card__row"><span>Questions saved</span><strong>${this.sessionData.questionsAnswered}</strong></div>
        <div class="db-card__row"><span>Correct answers</span><strong>${this.sessionData.correctAnswers}</strong></div>
        <div class="db-card__row"><span>Stored quiz history</span><strong>${history.length}</strong></div>
      </div>
      <div class="leaderboard motion-fade-in">
        <div class="leaderboard__title">🏆 Global Leaderboard</div>
        <table class="leaderboard-table">
          <thead>
            <tr><th>#</th><th>Fan</th><th>Score</th><th>Accuracy</th></tr>
          </thead>
          <tbody>
            ${leaderboard.map(l => `
              <tr class="${l.isYou ? 'leaderboard-row--you' : ''}">
                <td><span class="leaderboard-rank ${l.rank === 1 ? 'leaderboard-rank--gold' : l.rank === 2 ? 'leaderboard-rank--silver' : l.rank === 3 ? 'leaderboard-rank--bronze' : ''}">${l.rank}</span></td>
                <td style="font-weight:600;">${escapeHTML(l.name)}</td>
                <td style="font-weight:700;color:var(--accent-green);">${Number(l.score) || 0}</td>
                <td>${escapeHTML(l.accuracy)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `);

    // Start quiz countdown timer
    this._startQuizCountdown();
  },

  _startQuizCountdown() {
    this._clearManagedInterval('quizCountdown');
    let seconds = 30;
    const el = document.getElementById('quiz-countdown');
    if (!el) return;
    el.textContent = `${seconds}s`;
    this._startManagedInterval('quizCountdown', () => {
      seconds--;
      if (seconds <= 0) {
        el.textContent = 'READY';
        el.style.color = 'var(--accent-green)';
        this._clearManagedInterval('quizCountdown');
      } else {
        el.textContent = `${seconds}s`;
        el.style.color = seconds <= 10 ? 'var(--accent-red)' : 'var(--accent-amber)';
      }
    }, 1000);
  }
};
