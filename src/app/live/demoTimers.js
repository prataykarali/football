import { FEATURED_MATCH, MATCH_INFO } from '../../data/sampleMatch.js';
import { VIDEO_BASE } from '../../utils/media.js';
import { DAY_MS, DEFAULT_MATCH_SPEED, HOUR_MS, MINUTE_MS, SECOND_MS } from '../constants.js';

export const demoTimerMethods = {
  // Real-time kickoff. If an absolute kickoffTime is configured, use it;
  // otherwise compute "now + kickoffOffsetMinutes" once and persist it for the
  // session so the countdown ticks down in real time and survives navigation.
  _getFeaturedKickoffMs() {
    if (FEATURED_MATCH.forceLiveDemo) return null;

    if (FEATURED_MATCH.kickoffTime) {
      const abs = new Date(FEATURED_MATCH.kickoffTime).getTime();
      return Number.isNaN(abs) ? null : abs;
    }

    const storeKey = `vantage:kickoff:${FEATURED_MATCH.id}`;
    let stored = null;
    try { stored = Number(sessionStorage.getItem(storeKey)) || null; } catch { /* private mode */ }
    if (stored && stored > Date.now()) return stored;
    if (stored) return stored; // already passed → live

    const offsetMin = Number(FEATURED_MATCH.kickoffOffsetMinutes) || 3;
    const kickoffMs = Date.now() + offsetMin * MINUTE_MS;
    try { sessionStorage.setItem(storeKey, String(kickoffMs)); } catch { /* ignore */ }
    return kickoffMs;
  },

  _startDemoSimulation() {
    if (this.matchStarted) {
      this._activeLiveMatch = FEATURED_MATCH;
      this._setScoreBarTeams(FEATURED_MATCH);
      this._renderFeaturedStream(FEATURED_MATCH, { isLive: true });
      this._startLiveCountdown();
      return;
    }
    this._clearManagedInterval('preMatchCountdown');
    this._clearManagedInterval('realLiveClock');
    this.matchStarted = true;
    this.liveMatchVenue = this.venueMapService?.getVenueById('mercedes-benz-stadium') || this.liveMatchVenue;
    const venueEl = document.getElementById('live-match-venue');
    if (venueEl && this.liveMatchVenue) venueEl.textContent = this.liveMatchVenue.name;
    this._renderLiveTravelCard?.();
    this._setScoreBarTeams(FEATURED_MATCH);
    this._startMatch(FEATURED_MATCH);
    this._startLiveCountdown();
  },

  // Render the featured live stream (official YouTube embed, or local fallback)
  // and paint the score overlay. Shared by pre-match preview and live playback.
  _renderFeaturedStream(match, { isLive = false } = {}) {
    if (!this.videoPlayer) return;
    const src = match.liveStreamId
      ? `https://www.youtube.com/embed/${match.liveStreamId}`
      : (match.streamSrc || `${VIDEO_BASE}/football-goal-1.mp4`);
    this.videoPlayer.render(src, {
      autoplay: true, loop: !match.liveStreamId, muted: true, controls: true, overlay: true, isLive,
    });
    const score = this.matchFeed?.getCurrentState?.()?.score || { home: 0, away: 0 };
    this.videoPlayer.setOverlayScore(
      `${match.homeTeam.flag} ${match.homeTeam.code}`,
      `${match.awayTeam.code} ${match.awayTeam.flag}`,
      score.home,
      score.away
    );
  },

  _setScoreBarTeams(match) {
    const home = match.homeTeam;
    const away = match.awayTeam;
    const homeFlagEl = document.getElementById('live-home-flag');
    const homeNameEl = document.getElementById('live-home-name');
    const homeLogoEl = document.getElementById('live-home-logo');
    const awayFlagEl = document.getElementById('live-away-flag');
    const awayNameEl = document.getElementById('live-away-name');
    const awayLogoEl = document.getElementById('live-away-logo');

    if (homeFlagEl) homeFlagEl.textContent = home.flag;
    if (homeNameEl) homeNameEl.textContent = home.name.toUpperCase();
    if (homeLogoEl && home.code) homeLogoEl.src = this._countryLogoUrl(home.code);
    if (awayFlagEl) awayFlagEl.textContent = away.flag;
    if (awayNameEl) awayNameEl.textContent = away.name.toUpperCase();
    if (awayLogoEl && away.code) awayLogoEl.src = this._countryLogoUrl(away.code);

    const pulseDot = document.getElementById('live-pulse-dot');
    if (pulseDot) pulseDot.style.display = 'inline-block';
  },

  _countryLogoUrl(code = '') {
    return `https://a.espncdn.com/i/teamlogos/countries/500/${code.toLowerCase()}.png`;
  },

  _startPreMatchCountdown() {
    this._clearManagedInterval('preMatchCountdown');
    this._clearManagedInterval('liveCountdown');
    this._clearManagedInterval('realLiveClock');
    this.matchFeed?.pause();
    this._setScoreBarTeams(FEATURED_MATCH);
    if (FEATURED_MATCH.forceLiveDemo) {
      this._startDemoSimulation();
      return;
    }

    const scoreEl = document.getElementById('live-score-numbers');
    const minuteEl = document.getElementById('live-score-minute');
    const timerEl = document.getElementById('live-score-timer');
    const kickoffMs = this._getFeaturedKickoffMs();
    if (!kickoffMs || !timerEl) return;

    if (scoreEl) scoreEl.textContent = '0 — 0';
    if (minuteEl) minuteEl.textContent = 'KICKOFF IN';
    const pulseDot = document.getElementById('live-pulse-dot');
    if (pulseDot) pulseDot.style.display = 'none';
    // Show the live stream as a muted preview while we count down to kickoff.
    this._renderFeaturedStream(FEATURED_MATCH, { isLive: false });

    const update = () => {
      const diff = kickoffMs - Date.now();
      if (diff <= 0) {
        this._clearManagedInterval('preMatchCountdown');
        // Kickoff reached — go live: swap to the live stream + start the feed.
        this._startDemoSimulation();
        return false;
      }
      const { paddedText, color } = this._getCountdownTextAndColor(diff);
      timerEl.textContent = paddedText;
      timerEl.style.color = color;
      return true;
    };

    if (update()) this._startManagedInterval('preMatchCountdown', update, SECOND_MS);
  },

  _getCountdownTextAndColor(diff) {
    const d = Math.floor(diff / DAY_MS);
    const h = Math.floor((diff % DAY_MS) / HOUR_MS);
    const m = Math.floor((diff % HOUR_MS) / MINUTE_MS);
    const s = Math.floor((diff % MINUTE_MS) / SECOND_MS);
    
    return {
      text: `${d}d ${h}h ${m}m ${s}s`,
      paddedText: `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`,
      color: diff <= HOUR_MS ? 'var(--accent-red)' : 'var(--accent-amber)'
    };
  },

  _getElapsedMatchSeconds() {
    const speed = this.matchFeed?.speed || DEFAULT_MATCH_SPEED;
    const elapsedRealSeconds = Math.floor((Date.now() - (this._matchClockStartTime || Date.now())) / SECOND_MS);
    return Math.max(0, Math.floor((this._matchClockStartSeconds || 0) + (elapsedRealSeconds * speed)));
  },

  _startLiveCountdown() {
    this._clearManagedInterval('liveCountdown');
    this._clearManagedInterval('preMatchCountdown');
    this._clearManagedInterval('realLiveClock');
    const timerEl = document.getElementById('live-score-timer');
    const minuteEl = document.getElementById('live-score-minute');
    if (minuteEl) minuteEl.textContent = "LIVE";

    const matchDurationSeconds = (MATCH_INFO.durationMinutes || 90) * 60;
    const update = () => {
      // Smooth, continuously-advancing match clock (real seconds, not jumps).
      const elapsedMatchSeconds = Math.min(matchDurationSeconds, this._getElapsedMatchSeconds());
      const displayMin = Math.floor(elapsedMatchSeconds / 60);
      const secs = elapsedMatchSeconds % 60;

      if (timerEl) {
        timerEl.textContent = `${String(displayMin).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        timerEl.style.color = elapsedMatchSeconds >= matchDurationSeconds ? 'var(--accent-red)' : 'var(--accent-green)';
      }
      if (minuteEl) {
        if (displayMin >= 90) minuteEl.textContent = 'FULL TIME';
        else if (displayMin >= 45 && displayMin < 50) minuteEl.textContent = 'HALF TIME';
        else minuteEl.textContent = `${displayMin}'`;
      }
    };

    update();
    this._startManagedInterval('liveCountdown', update, SECOND_MS);
  }
};
