/**
 * Live Caption Layer — Multilingual + Accessibility
 * Inline language, pace, and register controls.
 */
export class CaptionLayer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.feedEl = null;
    this.mode = 'standard';
  }

  render() {
    if (!this.containerEl) return;

    this.containerEl.innerHTML = `
      <div class="caption-layer" role="log" aria-label="Live commentary feed" aria-live="polite">
        <div class="caption-layer__header">
          <div class="caption-layer__header-left">
            <span class="live-dot"></span>
            <span>AI Commentary</span>
          </div>
          <div class="caption-layer__controls">
            <select id="caption-lang" class="caption-control-select" aria-label="Commentary language">
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
            <select id="caption-pace" class="caption-control-select" aria-label="Commentary pace">
              <option value="slow">Slow</option>
              <option value="medium" selected>Medium</option>
              <option value="fast">Fast</option>
            </select>
            <select id="caption-register" class="caption-control-select" aria-label="Commentary style">
              <option value="casual">Casual</option>
              <option value="tactical">Tactical</option>
            </select>
          </div>
        </div>
        <div class="caption-layer__feed" id="caption-feed"></div>
      </div>
    `;

    this.feedEl = this.containerEl.querySelector('#caption-feed');
  }

  addCommentary(text, options = {}) {
    if (!this.feedEl) return;

    const { type = 'possession', isKeyMoment = false, minute = '' } = options;

    const item = document.createElement('div');
    item.className = `commentary-item commentary-item--${type}`;
    if (isKeyMoment) item.classList.add('commentary-item--key');

    const iconMap = {
      kickoff: '🏁', goal: '⚽', penalty_awarded: '⚠️', foul: '🟨',
      red_card: '🟥', shot: '🎯', corner: '🚩', half_time: '⏱️',
      full_time: '🏆', second_half: '🔄', substitution: '🔄',
      extra_time: '⏰', penalty_shootout: '🥅', possession: '⚡',
    };

    const icon = iconMap[type] || '⚡';

    item.innerHTML = `
      <span class="commentary-time">${minute ? minute + '\'' : ''}</span>
      <span class="commentary-icon">${icon}</span>
      <p class="commentary-text">${text}</p>
    `;

    this.feedEl.appendChild(item);
    this.feedEl.scrollTop = this.feedEl.scrollHeight;
  }

  setMode(mode) {
    this.mode = mode;
  }

  clear() {
    if (this.feedEl) this.feedEl.innerHTML = '';
  }
}
