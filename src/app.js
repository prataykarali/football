import { LocalDatabase } from './services/localDatabase.js';
import { MATCH_INFO } from './data/sampleMatch.js';
import { Toast } from './components/Toast.js';

import { coreMethods } from './app/core.js';
import { homePageMethods } from './app/homePage.js';
import { liveInitMethods } from './app/live/init.js';
import { liveTimerMethods } from './app/live/timers.js';
import { liveTravelMethods } from './app/live/travel.js';
import { liveEventMethods } from './app/live/events.js';
import { livePanelMethods } from './app/live/panels.js';
import { highlightsPageMethods } from './app/highlightsPage.js';
import { predictionsPageMethods } from './app/predictionsPage.js';
import { standingsPageMethods } from './app/standingsPage.js';
import { venuePageMethods } from './app/venuePage.js';

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
    this.liveMatchVenue = null;
    this.liveTravelPlan = null;
    this._managedIntervals = new Map();
    this._tacticalPitchAnimationFrame = null;
    this._tacticalPitchResizeHandler = null;
    this._renderVenuePage = null;
    this.staffPanel = null;
    this.sustainabilityService = null;
  }

  async init() {
    try {
      Toast.init();
      this._initServices();
      this._initSettingsPanel();
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
}

Object.assign(
  App.prototype,
  coreMethods,
  homePageMethods,
  liveInitMethods,
  liveTimerMethods,
  liveTravelMethods,
  liveEventMethods,
  livePanelMethods,
  highlightsPageMethods,
  predictionsPageMethods,
  standingsPageMethods,
  venuePageMethods,
);
