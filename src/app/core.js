import { MatchFeed } from '../services/matchFeed.js';
import { CommentaryService } from '../services/commentary.js';
import { PlayerCardService } from '../services/playerCard.js';
import { NightOwlService } from '../services/nightOwl.js';
import { CrowdPulseService } from '../services/crowdPulse.js';
import { VenueMapService } from '../services/venueMap.js';
import { MatchProofService } from '../services/matchProof.js';
import { SAMPLE_MATCH_EVENTS } from '../data/sampleMatch.js';
import { DEFAULT_MATCH_SPEED } from './constants.js';
import { Toast } from '../components/Toast.js';
import { gsap } from 'gsap';

export const coreMethods = {
  _handleRoute() {
    const hash = window.location.hash.replace('#/', '') || 'home';
    const validPages = ['home', 'live', 'highlights', 'predictions', 'standings', 'venue'];
    const page = validPages.includes(hash) ? hash : 'home';
    this._showPage(page);
  },

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
  },

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
  },

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

    window.addEventListener('scroll', () => {
      const nav = document.getElementById('site-nav');
      if (nav) {
        nav.classList.toggle('scrolled', window.scrollY > 50);
      }
    });
  },

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
  },

  _applyTheme(theme) {
    document.body.classList.forEach(cls => {
      if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });
    if (theme !== 'neon') {
      document.body.classList.add(`theme-${theme}`);
    }
  },

  // ─── Services ───────────────────────────────────────────

  _initServices() {
    this.commentaryService = new CommentaryService();
    this.playerCardService = new PlayerCardService();
    this.venueMapService = new VenueMapService();
    this.matchProofService = new MatchProofService();

    const initialSpeed = parseInt(document.getElementById('speed-select')?.value || `${DEFAULT_MATCH_SPEED}`, 10);
    this.matchFeed = new MatchFeed(SAMPLE_MATCH_EVENTS, initialSpeed);
    this.nightOwlService = new NightOwlService(this.matchFeed);
    this.crowdPulseService = new CrowdPulseService(this.matchFeed);
  },

  async _loadApiStatus() {
    try {
      const response = await fetch('/api/status');
      this.apiStatus = response.ok ? await response.json() : null;
    } catch {
      this.apiStatus = null;
    }
  },

  _renderApiStatus() {
    const el = document.getElementById('api-status-banner');
    if (!el) return;

    const isGeminiOnline = this.apiStatus?.services?.gemini?.configured;

    el.innerHTML = `
      <div class="api-status-card__title">Live Services</div>
      <div class="api-status-card__body">
        Commentary: ${isGeminiOnline ? '<strong style="color:var(--accent-green);">Gemini 2.5 Live Active</strong>' : 'fallback mode'}<br>
        GPS: browser location + local route fallback<br>
        Quiz/leaderboard: local + backend fallback<br>
        Maps/weather: local stadium data
      </div>
    `;

    if (isGeminiOnline) {
      el.classList.remove('api-status-card--offline');
      el.classList.add('api-status-card--online');
    } else {
      el.classList.remove('api-status-card--online');
      el.classList.add('api-status-card--offline');
    }
  },

  _startManagedInterval(key, callback, delayMs) {
    this._clearManagedInterval(key);
    const intervalId = setInterval(callback, delayMs);
    this._managedIntervals.set(key, intervalId);
    return intervalId;
  },

  _clearManagedInterval(key) {
    const intervalId = this._managedIntervals.get(key);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      this._managedIntervals.delete(key);
    }
  },

  _clearManagedIntervals() {
    this._managedIntervals.forEach((intervalId) => clearInterval(intervalId));
    this._managedIntervals.clear();
  },

  // ─── HOME PAGE ──────────────────────────────────────────

  _initScrollAnimations() {
    // All elements are visible by default via CSS
    // This method is kept for future scroll-triggered enhancements
  },

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
  },

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
  },

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
  },

  destroy() {
    this._liveEventsAbortController?.abort?.();
    this._liveEventsAbortController = null;
    this._clearManagedIntervals();
    if (this._tacticalPitchAnimationFrame) {
      cancelAnimationFrame(this._tacticalPitchAnimationFrame);
      this._tacticalPitchAnimationFrame = null;
    }
    if (this._tacticalPitchResizeHandler) {
      window.removeEventListener('resize', this._tacticalPitchResizeHandler);
      this._tacticalPitchResizeHandler = null;
    }
    if (this._leafletMap) {
      this._leafletMap.remove();
      this._leafletMap = null;
    }
    this.matchFeed?.destroy();
    this.nightOwlService?.deactivate();
    this.videoPlayer?.destroy();
  }
};
