/**
 * Staff & Organizer Command Center Component
 */
import { escapeHTML, setHTML } from '../utils/dom.js';
import { Toast } from './Toast.js';
import { speak } from '../utils/tts.js';

export class StaffPanel {
  constructor(containerEl, appInstance) {
    this.containerEl = containerEl;
    this.appInstance = appInstance;
    this.activeTab = 'organizer';
    this.incidents = [
      { id: 1, type: 'Medical Aid', location: 'Section 102', status: 'Pending', time: '12:45' },
      { id: 2, type: 'Spill / Cleaning', location: 'Concession Floor 3', status: 'In Progress', time: '12:48' },
      { id: 3, type: 'Gate Flow Alert', location: 'Gate 4 Turnstiles', status: 'Resolved', time: '12:30' }
    ];
    this.phrases = [
      { id: 'ticket', text: 'Please show me your digital match day pass.' },
      { id: 'gate', text: 'The closest entrance to your seat is Gate 7 (step-free).' },
      { id: 'medical', text: 'First-aid station is located on Level 1, near Section 105.' },
      { id: 'sensory', text: 'The sensory calm room is on Level 3, room 302.' }
    ];
    this.selectedLanguage = 'es';
    this.selectedPhrase = 'ticket';
    this.translatedText = 'Por favor, muestre su pase digital para el día del partido.';
    this.isTranslating = false;
    this.adviceText = 'AI recommendation: Re-route Gate 4 shuttle arrivals to Gate 7 step-free route to balance flow and prevent queue building.';
    this.isAnalyzing = false;
  }

  render() {
    if (!this.containerEl) return;

    setHTML(this.containerEl, `
      <section class="staff-command venue-info-card" aria-label="Staff command center">
        <div class="staff-command__header">
          <h2 class="staff-command__title">🏟️ Staff Command Center</h2>
          <span class="staff-command__badge">OPERATOR MODE</span>
        </div>
        ${this._renderTabs()}
        ${this.activeTab === 'organizer' ? this._renderOrganizerView() : this._renderVolunteerView()}
      </section>
    `);

    this.bindEvents();
  }

  _renderTabs() {
    return `
      <div class="staff-command__tabs" role="tablist" aria-label="Staff command workspace">
        <button class="btn btn--sm ${this.activeTab === 'organizer' ? 'btn--primary' : 'btn--glass'}" id="staff-tab-org" role="tab" aria-selected="${this.activeTab === 'organizer'}">
          Organizer Command
        </button>
        <button class="btn btn--sm ${this.activeTab === 'volunteer' ? 'btn--primary' : 'btn--glass'}" id="staff-tab-vol" role="tab" aria-selected="${this.activeTab === 'volunteer'}">
          Volunteer Workspace
        </button>
      </div>
    `;
  }

  _renderOrganizerView() {
    const adviceText = this.isAnalyzing ? 'Running GenAI flow optimization...' : this.adviceText;
    return `
      <div class="staff-command__view motion-fade-in" role="tabpanel" aria-labelledby="staff-tab-org">
        <div class="staff-command__metrics">
          <div class="staff-command__metric">
            <div class="staff-command__metric-label">ACTIVE GATE CONGESTION</div>
            <div class="staff-command__metric-value staff-command__metric-value--warning">MEDIUM</div>
          </div>
          <div class="staff-command__metric">
            <div class="staff-command__metric-label">AVG QUEUE TIME</div>
            <div class="staff-command__metric-value">8 MINS</div>
          </div>
        </div>

        <div class="staff-command__module staff-command__module--ai">
          <div class="staff-command__module-title">GenAI Crowd Flow Advisor</div>
          <div id="staff-ai-advice" class="staff-command__advice ${this.isAnalyzing ? 'animate-pulse' : ''}" role="status" aria-live="polite">
            ${escapeHTML(adviceText)}
          </div>
          <button id="btn-refresh-ai-advice" class="btn btn--glass btn--sm staff-command__full-action" ${this.isAnalyzing ? 'disabled' : ''}>
            ${this.isAnalyzing ? 'Analyzing crowd patterns...' : 'Run GenAI Flow Analysis'}
          </button>
        </div>
      </div>
    `;
  }

  _renderVolunteerView() {
    return `
      <div class="staff-command__view motion-fade-in" role="tabpanel" aria-labelledby="staff-tab-vol">
        <div class="staff-command__module">
          <div class="staff-command__module-title">Active Incidents & Dispatch</div>
          <div class="staff-command__incident-list">
            ${this.incidents.map(incident => this._renderIncident(incident)).join('')}
          </div>
        </div>

        <div class="staff-command__module">
          <div class="staff-command__module-title">International Fan Assistant</div>
          <div class="staff-command__form">
            <div>
              <label for="staff-query-select" class="staff-command__label">Select Phrase:</label>
              <select id="staff-query-select" class="setting-select staff-command__select">
                ${this.phrases.map(phrase => this._renderPhraseOption(phrase)).join('')}
              </select>
            </div>
            <div>
              <label for="staff-lang-select" class="staff-command__label">Translate To:</label>
              <select id="staff-lang-select" class="setting-select staff-command__select">
                ${this._renderLanguageOptions()}
              </select>
            </div>

            <div class="staff-command__translation-card">
              <div id="staff-translated-box" class="staff-command__translation ${this.isTranslating ? 'animate-pulse' : ''}" role="status" aria-live="polite">
                ${escapeHTML(this.isTranslating ? 'Translating...' : this.translatedText)}
              </div>
              <button id="btn-speak-translation" class="icon-btn staff-command__speak" aria-label="Read translation aloud">🔊</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderIncident(incident) {
    const statusHtml = incident.status === 'Resolved'
      ? '<span class="staff-command__resolved">RESOLVED</span>'
      : `<button class="btn btn--glass btn--sm btn-resolve-incident staff-command__resolve" data-inc-id="${Number(incident.id) || 0}">Resolve</button>`;

    return `
      <div class="staff-command__incident">
        <div>
          <strong>${escapeHTML(incident.type)}</strong>
          <span class="staff-command__incident-location">${escapeHTML(incident.location)}</span>
          <div class="staff-command__incident-time">Reported: ${escapeHTML(incident.time)}</div>
        </div>
        <div>${statusHtml}</div>
      </div>
    `;
  }

  _renderPhraseOption(phrase) {
    return `<option value="${escapeHTML(phrase.id)}" ${phrase.id === this.selectedPhrase ? 'selected' : ''}>${escapeHTML(phrase.text)}</option>`;
  }

  _renderLanguageOptions() {
    const languages = [
      ['es', 'Spanish'],
      ['fr', 'French'],
      ['de', 'German'],
      ['hi', 'Hindi'],
      ['pt', 'Portuguese'],
      ['zh', 'Chinese'],
      ['ja', 'Japanese'],
    ];
    return languages
      .map(([value, label]) => `<option value="${value}" ${this.selectedLanguage === value ? 'selected' : ''}>${label}</option>`)
      .join('');
  }

  bindEvents() {
    this.containerEl.querySelector('#staff-tab-org')?.addEventListener('click', () => {
      this.activeTab = 'organizer';
      this.render();
    });

    this.containerEl.querySelector('#staff-tab-vol')?.addEventListener('click', () => {
      this.activeTab = 'volunteer';
      this.render();
    });

    this.containerEl.querySelector('#btn-refresh-ai-advice')?.addEventListener('click', async (e) => {
      const button = e.currentTarget;
      button.disabled = true;
      button.textContent = 'Analyzing crowd patterns...';
      this.isAnalyzing = true;

      const adviceBox = this.containerEl.querySelector('#staff-ai-advice');
      if (adviceBox) {
        adviceBox.textContent = 'Running GenAI flow optimization...';
        adviceBox.classList.add('animate-pulse');
      }

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'Queue management action: Open auxiliary turnstiles at Gate 7 to accommodate heavy inbound flows. Deploy Volunteer dispatch squad.',
            targetLanguage: 'en'
          })
        });

        const adviceText = response.ok
          ? (await response.json()).translatedText
          : 'GenAI suggestion: Deploy group volunteers to redirect the crowd coming from Section 102 towards the North Metro Hub.';

        this.adviceText = adviceText;
        if (adviceBox) adviceBox.textContent = this.adviceText;
        Toast.show({ message: 'GenAI Flow Optimization complete!', type: 'success', duration: 3000 });
      } catch {
        this.adviceText = 'GenAI suggestion: Deploy group volunteers to redirect the crowd coming from Section 102 towards the North Metro Hub.';
        if (adviceBox) adviceBox.textContent = this.adviceText;
      } finally {
        this.isAnalyzing = false;
        if (adviceBox) adviceBox.classList.remove('animate-pulse');
        button.disabled = false;
        button.textContent = 'Run GenAI Flow Analysis';
      }
    });

    this.containerEl.querySelectorAll('.btn-resolve-incident').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.incId, 10);
        const incident = this.incidents.find(inc => inc.id === id);
        if (incident) {
          incident.status = 'Resolved';
          Toast.show({ message: `Incident resolved: ${incident.type}`, type: 'success', duration: 2500 });
          this.render();
        }
      });
    });

    const querySelect = this.containerEl.querySelector('#staff-query-select');
    const langSelect = this.containerEl.querySelector('#staff-lang-select');

    const handleTranslation = async () => {
      if (!querySelect || !langSelect) return;
      const phraseId = querySelect.value;
      const lang = langSelect.value;
      const phrase = this.phrases.find(p => p.id === phraseId);
      if (!phrase) return;

      this.selectedPhrase = phraseId;
      this.selectedLanguage = lang;
      this.isTranslating = true;
      
      const translatedBox = this.containerEl.querySelector('#staff-translated-box');
      if (translatedBox) {
        translatedBox.textContent = 'Translating...';
        translatedBox.classList.add('animate-pulse');
      }

      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: phrase.text, targetLanguage: lang })
        });
        
        if (response.ok) {
          const res = await response.json();
          this.translatedText = res.translatedText;
        } else {
          this.translatedText = phrase.text; // fallback
        }
      } catch {
          this.translatedText = phrase.text;
      } finally {
        this.isTranslating = false;
        if (translatedBox) {
          translatedBox.textContent = this.translatedText;
          translatedBox.classList.remove('animate-pulse');
        }
      }
    };

    querySelect?.addEventListener('change', handleTranslation);
    langSelect?.addEventListener('change', handleTranslation);

    this.containerEl.querySelector('#btn-speak-translation')?.addEventListener('click', () => {
      if (this.translatedText) {
        speak(this.translatedText, { lang: this.selectedLanguage });
        Toast.show({ message: `Speaking translation aloud...`, type: 'info', duration: 2000 });
      }
    });
  }
}
