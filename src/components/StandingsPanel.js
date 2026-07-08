/**
 * Standings Panel Component
 * Displays points table (league table) and key player stats.
 */
import { setHTML } from '../utils/dom.js';

export class StandingsPanel {
  constructor(containerEl) {
    this.containerEl = containerEl;
  }

  render() {
    if (!this.containerEl) return;

    setHTML(this.containerEl, `
      <div class="standings-panel animate-fade-in">
        <h3 class="panel-subtitle">League Standings</h3>
        <div class="table-container">
          <table class="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>P</th>
                <th>GD</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr class="standings-row--active">
                <td>1</td>
                <td>🇪🇸 FC Barcelona</td>
                <td>34</td>
                <td>+48</td>
                <td class="font-bold text-accent">85</td>
              </tr>
              <tr>
                <td>2</td>
                <td>🇪🇸 Real Madrid</td>
                <td>34</td>
                <td>+42</td>
                <td class="font-bold">82</td>
              </tr>
              <tr>
                <td>3</td>
                <td>🇪🇸 Atletico Madrid</td>
                <td>34</td>
                <td>+26</td>
                <td class="font-bold">71</td>
              </tr>
              <tr>
                <td>4</td>
                <td>🇪🇸 Real Sociedad</td>
                <td>34</td>
                <td>+14</td>
                <td class="font-bold">64</td>
              </tr>
              <tr>
                <td>5</td>
                <td>🇪🇸 Athletic Club</td>
                <td>34</td>
                <td>+10</td>
                <td class="font-bold">59</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 class="panel-subtitle" style="margin-top: var(--space-xl);">Top Scorers</h3>
        <div class="stats-list">
          <div class="stat-item">
            <div class="stat-player">
              <span class="stat-rank">1</span>
              <div>
                <div class="stat-name">Robert Lewandowski</div>
                <div class="stat-club">FC Barcelona</div>
              </div>
            </div>
            <div class="stat-value text-accent">24 Goals</div>
          </div>
          <div class="stat-item">
            <div class="stat-player">
              <span class="stat-rank">2</span>
              <div>
                <div class="stat-name">Vinicius Junior</div>
                <div class="stat-club">Real Madrid</div>
              </div>
            </div>
            <div class="stat-value">19 Goals</div>
          </div>
          <div class="stat-item">
            <div class="stat-player">
              <span class="stat-rank">3</span>
              <div>
                <div class="stat-name">Antoine Griezmann</div>
                <div class="stat-club">Atletico Madrid</div>
              </div>
            </div>
            <div class="stat-value">15 Goals</div>
          </div>
        </div>
      </div>
    `);
  }
}
