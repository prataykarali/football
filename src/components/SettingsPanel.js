/**
 * Settings Panel — slide-out with toggle switches
 */
export class SettingsPanel {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.onChangeCallback = null;
  }

  render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg);">
        <h2 class="settings-title">Settings</h2>
        <button id="btn-close-settings" class="icon-btn" aria-label="Close settings" style="width:28px;height:28px;">×</button>
      </div>

      <div class="setting-group">
        <label class="setting-label" for="setting-lang">Language</label>
        <select id="setting-lang" class="setting-select">
          <option value="en" selected>English</option>
          <option value="es">Español (Spanish)</option>
          <option value="fr">Français (French)</option>
          <option value="de">Deutsch (German)</option>
          <option value="pt">Português (Portuguese)</option>
          <option value="ar">العربية (Arabic)</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="bn">বাংলা (Bengali)</option>
          <option value="zh">中文 (Chinese)</option>
          <option value="ja">日本語 (Japanese)</option>
          <option value="ko">한국어 (Korean)</option>
          <option value="ta">தமிழ் (Tamil)</option>
          <option value="ru">Русский (Russian)</option>
          <option value="tr">Türkçe (Turkish)</option>
          <option value="it">Italiano (Italian)</option>
          <option value="te">తెలుగు (Telugu)</option>
          <option value="mr">मराठी (Marathi)</option>
          <option value="gu">ગુજરાતી (Gujarati)</option>
          <option value="kn">ಕನ್ನಡ (Kannada)</option>
          <option value="ml">മലയാളം (Malayalam)</option>
          <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
          <option value="ur">اردو (Urdu)</option>
          <option value="id">Bahasa Indonesia (Indonesian)</option>
          <option value="vi">Tiếng Việt (Vietnamese)</option>
          <option value="th">ไทย (Thai)</option>
          <option value="ms">Bahasa Melayu (Malay)</option>
          <option value="fil">Filipino</option>
          <option value="uk">Українська (Ukrainian)</option>
          <option value="he">עברית (Hebrew)</option>
          <option value="fa">فارسی (Persian)</option>
          <option value="el">Ελληνικά (Greek)</option>
          <option value="ro">Română (Romanian)</option>
          <option value="hu">Magyar (Hungarian)</option>
          <option value="sk">Slovenčina (Slovak)</option>
          <option value="bg">Български (Bulgarian)</option>
          <option value="hr">Hrvatski (Croatian)</option>
          <option value="sr">Српски (Serbian)</option>
          <option value="sl">Slovenščina (Slovenian)</option>
          <option value="et">Eesti (Estonian)</option>
          <option value="lv">Latviešu (Latvian)</option>
          <option value="lt">Lietuvių (Lithuanian)</option>
          <option value="is">Íslenska (Icelandic)</option>
          <option value="ga">Gaeilge (Irish)</option>
          <option value="cy">Cymraeg (Welsh)</option>
          <option value="sq">Shqip (Albanian)</option>
          <option value="mk">Македонски (Macedonian)</option>
          <option value="hy">Հայերեն (Armenian)</option>
          <option value="ka">ქართული (Georgian)</option>
          <option value="az">Azərbaycanca (Azerbaijani)</option>
          <option value="kk">Қазақша (Kazakh)</option>
          <option value="uz">Oʻzbekcha (Uzbek)</option>
          <option value="nl">Nederlands (Dutch)</option>
          <option value="sv">Svenska (Swedish)</option>
          <option value="da">Dansk (Danish)</option>
          <option value="no">Norsk (Norwegian)</option>
          <option value="fi">Suomi (Finnish)</option>
          <option value="cs">Čeština (Czech)</option>
          <option value="pl">Polski (Polish)</option>
        </select>
      </div>

      <div class="setting-group">
        <label class="setting-label" for="setting-pace">Pace</label>
        <select id="setting-pace" class="setting-select">
          <option value="slow">Slow — Dramatic & Detailed</option>
          <option value="medium" selected>Medium — Standard</option>
          <option value="fast">Fast — Punchy & Rapid</option>
        </select>
      </div>

      <div class="setting-group">
        <label class="setting-label" for="setting-register">Style</label>
        <select id="setting-register" class="setting-select">
          <option value="casual" selected>Casual Fan</option>
          <option value="tactical">Tactical Analyst</option>
        </select>
      </div>

      <div class="setting-group">
        <label class="setting-label" for="setting-theme">UI Theme</label>
        <select id="setting-theme" class="setting-select">
          <option value="neon" selected>Neon Athletic (Default)</option>
          <option value="cyber">Midnight Cyber (Cyan)</option>
          <option value="nightowl">Kolkata 2AM (Warm Amber)</option>
          <option value="light">Classic Light (High Contrast)</option>
        </select>
      </div>

      <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: var(--space-lg) 0;" />

      <h3 style="font-family: var(--font-heading); font-weight: 700; font-size: 0.95rem; margin-bottom: var(--space-md);">Accessibility</h3>

      <div class="toggle-row">
        <span class="toggle-label">Hearing-Impaired Mode</span>
        <div id="toggle-hearing" class="toggle" role="switch" aria-checked="false" tabindex="0" aria-label="Hearing-impaired mode"></div>
      </div>

      <div class="toggle-row">
        <span class="toggle-label">Vision-Impaired (TTS)</span>
        <div id="toggle-vision" class="toggle" role="switch" aria-checked="false" tabindex="0" aria-label="Vision-impaired mode"></div>
      </div>
    `;

    this.containerEl.querySelector('#btn-close-settings')?.addEventListener('click', () => {
      this.containerEl.hidden = true;
    });

    // Toggle switches
    ['toggle-hearing', 'toggle-vision'].forEach(id => {
      const el = this.containerEl.querySelector(`#${id}`);
      if (!el) return;
      const handler = () => {
        el.classList.toggle('toggle--active');
        const isActive = el.classList.contains('toggle--active');
        el.setAttribute('aria-checked', isActive.toString());
        this._emit();
      };
      el.addEventListener('click', handler);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    });

    // Select changes
    this.containerEl.querySelectorAll('select').forEach(el => {
      el.addEventListener('change', () => this._emit());
    });
  }

  _emit() {
    if (!this.onChangeCallback) return;
    this.onChangeCallback({
      language: this.containerEl.querySelector('#setting-lang')?.value || 'en',
      pace: this.containerEl.querySelector('#setting-pace')?.value || 'medium',
      register: this.containerEl.querySelector('#setting-register')?.value || 'casual',
      theme: this.containerEl.querySelector('#setting-theme')?.value || 'neon',
      hearingImpaired: this.containerEl.querySelector('#toggle-hearing')?.classList.contains('toggle--active') || false,
      visionImpaired: this.containerEl.querySelector('#toggle-vision')?.classList.contains('toggle--active') || false,
    });
  }

  onSettingsChange(cb) {
    this.onChangeCallback = cb;
  }
}
