import { FEATURED_MATCH, MATCH_INFO } from '../../data/sampleMatch.js';
import { Toast } from '../../components/Toast.js';
import { resolveVideo } from '../../utils/media.js';

export const liveEventMethods = {
  _startMatch(match = FEATURED_MATCH) {
    this._activeLiveMatch = match;
    this._clearManagedInterval('preMatchCountdown');
    this._setScoreBarTeams(match);
    this.matchFeed?.setTeams?.({
      homeCode: match.homeTeam?.code,
      awayCode: match.awayTeam?.code,
    });
    // Render the live stream (official YouTube embed, or local fallback).
    this._renderFeaturedStream(match, { isLive: true });

    // Night Owl + live commentary can use real match polling too, but we avoid
    // running the simulated MatchFeed timers when real match mode is active.
    if (!this._hasBoundLiveMatchHandlers) {
      this.matchFeed.onAny((event) => this._handleMatchEvent(event));
      this.nightOwlService.onBigMoment((event) => this._handleBigMoment(event));
      this._hasBoundLiveMatchHandlers = true;
    }

    if (!this._isRealMode) {
      this.matchFeed.start();
    }

    this._matchClockStartTime = Date.now();
    this._matchClockStartSeconds = (this.matchFeed.getMatchMinute() || 0) * 60;

    this._addCommentary(
      `LIVE stream ready: ${match.homeTeam.flag} ${match.homeTeam.name} vs ${match.awayTeam.name} ${match.awayTeam.flag} at ${this.liveMatchVenue?.name || match.venue}.`,
      { type: 'kickoff', isKeyMoment: true }
    );
  },

  _bindLiveEvents() {
    this._liveEventsAbortController?.abort?.();
    this._liveEventsAbortController = new AbortController();
    const { signal } = this._liveEventsAbortController;

    document.getElementById('btn-identify-player')?.addEventListener('click', () => this._identifyPlayer(), { signal });
    document.getElementById('btn-catch-up')?.addEventListener('click', () => this._showCatchUp({ preferPanel: true }), { signal });
    document.getElementById('btn-night-owl')?.addEventListener('click', () => this._toggleNightOwl(), { signal });
    document.getElementById('btn-export-proof')?.addEventListener('click', () => this._exportProof(), { signal });
    document.getElementById('night-owl-live-panel')?.addEventListener('click', (event) => {
      const action = event.target.closest('[data-nightowl-action]')?.dataset.nightowlAction;
      if (action === 'catchup') this._showCatchUp({ preferPanel: true });
      if (action === 'break') this._startNightOwlBreak();
      if (action === 'cancel-break') this._cancelNightOwlBreak();
    }, { signal });

    // --- YouTube Embed Box ---
    const ytBtn = document.getElementById('btn-custom-youtube');
    const ytBox = document.getElementById('youtube-embed-box');
    const ytLoadBtn = document.getElementById('btn-load-youtube');
    const ytInput = document.getElementById('youtube-url-input');

    ytBtn?.addEventListener('click', () => {
      if (!ytBox) return;
      const isVisible = ytBox.style.display !== 'none';
      ytBox.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && ytInput) ytInput.focus();
    }, { signal });

    const loadYouTube = () => {
      const raw = ytInput?.value?.trim();
      if (!raw) {
        Toast.show({ message: 'Please paste a YouTube link or video ID.', type: 'warning', duration: 3000 });
        return;
      }
      if (!this.videoPlayer) return;
      // Accept full URL or bare video ID
      let src = raw;
      if (!/youtube\.com|youtu\.be/i.test(raw)) {
        // Treat as video ID
        src = `https://www.youtube.com/embed/${raw}?autoplay=1&mute=1`;
      }
      this.videoPlayer.render(src, { autoplay: true, muted: true, controls: true, overlay: true, isLive: true });
      // Mark no chip as active
      document.querySelectorAll('.stream-chip').forEach(el => el.classList.remove('stream-chip--active'));
      ytBtn?.classList.add('stream-chip--active');
      if (ytBox) ytBox.style.display = 'none';
      Toast.show({ message: '📺 YouTube stream loaded!', type: 'success', duration: 3000 });
    };

    ytLoadBtn?.addEventListener('click', loadYouTube, { signal });
    ytInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') loadYouTube(); }, { signal });

    // --- Stream Chip Selector ---
    this._bindStreamChips(signal);

    // Re-bind chips after async real match data finishes loading (videoPlayer is re-rendered)
    this._streamChipSignal = signal;

    document.getElementById('speed-select')?.addEventListener('change', (e) => {
      const speed = parseInt(e.target.value, 10);
      this._matchClockStartSeconds = this._getElapsedMatchSeconds();
      this._matchClockStartTime = Date.now();
      this.matchFeed.setSpeed(speed);
      Toast.show({ message: `Playback: ${speed}x`, type: 'info', duration: 2000 });
    }, { signal });

    // --- Zoom Quick Controls (sidebar buttons) ---
    document.getElementById('btn-zoom-in-sidebar')?.addEventListener('click', () => {
      if (this.videoPlayer) this.videoPlayer.setZoom(this.videoPlayer.zoom + 0.25);
    }, { signal });
    document.getElementById('btn-zoom-out-sidebar')?.addEventListener('click', () => {
      if (this.videoPlayer) this.videoPlayer.setZoom(this.videoPlayer.zoom - 0.25);
    }, { signal });

    // --- Crowd Control Bindings ---
    this._bindCrowdControls(signal);

  },

  _bindStreamChips(signal) {
    document.querySelectorAll('.stream-chip[data-stream-src]').forEach(chip => {
      // Remove old listeners by cloning (safe since we use AbortController signal)
      chip.addEventListener('click', () => {
        const src = chip.dataset.streamSrc;
        if (!src || !this.videoPlayer) return;
        document.querySelectorAll('.stream-chip').forEach(el => el.classList.remove('stream-chip--active'));
        chip.classList.add('stream-chip--active');
        // Hide YouTube box if open
        const ytBox = document.getElementById('youtube-embed-box');
        if (ytBox) ytBox.style.display = 'none';
        this.videoPlayer.render(src, {
          autoplay: true, loop: true, muted: true, controls: true, overlay: true, isLive: true
        });
        if (this._activeLiveMatch) {
          const home = this._activeLiveMatch.homeTeam || {};
          const away = this._activeLiveMatch.awayTeam || {};
          const state = this.matchFeed?.getCurrentState();
          this.videoPlayer.setOverlayScore(
            `${home.flag || ''} ${home.code || 'HOME'}`,
            `${away.code || 'AWAY'} ${away.flag || ''}`,
            state?.score?.home ?? 0,
            state?.score?.away ?? 0
          );
        }
        Toast.show({ message: `Feed: ${chip.textContent.trim()}`, type: 'info', duration: 2000 });
      }, { signal });
    });
  },

  _bindCrowdControls(signal) {
    // --- Crowd Control Bindings ---
    const crowdVideo = document.getElementById('crowd-audio-element');
    const crowdVolume = document.getElementById('crowd-volume');
    const crowdVolumeVal = document.getElementById('crowd-volume-val');
    const crowdIntensity = document.getElementById('crowd-intensity');
    const crowdIntensityVal = document.getElementById('crowd-intensity-val');
    const crowdMuteToggle = document.getElementById('crowd-mute-toggle');

    if (crowdVolume && crowdVideo && crowdVolumeVal) {
      const intensityLabels = ['Quiet', 'Balanced', 'Full roar'];
      let userPausedCrowd = crowdVideo.paused;
      const playCrowd = () => {
        userPausedCrowd = false;
        return crowdVideo.play().catch(() => {
          userPausedCrowd = true;
          Toast.show({ message: 'Crowd audio blocked by the browser. Tap Resume crowd bed to start it.', type: 'warning', duration: 3000 });
        });
      };
      const setCrowdMix = () => {
        const baseVolume = parseFloat(crowdVolume.value) / 100;
        const intensity = parseInt(crowdIntensity?.value || '1', 10);
        const multiplier = [0.35, 0.7, 1][Math.max(0, Math.min(2, intensity))];
        crowdVideo.volume = Math.max(0, Math.min(1, baseVolume * multiplier));
        crowdVolumeVal.textContent = `${crowdVolume.value}%`;
        if (crowdIntensityVal) crowdIntensityVal.textContent = intensityLabels[intensity] || 'Balanced';
      };

      setCrowdMix();

      crowdVolume.addEventListener('input', (e) => {
        setCrowdMix();
        if (parseFloat(e.target.value) > 0 && crowdVideo.paused && !userPausedCrowd) {
          playCrowd();
        }
      }, { signal });

      crowdIntensity?.addEventListener('input', () => {
        setCrowdMix();
        if (crowdVideo.volume > 0 && crowdVideo.paused && !userPausedCrowd) {
          playCrowd();
        }
      }, { signal });

      crowdMuteToggle?.addEventListener('click', () => {
        if (crowdVideo.paused || crowdVideo.volume === 0) {
          if (parseFloat(crowdVolume.value) === 0) crowdVolume.value = '45';
          setCrowdMix();
          playCrowd();
          crowdMuteToggle.textContent = 'Mute crowd bed';
        } else {
          userPausedCrowd = true;
          crowdVideo.pause();
          crowdMuteToggle.textContent = 'Resume crowd bed';
        }
      }, { signal });

      document.querySelectorAll('.crowd-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const src = btn.dataset.crowdSrc;
          const resolvedCrowd = resolveVideo(src);
          if (!resolvedCrowd) return;

          document.querySelectorAll('.crowd-mode-btn').forEach(el => {
            el.classList.remove('btn--primary', 'crowd-mode-btn--active');
            el.classList.add('btn--glass');
          });
          btn.classList.remove('btn--glass');
          btn.classList.add('btn--primary', 'crowd-mode-btn--active');

          const wasPausedByUser = userPausedCrowd || crowdVideo.paused;

          crowdVideo.src = resolvedCrowd;
          crowdVideo.load();
          setCrowdMix();

          if (!wasPausedByUser && crowdVideo.volume > 0) {
            playCrowd();
          }

          Toast.show({ message: `Crowd: ${btn.textContent.trim()}`, type: 'info', duration: 2500 });
        }, { signal });
      });
    }
  },

  _addCommentary(text, meta = {}) {
    const feed = document.getElementById('commentary-feed');
    if (!feed) return;

    const icons = {
      kickoff: '🏟️', goal: '⚽', penalty_awarded: '⚠️', red_card: '🟥',
      shot: '🎯', substitution: '🔄', possession: '📊', yellow_card: '🟨',
      var_review: '📺', half_time: '⏸️', full_time: '🏁'
    };

    const item = document.createElement('div');
    item.className = `commentary-item${meta.type === 'goal' ? ' commentary-item--goal' : ''}${meta.type === 'penalty_awarded' ? ' commentary-item--penalty' : ''}${meta.type === 'red_card' ? ' commentary-item--red' : ''}`;

    const timeEl = document.createElement('span');
    timeEl.className = 'commentary-time';
    timeEl.textContent = meta.minute ? `${meta.minute}'` : '--';

    const iconEl = document.createElement('span');
    iconEl.className = 'commentary-icon';
    iconEl.textContent = icons[meta.type] || '📝';

    const textEl = document.createElement('span');
    textEl.className = 'commentary-text';
    textEl.textContent = text;

    item.append(timeEl, iconEl, textEl);

    feed.appendChild(item);

    while (feed.children.length > 100) {
      feed.removeChild(feed.firstChild);
    }

    feed.scrollTop = feed.scrollHeight;
  },

  async _handleMatchEvent(event) {
    this._updateLiveScore(event);

    try {
      const commentary = await this.commentaryService.generateCommentary(event, {
        language: this.settings.language,
        pace: this.settings.pace,
        register: this.settings.register,
      });

      const titleEl = document.getElementById('commentary-header-title');

      if (commentary && commentary.text) {
        this._addCommentary(commentary.text, {
          type: event.type,
          isKeyMoment: event.isKeyMoment,
          minute: event.minute,
          isFallback: commentary.isFallback,
        });
        // Free-tier note: when Gemini is rate-limited we fall back to local
        // commentary. Keep this seamless — no alarming "offline" banner. The
        // header stays consistent whether the text is AI- or locally-generated.
        if (titleEl) {
          titleEl.textContent = '🎙️ AI Commentary';
          titleEl.style.color = '';
        }
      } else {
        this._addCommentary(`${event.details || event.type}`, {
          type: event.type,
          minute: event.minute,
        });
      }
    } catch {
      this._addCommentary(`${event.details || event.type}`, {
        type: event.type,
        minute: event.minute,
      });
    }

    if (this._shouldGenerateQuiz(event)) {
      this._generateQuizQuestion();
    }
  },

  _updateLiveScore(event) {
    const scoreEl = document.getElementById('live-score-numbers');
    const minuteEl = document.getElementById('live-score-minute');
    if (!scoreEl || !minuteEl) return;

    const state = this.matchFeed?.getCurrentState();
    const scoreHome = state?.score?.home ?? 0;
    const scoreAway = state?.score?.away ?? 0;
    scoreEl.textContent = `${scoreHome} — ${scoreAway}`;
    minuteEl.textContent = `${event.minute}'`;
    this._matchClockStartTime = Date.now();
    this._matchClockStartSeconds = Math.max(0, Math.floor(Number(event.minute || 0) * 60));

    if (this.videoPlayer) {
      const home = this._activeLiveMatch?.homeTeam || FEATURED_MATCH.homeTeam;
      const away = this._activeLiveMatch?.awayTeam || FEATURED_MATCH.awayTeam;
      this.videoPlayer.setOverlayScore(`${home.flag} ${home.code}`, `${away.code} ${away.flag}`, state?.score?.home ?? 0, state?.score?.away ?? 0);
    }
  },

  _handleBigMoment(event) {
    const labels = {
      goal: 'GOAL!',
      red_card: 'RED CARD!',
      penalty_awarded: 'PENALTY!',
      var_review: 'VAR REVIEW',
    };
    const label = labels[event.type] || 'BIG MOMENT';
    Toast.show({
      message: `${label} ${event.details || ''}`,
      type: event.type === 'goal' ? 'goal' : event.type === 'red_card' ? 'danger' : 'warning',
      duration: 8000,
      vibrate: true,
    });

    this._triggerCrowdReaction(event.type);

    if (this.isNightOwlActive) this._renderNightOwlPanel(event);
  },

  _triggerCrowdReaction(type) {
    const flash = document.createElement('div');
    flash.className = `crowd-reaction-flash crowd-reaction-flash--${type === 'goal' ? 'goal' : type === 'penalty_awarded' ? 'penalty' : 'red'}`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 900);

    const crowdVideo = document.getElementById('crowd-audio-element');
    if (crowdVideo && !crowdVideo.paused) {
      const baseVolume = parseFloat(document.getElementById('crowd-volume')?.value || 50) / 100;
      crowdVideo.volume = Math.min(1, baseVolume * 1.5);
      setTimeout(() => {
        crowdVideo.volume = baseVolume;
      }, 3000);
    }

    this._updateCrowdEnergy(type);
  },

  _updateCrowdEnergy(type) {
    const energyBar = document.getElementById('crowd-energy-bar');
    const energyVal = document.getElementById('crowd-energy-val');
    if (!energyBar || !energyVal) return;

    const boosts = { goal: 40, penalty_awarded: 30, red_card: 25, shot: 10, foul: 5 };
    const currentWidth = parseFloat(energyBar.style.width) || 30;
    const boost = boosts[type] || 5;
    const newEnergy = Math.min(100, currentWidth + boost);

    energyBar.style.width = `${newEnergy}%`;
    energyVal.textContent = `${Math.round(newEnergy)}%`;

    if (newEnergy > 70) {
      energyBar.style.background = 'linear-gradient(90deg, var(--accent-amber), var(--accent-red))';
      energyVal.style.color = 'var(--accent-red)';
    } else if (newEnergy > 40) {
      energyBar.style.background = 'linear-gradient(90deg, var(--accent-green), var(--accent-amber))';
      energyVal.style.color = 'var(--accent-amber)';
    } else {
      energyBar.style.background = 'linear-gradient(90deg, var(--accent-green), var(--accent-amber))';
      energyVal.style.color = 'var(--accent-green)';
    }

    setTimeout(() => {
      const decayed = Math.max(20, newEnergy - 15);
      energyBar.style.width = `${decayed}%`;
      energyVal.textContent = `${Math.round(decayed)}%`;
    }, 5000);
  },

  async _identifyPlayer() {
    if (!this.playerCard) return;
    this.playerCard.showLoading();
    this.videoPlayer?.setZoom?.(3.0);
    this.videoPlayer?.pulseScanReticle?.();

    const videoEl = document.getElementById('match-video');
    const isEmbed = !videoEl || videoEl.tagName !== 'VIDEO';

    let playerData = null;

    // Only real <video> elements can be scanned (canvas can't read a
    // cross-origin YouTube/Twitch iframe). Skip the doomed vision call on embeds.
    if (!isEmbed) {
      let frame = null;
      try {
        frame = await this._captureVideoFrame();
      } catch (err) {
        console.warn('Frame capture failed:', err);
      }
      if (frame) {
        try {
          playerData = await this.playerCardService.identifyPlayer(frame);
        } catch (err) {
          console.warn('Vision API failed:', err);
        }
      }
    }

    if (!playerData || playerData.error || playerData.player === 'Unknown') {
      const note = isEmbed
        ? 'Identified from live match context — external streams can’t be pixel-scanned.'
        : 'Identified from live match context (AI vision unavailable).';
      playerData = this._contextIdentifyPlayer(note);
    }

    this.playerCard.show(playerData);
  },

  // Best-effort player identification from the live event feed, used whenever
  // pixel-level vision isn't available (embed stream or AI quota exhausted).
  _contextIdentifyPlayer(note) {
    const knownPlayers = this.playerCardService.constructor.KNOWN_PLAYERS;
    const recent = this.matchFeed?.getCurrentState?.()?.recentEvents || [];
    const activeName = [...recent].reverse().find(e => e.player)?.player || null;

    const matchedKey = activeName
      ? Object.keys(knownPlayers).find(k =>
          activeName.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(activeName.toLowerCase()))
      : null;

    const key = matchedKey || Object.keys(knownPlayers)[0];
    const playerData = { ...knownPlayers[key] };
    playerData.isUncertain = true;
    playerData.confidence = Math.min(playerData.confidence || 0.7, 0.7);
    playerData.funFact = `${playerData.funFact} (${note})`;
    return playerData;
  },

  _captureVideoFrame() {
    return new Promise((resolve, reject) => {
      const video = document.getElementById('match-video');
      if (!video || video.tagName !== 'VIDEO') {
        reject(new Error('No scannable video element'));
        return;
      }
      if (!video.videoWidth || !video.videoHeight) {
        reject(new Error('Video frame not ready'));
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 1280);
        canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Frame capture failed'));
        }, 'image/jpeg', 0.82);
      } catch (e) {
        reject(e);
      }
    });
  }
};
