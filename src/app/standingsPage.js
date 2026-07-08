import { escapeHTML, setHTML, safeNumber } from '../utils/dom.js';

export const standingsPageMethods = {
  _initStandingsPage() {
    const tableContainer = document.getElementById('standings-table-container');
    const sidebar = document.getElementById('standings-sidebar');
    const tabsContainer = document.getElementById('standings-group-tabs');
    if (!tableContainer || !sidebar) return;

    setHTML(tableContainer, '<div style="text-align:center;padding:var(--space-2xl);color:var(--text-muted);">Loading FIFA standings...</div>');
    sidebar.replaceChildren();

    fetch('/api/standings').then(r => r.json()).then(data => {
      const groups = data.groups || [];
      if (groups.length > 0) {
        // Build group tabs
        if (tabsContainer) {
          tabsContainer.setAttribute('role', 'tablist');
          tabsContainer.replaceChildren();
          // Add "All Groups" tab
          const allTab = document.createElement('button');
          allTab.className = 'group-tab group-tab--active';
          allTab.textContent = '⚽ All Groups';
          allTab.dataset.groupIdx = 'all';
          allTab.setAttribute('role', 'tab');
          allTab.setAttribute('aria-selected', 'true');
          tabsContainer.appendChild(allTab);
          groups.forEach((g, idx) => {
            const tab = document.createElement('button');
            tab.className = 'group-tab';
            tab.textContent = g.name || `Group ${idx + 1}`;
            tab.dataset.groupIdx = idx;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', 'false');
            tabsContainer.appendChild(tab);
          });
          // Tab switching
          tabsContainer.addEventListener('click', (e) => {
            const tab = e.target.closest('.group-tab');
            if (!tab) return;
            tabsContainer.querySelectorAll('.group-tab').forEach(t => {
              t.classList.remove('group-tab--active');
              t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('group-tab--active');
            tab.setAttribute('aria-selected', 'true');
            const idx = tab.dataset.groupIdx;
            const filtered = idx === 'all' ? groups : [groups[parseInt(idx, 10)]];
            this._renderFIFAStandings(tableContainer, sidebar, filtered);
          });
        }
        this._renderFIFAStandings(tableContainer, sidebar, groups);
      } else {
        this._renderFallbackStandings(tableContainer, sidebar);
      }
    }).catch(() => {
      this._renderFallbackStandings(tableContainer, sidebar);
    });
  },

  _renderFIFAStandings(tableContainer, sidebar, groups) {
    const teamAbbrMap = {
      'USA': '🇺🇸', 'MEX': '🇲🇽', 'CAN': '🇨🇦', 'BRA': '🇧🇷', 'ARG': '🇦🇷', 'FRA': '🇫🇷',
      'GER': '🇩🇪', 'ESP': '🇪🇸', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'ITA': '🇮🇹', 'POR': '🇵🇹', 'NED': '🇳🇱',
      'BEL': '🇧🇪', 'CRO': '🇭🇷', 'URU': '🇺🇾', 'COL': '🇨🇴', 'JPN': '🇯🇵', 'KOR': '🇰🇷',
      'AUS': '🇦🇺', 'SEN': '🇸🇳', 'MAR': '🇲🇦', 'SUI': '🇨🇭', 'DEN': '🇩🇰', 'POL': '🇵🇱',
      'ECU': '🇪🇨', 'GHA': '🇬🇭', 'CMR': '🇨🇲', 'SRB': '🇷🇸', 'TUN': '🇹🇳', 'CRC': '🇨🇷',
      'SAU': '🇸🇦', 'IRN': '🇮🇷', 'QAT': '🇶🇦', 'WAL': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'PER': '🇵🇪', 'CHI': '🇨🇱',
    };
    const getFlag = (abbr) => teamAbbrMap[abbr?.toUpperCase()] || '🏳️';

    setHTML(tableContainer, groups.map(g => `
      <div class="standings-panel motion-fade-in" style="margin-bottom:var(--space-xl);">
        <div class="standings-panel__header">
          <div class="standings-panel__title">${escapeHTML(g.name || 'Group')}</div>
          <div class="standings-panel__league">FIFA World Cup 2026</div>
        </div>
        <div class="table-container">
          <table class="standings-table">
            <thead>
              <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
            </thead>
            <tbody>
              ${g.teams.map((t, i) => `
                <tr class="${i === 0 ? 'standings-row--highlight' : ''}">
                  <td class="pos">${i + 1}</td>
                  <td><div class="team-cell"><span class="team-flag">${getFlag(t.abbreviation)}</span> ${escapeHTML(t.name || 'Team')}</div></td>
                  <td>${safeNumber(t.p)}</td>
                  <td>${safeNumber(t.w)}</td>
                  <td>${safeNumber(t.d)}</td>
                  <td>${safeNumber(t.l)}</td>
                  <td>${safeNumber(t.gf)}</td>
                  <td>${safeNumber(t.ga)}</td>
                  <td class="gd" style="color:${String(t.gd).startsWith('-') ? 'var(--accent-red)' : String(t.gd) === '0' ? 'var(--text-muted)' : 'var(--accent-green)'}">${escapeHTML(t.gd)}</td>
                  <td class="pts">${safeNumber(t.pts)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join(''));

    this._renderScorersSidebar(sidebar);
  },

  _renderFallbackStandings(tableContainer, sidebar) {
    const standings = [
      { pos: 1, flag: '🇪🇸', team: 'Barcelona', p: 32, w: 25, d: 4, l: 3, gf: 78, ga: 22, gd: '+56', pts: 79, highlight: true },
      { pos: 2, flag: '🇪🇸', team: 'Real Madrid', p: 32, w: 24, d: 5, l: 3, gf: 72, ga: 25, gd: '+47', pts: 77 },
      { pos: 3, flag: '🇪🇸', team: 'Atletico Madrid', p: 32, w: 20, d: 7, l: 5, gf: 58, ga: 28, gd: '+30', pts: 67 },
      { pos: 4, flag: '🇪🇸', team: 'Real Sociedad', p: 32, w: 17, d: 8, l: 7, gf: 48, ga: 30, gd: '+18', pts: 59 },
      { pos: 5, flag: '🇪🇸', team: 'Villarreal', p: 32, w: 16, d: 7, l: 9, gf: 52, ga: 35, gd: '+17', pts: 55 },
      { pos: 6, flag: '🇪🇸', team: 'Real Betis', p: 32, w: 14, d: 10, l: 8, gf: 42, ga: 32, gd: '+10', pts: 52 },
      { pos: 7, flag: '🇪🇸', team: 'Sevilla', p: 32, w: 13, d: 8, l: 11, gf: 38, ga: 38, gd: '0', pts: 47 },
      { pos: 8, flag: '🇪🇸', team: 'Athletic Bilbao', p: 32, w: 12, d: 9, l: 11, gf: 40, ga: 36, gd: '+4', pts: 45 },
      { pos: 9, flag: '🇪🇸', team: 'Valencia', p: 32, w: 11, d: 7, l: 14, gf: 35, ga: 40, gd: '-5', pts: 40 },
      { pos: 10, flag: '🇪🇸', team: 'Getafe', p: 32, w: 9, d: 10, l: 13, gf: 28, ga: 38, gd: '-10', pts: 37 },
    ];

    setHTML(tableContainer, `
      <div class="standings-panel motion-fade-in">
        <div class="standings-panel__header">
          <div class="standings-panel__title">La Liga 2025/26</div>
          <div class="standings-panel__league">Season 2025-26</div>
        </div>
        <div class="table-container">
          <table class="standings-table">
            <thead>
              <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>
            </thead>
            <tbody>
              ${standings.map(s => `
                <tr class="${s.highlight ? 'standings-row--highlight' : ''}">
                  <td class="pos">${s.pos}</td>
                  <td><div class="team-cell"><span class="team-flag">${s.flag}</span> ${s.team}</div></td>
                  <td>${s.p}</td>
                  <td>${s.w}</td>
                  <td>${s.d}</td>
                  <td>${s.l}</td>
                  <td>${s.gf}</td>
                  <td>${s.ga}</td>
                  <td class="gd" style="color:${s.gd.startsWith('+') ? 'var(--accent-green)' : s.gd.startsWith('-') ? 'var(--accent-red)' : 'var(--text-muted)'}">${s.gd}</td>
                  <td class="pts">${s.pts}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `);

    this._renderScorersSidebar(sidebar);
  },

  _renderScorersSidebar(sidebar) {
    const scorers = [
      { rank: 1, name: 'Robert Lewandowski', club: 'Barcelona', goals: 24 },
      { rank: 2, name: 'Vinicius Junior', club: 'Real Madrid', goals: 19 },
      { rank: 3, name: 'Antoine Griezmann', club: 'Atletico Madrid', goals: 17 },
      { rank: 4, name: 'Jude Bellingham', club: 'Real Madrid', goals: 16 },
      { rank: 5, name: 'Alexander Sorloth', club: 'Villarreal', goals: 15 },
      { rank: 6, name: 'Borja Iglesias', club: 'Real Betis', goals: 13 },
      { rank: 7, name: 'Mikel Oyarzabal', club: 'Real Sociedad', goals: 12 },
      { rank: 8, name: 'Pedri', club: 'Barcelona', goals: 11 },
    ];

    setHTML(sidebar, `
      <div class="scorers-panel motion-fade-in">
        <div class="scorers-panel__title">⚽ Top Scorers</div>
        ${scorers.map(s => `
          <div class="scorer-item">
            <div class="scorer-rank ${s.rank <= 3 ? 'scorer-rank--' + s.rank : ''}">${s.rank}</div>
            <div class="scorer-info">
              <div class="scorer-name">${s.name}</div>
              <div class="scorer-club">${s.club}</div>
            </div>
            <div class="scorer-goals">${s.goals}</div>
          </div>
        `).join('')}
      </div>
    `);
  }
};
