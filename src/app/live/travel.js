import { VenueMapService } from '../../services/venueMap.js';
import { Toast } from '../../components/Toast.js';

export const liveTravelMethods = {
  _initLiveTravelCard() {
    if (!this.venueMapService) return;
    if (!this.liveMatchVenue) {
      const venueName = document.getElementById('live-match-venue')?.textContent || '';
      this.liveMatchVenue = this.venueMapService.findVenueByName(venueName)
        || this.venueMapService.getVenueById('mercedes-benz-stadium')
        || VenueMapService.STADIUMS[0];
    }

    if (!this._liveTravelBound) {
      document.getElementById('btn-live-location')?.addEventListener('click', () => this._locateForLiveTrip());
      this._liveTravelBound = true;
    }

    this._renderLiveTravelCard();
  },

  async _locateForLiveTrip() {
    const btn = document.getElementById('btn-live-location');
    const status = document.getElementById('live-travel-status');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Checking location...';
    }
    if (status) status.textContent = 'Requesting browser location permission...';

    try {
      const position = await this.venueMapService.getCurrentPosition();
      this.liveTravelPlan = this.venueMapService.buildTripPlan(position, this.liveMatchVenue?.id);
      this._renderLiveTravelCard();
      Toast.show({
        message: position ? 'Stadium trip calculated.' : 'Location unavailable. Showing a local demo route.',
        type: position ? 'success' : 'warning',
        duration: 3000,
      });
    } catch {
      this.liveTravelPlan = this.venueMapService.buildTripPlan(null, this.liveMatchVenue?.id);
      this._renderLiveTravelCard();
      Toast.show({ message: 'Could not read location. Showing a local demo route.', type: 'warning', duration: 3000 });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Check From My Location';
      }
    }
  },

  _renderLiveTravelCard() {
    const status = document.getElementById('live-travel-status');
    const optionsEl = document.getElementById('live-travel-options');
    if (!status || !optionsEl || !this.venueMapService) return;

    const venue = this.liveMatchVenue
      || this.venueMapService.getVenueById?.('mercedes-benz-stadium')
      || VenueMapService.STADIUMS[0];
    const plan = this.liveTravelPlan
      || this.venueMapService.buildTripPlan?.(null, venue.id)
      || new VenueMapService().buildTripPlan(null, venue.id);
    const locationLabel = plan.hasUserLocation ? 'from your location' : 'demo route near the stadium';
    const recommended = plan.recommended;

    status.innerHTML = `
      <strong>${this._escapeHtml(plan.venue.name)}</strong><br>
      ${plan.distanceKm} km straight-line, about ${plan.routeDistanceKm} km by route (${locationLabel}).
    `;

    optionsEl.innerHTML = `
      <div class="live-travel-summary">
        <div>
          <span class="live-travel-summary__label">Best option</span>
          <strong>${this._escapeHtml(recommended.label)}</strong>
        </div>
        <div class="live-travel-summary__eta">${this._formatTravelEta(recommended.etaMinutes)}</div>
      </div>
      <div class="live-travel-gate">
        Best entry: <strong>${this._escapeHtml(plan.bestGate?.name || 'lowest wait accessible gate')}</strong>
      </div>
      <div class="live-travel-option-list">
        ${plan.alternatives.map(option => `
          <div class="live-travel-option">
            <div class="live-travel-option__top">
              <strong>${this._escapeHtml(option.label)}</strong>
              <span>${this._formatTravelEta(option.etaMinutes)}</span>
            </div>
            <div class="live-travel-option__meta">
              <span>${this._escapeHtml(option.badge)}</span>
              <span>${option.distanceKm} km</span>
              <span>${this._escapeHtml(option.cost)}</span>
            </div>
            <p>${this._escapeHtml(option.reason)}</p>
          </div>
        `).join('')}
      </div>
    `;
  },

  _formatTravelEta(minutes) {
    if (minutes < 90) return `${Math.max(1, minutes)} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  },

  _escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
