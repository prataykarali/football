import { MATCH_INFO, SAMPLE_MATCH_EVENTS } from '../../data/sampleMatch.js';
import { Toast } from '../../components/Toast.js';

export const livePanelMethods = {
  async _showCatchUp(options = {}) {
    const events = this._getCatchUpEvents();
    if (events.length === 0) {
      const emptyCatchUp = {
        summary: 'No match events have been recorded yet. The live stream is starting — Night Owl will begin monitoring once events come in.',
        keyMoments: [],
      };
      Toast.show({ message: 'Night Owl is monitoring the live feed.', type: 'info', duration: 3000 });
      this._renderNightOwlPanel(null, emptyCatchUp);
      if (options.preferPanel) {
        const panel = document.getElementById('night-owl-live-panel');
        if (panel) {
          panel.hidden = false;
          panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return;
    }

    try {
      const catchUp = await this.nightOwlService.generateCatchUp(
        events.map((event) => this._normaliseCatchUpEvent(event)),
        this.settings?.language || 'en'
      );
      const summary = catchUp.summary || 'No key moments yet.';
      Toast.show({ message: 'Catch-up generated!', type: 'success', duration: 3000 });
      this._addCommentary(`CATCH UP:\n${summary}`, { type: 'possession' });
      this._renderNightOwlPanel(null, catchUp);
      const panel = document.getElementById('night-owl-live-panel');
      if (panel) {
        panel.hidden = false;
        if (options.preferPanel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      console.warn('Catch-up generation failed:', err);
      const fallback = {
        summary: events.slice(-5).map(e => `${e.minute}' — ${e.details || e.type}`).join('\n'),
        keyMoments: events.filter(e => e.isKeyMoment).slice(-3).map(e => ({ minute: e.minute, description: e.details })),
      };
      this._renderNightOwlPanel(null, fallback);
      const panel = document.getElementById('night-owl-live-panel');
      if (panel) {
        panel.hidden = false;
        if (options.preferPanel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      Toast.show({ message: 'Catch-up generated (offline).', type: 'info', duration: 3000 });
    }
  },

  _getCatchUpEvents() {
    const feedEvents = this.matchFeed?.getEventLog?.() || [];
    const nightOwlEvents = this.nightOwlService?.eventsList || [];
    const byKey = new Map();
    [...feedEvents, ...nightOwlEvents].forEach((event) => {
      const key = `${event.type}:${event.minute}:${event.player || ''}:${event.team || ''}:${event.details || ''}`;
      byKey.set(key, event);
    });
    const events = [...byKey.values()].sort((a, b) => Number(a.minute || 0) - Number(b.minute || 0));
    if (events.length > 0) return events;
    if (this.matchStarted) return SAMPLE_MATCH_EVENTS.slice(0, 8);
    return SAMPLE_MATCH_EVENTS.slice(0, 4);
  },

  _normaliseCatchUpEvent(event) {
    return {
      type: String(event?.type || 'possession'),
      minute: Number.isFinite(Number(event?.minute)) ? Number(event.minute) : 0,
      player: String(event?.player || event?.team || 'Unknown'),
      team: String(event?.team || 'Neutral'),
      details: String(event?.details || event?.type || 'Play continues'),
      isKeyMoment: Boolean(event?.isKeyMoment),
    };
  },

  _toggleNightOwl() {
    this.isNightOwlActive = !this.isNightOwlActive;
    const btn = document.getElementById('btn-night-owl');
    const panel = document.getElementById('night-owl-live-panel');
    if (this.isNightOwlActive) {
      this.nightOwlService.activate();
      document.body.classList.add('night-owl-active');
      btn?.classList.remove('btn--glass');
      btn?.classList.add('btn--primary');
      Toast.show({ message: '🦉 Night Owl activated!', type: 'info', duration: 3000 });
      this._renderNightOwlPanel();
    } else {
      this.nightOwlService.deactivate();
      document.body.classList.remove('night-owl-active');
      btn?.classList.remove('btn--primary');
      btn?.classList.add('btn--glass');
      if (panel) {
        panel.hidden = true;
        panel.innerHTML = '';
      }
      Toast.show({ message: '☀️ Night Owl off.', type: 'info', duration: 2000 });
    }
  },

  _renderNightOwlPanel(latestEvent = null, catchUp = null) {
    const panel = document.getElementById('night-owl-live-panel');
    if (!panel) return;

    const breakStatus = this.nightOwlService.isBreakSafe();
    const recentEvents = this.matchFeed?.getEventLog?.().slice(-4) || [];
    const keyMoments = catchUp?.keyMoments || recentEvents
      .filter(e => e.isKeyMoment || ['goal', 'penalty_awarded', 'red_card'].includes(e.type))
      .slice(-3)
      .map(e => ({ minute: e.minute, description: e.details || e.type }));

    panel.hidden = false;
    panel.innerHTML = `
      <div class="live-action-panel__header">
        <strong>Night Owl Monitor</strong>
        <span class="${breakStatus.safe ? 'panel-pill panel-pill--safe' : 'panel-pill panel-pill--danger'}">
          ${breakStatus.safe ? 'BREAK SAFE' : 'STAY WATCHING'}
        </span>
      </div>
      <p>${this._escapeHtml(breakStatus.reason)}</p>
      <div class="night-owl-meter">
        <span>Confidence</span>
        <strong>${Math.round(breakStatus.confidence * 100)}%</strong>
      </div>
      ${latestEvent ? `<div class="night-owl-alert">Latest alert: ${this._escapeHtml(latestEvent.minute)}' ${this._escapeHtml(latestEvent.details || latestEvent.type)}</div>` : ''}
      ${catchUp?.summary ? `<div class="night-owl-catchup">${this._escapeHtml(catchUp.summary)}</div>` : ''}
      <div class="night-owl-moments">
        ${keyMoments.length
          ? keyMoments.map(moment => `<div><strong>${this._escapeHtml(moment.minute)}'</strong> ${this._escapeHtml(moment.description)}</div>`).join('')
          : '<div>No major moments yet. Monitoring the live feed.</div>'
        }
      </div>
      <div class="live-panel-actions">
        <button class="btn btn--primary btn--sm" data-nightowl-action="break">4 min break</button>
        <button class="btn btn--glass btn--sm" data-nightowl-action="catchup">Catch up</button>
        <button class="btn btn--glass btn--sm" data-nightowl-action="cancel-break">Cancel</button>
      </div>
      <div id="night-owl-break-countdown" class="night-owl-break-countdown"></div>
    `;
  },

  _startNightOwlBreak() {
    const countdown = document.getElementById('night-owl-break-countdown');
    this.nightOwlService.startBreakTimer(4, (secondsLeft) => {
      if (!countdown) return;
      const min = Math.floor(secondsLeft / 60);
      const sec = secondsLeft % 60;
      countdown.textContent = `Break timer: ${min}:${String(sec).padStart(2, '0')}`;
    }, () => {
      Toast.show({ message: 'Break timer complete. Back to the match.', type: 'info', duration: 4000 });
      this._renderNightOwlPanel();
    });
    if (countdown) countdown.textContent = 'Break timer: 4:00';
    Toast.show({ message: 'Night Owl break timer started.', type: 'info', duration: 2500 });
  },

  _cancelNightOwlBreak() {
    this.nightOwlService.cancelBreakTimer();
    const countdown = document.getElementById('night-owl-break-countdown');
    if (countdown) countdown.textContent = 'Break timer cancelled.';
  },

  _shouldGenerateQuiz(event) {
    return event.isKeyMoment || this.matchFeed.getEventLog().length % 5 === 0;
  },

  async _generateQuizQuestion() {
    try {
      const recentEvents = this.matchFeed.getEventLog().slice(-5);
      const question = await this.crowdPulseService.generateQuestionFromApi(recentEvents);
      if (question) {
        Toast.show({ message: '🧠 New quiz question available on Predictions page!', type: 'quiz', duration: 4000 });
      }
    } catch { }
  },

  async _exportProof() {
    try {
      const sessionData = {
        matchId: MATCH_INFO.id,
        accuracyBps: this.sessionData.correctAnswers > 0
          ? Math.round((this.sessionData.correctAnswers / this.sessionData.questionsAnswered) * 10000)
          : 0,
        questionsAnswered: this.sessionData.questionsAnswered,
        timestamp: Math.floor(Date.now() / 1000),
        categoryTotals: this.sessionData.categoryTotals,
      };
      const payload = this.matchProofService.buildCanonicalPayload(sessionData);
      const proofId = await this.matchProofService.generateProofId(payload);
      const fingerprint = await this.matchProofService.generateEngagementFingerprint(sessionData.categoryTotals);
      const calldata = this.matchProofService.buildCairoCalldata(proofId, sessionData.accuracyBps, fingerprint, sessionData.timestamp);
      await this.matchProofService.exportProof(calldata);
      this._renderProofPanel(calldata);
      Toast.show({ message: '🔐 Proof exported!', type: 'success', duration: 5000 });
    } catch {
      Toast.show({ message: 'Proof export failed.', type: 'danger', duration: 3000 });
    }
  },

  _renderProofPanel(calldata) {
    const panel = document.getElementById('live-proof-panel');
    if (!panel || !calldata) return;

    panel.hidden = false;
    panel.innerHTML = `
      <div class="live-action-panel__header">
        <strong>Match Proof</strong>
        <span class="panel-pill panel-pill--safe">EXPORTED</span>
      </div>
      <div class="proof-grid">
        <div><span>Accuracy</span><strong>${calldata.accuracy_bps / 100}%</strong></div>
        <div><span>Questions</span><strong>${this.sessionData.questionsAnswered}</strong></div>
        <div><span>Recorded</span><strong>${new Date(calldata.recorded_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
      </div>
      <div class="proof-hash">
        <span>Proof ID</span>
        <code>${this._escapeHtml(String(calldata.proof_id))}</code>
      </div>
      <div class="proof-hash">
        <span>Engagement fingerprint</span>
        <code>${this._escapeHtml(String(calldata.engagement_fingerprint))}</code>
      </div>
    `;
  }

  // ─── HIGHLIGHTS PAGE ────────────────────────────────────
};
