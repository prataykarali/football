import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app.js';

function makeBody() {
  return {
    classList: {
      _set: new Set(),
      add(c) { this._set.add(c); },
      remove(c) { this._set.delete(c); },
      toggle(c, on) { on ? this._set.add(c) : this._set.delete(c); },
      contains(c) { return this._set.has(c); },
      forEach(cb) { this._set.forEach(cb); },
    },
    focus: vi.fn(),
  };
}

describe('App settings & accessibility application', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      getElementById: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
    });
    vi.stubGlobal('localStorage', {
      _store: {},
      getItem(k) { return this._store[k] ?? null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
    });
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
      addEventListener: () => {},
    });
    vi.stubGlobal('document', {
      ...globalThis.document,
      body: makeBody(),
      getElementById: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists settings to localStorage', () => {
    const app = new App();
    app._applySettings({ language: 'es', pace: 'fast' });

    const stored = JSON.parse(localStorage.getItem('vantage_settings'));
    expect(stored.language).toBe('es');
    expect(stored.pace).toBe('fast');
  });

  it('enables reduced-motion + high-contrast + TTS for vision-impaired mode', () => {
    const app = new App();
    app._applySettings({ visionImpaired: true });

    expect(document.body.classList.contains('reduced-motion')).toBe(true);
    expect(document.body.classList.contains('high-contrast')).toBe(true);
  });

  it('enables hearing-impaired caption styling', () => {
    const app = new App();
    app._applySettings({ hearingImpaired: true });

    expect(document.body.classList.contains('hearing-impaired')).toBe(true);
  });

  it('disables accessibility classes when toggles are off', () => {
    const app = new App();
    app._applySettings({ visionImpaired: true, hearingImpaired: true });
    app._applySettings({ visionImpaired: false, hearingImpaired: false });

    expect(document.body.classList.contains('reduced-motion')).toBe(false);
    expect(document.body.classList.contains('high-contrast')).toBe(false);
    expect(document.body.classList.contains('hearing-impaired')).toBe(false);
  });

  it('_speak is a safe no-op when vision-impaired is off', () => {
    const app = new App();
    app._applySettings({ visionImpaired: false });
    expect(() => app._speak('Goal')).not.toThrow();
  });
});
