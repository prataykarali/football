import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app.js';

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
});
