import { MatchFeed } from '../services/matchFeed.js';
import { CommentaryService } from '../services/commentary.js';
import { PlayerCardService } from '../services/playerCard.js';
import { NightOwlService } from '../services/nightOwl.js';
import { CrowdPulseService } from '../services/crowdPulse.js';
import { VenueMapService } from '../services/venueMap.js';
import { MatchProofService } from '../services/matchProof.js';
import { SustainabilityService } from '../services/sustainability.js';
import { StaffPanel } from '../components/StaffPanel.js';
import { SAMPLE_MATCH_EVENTS } from '../data/sampleMatch.js';
import { DEFAULT_MATCH_SPEED } from './constants.js';
import { Toast } from '../components/Toast.js';
import { SettingsPanel } from '../components/SettingsPanel.js';
import { setHTML } from '../utils/dom.js';
import { setTTSEnabled, speak as speakTTS } from '../utils/tts.js';
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
      const isActive = link.dataset.page === pageId;
      link.classList.toggle('site-nav__link--active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    this.currentPage = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('main-content')?.focus?.({ preventScroll: true });

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
      const toggleMenu = () => {
        const isOpen = links.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', isOpen.toString());
      };
      hamburger.addEventListener('click', toggleMenu);
      links.querySelectorAll('.site-nav__link').forEach(link => {
        link.addEventListener('click', () => {
          links.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
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

    const savedTheme = this._normalizeTheme(typeof localStorage === 'undefined'
      ? 'neon'
      : localStorage.getItem('vantage_theme') || 'neon');
    this._applyTheme(savedTheme);

    const dots = switcher.querySelectorAll('.theme-dot');
    const applySelection = (dot, { focus = false } = {}) => {
      const theme = dot.dataset.theme;
      this._applyTheme(theme);
      dots.forEach(d => {
        const isActive = d === dot;
        d.classList.toggle('theme-dot--active', isActive);
        d.setAttribute('aria-checked', isActive.toString());
        d.tabIndex = isActive ? 0 : -1;
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vantage_theme', theme);
      }
      if (focus) dot.focus?.();
      Toast.show({ message: `Theme: ${theme}`, type: 'info', duration: 2000 });
    };

    dots.forEach(dot => {
      const isCurrent = dot.dataset.theme === savedTheme;
      dot.classList.toggle('theme-dot--active', isCurrent);
      dot.setAttribute('aria-checked', isCurrent.toString());
      dot.tabIndex = isCurrent ? 0 : -1;

      const activateTheme = () => {
        applySelection(dot);
      };

      dot.addEventListener('click', activateTheme);
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateTheme();
        } else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          const currentIndex = [...dots].indexOf(dot);
          let nextIndex = currentIndex;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (currentIndex + 1) % dots.length;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (currentIndex - 1 + dots.length) % dots.length;
          if (e.key === 'Home') nextIndex = 0;
          if (e.key === 'End') nextIndex = dots.length - 1;
          applySelection(dots[nextIndex], { focus: true });
        }
      });
    });
  },

  _normalizeTheme(theme = 'neon') {
    const allowedThemes = ['neon', 'cyber', 'nightowl', 'rose', 'purple', 'light'];
    return allowedThemes.includes(theme) ? theme : 'neon';
  },

  _applyTheme(theme) {
    const safeTheme = this._normalizeTheme(theme);
    document.body.classList.forEach(cls => {
      if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    });
    if (safeTheme !== 'neon') {
      document.body.classList.add(`theme-${safeTheme}`);
    }
    this._syncThemeSwitcher(safeTheme);
    return safeTheme;
  },

  _syncThemeSwitcher(theme = 'neon') {
    const safeTheme = this._normalizeTheme(theme);
    document.querySelectorAll('#theme-switcher .theme-dot').forEach(dot => {
      const isActive = dot.dataset.theme === safeTheme;
      dot.classList.toggle('theme-dot--active', isActive);
      dot.setAttribute('aria-checked', isActive.toString());
      dot.tabIndex = isActive ? 0 : -1;
    });
  },

  // ─── Settings Panel ────────────────────────────────────

  _initSettingsPanel() {
    const container = document.getElementById('settings-container');
    if (!container) return;
    this.settingsPanel = new SettingsPanel(container);
    this.settingsPanel.render();
    this.settingsPanel.onSettingsChange((next) => this._applySettings(next));

    const btn = document.getElementById('btn-settings');
    btn?.addEventListener('click', () => {
      const isOpen = !container.hidden;
      container.hidden = isOpen;
      btn.setAttribute('aria-expanded', (!isOpen).toString());
      if (!isOpen) container.focus?.();
    });

    container.addEventListener?.('vantage:settings-close', () => {
      container.hidden = true;
      btn?.setAttribute('aria-expanded', 'false');
      btn?.focus?.();
    });

    // Apply the persisted settings once on boot so toggles stay in sync.
    this._applySettings(this.settings);
  },

  _applySettings(next = {}) {
    this.settings = { ...this.settings, ...next };
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('vantage_settings', JSON.stringify(this.settings));
      } catch (error) {
        console.warn('Settings could not be persisted.', error);
      }
    }

    const body = document.body;
    body.classList.toggle('reduced-motion', Boolean(this.settings.visionImpaired));
    body.classList.toggle('high-contrast', Boolean(this.settings.visionImpaired));
    body.classList.toggle('hearing-impaired', Boolean(this.settings.hearingImpaired));
    if (this.settings.theme) {
      this.settings.theme = this._applyTheme(this.settings.theme);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('vantage_theme', this.settings.theme);
      }
    }

    setTTSEnabled(Boolean(this.settings.visionImpaired));

    // Reflect toggle state back into the panel checkboxes if they exist.
    const panel = this.settingsPanel?.containerEl;
    if (panel) {
      const hearing = panel.querySelector('#toggle-hearing');
      const vision = panel.querySelector('#toggle-vision');
      const staff = panel.querySelector('#toggle-staff');
      hearing?.classList.toggle('toggle--active', Boolean(this.settings.hearingImpaired));
      hearing?.setAttribute('aria-checked', Boolean(this.settings.hearingImpaired).toString());
      vision?.classList.toggle('toggle--active', Boolean(this.settings.visionImpaired));
      vision?.setAttribute('aria-checked', Boolean(this.settings.visionImpaired).toString());
      staff?.classList.toggle('toggle--active', Boolean(this.settings.staffMode));
      staff?.setAttribute('aria-checked', Boolean(this.settings.staffMode).toString());
      const lang = panel.querySelector('#setting-lang');
      if (lang && this.settings.language) lang.value = this.settings.language;
      const pace = panel.querySelector('#setting-pace');
      if (pace && this.settings.pace) pace.value = this.settings.pace;
      const register = panel.querySelector('#setting-register');
      if (register && this.settings.register) register.value = this.settings.register;
      const theme = panel.querySelector('#setting-theme');
      if (theme && this.settings.theme) theme.value = this.settings.theme;
    }

    const staffContainer = document.getElementById('staff-command-container');
    if (staffContainer) {
      staffContainer.hidden = !this.settings.staffMode;
      if (this.settings.staffMode) {
        if (!this.staffPanel) {
          this.staffPanel = new StaffPanel(staffContainer, this);
        }
        this.staffPanel.render();
      }
    }
  },

  _speak(text) {
    if (this.settings?.visionImpaired) speakTTS(text, { lang: this.settings?.language || 'en' });
  },

  // ─── Services ───────────────────────────────────────────

  _initServices() {
    this.commentaryService = new CommentaryService();
    this.playerCardService = new PlayerCardService();
    this.venueMapService = new VenueMapService();
    this.matchProofService = new MatchProofService();
    this.sustainabilityService = new SustainabilityService();

    const initialSpeed = parseInt(document.getElementById('speed-select')?.value || `${DEFAULT_MATCH_SPEED}`, 10);
    this.matchFeed = new MatchFeed(SAMPLE_MATCH_EVENTS, initialSpeed);
    this.nightOwlService = new NightOwlService(this.matchFeed);
    this.crowdPulseService = new CrowdPulseService(this.matchFeed);
  },

  async _loadApiStatus() {
    try {
      const response = await fetch('/api/status');
      this.apiStatus = response.ok ? await response.json() : null;
    } catch (error) {
      console.warn('API status unavailable; using offline service banner.', error);
      this.apiStatus = null;
    }
  },

  _renderApiStatus() {
    const el = document.getElementById('api-status-banner');
    if (!el) return;

    const isGeminiOnline = this.apiStatus?.services?.gemini?.configured;

    setHTML(el, `
      <div class="api-status-card__title">Live Services</div>
      <div class="api-status-card__body">
        Commentary: ${isGeminiOnline ? '<strong style="color:var(--accent-green);">Gemini 2.5 Live Active</strong>' : 'fallback mode'}<br>
        GPS: browser location + local route fallback<br>
        Quiz/leaderboard: local + backend fallback<br>
        Maps/weather: local stadium data
      </div>
    `);

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
    if (typeof localStorage === 'undefined') {
      return this._defaultSettings();
    }

    try {
      const saved = localStorage.getItem('vantage_settings');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.warn('Saved settings could not be read; using defaults.', error);
    }
    return this._defaultSettings();
  },

  _defaultSettings() {
    return {
      language: 'en',
      pace: 'medium',
      register: 'casual',
      hearingImpaired: false,
      visionImpaired: false,
      nightOwl: false,
      notifications: true,
      playbackSpeed: 10,
      theme: 'neon',
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
