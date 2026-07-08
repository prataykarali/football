/**
 * Crowd Pulse Quiz Panel
 */
export class CrowdPulsePanel {
  constructor(containerEl, crowdPulseService) {
    this.containerEl = containerEl;
    this.crowdPulseService = crowdPulseService;
  }

  render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="crowd-pulse-panel">
        <div id="active-quiz-area">
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
    `;

    this.updateLeaderboard();
  }

  showQuestion(question) {
    const quizArea = this.containerEl?.querySelector('#active-quiz-area');
    if (!quizArea) return;

    quizArea.innerHTML = `
      <div class="quiz-card">
        <div class="quiz-meta">LIVE PREDICTION</div>
        <div class="quiz-question">${question.question}</div>
        <div class="quiz-options">
          ${question.options.map((opt, idx) => `
            <button class="quiz-opt-btn" data-idx="${idx}">${opt}</button>
          `).join('')}
        </div>
      </div>
    `;

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

    if (quizArea) {
      const isCorrect = res.isCorrect;
      quizArea.innerHTML = `
        <div class="quiz-card" style="text-align: center; border-color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'};">
          <div style="font-size: 1.5rem; margin-bottom: var(--space-sm);">${isCorrect ? '✅' : '❌'}</div>
          <div style="font-weight: 700; color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${isCorrect ? 'Correct! +10 pts' : 'Wrong prediction'}
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: var(--space-xs);">62% of fans voted similarly</div>
        </div>
      `;
    }

    this.updateLeaderboard();
  }

  updateLeaderboard() {
    if (!this.crowdPulseService) return;
    const tbody = this.containerEl?.querySelector('#leaderboard-body');
    if (!tbody) return;

    const data = this.crowdPulseService.getLeaderboard();
    tbody.innerHTML = data.map((p, idx) => `
      <tr style="${p.id === 'p5' ? 'background: rgba(0, 255, 102, 0.12); border-left: 3px solid var(--accent-green);' : ''}">
        <td>${idx + 1}</td>
        <td>${p.name}</td>
        <td style="color: var(--accent-amber); font-weight: 700;">${p.score}</td>
        <td>🔥 ${p.streak}</td>
      </tr>
    `).join('');
  }
}
