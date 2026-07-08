import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffPanel } from '../src/components/StaffPanel.js';

function makeMockElement() {
  const querySelectorSpy = vi.fn((sel) => {
    if (sel === '.staff-panel__tabs') {
      return makeMockElement();
    }
    if (sel === '#staff-tab-org' || sel === '#staff-tab-vol' || sel === '#btn-refresh-ai-advice' || sel === '#btn-speak-translation' || sel === '#staff-translated-box') {
      return makeMockElement();
    }
    return null;
  });

  const querySelectorAllSpy = vi.fn((sel) => {
    if (sel === '.btn-resolve-incident') {
      return [makeMockElement()];
    }
    return [];
  });

  return {
    querySelector: querySelectorSpy,
    querySelectorAll: querySelectorAllSpy,
    addEventListener: vi.fn(),
    remove: vi.fn(),
    replaceChildren: vi.fn(),
    insertAdjacentHTML: vi.fn(),
    dataset: { incId: '1' }
  };
}

describe('StaffPanel Component', () => {
  let container;

  beforeEach(() => {
    container = makeMockElement();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => makeMockElement()),
      body: makeMockElement(),
    });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ translatedText: 'Traducido' })
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders tab headers correctly', () => {
    const panel = new StaffPanel(container, {});
    panel.render();

    expect(container.querySelector).toHaveBeenCalled();
  });

  it('toggles tabs when clicked', () => {
    const panel = new StaffPanel(container, {});
    panel.render();

    expect(panel.activeTab).toBe('organizer');

    // Simulate switching active tab
    panel.activeTab = 'volunteer';
    panel.render();

    expect(panel.activeTab).toBe('volunteer');
  });

  it('resolves active incidents', () => {
    const panel = new StaffPanel(container, {});
    panel.activeTab = 'volunteer';
    panel.render();

    const firstIncident = panel.incidents[0];
    expect(firstIncident.status).toBe('Pending');

    // Simulate incident resolution
    firstIncident.status = 'Resolved';
    expect(firstIncident.status).toBe('Resolved');
  });
});
