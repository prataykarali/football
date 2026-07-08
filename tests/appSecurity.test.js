import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app.js';
import { CrowdPulsePanel } from '../src/components/CrowdPulsePanel.js';
import { NightOwlPanel } from '../src/components/NightOwlPanel.js';
import { PlayerCard } from '../src/components/PlayerCard.js';
import { VideoPlayer } from '../src/components/VideoPlayer.js';

function elementStub() {
  return {
    innerHTML: '',
    textContent: '',
    style: {},
  };
}

function stubElements(map) {
  vi.stubGlobal('document', {
    getElementById: vi.fn((id) => map[id] || null),
  });
}

function htmlStub(children = {}) {
  return {
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: {},
    hidden: false,
    tagName: 'DIV',
    replaceChildren() {
      this.innerHTML = '';
    },
    insertAdjacentHTML(_position, html) {
      this.innerHTML = String(html);
    },
    querySelector(selector) {
      return children[selector] || null;
    },
    querySelectorAll(selector) {
      return children[selector] || [];
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('App frontend security', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('escapes HTML before rendering live travel route data', () => {
    const status = elementStub();
    const options = elementStub();
    stubElements({
      'live-travel-status': status,
      'live-travel-options': options,
    });

    const app = new App();
    app.venueMapService = {};
    app.liveTravelPlan = {
      venue: { name: '<img src=x onerror=alert(1)>' },
      distanceKm: 1.2,
      routeDistanceKm: 1.6,
      hasUserLocation: true,
      bestGate: { name: '<script>alert("gate")</script>' },
      recommended: {
        label: '<b onclick=alert(1)>Transit</b>',
        etaMinutes: 12,
      },
      alternatives: [
        {
          label: '<svg onload=alert(1)>',
          etaMinutes: 12,
          badge: '<iframe src=x>',
          distanceKm: 1.6,
          cost: '<img src=x>',
          reason: '<script>alert("reason")</script>',
        },
      ],
    };

    app._renderLiveTravelCard();

    const rendered = `${status.innerHTML}${options.innerHTML}`;
    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('<svg');
    expect(rendered).not.toContain('<iframe');
    expect(rendered).toContain('&lt;img');
    expect(rendered).toContain('&lt;script&gt;');
  });

  it('uses text nodes for hostile commentary text', () => {
    const feed = {
      scrollHeight: 10,
      scrollTop: 0,
      appended: null,
      children: [],
      appendChild(node) {
        this.appended = node;
        this.children.push(node);
      },
      removeChild(node) {
        const idx = this.children.indexOf(node);
        if (idx >= 0) this.children.splice(idx, 1);
      },
    };
    const createdNodes = [];
    stubElements({ 'commentary-feed': feed });
    document.createElement = vi.fn((tag) => {
      const node = {
        tag,
        className: '',
        textContent: '',
        children: [],
        append(...children) {
          this.children.push(...children);
        },
      };
      createdNodes.push(node);
      return node;
    });

    const app = new App();
    app._addCommentary('<img src=x onerror=alert(1)>', { type: 'goal', minute: '<script>' });

    expect(feed.appended.children[0].textContent).toBe("<script>'");
    expect(feed.appended.children[2].textContent).toBe('<img src=x onerror=alert(1)>');
    expect(feed.appended.innerHTML).toBeUndefined();
  });

  it('escapes hostile Crowd Pulse questions, options, and leaderboard names', () => {
    const buttons = [
      { dataset: { idx: '0' }, addEventListener: vi.fn() },
      { dataset: { idx: '1' }, addEventListener: vi.fn() },
    ];
    const quizArea = htmlStub({ '.quiz-opt-btn': buttons });
    const leaderboardBody = htmlStub();
    const panel = new CrowdPulsePanel(htmlStub({
      '#active-quiz-area': quizArea,
      '#leaderboard-body': leaderboardBody,
    }), {
      getLeaderboard: () => [
        { id: 'p5', name: '<img src=x onerror=alert(1)>', score: '42', streak: '3' },
      ],
    });

    panel.showQuestion({
      id: 'q-xss',
      question: '<script>alert(1)</script>',
      options: ['<img src=x onerror=alert(1)>', '<svg onload=alert(1)>'],
    });
    panel.updateLeaderboard();

    const rendered = `${quizArea.innerHTML}${leaderboardBody.innerHTML}`;
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<svg');
    // Escaped text may legitimately contain the substring `onerror=` as inert
    // content (e.g. `&lt;img src=x onerror=alert(1)&gt;`); what matters is that
    // no live `<img>`/`<svg>` tag survives. Guard against a real attribute by
    // asserting the dangerous tokens only appear inside escaped entities.
    expect(rendered).not.toMatch(/<(?:img|svg)[\s>]/i);
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).toContain('&lt;img');
  });

  it('escapes hostile Night Owl alert, break reason, and catch-up summary content', () => {
    const alertArea = htmlStub();
    const summaryEl = htmlStub();
    const panel = new NightOwlPanel(htmlStub({
      '#night-owl-alert-area': alertArea,
      '#catchup-summary-content': summaryEl,
    }), {
      isBreakSafe: () => ({
        safe: false,
        reason: '<img src=x onerror=alert(1)>',
      }),
    });

    panel.showBigMomentAlert({
      type: 'goal',
      minute: '<script>alert(1)</script>',
      details: '<svg onload=alert(1)>',
    });
    panel.checkBreakWindow();
    panel.showCatchUpSummary({ summary: '<iframe src=javascript:alert(1)></iframe>' });

    const rendered = `${alertArea.innerHTML}${summaryEl.innerHTML}`;
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('<svg');
    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<iframe');
    expect(rendered).toContain('&lt;img');
    expect(rendered).toContain('&lt;iframe');
  });

  it('escapes hostile PlayerCard vision data and video overlay text', () => {
    const playerContent = htmlStub();
    const playerCard = new PlayerCard(htmlStub({ '#player-card-content': playerContent }));
    playerCard.show({
      homeTeam: '<img src=x onerror=alert(1)>',
      awayTeam: '<svg onload=alert(1)>',
      score: '<script>alert(1)</script>',
      minute: '<iframe src=x>',
      inFocus: '<b onclick=alert(1)>focus</b>',
      phase: '<marquee>phase</marquee>',
      funFact: '<script>alert("fact")</script>',
      player: '<img src=x onerror=alert(1)>',
      confidence: 0.9,
    });

    const overlay = htmlStub();
    const videoPlayer = new VideoPlayer(htmlStub({ '#video-score-overlay': overlay }));
    videoPlayer.setOverlayScore('<img src=x onerror=alert(1)>', '<svg onload=alert(1)>', '<script>', '</script>');

    const rendered = `${playerContent.innerHTML}${overlay.innerHTML}`;
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('<img');
    expect(rendered).not.toContain('<svg');
    expect(rendered).not.toContain('<iframe');
    expect(rendered).toContain('&lt;script');
    expect(rendered).toContain('&lt;img');
  });

  it('rejects spoofed media URLs that only mention trusted hosts in the query', () => {
    const videoPlayer = new VideoPlayer(htmlStub());

    const safeSrc = videoPlayer._safeMediaSrc('https://evil.example/watch?next=youtube.com');

    expect(safeSrc).not.toContain('evil.example');
    expect(safeSrc).toContain('football-goal-1.mp4');
  });
});
