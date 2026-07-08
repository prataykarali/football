import { Toast } from '../../components/Toast.js';
import { VIDEO_BASE } from '../../utils/media.js';
import { SECOND_MS } from '../constants.js';

export const realTimerMethods = {
  async _loadRealMatch() {
    let realData = null;
    try {
      const r = await fetch('/api/livematch');
      if (r.ok) {
        realData = await r.json();
      } else {
        this._showLiveServiceFallback(`Live data unavailable (${r.status}). Starting demo feed.`);
      }
    } catch {
      this._showLiveServiceFallback('Live data unavailable. Starting demo feed.');
    }

    const match = realData?.featured;

    if (match) {
      // Real match data is available: don't run simulated MatchFeed timers.
      this._isRealMode = true;
      this.matchFeed?.pause();
      this._activeLiveMatch = {
        homeTeam: {
          name: match.homeTeam.name,
          code: match.homeTeam.abbreviation,
          flag: this._countryFlag(match.homeTeam.abbreviation),
        },
        awayTeam: {
          name: match.awayTeam.name,
          code: match.awayTeam.abbreviation,
          flag: this._countryFlag(match.awayTeam.abbreviation),
        },
        venue: match.venue,
        streamSrc: `${VIDEO_BASE}/football-goal-1.mp4`,
      };
      this.matchFeed?.setTeams?.({
        homeCode: match.homeTeam.abbreviation,
        awayCode: match.awayTeam.abbreviation,
      });

      // Override the scoreboard with real teams
      this._applyRealMatchToUI(match);

      if (match.status.isLive) {
        // Clear pre-match countdown poll
        this._clearManagedInterval('realLivePreMatchPoll');

        this._ingestRealKeyEvents(realData.keyEvents || [], match);

        // Render live match video stream
        if (this.videoPlayer) {
          this.videoPlayer.render(`${VIDEO_BASE}/football-goal-1.mp4`, {
            autoplay: true, loop: true, muted: true, controls: true, overlay: true, isLive: true
          });
          const homeFlag = this._countryFlag(match.homeTeam.abbreviation);
          const awayFlag = this._countryFlag(match.awayTeam.abbreviation);
          this.videoPlayer.setOverlayScore(
            `${homeFlag} ${match.homeTeam.abbreviation}`,
            `${match.awayTeam.abbreviation} ${awayFlag}`,
            match.homeTeam.score,
            match.awayTeam.score
          );
        }

        // Real live match — show real score and poll for updates
        this._addCommentary(
          `🌍 LIVE — ${match.homeTeam.name} ${match.homeTeam.score}–${match.awayTeam.score} ${match.awayTeam.name} | ${match.status.clock} | ${match.venue}`,
          { type: 'kickoff', isKeyMoment: true }
        );
        this._renderNewRealKeyEvents(realData.keyEvents || [], match);
        this._startRealLivePolling(match.id);
        this._startRealLiveClock(match);
      } else if (!match.status.isFinished) {
        this._startRealPreMatchCountdown(match);
      } else {
        // Clear pre-match countdown poll
        this._clearManagedInterval('realLivePreMatchPoll');
        // Finished match — show recap + start demo sim (now that real mode ended)
        this._isRealMode = false;
        this._addCommentary(
          `📋 FT: ${match.homeTeam.name} ${match.homeTeam.score}–${match.awayTeam.score} ${match.awayTeam.name} | Match complete.`,
          { type: 'kickoff', isKeyMoment: true }
        );
        this._startDemoSimulation();
      }
    } else {
      // Clear pre-match countdown poll
      this._clearManagedInterval('realLivePreMatchPoll');
      // No real data — show the featured match with a real countdown to kickoff,
      // then auto-go-live with the stream + event feed.
      this._isRealMode = false;
      this._startPreMatchCountdown();
    }
  },

  _showLiveServiceFallback(message) {
    this._addCommentary(message, { type: 'kickoff', isKeyMoment: true });
    Toast.show({ message, type: 'warning', duration: 3500 });
  },

  _applyRealMatchToUI(match) {
    const homeFlag = this._countryFlag(match.homeTeam.abbreviation);
    const awayFlag = this._countryFlag(match.awayTeam.abbreviation);

    const scoreEl = document.getElementById('live-score-numbers');
    const minuteEl = document.getElementById('live-score-minute');
    const timerEl = document.getElementById('live-score-timer');

    if (scoreEl) scoreEl.textContent = `${match.homeTeam.score} — ${match.awayTeam.score}`;
    if (minuteEl) minuteEl.textContent = match.status.isLive ? 'LIVE' : (match.status.isFinished ? 'FT' : 'KICKOFF IN');
    const pulseDot = document.getElementById('live-pulse-dot');
    if (pulseDot) pulseDot.style.display = match.status.isLive ? 'inline-block' : 'none';
    if (timerEl) {
      if (match.status.isLive) {
        timerEl.textContent = this._formatRealMatchClock(match);
        timerEl.style.color = 'var(--accent-green)';
      } else if (match.status.isFinished) {
        timerEl.textContent = match.status.description || 'MATCH COMPLETE';
        timerEl.style.color = 'var(--accent-red)';
      } else {
        timerEl.textContent = 'CALCULATING KICKOFF...';
        timerEl.style.color = 'var(--accent-amber)';
      }
    }

    // Update scoreboard team names
    const homeNameEl = document.getElementById('live-home-name');
    const awayNameEl = document.getElementById('live-away-name');
    const homeFlagEl = document.getElementById('live-home-flag');
    const awayFlagEl = document.getElementById('live-away-flag');
    if (homeNameEl) homeNameEl.textContent = match.homeTeam.name.toUpperCase();
    if (awayNameEl) awayNameEl.textContent = match.awayTeam.name.toUpperCase();
    if (homeFlagEl) homeFlagEl.textContent = homeFlag;
    if (awayFlagEl) awayFlagEl.textContent = awayFlag;

    // Update ESPN team logos if available
    const homeLogoEl = document.getElementById('live-home-logo');
    const awayLogoEl = document.getElementById('live-away-logo');
    if (homeLogoEl && match.homeTeam.logo) homeLogoEl.src = match.homeTeam.logo;
    if (awayLogoEl && match.awayTeam.logo) awayLogoEl.src = match.awayTeam.logo;

    if (this.videoPlayer) {
      this.videoPlayer.setOverlayScore(
        `${homeFlag} ${match.homeTeam.abbreviation}`,
        `${match.awayTeam.abbreviation} ${awayFlag}`,
        match.homeTeam.score,
        match.awayTeam.score
      );
    }

    // Update venue meta card
    const venueEl = document.getElementById('live-match-venue');
    if (venueEl && match.venue) {
      venueEl.textContent = match.venue;
      this.liveMatchVenue = this.venueMapService?.findVenueByName(match.venue) || this.liveMatchVenue;
      this._renderLiveTravelCard?.();
    }
  },


  _countryFlag(abbr = '') {
    const map = {
      POR: '🇵🇹', ESP: '🇪🇸', ARG: '🇦🇷', FRA: '🇫🇷', BRA: '🇧🇷', GER: '🇩🇪',
      ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ITA: '🇮🇹', NED: '🇳🇱', BEL: '🇧🇪', USA: '🇺🇸', MEX: '🇲🇽',
      CAN: '🇨🇦', JPN: '🇯🇵', KOR: '🇰🇷', MOR: '🇲🇦', SEN: '🇸🇳', URU: '🇺🇾',
      CRO: '🇭🇷', SUI: '🇨🇭', DEN: '🇩🇰', AUS: '🇦🇺', ECU: '🇪🇨', GHA: '🇬🇭',
      CMR: '🇨🇲', SRB: '🇷🇸', POL: '🇵🇱', WAL: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', TUN: '🇹🇳', CRC: '🇨🇷',
    };
    return map[abbr.toUpperCase()] || '🏳️';
  },

  _startRealLivePolling(eventId) {
    this._startManagedInterval('realPoll', async () => {
      try {
        const r = await fetch('/api/livematch');
        if (!r.ok) return;
        const data = await r.json();
        const match = data?.featured;
        if (!match) return;
        if (eventId && match.id && match.id !== eventId) return;
        this._applyRealMatchToUI(match);
        if (match.status.isLive) this._startRealLiveClock(match);
        this._ingestRealKeyEvents(data.keyEvents || [], match);
        this._renderNewRealKeyEvents(data.keyEvents || [], match);
        if (match.status.isFinished) {
          this._clearManagedInterval('realPoll');
          this._clearManagedInterval('realLiveClock');
          this._addCommentary(
            `🏁 Full Time: ${match.homeTeam.name} ${match.homeTeam.score}–${match.awayTeam.score} ${match.awayTeam.name}`,
            { type: 'kickoff', isKeyMoment: true }
          );
        }
      } catch { /* network error, retry next interval */ }
    }, 30000);
  },

  _startRealLiveClock(match) {
    this._clearManagedInterval('liveCountdown');
    this._clearManagedInterval('preMatchCountdown');
    this._clearManagedInterval('realLivePreMatchPoll');

    const timerEl = document.getElementById('live-score-timer');
    const minuteEl = document.getElementById('live-score-minute');
    if (!timerEl) return;

    if (minuteEl) minuteEl.textContent = 'LIVE';

    const clock = this._formatRealMatchClock(match);
    const baseSeconds = this._parseMatchClockSeconds(clock);

    // ESPN's clock is authoritative (it already accounts for stoppages), so we
    // display it verbatim and let the 30s poll refresh it, rather than drifting
    // with a local per-second counter that would desync from the broadcast.
    const render = () => {
      if (baseSeconds == null) {
        timerEl.textContent = clock;
        timerEl.style.color = 'var(--accent-green)';
        return;
      }
      const mins = Math.floor(baseSeconds / 60);
      const secs = baseSeconds % 60;
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      timerEl.style.color = 'var(--accent-green)';

      if (minuteEl) {
        if (mins >= 90) minuteEl.textContent = 'FULL TIME';
        else if (mins >= 45 && mins < 50) minuteEl.textContent = 'HALF TIME';
        else minuteEl.textContent = `${mins}'`;
      }
    };

    render();
    this._startManagedInterval('realLiveClock', render, SECOND_MS);
  },

  _formatRealMatchClock(match) {
    const clock = String(match?.status?.clock || '').trim();
    return clock || match?.status?.detail || match?.status?.description || 'LIVE CLOCK';
  },

  _parseMatchClockSeconds(clock) {
    const text = String(clock || '').trim();
    if (!text) return null;

    const mmss = text.match(/^(\d{1,3}):([0-5]\d)$/);
    if (mmss) return (Number(mmss[1]) * 60) + Number(mmss[2]);

    const minuteText = text.match(/^(\d{1,3})(?:\+(\d{1,2}))?['’]?$/);
    if (minuteText) {
      return (Number(minuteText[1]) + Number(minuteText[2] || 0)) * 60;
    }

    return null;
  },

  _formatMatchClockSeconds(totalSeconds) {
    const safeSeconds = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  _normaliseRealKeyEvent(ke, match) {
    const type = ke.type === 'yellow-card' ? 'yellow_card' : (ke.type === 'red-card' ? 'red_card' : ke.type || 'possession');
    const homeName = String(match?.homeTeam?.name || '').toLowerCase();
    const awayName = String(match?.awayTeam?.name || '').toLowerCase();
    const eventTeamName = String(ke.team || '').toLowerCase();
    let team = match?.homeTeam?.abbreviation || 'HOME';
    if (eventTeamName && awayName && (eventTeamName === awayName || awayName.includes(eventTeamName) || eventTeamName.includes(awayName))) {
      team = match?.awayTeam?.abbreviation || 'AWAY';
    } else if (eventTeamName && homeName && (eventTeamName === homeName || homeName.includes(eventTeamName) || eventTeamName.includes(homeName))) {
      team = match?.homeTeam?.abbreviation || 'HOME';
    }
    const minute = parseInt(String(ke.minute || '').replace(/[^\d]/g, ''), 10) || 0;
    return {
      id: ke.id || `${type}:${minute}:${ke.player || ''}:${team}`,
      minute,
      type,
      player: ke.player || ke.team || 'Unknown',
      team,
      details: ke.text || `${type} for ${ke.team || team}`,
      isKeyMoment: ['goal', 'penalty_awarded', 'red_card', 'yellow_card', 'substitution'].includes(type),
      timestamp: Date.now(),
    };
  },

  _realEventKey(event) {
    return `${event.type}:${event.minute}:${event.player}:${event.team}:${event.details}`;
  },

  _ingestRealKeyEvents(keyEvents, match) {
    if (!this.matchFeed) return [];
    if (!this._seenRealEventKeys) this._seenRealEventKeys = new Set();
    const added = [];
    keyEvents.forEach((ke) => {
      const event = this._normaliseRealKeyEvent(ke, match);
      const key = this._realEventKey(event);
      if (this._seenRealEventKeys.has(key)) return;
      this._seenRealEventKeys.add(key);
      this.matchFeed.eventLog.push(event);
      this.nightOwlService?.eventsList?.push(event);
      added.push(event);
    });
    return added;
  },

  _renderNewRealKeyEvents(keyEvents, match) {
    if (!this._renderedRealEventKeys) this._renderedRealEventKeys = new Set();
    keyEvents.forEach((ke) => {
      const event = this._normaliseRealKeyEvent(ke, match);
      const key = this._realEventKey(event);
      if (this._renderedRealEventKeys.has(key) || event.type === 'kickoff') return;
      this._renderedRealEventKeys.add(key);
      const label = event.type === 'goal' ? 'GOAL!' : event.type.replace(/_/g, ' ');
      this._addCommentary(`${label} — ${event.player} (${event.team}) ${event.minute ? `${event.minute}'` : ''}`, {
        type: event.type,
        minute: event.minute,
        isKeyMoment: event.isKeyMoment,
      });
      if (event.isKeyMoment) this._handleBigMoment(event);
    });
  },

  _startRealPreMatchCountdown(match) {
    this._clearManagedInterval('liveCountdown');
    this._clearManagedInterval('realLiveClock');
    this.matchFeed?.pause();
    this.matchStarted = false;
    this._applyRealMatchToUI(match);
    const timerEl = document.getElementById('live-score-timer');
    const minuteEl = document.getElementById('live-score-minute');
    if (minuteEl) minuteEl.textContent = 'KICKOFF IN';

    if (this.videoPlayer) {
      this.videoPlayer.render(`${VIDEO_BASE}/stage2.mp4`, {
        autoplay: true, loop: true, muted: true, controls: true, overlay: true, isLive: false
      });
      const homeFlag = this._countryFlag(match.homeTeam.abbreviation);
      const awayFlag = this._countryFlag(match.awayTeam.abbreviation);
      this.videoPlayer.setOverlayScore(
        `${homeFlag} ${match.homeTeam.abbreviation}`,
        `${match.awayTeam.abbreviation} ${awayFlag}`,
        0,
        0
      );
    }

    const kickoffMs = new Date(match.date).getTime();
    if (Number.isNaN(kickoffMs)) {
      if (timerEl) {
        timerEl.textContent = 'KICKOFF TIME TBC';
        timerEl.style.color = 'var(--accent-amber)';
      }
      return;
    }
    this._clearManagedInterval('preMatchCountdown');

    const update = () => {
      const diff = kickoffMs - Date.now();
      if (diff <= 0) {
        if (timerEl) {
          timerEl.textContent = 'MATCH STARTING SOON...';
          timerEl.style.color = 'var(--accent-amber)';
        }
        this._clearManagedInterval('preMatchCountdown');
        // Poll ESPN API every 30 seconds for status updates instead of recursing immediately
        this._startManagedInterval('realLivePreMatchPoll', () => {
          this._loadRealMatch();
        }, 30000);
        return false;
      }
      const { paddedText, color } = this._getCountdownTextAndColor(diff);
      if (timerEl) {
        timerEl.textContent = paddedText;
        timerEl.style.color = color;
      }
      return true;
    };
    if (update()) this._startManagedInterval('preMatchCountdown', update, SECOND_MS);

    this._addCommentary(
      `🏆 FIFA World Cup 2026 — ${match.homeTeam.name} vs ${match.awayTeam.name} at ${match.venue}. Kickoff coming up!`,
      { type: 'kickoff', isKeyMoment: true }
    );
  },
};
