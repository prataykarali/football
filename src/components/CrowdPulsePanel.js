/**
 * Crowd Pulse Quiz Panel
 */
import { escapeHTML, setHTML } from '../utils/dom.js';

export class CrowdPulsePanel {
  constructor(containerEl, crowdPulseService) {
    this.containerEl = containerEl;
    this.crowdPulseService = crowdPulseService;
  }

  render() {
    if (!this.containerEl) return;

    setHTML(this.containerEl, `
      <div class="crowd-pulse-panel">
        <div id="active-quiz-area" role="status" aria-live="polite" aria-atomic="true" style="position: relative;">
          <span id="active-quiz-announcer" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;" aria-live="assertive" aria-atomic="true"></span>
          <div style="text-align: center; padding: var(--space-2xl); color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: var(--space-sm);">🧠</div>
            <p>Waiting for match events...</p>
            <p style="font-size: 0.8rem; margin-top: var(--space-xs);">AI-generated prediction questions will appear here</p>
          </div>
        </div>

        <div class="leaderboard">
          <div class="leaderboard__title">🏆 Match Leaderboard</div>
          <table class="leaderboard-table">
            <thead>
              <tr><th>#</th><th>Fan</th><th>Score</th><th>Streak</th></tr>
            </thead>
            <tbody id="leaderboard-body"></tbody>
          </table>
        </div>
      </div>
    `);

    this.updateLeaderboard();
  }

  showQuestion(question) {
    const quizArea = this.containerEl?.querySelector('#active-quiz-area');
    if (!quizArea) return;

    const safeQuestion = escapeHTML(question?.question || question?.text || 'Who will score next?');
    const safeOptions = Array.isArray(question?.options) && question.options.length
      ? question.options.map((opt) => escapeHTML(opt))
      : ['Yes', 'No'];

    setHTML(quizArea, `
      <div class="quiz-card">
        <div class="quiz-meta">LIVE PREDICTION</div>
        <div class="quiz-question">${safeQuestion}</div>
        <div class="quiz-options">
          ${safeOptions.map((opt, idx) => `
            <button class="quiz-opt-btn" data-idx="${idx}">${opt}</button>
          `).join('')}
        </div>
      </div>
    `);

    // Update an offscreen announcer to ensure screen readers detect the new question
    const announcer = this.containerEl?.querySelector('#active-quiz-announcer');
    if (announcer) {
      // set textContent separately to trigger live region announcements
      announcer.textContent = safeQuestion;
    }

    quizArea.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        this.submitVote(question.id, idx);
      });
    });
  }

  submitVote(questionId, idx) {
    if (!this.crowdPulseService) return;

    const res = this.crowdPulseService.submitAnswer(questionId, idx);
    const quizArea = this.containerEl?.querySelector('#active-quiz-area');

      const percentage = 40 + Math.round((String(questionId || '').charCodeAt(0) || 0) % 35) + (idx * 3) % 15;
      const pct = Math.min(95, Math.max(15, percentage));

      if (quizArea) {
        const isCorrect = res.isCorrect;
        const resultText = isCorrect ? 'Correct! +10 pts' : 'Wrong prediction';
        setHTML(quizArea, `
          <div class="quiz-card" style="text-align: center; border-color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'};">
            <div style="font-size: 1.5rem; margin-bottom: var(--space-sm);">${isCorrect ? '✅' : '❌'}</div>
            <div style="font-weight: 700; color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'};">
              ${isCorrect ? 'Correct! +10 pts' : 'Wrong prediction'}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: var(--space-xs);">${pct}% of fans voted similarly</div>
          </div>
        `);

      // Announce the result through the offscreen announcer for assistive tech
      const announcer = this.containerEl?.querySelector('#active-quiz-announcer');
      if (announcer) announcer.textContent = resultText;
    }

    this.updateLeaderboard();
  }

  updateLeaderboard() {
    if (!this.crowdPulseService) return;
    const tbody = this.containerEl?.querySelector('#leaderboard-body');
    if (!tbody) return;

    const data = this.crowdPulseService.getLeaderboard();
    setHTML(tbody, data.map((p, idx) => {
      const rank = Number.isFinite(Number(idx)) ? idx + 1 : '';
      const name = escapeHTML(p?.name || 'Fan');
      const score = Number.isFinite(Number(p?.score)) ? Number(p.score) : 0;
      const streak = Number.isFinite(Number(p?.streak)) ? Number(p.streak) : 0;
      const isUser = p?.id === 'p5';
      return `
      <tr style="${isUser ? 'background: rgba(0, 255, 102, 0.12); border-left: 3px solid var(--accent-green);' : ''}">
        <td>${rank}</td>
        <td>${name}</td>
        <td style="color: var(--accent-amber); font-weight: 700;">${score}</td>
        <td>🔥 ${streak}</td>
      </tr>
    `;
    }).join(''));
  }
}
