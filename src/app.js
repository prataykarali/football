import { MatchFeed } from './services/matchFeed.js';
import { CommentaryService } from './services/commentary.js';
import { PlayerCardService } from './services/playerCard.js';
import { NightOwlService } from './services/nightOwl.js';
import { CrowdPulseService } from './services/crowdPulse.js';
import { VenueMapService } from './services/venueMap.js';
import { MatchProofService } from './services/matchProof.js';
import { LocalDatabase } from './services/localDatabase.js';

import { CaptionLayer } from './components/CaptionLayer.js';
import { PlayerCard } from './components/PlayerCard.js';
import { VideoPlayer } from './components/VideoPlayer.js';
import { Toast } from './components/Toast.js';

import { SAMPLE_MATCH_EVENTS, MATCH_INFO } from './data/sampleMatch.js';
import { gsap } from 'gsap';

export class App {
  constructor() {
    this.currentPage = 'home';
    this.matchFeed = null;
    this.commentaryService = null;
    this.playerCardService = null;
    this.nightOwlService = null;
    this.crowdPulseService = null;
    this.venueMapService = null;
    this.matchProofService = null;

    this.captionLayer = null;
    this.playerCard = null;
    this.videoPlayer = null;

    this.settings = this._loadSettings();
    this.isNightOwlActive = false;
    const savedDb = LocalDatabase.read();
    this.sessionData = {
      matchId: MATCH_INFO.id,
      questionsAnswered: savedDb.session?.questionsAnswered || 0,
      correctAnswers: savedDb.session?.correctAnswers || 0,
      categoryTotals: savedDb.session?.categoryTotals || {},
    };
    this._currentQuizIdx = 0;
    this._quizScore = 0;
    this.matchStarted = false;
  }

  async init() {
    try {
      Toast.init();
      this._initServices();
      await this._loadApiStatus();
      this._bindNavigation();
      this._bindThemeSwitcher();
      this._handleRoute();
      this._initScrollAnimations();
      this._initParticles();
      this._animateHero();

      window.addEventListener('hashchange', () => this._handleRoute());
      console.log('[VANTAGE] Ready');
    } catch (error) {
      console.error('[VANTAGE] Init failed:', error);
    }
  }

  // ─── Router ─────────────────────────────────────────────

  _handleRoute() {
    const hash = window.location.hash.replace('#/', '') || 'home';
    const validPages = ['home', 'live', 'highlights', 'predictions', 'standings', 'venue'];
    const page = validPages.includes(hash) ? hash : 'home';
    this._showPage(page);
  }

  _showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('page--active');
      p.style.animation = 'none';
    });

    const page = document.getElementById(`page-${pageId}`);
    if (page) {
      page.classList.add('page--active');
      page.style.animation = '';
      void page.offsetHeight;
      page.style.animation = 'pageIn 0.6s var(--ease-out-expo) forwards';
    }

    document.querySelectorAll('.site-nav__link').forEach(link => {
      link.classList.toggle('site-nav__link--active', link.dataset.page === pageId);
    });

    this.currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this._initPageContent(pageId);
  }

  _initPageContent(pageId) {
    switch (pageId) {
      case 'home':
        this._initHomePage();
        break;
      case 'live':
        this._initLivePage();
        break;
      case 'highlights':
        this._initHighlightsPage();
        break;
      case 'predictions':
        this._initPredictionsPage();
        break;
      case 'standings':
        this._initStandingsPage();
        break;
      case 'venue':
        this._initVenuePage();
        break;
    }
    setTimeout(() => this._initScrollAnimations(), 100);
  }

  // ─── Navigation ─────────────────────────────────────────

  _bindNavigation() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        window.location.hash = '#/home';
      });
    });

    const hamburger = document.getElementById('nav-hamburger');
    const links = document.getElementById('nav-links');
    if (hamburger && links) {
      hamburger.addEventListener('click', () => {
        links.classList.toggle('open');
      });
      links.querySelectorAll('.site-nav__link').forEach(link => {
        link.addEventListener('click', () => links.classList.remove('open'));
      });
    }

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('site-nav');
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 50);
      }
    });
  }

  // ─── Theme Switcher ─────────────────────────────────────

  _bindThemeSwitcher() {
    const switcher = document.getElementById('theme-switcher');
    if (!switcher) return;

    const savedTheme = localStorage.getItem('vantage_theme') || 'neon';
    this._applyTheme(savedTheme);

    switcher.querySelectorAll('.theme-dot').forEach(dot => {
      if (dot.dataset.theme === savedTheme) {
        dot.classList.add('theme-dot--active');
      }
      dot.addEventListener('click', () => {
        const theme = dot.dataset.theme;
        this._applyTheme(theme);
        switcher.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('theme-dot--active'));
        dot.classList.add('theme-dot--active');
        localStorage.setItem('vantage_theme', theme);
        Toast.show({ message: `Theme: ${theme}`, type: 'info', duration: 2000 });
      });
    });
  }

  _applyTheme(theme) {
    document.body.classList.forEach(cls => {
      if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });
    if (theme !== 'neon') {
      document.body.classList.add(`theme-${theme}`);
    }
  }

  // ─── Services ───────────────────────────────────────────

  _initServices() {
    this.commentaryService = new CommentaryService();
    this.playerCardService = new PlayerCardService();
    this.venueMapService = new VenueMapService();
    this.matchProofService = new MatchProofService();

    const initialSpeed = parseInt(document.getElementById('speed-select')?.value || '10', 10);
    this.matchFeed = new MatchFeed(SAMPLE_MATCH_EVENTS, initialSpeed);
    this.nightOwlService = new NightOwlService(this.matchFeed);
    this.crowdPulseService = new CrowdPulseService(this.matchFeed);
  }

  async _loadApiStatus() {
    try {
      const response = await fetch('/api/status');
      this.apiStatus = response.ok ? await response.json() : null;
    } catch {
      this.apiStatus = null;
    }
  }

  _renderApiStatus() {
    const el = document.getElementById('api-status-banner');
    if (!el) return;
    const gemini = this.apiStatus?.services?.gemini;
    const online = gemini?.status === 'configured';
    el.innerHTML = `
      <div class="api-status-card__title">${online ? 'AI Online' : 'AI Offline'}</div>
      <div class="api-status-card__body">
        Gemini: ${online ? 'configured' : 'invalid/missing key'}<br>
        Quiz/leaderboard: local + backend fallback<br>
        Maps/weather: local demo data
      </div>
    `;
    el.classList.toggle('api-status-card--offline', !online);
  }

  // ─── HOME PAGE ──────────────────────────────────────────

  _initHomePage() {
    this._renderUpcomingMatches();
    this._renderNews();
    this._updateSpotlightCountdown();
  }

  _renderUpcomingMatches() {
    const container = document.getElementById('upcoming-matches');
    if (!container) return;

    const matches = [
      { league: 'Premier League', home: '🇬🇧 Man United', away: '🇬🇧 Liverpool', time: '28 MAY · 06:30 PM', status: 'soon' },
      { league: 'Bundesliga', home: '🇩🇪 Bayern Munich', away: '🇩🇪 Dortmund', time: '29 MAY · 09:00 PM', status: null },
      { league: 'Ligue 1', home: '🇫🇷 PSG', away: '🇫🇷 Marseille', time: '30 MAY · 07:45 PM', status: null },
      { league: 'Serie A', home: '🇮🇹 AC Milan', away: '🇮🇹 Inter Milan', time: '31 MAY · 08:45 PM', status: null },
      { league: 'La Liga', home: '🇪🇸 Atletico Madrid', away: '🇪🇸 Sevilla', time: '01 JUN · 09:00 PM', status: null },
      { league: 'Champions League', home: '🇪🇸 Barcelona', away: '🇩🇪 Bayern Munich', time: '05 JUN · 08:00 PM', status: 'soon' },
    ];

    container.innerHTML = matches.map(m => `
      <div class="upcoming-card motion-fade-in">
        <div class="upcoming-card__league">${m.league}</div>
        <div class="upcoming-card__teams">
          <div class="upcoming-card__team">${m.home}</div>
          <span class="vs-badge">VS</span>
          <div class="upcoming-card__team">${m.away}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div class="upcoming-card__time">${m.time}</div>
          ${m.status ? `<div class="upcoming-card__status upcoming-card__status--${m.status}">${m.status === 'live' ? '● LIVE' : '● SOON'}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  _renderNews() {
    const container = document.getElementById('news-grid');
    if (!container) return;

    const news = [
      {
        img: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&q=80',
        tag: 'Champions League',
        title: 'Champions League Final: Everything You Need to Know',
        desc: 'Preview, key players, team news, and where to watch the biggest game of the season.',
        time: '2 hours ago',
      },
      {
        img: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80',
        tag: 'Technology',
        title: 'How AI is Revolutionizing Football Commentary',
        desc: 'Behind the scenes of how Gemini Omni powers real-time multilingual match analytics and player identification.',
        time: '5 hours ago',
      },
    ];

    container.innerHTML = news.map(n => `
      <div class="news-card motion-fade-in">
        <img class="news-card__img" src="${n.img}" alt="${n.title}" loading="lazy" />
        <div class="news-card__body">
          <div class="card__tag">${n.tag}</div>
          <h3 class="news-card__title">${n.title}</h3>
          <p class="news-card__desc">${n.desc}</p>
          <div class="card__meta"><span>${n.time}</span></div>
        </div>
      </div>
    `).join('');
  }

  _updateSpotlightCountdown() {
    const el = document.getElementById('spotlight-countdown');
    if (!el) return;
    if (this._spotlightCountdownInterval) {
      clearInterval(this._spotlightCountdownInterval);
    }

    let target = new Date('2026-07-12T20:00:00');
    if (target.getTime() <= Date.now()) {
      target = new Date(Date.now() + (6 * 24 * 60 * 60 * 1000));
    }
    const update = () => {
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) { el.textContent = 'MATCH IS LIVE!'; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `${d}d ${h}h ${m}m ${s}s`;
    };
    update();
    this._spotlightCountdownInterval = setInterval(update, 1000);
  }

  // ─── LIVE MATCH PAGE ────────────────────────────────────

  _initLivePage() {
    if (!this.videoPlayer) {
      const videoContainer = document.getElementById('video-container');
      if (videoContainer) {
        this.videoPlayer = new VideoPlayer(videoContainer);
      }
    }

    if (!this.captionLayer) {
      const feedEl = document.getElementById('commentary-feed');
      if (feedEl) {
        this.captionLayer = { feedEl, mode: 'standard', addCommentary: (text, opts = {}) => {
          const icons = { kickoff:'🏟️',goal:'⚽',penalty_awarded:'⚠️',red_card:'🟥',shot:'🎯',substitution:'🔄',possession:'📊',yellow_card:'🟨',var_review:'📺',half_time:'⏸️',full_time:'🏁' };
          const item = document.createElement('div');
          item.className = `commentary-item${opts.type==='goal'?' commentary-item--goal':''}${opts.type==='penalty_awarded'?' commentary-item--penalty':''}${opts.type==='red_card'?' commentary-item--red':''}`;
          item.innerHTML = `<span class="commentary-time">${opts.minute?opts.minute+"'":'--'}</span><span class="commentary-icon">${icons[opts.type]||'📝'}</span><span class="commentary-text">${text}</span>`;
          feedEl.appendChild(item);
          feedEl.scrollTop = feedEl.scrollHeight;
        }, setMode: () => {}, clear: () => { feedEl.innerHTML = ''; } };
      }
    }

    if (!this.playerCard) {
      const pcContainer = document.getElementById('player-card-container');
      if (pcContainer) {
        this.playerCard = new PlayerCard(pcContainer);
        this.playerCard.render();
      }
    }

    if (!this.matchStarted) {
      this._startMatch();
      this.matchStarted = true;
    }

    this._bindLiveEvents();
    this._renderApiStatus();
    this._startLiveCountdown();
  }

  _startMatch() {
    if (this.videoPlayer) {
      this.videoPlayer.render('/videos/live-stream.mp4', {
        autoplay: true, loop: true, muted: true, controls: true, overlay: true
      });
      // Fallback: if video fails, show poster image
      const vid = this.containerEl?.querySelector?.('#match-video') || document.querySelector('#match-video');
      if (vid) {
        vid.poster = 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1280&q=80';
        vid.onerror = () => {
          vid.style.display = 'none';
          const parent = vid.parentElement;
          if (parent && !parent.querySelector('.video-fallback')) {
            const fb = document.createElement('div');
            fb.className = 'video-fallback';
            fb.style.cssText = 'position:absolute;inset:0;background:url(https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1280&q=80) center/cover;display:flex;align-items:center;justify-content:center;';
            fb.innerHTML = '<div style="background:rgba(0,0,0,0.7);padding:16px 24px;border-radius:12px;font-family:var(--font-heading);font-size:1.2rem;color:#fff;">⚽ LIVE MATCH FEED</div>';
            parent.appendChild(fb);
          }
        };
      }
      this.videoPlayer.setOverlayScore('🇦🇷 ARG', 'FRA 🇫🇷', 0, 0);
    }

    this.matchFeed.start();
    this._matchClockStartTime = Date.now();
    this._matchClockStartSeconds = (this.matchFeed.getMatchMinute() || 0) * 60;

    this._addCommentary(
      `🏟️ Welcome to ${MATCH_INFO.competition}! ${MATCH_INFO.homeTeam.flag} ${MATCH_INFO.homeTeam.name} vs ${MATCH_INFO.awayTeam.name} ${MATCH_INFO.awayTeam.flag} at ${MATCH_INFO.venue}.`,
      { type: 'kickoff', isKeyMoment: true }
    );

    this.matchFeed.onAny((event) => this._handleMatchEvent(event));
    this.nightOwlService.onBigMoment((event) => this._handleBigMoment(event));
  }

  _bindLiveEvents() {
    document.getElementById('btn-identify-player')?.addEventListener('click', () => this._identifyPlayer());
    document.getElementById('btn-catch-up')?.addEventListener('click', () => this._showCatchUp());
    document.getElementById('btn-night-owl')?.addEventListener('click', () => this._toggleNightOwl());
    document.getElementById('btn-export-proof')?.addEventListener('click', () => this._exportProof());

    document.querySelectorAll('.stream-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const src = chip.dataset.streamSrc;
        if (!src || !this.videoPlayer) return;
        document.querySelectorAll('.stream-chip').forEach(el => el.classList.remove('stream-chip--active'));
        chip.classList.add('stream-chip--active');
        this.videoPlayer.play(src);
      });
    });

    document.getElementById('speed-select')?.addEventListener('change', (e) => {
      const speed = parseInt(e.target.value, 10);
      this.matchFeed.setSpeed(speed);
      Toast.show({ message: `Playback: ${speed}x`, type: 'info', duration: 2000 });
    });
  }

  _startLiveCountdown() {
    if (this._liveCountdownInterval) clearInterval(this._liveCountdownInterval);
    const timerEl = document.getElementById('live-score-timer');
    const minuteEl = document.getElementById('live-score-minute');
    if (minuteEl) minuteEl.textContent = "LIVE";
    if (!this._matchClockStartTime) {
      this._matchClockStartTime = Date.now();
      this._matchClockStartSeconds = (this.matchFeed?.getMatchMinute() || 0) * 60;
    }

    this._liveCountdownInterval = setInterval(() => {
      const state = this.matchFeed?.getCurrentState();
      const matchMin = state?.minute ?? 0;

      if (timerEl) {
        const speed = this.matchFeed?.speed || 1;
        const elapsedRealSeconds = Math.floor((Date.now() - this._matchClockStartTime) / 1000);
        const elapsedSimulatedSeconds = elapsedRealSeconds * speed;
        const elapsedMatchSeconds = Math.min(90 * 60, this._matchClockStartSeconds + elapsedSimulatedSeconds);
        const remainingSeconds = Math.max(0, (90 * 60) - elapsedMatchSeconds);
        const displayMin = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        timerEl.textContent = `${String(displayMin).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        timerEl.style.color = remainingSeconds <= 300 ? 'var(--accent-red)' : 'var(--accent-green)';
      }
      if (minuteEl) {
        if (matchMin >= 90) minuteEl.textContent = "FULL TIME";
        else if (matchMin >= 45 && matchMin < 50) minuteEl.textContent = "HALF TIME";
        else minuteEl.textContent = `${matchMin}'`;
      }
    }, 1000);
  }

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

    item.innerHTML = `
      <span class="commentary-time">${meta.minute ? meta.minute + "'" : '--'}</span>
      <span class="commentary-icon">${icons[meta.type] || '📝'}</span>
      <span class="commentary-text">${text}</span>
    `;

    feed.appendChild(item);
    feed.scrollTop = feed.scrollHeight;
  }

  async _handleMatchEvent(event) {
    this._updateLiveScore(event);

    try {
      const commentary = await this.commentaryService.generateCommentary(event, {
        language: this.settings.language,
        pace: this.settings.pace,
        register: this.settings.register,
      });

      if (commentary && commentary.text) {
        this._addCommentary(commentary.text, {
          type: event.type,
          isKeyMoment: event.isKeyMoment,
          minute: event.minute,
          isFallback: commentary.isFallback,
        });
        if (commentary.isFallback) {
          Toast.show({ message: 'Gemini commentary offline. Showing local event text.', type: 'warning', duration: 3000 });
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
  }

  _updateLiveScore(event) {
    const scoreEl = document.getElementById('live-score-numbers');
    const minuteEl = document.getElementById('live-score-minute');
    if (!scoreEl || !minuteEl) return;

    const state = this.matchFeed?.getCurrentState();
    const home = state?.score?.home ?? 0;
    const away = state?.score?.away ?? 0;
    scoreEl.textContent = `${home} — ${away}`;
    minuteEl.textContent = `${event.minute}'`;
    this._matchClockStartTime = Date.now();
    this._matchClockStartSeconds = Math.max(0, Math.floor(Number(event.minute || 0) * 60));

    if (this.videoPlayer) {
      this.videoPlayer.setOverlayScore('🇦🇷 ARG', 'FRA 🇫🇷', home, away);
    }
  }

  _handleBigMoment(event) {
    const labels = {
      goal: '⚽ GOAL!',
      red_card: '🟥 RED CARD!',
      penalty_awarded: '⚠️ PENALTY!',
      var_review: '📺 VAR REVIEW',
    };
    const label = labels[event.type] || '🔔 BIG MOMENT';
    Toast.show({
      message: `${label} ${event.details || ''}`,
      type: event.type === 'goal' ? 'goal' : event.type === 'red_card' ? 'danger' : 'warning',
      duration: 8000,
      vibrate: true,
    });
  }

  async _identifyPlayer() {
    if (!this.playerCard) return;
    this.playerCard.showLoading();

    try {
      const frame = await this._captureVideoFrame();
      const playerData = await this.playerCardService.identifyPlayer(frame);
      if (playerData.error) throw new Error(playerData.error);
      this.playerCard.show(playerData);
    } catch (error) {
      this.playerCard.showError(`Gemini Vision unavailable: ${error.message || 'could not identify player'}`);
    }
  }

  _captureVideoFrame() {
    return new Promise((resolve, reject) => {
      const video = document.getElementById('match-video');
      if (!video || !video.videoWidth || !video.videoHeight) {
        reject(new Error('video frame is not ready'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth, 1280);
      canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('frame capture failed'));
      }, 'image/jpeg', 0.82);
    });
  }

  async _showCatchUp() {
    const events = this.matchFeed.getEventLog();
    if (events.length === 0) {
      Toast.show({ message: 'No events yet!', type: 'info', duration: 3000 });
      return;
    }
    const keyEvents = events.filter(e => e.isKeyMoment);
    const summary = keyEvents.map(e => `${e.minute}' — ${e.details}`).join('\n') || 'No key moments yet.';
    Toast.show({ message: '📋 Catch-up generated!', type: 'success', duration: 3000 });
    this._addCommentary(`📋 CATCH UP:\n${summary}`, { type: 'possession' });
  }

  _toggleNightOwl() {
    this.isNightOwlActive = !this.isNightOwlActive;
    const btn = document.getElementById('btn-night-owl');
    if (this.isNightOwlActive) {
      this.nightOwlService.activate();
      document.body.classList.add('night-owl-active');
      btn?.classList.add('btn--primary');
      Toast.show({ message: '🦉 Night Owl activated!', type: 'info', duration: 3000 });
    } else {
      this.nightOwlService.deactivate();
      document.body.classList.remove('night-owl-active');
      btn?.classList.remove('btn--primary');
      Toast.show({ message: '☀️ Night Owl off.', type: 'info', duration: 2000 });
    }
  }

  _shouldGenerateQuiz(event) {
    return event.isKeyMoment || this.matchFeed.getEventLog().length % 5 === 0;
  }

  async _generateQuizQuestion() {
    try {
      const recentEvents = this.matchFeed.getEventLog().slice(-5);
      const question = await this.crowdPulseService.generateQuestionFromApi(recentEvents);
      if (question) {
        Toast.show({ message: '🧠 New quiz question available on Predictions page!', type: 'quiz', duration: 4000 });
      }
    } catch { }
  }

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
      this.matchProofService.exportProof(calldata);
      Toast.show({ message: '🔐 Proof exported!', type: 'success', duration: 5000 });
    } catch {
      Toast.show({ message: 'Proof export failed.', type: 'danger', duration: 3000 });
    }
  }

  // ─── HIGHLIGHTS PAGE ────────────────────────────────────

  _initHighlightsPage() {
    const container = document.getElementById('highlights-grid');
    if (!container) return;

    const highlights = [
      { type: 'goal', title: 'Messi Opening Goal', match: 'Argentina vs France', minute: "23'", video: '/videos/highlight-goal.mp4', img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80' },
      { type: 'goal', title: 'Mbappe Equalizer', match: 'Argentina vs France', minute: "45'", video: '/videos/highlight-1.mp4', img: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&q=80' },
      { type: 'goal', title: 'Di Maria Wonder Goal', match: 'Argentina vs France', minute: "58'", video: '/videos/highlight-2.mp4', img: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80' },
      { type: 'penalty', title: 'Penalty Awarded - VAR', match: 'Argentina vs France', minute: "80'", video: '/videos/football-goal-2.mp4', img: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80' },
      { type: 'goal', title: 'Mbappe Hat-trick', match: 'Argentina vs France', minute: "81'", video: '/videos/highlight-3.mp4', img: 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?w=600&q=80' },
      { type: 'goal', title: 'Messi Extra Time Winner', match: 'Argentina vs France', minute: "108'", video: '/videos/highlight-4.mp4', img: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=600&q=80' },
      { type: 'red', title: 'Red Card - Dangerous Play', match: 'Barcelona vs Real Madrid', minute: "34'", video: '/videos/match-action.mp4', img: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=600&q=80' },
      { type: 'goal', title: 'Last Minute Winner', match: 'Liverpool vs Man City', minute: "90+3'", video: '/videos/highlight-5.mp4', img: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=600&q=80' },
      { type: 'goal', title: 'Bicycle Kick Stunner', match: 'Bayern vs Dortmund', minute: "67'", video: '/videos/highlight-6.mp4', img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&q=80' },
    ];

    container.innerHTML = highlights.map((h, i) => `
      <div class="highlight-card highlight-card--${h.type}" data-video="${h.video}" data-idx="${i}" style="opacity:1;transform:none;">
        <div class="highlight-card__video-wrap" style="position:relative;width:100%;height:180px;overflow:hidden;border-radius:var(--radius-md) var(--radius-md) 0 0;background:#000;cursor:pointer;">
          <video class="hl-video" muted preload="none" poster="${h.img}" style="width:100%;height:100%;object-fit:cover;">
            <source src="${h.video}" type="video/mp4" />
          </video>
          <div class="hl-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);transition:background 0.3s;pointer-events:none;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white" opacity="0.9"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div class="highlight-card__body">
          <div class="highlight-card__type">${h.type.toUpperCase()}</div>
          <div class="highlight-card__title">${h.title}</div>
          <div class="highlight-card__meta">
            <span>${h.match}</span>
            <span>${h.minute}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Hover previews and click plays the selected highlight inline.
    container.querySelectorAll('.highlight-card').forEach(card => {
      const vid = card.querySelector('.hl-video');
      const overlay = card.querySelector('.hl-overlay');
      const wrap = card.querySelector('.highlight-card__video-wrap');

      wrap?.addEventListener('mouseenter', () => {
        if (vid && vid.paused) { vid.play().catch(() => {}); }
        if (overlay) overlay.style.background = 'rgba(0,0,0,0.1)';
      });

      wrap?.addEventListener('mouseleave', () => {
        if (vid && !vid.dataset.pinned) {
          vid.pause();
          vid.currentTime = 0;
          vid.controls = false;
        }
        if (overlay && !vid?.dataset.pinned) overlay.style.background = 'rgba(0,0,0,0.4)';
      });

      wrap?.addEventListener('click', () => {
        if (!vid) return;
        container.querySelectorAll('.hl-video').forEach(other => {
          if (other !== vid) {
            other.pause();
            other.currentTime = 0;
            other.controls = false;
            delete other.dataset.pinned;
            const otherOverlay = other.closest('.highlight-card__video-wrap')?.querySelector('.hl-overlay');
            if (otherOverlay) otherOverlay.style.display = '';
          }
        });

        vid.dataset.pinned = 'true';
        vid.controls = true;
        vid.muted = false;
        vid.currentTime = Math.max(0, vid.currentTime);
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
        if (overlay) overlay.style.display = 'none';
      });
    });
  }

  // ─── PREDICTIONS PAGE ───────────────────────────────────

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
      return `
        <div class="quiz-card" style="opacity:1;transform:none;">
          <div class="quiz-meta">${q.isPrediction ? '🧠 LIVE AI PREDICTION' : `🧠 CROWD PULSE QUIZ · Question ${idx + 1}/${quizQuestions.length}`} · Score: ${this._quizScore}</div>
          <div class="quiz-question">${q.q}</div>
          ${q.source ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:var(--space-sm);">Grounded in: ${q.source}</div>` : ''}
          <div class="quiz-options" id="quiz-options-container">
            ${q.opts.map((opt, i) => `<button class="quiz-opt-btn" data-answer="${i}">${opt}</button>`).join('')}
          </div>
        </div>
      `;
    };

    main.innerHTML = `
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
    `;

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
            quizArea.innerHTML = renderQuiz(this._currentQuizIdx);
          }
        }, 2000);
      }

      // Restart quiz
      const restartBtn = e.target.closest('#btn-restart-quiz');
      if (restartBtn) {
        this._currentQuizIdx = 0;
        this._quizScore = 0;
        const quizArea = document.getElementById('quiz-area');
        if (quizArea) quizArea.innerHTML = renderQuiz(0);
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

    sidebar.innerHTML = `
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
                <td style="font-weight:600;">${l.name}</td>
                <td style="font-weight:700;color:var(--accent-green);">${l.score}</td>
                <td>${l.accuracy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── STANDINGS PAGE ─────────────────────────────────────

  _initStandingsPage() {
    const tableContainer = document.getElementById('standings-table-container');
    const sidebar = document.getElementById('standings-sidebar');
    if (!tableContainer || !sidebar) return;

    const standings = [
      { pos: 1, flag: '🇪🇸', team: 'Barcelona', p: 32, w: 25, d: 4, l: 3, gf: 78, ga: 22, gd: '+56', pts: 79, highlight: true },
      { pos: 2, flag: '🇪🇸', team: 'Real Madrid', p: 32, w: 24, d: 5, l: 3, gf: 72, ga: 25, gd: '+47', pts: 77 },
      { pos: 3, flag: '🇪🇸', team: 'Atletico Madrid', p: 32, w: 20, d: 7, l: 5, gf: 58, ga: 28, gd: '+30', pts: 67 },
      { pos: 4, flag: '🇪🇸', team: 'Real Sociedad', p: 32, w: 17, d: 8, l: 7, gf: 48, ga: 30, gd: '+18', pts: 59 },
      { pos: 5, flag: '🇪🇸', team: 'Villarreal', p: 32, w: 16, d: 7, l: 9, gf: 52, ga: 35, gd: '+17', pts: 55 },
      { pos: 6, flag: '🇪🇸', team: 'Real Betis', p: 32, w: 14, d: 10, l: 8, gf: 42, ga: 32, gd: '+10', pts: 52 },
      { pos: 7, flag: '🇪🇸', team: 'Sevilla', p: 32, w: 13, d: 8, l: 11, gf: 38, ga: 38, gd: '0', pts: 47 },
      { pos: 8, flag: '🇪🇸', team: 'Athletic Bilbao', p: 32, w: 12, d: 9, l: 11, gf: 40, ga: 36, gd: '+4', pts: 45 },
      { pos: 9, flag: '🇪🇸', team: 'Valencia', p: 32, w: 11, d: 7, l: 14, gf: 35, ga: 40, gd: '-5', pts: 40 },
      { pos: 10, flag: '🇪🇸', team: 'Getafe', p: 32, w: 9, d: 10, l: 13, gf: 28, ga: 38, gd: '-10', pts: 37 },
    ];

    tableContainer.innerHTML = `
      <div class="standings-panel motion-fade-in">
        <div class="standings-panel__header">
          <div class="standings-panel__title">La Liga 2025/26</div>
          <div class="standings-panel__league">Season 2025-26</div>
        </div>
        <div class="table-container">
          <table class="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GF</th>
                <th>GA</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              ${standings.map(s => `
                <tr class="${s.highlight ? 'standings-row--highlight' : ''}">
                  <td class="pos">${s.pos}</td>
                  <td><div class="team-cell"><span class="team-flag">${s.flag}</span> ${s.team}</div></td>
                  <td>${s.p}</td>
                  <td>${s.w}</td>
                  <td>${s.d}</td>
                  <td>${s.l}</td>
                  <td>${s.gf}</td>
                  <td>${s.ga}</td>
                  <td class="gd" style="color:${s.gd.startsWith('+') ? 'var(--accent-green)' : s.gd.startsWith('-') ? 'var(--accent-red)' : 'var(--text-muted)'}">${s.gd}</td>
                  <td class="pts">${s.pts}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const scorers = [
      { rank: 1, name: 'Robert Lewandowski', club: 'Barcelona', goals: 24 },
      { rank: 2, name: 'Vinicius Junior', club: 'Real Madrid', goals: 19 },
      { rank: 3, name: 'Antoine Griezmann', club: 'Atletico Madrid', goals: 17 },
      { rank: 4, name: 'Jude Bellingham', club: 'Real Madrid', goals: 16 },
      { rank: 5, name: 'Alexander Sorloth', club: 'Villarreal', goals: 15 },
      { rank: 6, name: 'Borja Iglesias', club: 'Real Betis', goals: 13 },
      { rank: 7, name: 'Mikel Oyarzabal', club: 'Real Sociedad', goals: 12 },
      { rank: 8, name: 'Pedri', club: 'Barcelona', goals: 11 },
    ];

    sidebar.innerHTML = `
      <div class="scorers-panel motion-fade-in">
        <div class="scorers-panel__title">⚽ Top Scorers</div>
        ${scorers.map(s => `
          <div class="scorer-item">
            <div class="scorer-rank ${s.rank <= 3 ? 'scorer-rank--' + s.rank : ''}">${s.rank}</div>
            <div class="scorer-info">
              <div class="scorer-name">${s.name}</div>
              <div class="scorer-club">${s.club}</div>
            </div>
            <div class="scorer-goals">${s.goals}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ─── VENUE PAGE ─────────────────────────────────────────

  _initVenuePage() {
    const heroContainer = document.getElementById('venue-hero-container');
    const contentContainer = document.getElementById('venue-content');
    if (!heroContainer || !contentContainer) return;

    heroContainer.innerHTML = `
      <div class="venue-hero motion-scale-in">
        <img class="venue-hero__img" src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80" alt="Lusail Stadium" loading="lazy" />
        <div class="venue-hero__overlay">
          <div class="venue-hero__name">Lusail Stadium</div>
          <div class="venue-hero__location">Lusail, Qatar · Capacity: 88,966</div>
        </div>
      </div>
    `;

    contentContainer.innerHTML = `
      <div>
        <div class="venue-info-card motion-fade-in venue-gps-card" style="margin-bottom:var(--space-xl);">
          <div class="venue-info-card__title"><span class="venue-info-card__icon">📍</span> GPS Matchday Route</div>
          <div id="venue-gps-status" style="color:var(--text-secondary);margin-bottom:var(--space-md);">Use your location to find the fastest accessible gate route.</div>
          <button class="btn btn--primary btn--md" id="btn-use-gps">Use GPS</button>
          <div id="venue-route-result" style="margin-top:var(--space-md);"></div>
        </div>

        <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
          <div class="venue-info-card__title"><span class="venue-info-card__icon">🏟️</span> Stadium Details</div>
          <div class="venue-stat"><span class="venue-stat__label">Capacity</span><span class="venue-stat__value">88,966</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Opened</span><span class="venue-stat__value">2022</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Surface</span><span class="venue-stat__value">Hybrid Grass</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Roof</span><span class="venue-stat__value">Retractable</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Climate Control</span><span class="venue-stat__value">Air-Conditioned</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Accessibility</span><span class="venue-stat__value">Wheelchair Accessible</span></div>
        </div>

        <div class="venue-info-card motion-fade-in">
          <div class="venue-info-card__title"><span class="venue-info-card__icon">🚪</span> Gate Density</div>
          <div class="gate-card">
            <span class="gate-name">Gate A - North</span>
            <span class="gate-density--high">HIGH</span>
          </div>
          <div class="gate-card">
            <span class="gate-name">Gate B - South</span>
            <span class="gate-density--medium">MEDIUM</span>
          </div>
          <div class="gate-card">
            <span class="gate-name">Gate C - East</span>
            <span class="gate-density--low">LOW</span>
          </div>
          <div class="gate-card">
            <span class="gate-name">Gate D - West</span>
            <span class="gate-density--medium">MEDIUM</span>
          </div>
          <div class="gate-card">
            <span class="gate-name">Gate E - VIP</span>
            <span class="gate-density--low">LOW</span>
          </div>
        </div>
      </div>

      <div>
        <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
          <div class="venue-info-card__title"><span class="venue-info-card__icon">🚇</span> Transport Routes</div>
          <div class="transport-routes">
            <div class="transport-route">
              <div class="transport-route__icon">🚇</div>
              <div class="transport-route__info">
                <div class="transport-route__name">Lusail Metro Station</div>
                <div class="transport-route__desc">Red Line · Direct access to Gate C</div>
              </div>
              <div class="transport-route__time">5 min</div>
            </div>
            <div class="transport-route">
              <div class="transport-route__icon">🚌</div>
              <div class="transport-route__info">
                <div class="transport-route__name">Stadium Express Bus</div>
                <div class="transport-route__desc">Route 77 · From City Center</div>
              </div>
              <div class="transport-route__time">25 min</div>
            </div>
            <div class="transport-route">
              <div class="transport-route__icon">🚗</div>
              <div class="transport-route__info">
                <div class="transport-route__name">Parking Zone P1</div>
                <div class="transport-route__desc">12,000 spaces · Shuttle to Gate A</div>
              </div>
              <div class="transport-route__time">10 min</div>
            </div>
            <div class="transport-route">
              <div class="transport-route__icon">🚕</div>
              <div class="transport-route__info">
                <div class="transport-route__name">Taxi / Ride Share</div>
                <div class="transport-route__desc">Drop-off at Gate B entrance</div>
              </div>
              <div class="transport-route__time">Varies</div>
            </div>
            <div class="transport-route">
              <div class="transport-route__icon">♿</div>
              <div class="transport-route__info">
                <div class="transport-route__name">Accessible Shuttle</div>
                <div class="transport-route__desc">Wheelchair-friendly · Gate E VIP</div>
              </div>
              <div class="transport-route__time">8 min</div>
            </div>
          </div>
        </div>

        <div class="venue-info-card motion-fade-in">
          <div class="venue-info-card__title"><span class="venue-info-card__icon">♿</span> Accessibility</div>
          <div class="venue-stat"><span class="venue-stat__label">Wheelchair Spaces</span><span class="venue-stat__value">450+</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Accessible Gates</span><span class="venue-stat__value">Gate C, Gate E</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Audio Description</span><span class="venue-stat__value">Available</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Sign Language</span><span class="venue-stat__value">On Request</span></div>
          <div class="venue-stat"><span class="venue-stat__label">Companion Seats</span><span class="venue-stat__value">All Sections</span></div>
        </div>
      </div>
    `;

    const gpsBtn = contentContainer.querySelector('#btn-use-gps');
    const gpsStatus = contentContainer.querySelector('#venue-gps-status');
    const routeResult = contentContainer.querySelector('#venue-route-result');
    gpsBtn?.addEventListener('click', async () => {
      gpsBtn.disabled = true;
      gpsBtn.textContent = 'Locating...';
      try {
        const position = await this.venueMapService.getCurrentPosition();
        const venue = await this.venueMapService.findNearestVenue(position);
        const route = this.venueMapService.getAccessibleRoute('gate-7');
        if (gpsStatus) {
          gpsStatus.textContent = `Nearest venue: ${venue.name} · ${venue.distanceKm}km away`;
        }
        if (routeResult) {
          routeResult.innerHTML = `
            <div class="route-summary">
              <div><strong>${route.destination}</strong></div>
              <div>${route.totalDistance} · ${route.estimatedTime} · ${route.isWheelchairAccessible ? 'Step-free' : 'Standard route'}</div>
              ${route.steps.map(step => `<div class="route-step">${step.instruction}<span>${step.distance}</span></div>`).join('')}
            </div>
          `;
        }
        Toast.show({ message: 'GPS route ready.', type: 'success', duration: 2500 });
      } catch {
        Toast.show({ message: 'GPS failed. Showing default accessible route.', type: 'warning', duration: 3000 });
      } finally {
        gpsBtn.disabled = false;
        gpsBtn.textContent = 'Refresh GPS';
      }
    });
  }

  // ─── Scroll Animations ──────────────────────────────────

  _initScrollAnimations() {
    // All elements are visible by default via CSS
    // This method is kept for future scroll-triggered enhancements
  }

  // ─── Hero Particles ─────────────────────────────────────

  _initParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'hero__particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 6}s`;
      particle.style.animationDuration = `${4 + Math.random() * 4}s`;
      particle.style.width = `${1 + Math.random() * 2}px`;
      particle.style.height = particle.style.width;
      container.appendChild(particle);
    }
  }

  // ─── Hero Animation ─────────────────────────────────────

  _animateHero() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.hero__badge', { y: 20, opacity: 0, duration: 0.6, delay: 0.3 })
      .from('.hero__title-line', { y: 40, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.3')
      .from('.hero__subtitle', { y: 20, opacity: 0, duration: 0.6 }, '-=0.3')
      .from('.hero__cta', { y: 20, opacity: 0, duration: 0.5 }, '-=0.2')
      .from('.feature-card', { y: 30, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
      .from('.hero__scroll', { opacity: 0, duration: 0.5 }, '-=0.2');

    const hero = document.getElementById('hero');
    if (hero) {
      hero.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 10;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        gsap.to('.hero__video', { x: x * 0.5, y: y * 0.5, duration: 0.8, ease: 'power2.out' });
      });
    }
  }

  // ─── Settings Persistence ───────────────────────────────

  _loadSettings() {
    try {
      const saved = localStorage.getItem('vantage_settings');
      if (saved) return JSON.parse(saved);
    } catch { }
    return {
      language: 'en',
      pace: 'medium',
      register: 'casual',
      hearingImpaired: false,
      visionImpaired: false,
      nightOwl: false,
      notifications: true,
      playbackSpeed: 10,
    };
  }

  destroy() {
    this.matchFeed?.destroy();
    this.nightOwlService?.deactivate();
    this.videoPlayer?.destroy();
  }
}
