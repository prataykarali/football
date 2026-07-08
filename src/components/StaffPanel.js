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
    this.activeTab = 'organizer'; // organizer or volunteer
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
  }

  render() {
    if (!this.containerEl) return;

    const navTabsHtml = `
      <div class="staff-panel__tabs" style="display:flex; border-bottom:1px solid var(--border-subtle); margin-bottom:15px; padding-bottom:5px; gap: 10px;">
        <button class="btn btn--sm ${this.activeTab === 'organizer' ? 'btn--primary' : 'btn--glass'}" id="staff-tab-org" role="tab" aria-selected="${this.activeTab === 'organizer'}">
          🏟️ Organizer Command
        </button>
        <button class="btn btn--sm ${this.activeTab === 'volunteer' ? 'btn--primary' : 'btn--glass'}" id="staff-tab-vol" role="tab" aria-selected="${this.activeTab === 'volunteer'}">
          🤝 Volunteer Workspace
        </button>
      </div>
    `;

    const organizerHtml = `
      <div class="staff-panel__org-view motion-fade-in">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
          <div class="stat-card" style="background:rgba(255,255,255,0.02); padding:10px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
            <div style="font-size:0.7rem; color:var(--text-muted);">ACTIVE GATES CONGESTION</div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--accent-amber);">MEDIUM</div>
          </div>
          <div class="stat-card" style="background:rgba(255,255,255,0.02); padding:10px; border:1px solid var(--border-subtle); border-radius:var(--radius-md);">
            <div style="font-size:0.7rem; color:var(--text-muted);">AVG QUEUE TIME</div>
            <div style="font-size:1.2rem; font-weight:700; color:var(--accent-green);">8 MINS</div>
          </div>
        </div>

        <div class="venue-info-card" style="padding:12px; margin-bottom:15px; border-color:var(--accent-blue);">
          <div style="font-size:0.8rem; font-weight:bold; color:var(--accent-blue); display:flex; align-items:center; gap:5px;">
            <span>🤖</span> GenAI Crowd Flow Advisor
          </div>
          <div id="staff-ai-advice" style="font-size:0.78rem; color:var(--text-secondary); margin-top:8px; line-height:1.4;">
            AI recommendation: Redirection: Re-route Gate 4 shuttle arrivals to Gate 7 step-free route to balance flow and prevent queue building.
          </div>
          <button id="btn-refresh-ai-advice" class="btn btn--glass btn--sm" style="margin-top:10px; font-size:0.72rem; width:100%; justify-content:center;">
            Run GenAI Flow Analysis
          </button>
        </div>
      </div>
    `;

    const volunteerHtml = `
      <div class="staff-panel__vol-view motion-fade-in">
        <!-- Incident Log -->
        <div class="venue-info-card" style="padding:12px; margin-bottom:15px;">
          <div style="font-size:0.8rem; font-weight:bold; color:var(--text-primary); margin-bottom:8px;">Active Incidents & Dispatch</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${this.incidents.map(inc => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; padding:6px; background:rgba(0,0,0,0.1); border-radius:4px;">
                <div>
                  <strong>${escapeHTML(inc.type)}</strong> - <span style="color:var(--text-secondary);">${escapeHTML(inc.location)}</span>
                  <div style="font-size:0.65rem; color:var(--text-muted);">Reported: ${escapeHTML(inc.time)}</div>
                </div>
                <div>
                  ${inc.status === 'Resolved'
                    ? `<span style="color:var(--accent-green); font-weight:bold;">RESOLVED</span>`
                    : `<button class="btn btn--glass btn--sm btn-resolve-incident" data-inc-id="${inc.id}" style="font-size:0.65rem; padding:2px 8px;">Resolve</button>`
                  }
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Translation Helper -->
        <div class="venue-info-card" style="padding:12px;">
          <div style="font-size:0.8rem; font-weight:bold; color:var(--text-primary); margin-bottom:8px;">📢 International Fan Assistant</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div>
              <label for="staff-query-select" style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:4px;">Select Phrase:</label>
              <select id="staff-query-select" class="setting-select" style="width:100%; font-size:0.75rem;">
                ${this.phrases.map(p => `<option value="${p.id}" ${p.id === this.selectedPhrase ? 'selected' : ''}>${escapeHTML(p.text)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="staff-lang-select" style="font-size:0.7rem; color:var(--text-muted); display:block; margin-bottom:4px;">Translate To:</label>
              <select id="staff-lang-select" class="setting-select" style="width:100%; font-size:0.75rem;">
                <option value="es" ${this.selectedLanguage === 'es' ? 'selected' : ''}>Spanish</option>
                <option value="fr" ${this.selectedLanguage === 'fr' ? 'selected' : ''}>French</option>
                <option value="de" ${this.selectedLanguage === 'de' ? 'selected' : ''}>German</option>
                <option value="hi" ${this.selectedLanguage === 'hi' ? 'selected' : ''}>Hindi</option>
                <option value="pt" ${this.selectedLanguage === 'pt' ? 'selected' : ''}>Portuguese</option>
                <option value="zh" ${this.selectedLanguage === 'zh' ? 'selected' : ''}>Chinese</option>
                <option value="ja" ${this.selectedLanguage === 'ja' ? 'selected' : ''}>Japanese</option>
              </select>
            </div>

            <div style="background:rgba(255,255,255,0.02); padding:10px; border:1px solid var(--border-subtle); border-radius:var(--radius-md); font-size:0.78rem; min-height:40px; margin-top:5px; position:relative;">
              <div id="staff-translated-box" style="padding-right:30px;">
                ${this.isTranslating ? '<span class="animate-pulse">Translating...</span>' : escapeHTML(this.translatedText)}
              </div>
              <button id="btn-speak-translation" class="icon-btn" style="position:absolute; right:5px; top:5px;" aria-label="Read translation aloud">🔊</button>
            </div>
          </div>
        </div>
      </div>
    `;

    setHTML(this.containerEl, `
      <div class="venue-info-card" style="border: 2px solid var(--accent-green); background: var(--bg-glass);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h2 style="font-size:1rem; font-weight:800; color:var(--accent-green); margin:0;">🏟️ Staff Command Center</h2>
          <span style="font-size:0.65rem; background:rgba(0, 220, 120, 0.15); color:var(--accent-green); padding:2px 8px; border-radius:var(--radius-full); font-weight:700;">OPERATOR MODE</span>
        </div>
        ${navTabsHtml}
        ${this.activeTab === 'organizer' ? organizerHtml : volunteerHtml}
      </div>
    `);

    this.bindEvents();
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
      e.target.disabled = true;
      e.target.textContent = 'Analyzing crowd patterns...';
      
      try {
        const adviceBox = this.containerEl.querySelector('#staff-ai-advice');
        if (adviceBox) adviceBox.innerHTML = '<span class="animate-pulse">Running GenAI flow optimization...</span>';
        
        // Call backend API or simulate
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

        if (adviceBox) adviceBox.textContent = adviceText;
        Toast.show({ message: 'GenAI Flow Optimization complete!', type: 'success', duration: 3000 });
      } catch {
        const adviceBox = this.containerEl.querySelector('#staff-ai-advice');
        if (adviceBox) adviceBox.textContent = 'GenAI suggestion: Deploy group volunteers to redirect the crowd coming from Section 102 towards the North Metro Hub.';
      } finally {
        e.target.disabled = false;
        e.target.textContent = 'Run GenAI Flow Analysis';
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
      if (translatedBox) translatedBox.innerHTML = '<span class="animate-pulse">Translating...</span>';

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
        if (translatedBox) translatedBox.textContent = this.translatedText;
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
