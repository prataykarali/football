import { App } from './app.js';

function checkBrowserSupport() {
  const required = {
    'ES Modules': typeof import.meta !== 'undefined',
    'Fetch API': typeof fetch === 'function',
    'localStorage': (() => {
      try { localStorage.setItem('__test__', '1'); localStorage.removeItem('__test__'); return true; }
      catch { return false; }
    })(),
  };
  const unsupported = Object.entries(required).filter(([, s]) => !s).map(([n]) => n);
  if (unsupported.length > 0) console.warn('[VANTAGE] Unsupported features:', unsupported);
}

function setupAccessibility() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.body.classList.add('using-keyboard');
  });
  document.addEventListener('mousedown', () => document.body.classList.remove('using-keyboard'));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches) document.body.classList.add('reduced-motion');
  prefersReducedMotion.addEventListener('change', (e) => document.body.classList.toggle('reduced-motion', e.matches));

  const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
  if (prefersHighContrast.matches) document.body.classList.add('high-contrast');
  prefersHighContrast.addEventListener('change', (e) => document.body.classList.toggle('high-contrast', e.matches));
}

async function boot() {
  checkBrowserSupport();
  setupAccessibility();

  const app = new App();
  await app.init();

  if (import.meta.env.DEV) {
    window.__VANTAGE__ = app;
  }

  window.addEventListener('beforeunload', () => app.destroy());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
