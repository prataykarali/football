/**
 * Stadium Finder UI Panel Component
 */
import { escapeHTML, setHTML } from '../utils/dom.js';

export class StadiumFinderPanel {
  constructor(containerEl, venueMapService) {
    this.containerEl = containerEl;
    this.venueMapService = venueMapService;
  }

  async render() {
    if (!this.containerEl) return;

    const venue = await this.venueMapService.findNearestVenue();
    const route = this.venueMapService.getAccessibleRoute(venue.id, 'gate-7');

    const safeDensity = (value) => {
      const density = String(value || 'low').toLowerCase();
      return ['low', 'medium', 'high'].includes(density) ? density : 'low';
    };
    const gatesHTML = venue.gates.map(g => `
      <div class="gate-card">
        <div>
          <strong>${escapeHTML(g.name)}</strong>
          ${g.isAccessible ? ' <span title="Wheelchair Accessible">♿</span>' : ''}
          ${g.hasCover ? ' <span title="Covered Walkway">☂️</span>' : ''}
        </div>
        <div class="gate-density--${safeDensity(g.density)}">
          ${safeDensity(g.density).toUpperCase()} (${Number(g.waitMinutes) || 0}m wait)
        </div>
      </div>
    `).join('');

    setHTML(this.containerEl, `
      <div class="stadium-finder-panel">
        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: var(--radius-md); margin-bottom: 16px;">
          <h3 style="font-family: var(--font-heading); margin-bottom: 4px;">🏟️ ${escapeHTML(venue.name)}</h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(venue.city)} · ${Number(venue.distanceKm) || 0} km away</p>
          <div style="margin-top: 10px; font-size: 0.85rem; color: var(--accent-amber);">
            ${escapeHTML(venue.weather.icon)} ${Number(venue.weather.tempC) || 0}°C · ${escapeHTML(venue.weather.condition)}
          </div>
        </div>

        <h4 style="font-family: var(--font-heading); margin-bottom: 8px;">📊 Live Gate Density & Crowd Routing</h4>
        <div style="margin-bottom: 16px;">
          ${gatesHTML}
        </div>

        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--accent-blue); padding: 16px; border-radius: var(--radius-md);">
          <h4 style="font-family: var(--font-heading); color: var(--accent-blue); margin-bottom: 8px;">♿ Wheelchair Accessible Entry Route</h4>
          <p style="font-size: 0.85rem; margin-bottom: 8px;"><strong>Destination:</strong> ${escapeHTML(route.destination)} (${escapeHTML(route.totalDistance)}, ~${escapeHTML(route.estimatedTime)})</p>
          <ol style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 18px;">
            ${route.steps.map(s => `<li>${escapeHTML(s.instruction)}</li>`).join('')}
          </ol>
        </div>
      </div>
    `);
  }
}
