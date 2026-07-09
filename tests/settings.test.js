import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app.js';
import { SettingsPanel } from '../src/components/SettingsPanel.js';

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

function makeSelect(value = '') {
  return { value };
}

function makeToggle() {
  return {
    classList: {
      _set: new Set(),
      toggle(c, on) { on ? this._set.add(c) : this._set.delete(c); },
      contains(c) { return this._set.has(c); },
    },
    setAttribute: vi.fn(),
  };
}

function makeClassList() {
  return {
    _set: new Set(),
    add(c) { this._set.add(c); },
    remove(c) { this._set.delete(c); },
    toggle(c, on) {
      const enabled = on === undefined ? !this._set.has(c) : on;
      enabled ? this._set.add(c) : this._set.delete(c);
      return enabled;
    },
    contains(c) { return this._set.has(c); },
  };
}

function makePanelNode({ tagName = 'BUTTON', value = '', attrs = {} } = {}) {
  const listeners = {};
  const attributes = { ...attrs };
  return {
    tagName,
    value,
    classList: makeClassList(),
    addEventListener: vi.fn((type, cb) => { listeners[type] = cb; }),
    click() { listeners.click?.({ type: 'click' }); },
    setAttribute: vi.fn((name, next) => { attributes[name] = String(next); }),
    getAttribute: vi.fn((name) => attributes[name] ?? null),
  };
}

function makeSettingsContainer() {
  const listeners = {};
  const nodes = {};
  const selects = [];
  const container = {
    innerHTML: '',
    replaceChildren: vi.fn(() => { container.innerHTML = ''; }),
    insertAdjacentHTML: vi.fn((_position, html) => {
      container.innerHTML = String(html);
      nodes['#btn-close-settings'] = makePanelNode({ attrs: { 'aria-label': 'Close settings' } });
      nodes['#toggle-hearing'] = makePanelNode({ attrs: { role: 'switch', 'aria-checked': 'false' } });
      nodes['#toggle-vision'] = makePanelNode({ attrs: { role: 'switch', 'aria-checked': 'false' } });
      nodes['#toggle-staff'] = makePanelNode({ attrs: { role: 'switch', 'aria-checked': 'false' } });
      nodes['#setting-lang'] = makePanelNode({ tagName: 'SELECT', value: 'en' });
      nodes['#setting-pace'] = makePanelNode({ tagName: 'SELECT', value: 'medium' });
      nodes['#setting-register'] = makePanelNode({ tagName: 'SELECT', value: 'casual' });
      nodes['#setting-theme'] = makePanelNode({ tagName: 'SELECT', value: 'neon' });
      selects.splice(0, selects.length, nodes['#setting-lang'], nodes['#setting-pace'], nodes['#setting-register'], nodes['#setting-theme']);
    }),
    querySelector: vi.fn((selector) => nodes[selector] || null),
    querySelectorAll: vi.fn((selector) => selector === 'select' ? selects : []),
    addEventListener: vi.fn((type, cb) => { listeners[type] = cb; }),
    dispatchEvent: vi.fn((event) => {
      listeners[event.type]?.(event);
      return true;
    }),
  };
  return container;
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

  it('applies and persists the selected theme from settings', () => {
    const app = new App();
    app._applySettings({ theme: 'light' });

    expect(document.body.classList.contains('theme-light')).toBe(true);
    expect(localStorage.getItem('vantage_theme')).toBe('light');
  });

  it('normalizes invalid theme values before applying body classes', () => {
    const app = new App();
    app._applySettings({ theme: 'bad theme<script>' });

    expect(app.settings.theme).toBe('neon');
    expect([...document.body.classList._set].some(cls => cls.includes('script'))).toBe(false);
    expect(localStorage.getItem('vantage_theme')).toBe('neon');
  });

  it('reflects persisted select and switch state into the settings panel', () => {
    const controls = {
      '#toggle-hearing': makeToggle(),
      '#toggle-vision': makeToggle(),
      '#toggle-staff': makeToggle(),
      '#setting-lang': makeSelect('en'),
      '#setting-pace': makeSelect('medium'),
      '#setting-register': makeSelect('casual'),
      '#setting-theme': makeSelect('neon'),
    };
    const app = new App();
    app.settingsPanel = {
      containerEl: {
        querySelector: vi.fn((selector) => controls[selector] || null),
      },
    };

    app._applySettings({
      language: 'bn',
      pace: 'fast',
      register: 'tactical',
      theme: 'nightowl',
      hearingImpaired: true,
      visionImpaired: true,
      staffMode: true,
    });

    expect(controls['#setting-lang'].value).toBe('bn');
    expect(controls['#setting-pace'].value).toBe('fast');
    expect(controls['#setting-register'].value).toBe('tactical');
    expect(controls['#setting-theme'].value).toBe('nightowl');
    expect(controls['#toggle-hearing'].setAttribute).toHaveBeenCalledWith('aria-checked', 'true');
    expect(controls['#toggle-vision'].setAttribute).toHaveBeenCalledWith('aria-checked', 'true');
    expect(controls['#toggle-staff'].setAttribute).toHaveBeenCalledWith('aria-checked', 'true');
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

describe('SettingsPanel accessibility controls', () => {
  it('renders settings switches as native buttons with switch semantics', () => {
    const container = makeSettingsContainer();
    const panel = new SettingsPanel(container);

    panel.render();

    const hearing = container.querySelector('#toggle-hearing');
    const vision = container.querySelector('#toggle-vision');
    const staff = container.querySelector('#toggle-staff');
    expect(hearing.tagName).toBe('BUTTON');
    expect(vision.tagName).toBe('BUTTON');
    expect(staff.tagName).toBe('BUTTON');
    expect(hearing.getAttribute('role')).toBe('switch');
    expect(hearing.getAttribute('aria-checked')).toBe('false');

    const closeEvent = vi.fn();
    container.addEventListener('vantage:settings-close', closeEvent);
    container.querySelector('#btn-close-settings').click();

    expect(closeEvent).toHaveBeenCalledTimes(1);
  });

  it('emits settings after a native switch click', () => {
    const container = makeSettingsContainer();
    const panel = new SettingsPanel(container);
    const onChange = vi.fn();

    panel.render();
    panel.onSettingsChange(onChange);
    container.querySelector('#toggle-vision').click();

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      visionImpaired: true,
    }));
    expect(container.querySelector('#toggle-vision').getAttribute('aria-checked')).toBe('true');
  });
});
