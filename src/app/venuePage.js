import { VenueMapService } from '../services/venueMap.js';
import { Toast } from '../components/Toast.js';
import { venueImages, transportRoutes, venueSchedule } from '../data/venueExperience.js';
import { initVenueLeafletMap } from './venue/leafletMap.js';
import { renderVenueSvgMap } from './venue/venueSvgMap.js';

export const venuePageMethods = {
  _initVenuePage() {
    const heroContainer = document.getElementById('venue-hero-container');
    const contentContainer = document.getElementById('venue-content');
    const chipsContainer = document.getElementById('venue-chips');
    if (!heroContainer || !contentContainer) return;

    // Verified working stadium photos from Wikimedia Commons
    // Keep track of the active venue and selected gate
    let activeVenue = null;
    let selectedGateId = 'gate-7';

    const renderPage = (venue) => {
      activeVenue = venue;
      
      // Update Chips active status
      if (chipsContainer) {
        chipsContainer.querySelectorAll('.venue-chip').forEach(chip => {
          chip.classList.toggle('venue-chip--active', chip.dataset.venueId === venue.id);
        });
      }

      const bgImg = venueImages[venue.id] || venueImages['metlife-stadium'];
      const isVideo = bgImg.endsWith('.mp4');
      heroContainer.innerHTML = `
        <div class="venue-hero motion-scale-in">
          ${isVideo
            ? `<video class="venue-hero__img" autoplay muted loop playsinline src="${bgImg}" style="width:100%;height:100%;object-fit:cover;"></video>`
            : `<img class="venue-hero__img" src="${bgImg}" alt="${venue.name}" loading="lazy"
                 onerror="this.onerror=null;this.src='/images/stadium-aerial.jpg';" />`
          }
          <div class="venue-hero__overlay">
            <div class="venue-hero__name">${venue.name}</div>
            <div class="venue-hero__location">${venue.city} · Capacity: ${venue.capacity.toLocaleString()}</div>
          </div>
        </div>
      `;

      const weather = venue.weather;
      const weatherAlertHtml = weather.alert 
        ? `<div class="venue-weather-alert animate-pulse" style="background: rgba(244, 63, 94, 0.1); border: 1px solid var(--accent-red); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-xl); display: flex; align-items: center; gap: var(--space-sm); color: var(--accent-red); font-size: 0.88rem; font-weight: 500;">
             <span>🚨</span>
             <span>${weather.alert}</span>
           </div>`
        : '';

      const route = this.venueMapService.getAccessibleRoute(venue.id, selectedGateId);

      const svgMapHtml = renderVenueSvgMap(venue, selectedGateId);

      const routes = transportRoutes[venue.id] || transportRoutes['metlife-stadium'];
      const schedule = venueSchedule[venue.id] || [{ match: 'No upcoming matches', date: 'N/A', teams: 'N/A' }];

      contentContainer.innerHTML = `
        <div>
          ${weatherAlertHtml}

          <!-- Match Schedule at This Venue -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">📅</span> Match Schedule at ${venue.name}</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${schedule.map(m => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:var(--radius-md);">
                  <div>
                    <div style="font-weight:700;font-size:0.88rem;color:var(--accent-green);">${m.match}</div>
                    <div style="font-size:0.78rem;color:var(--text-secondary);">${m.teams}</div>
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-muted);text-align:right;">${m.date}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- GPS Route Card -->
          <div class="venue-info-card motion-fade-in venue-gps-card" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">📍</span> GPS Matchday Route</div>
            <div id="venue-gps-status" style="color:var(--text-secondary);margin-bottom:var(--space-md); font-size:0.88rem;">
              ${venue.isSimulated 
                ? `Showing: <strong>${venue.name}</strong>. Enable browser GPS for local detection.` 
                : `Located: <strong>${venue.name}</strong> (${venue.distanceKm} km away)`}
            </div>
            <div style="display:flex; gap:10px; margin-bottom:var(--space-md);">
              <button class="btn btn--primary btn--sm" id="btn-use-gps" aria-label="Check my location">
                <span>Check My Location</span>
              </button>
              <select id="venue-selector" class="setting-select" style="width:auto;padding:6px 12px;font-size:0.8rem;border-radius:var(--radius-full);">
                ${VenueMapService.STADIUMS.map(s => `<option value="${s.id}" ${s.id === venue.id ? 'selected' : ''}>${s.name.split(' (')[0]}</option>`).join('')}
              </select>
            </div>
            
            ${svgMapHtml}

            <div id="leaflet-map" style="width:100%;height:300px;border-radius:var(--radius-lg);border:1px solid var(--border-subtle);margin-bottom:var(--space-md);z-index:1;"></div>

            <div id="venue-route-result">
              <div class="route-summary" style="background:rgba(255,255,255,0.02); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-sm);">
                  <strong>${route.destination}</strong>
                  <span style="font-size:0.75rem; background:rgba(20, 150, 255, 0.15); color:var(--accent-blue); padding:2px 8px; border-radius:var(--radius-full); font-weight:700;">
                    ${route.isWheelchairAccessible ? '♿ ACCESSIBLE ROUTE' : 'STANDARD ROUTE'}
                  </span>
                </div>
                <div style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:var(--space-md);">
                  Distance: <strong>${route.totalDistance}</strong> · Time: <strong>${route.estimatedTime}</strong> · Covered: <strong>${route.hasCoveredWalkway ? 'Yes' : 'No'}</strong>
                </div>
                <div class="route-steps-list" style="display:flex; flex-direction:column; gap:8px;">
                  ${route.steps.map((step, idx) => `
                    <div class="route-step" style="display:flex; align-items:flex-start; gap:var(--space-sm); font-size:0.82rem;">
                      <span style="background:var(--bg-glass-active); color:var(--accent-green); width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:0.7rem; font-weight:700; margin-top:2px;">${idx + 1}</span>
                      <div style="flex:1;">
                        <div>${step.instruction}</div>
                        <div style="font-size:0.72rem; color:var(--text-muted);">${step.distance}</div>
                      </div>
                      ${step.accessible ? '<span title="Accessible step" style="font-size:0.8rem; margin-top:2px;">♿</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- Gate Wait Times & Density -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">🚪</span> Gate Density & Selector</div>
            <p style="font-size:0.82rem; color:var(--text-secondary); margin-bottom:var(--space-md);">Select a gate to dynamically re-route accessible navigation:</p>
            <div class="gate-grid" style="display:grid; grid-template-columns:1fr; gap:8px;">
              ${venue.gates.map(g => {
                const densityClass = g.density === 'high' ? 'gate-density--high' : g.density === 'medium' ? 'gate-density--medium' : 'gate-density--low';
                const isSelected = g.id === selectedGateId;
                return `
                  <div class="gate-card select-gate-row" data-gate-id="${g.id}" style="cursor:pointer; border:1px solid ${isSelected ? 'var(--accent-green)' : 'var(--border-subtle)'}; background:${isSelected ? 'var(--bg-glass-active)' : 'rgba(255,255,255,0.02)'}; transition:all 0.2s; padding:12px; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:1.1rem; filter:${isSelected ? 'none' : 'grayscale(1)'};">🚪</span>
                      <div>
                        <div style="font-weight:600; font-size:0.88rem; color:${isSelected ? 'var(--accent-green)' : 'var(--text-primary)'};">${g.name}</div>
                        <div style="font-size:0.72rem; color:var(--text-muted);">Wait: ${g.waitMinutes} mins · ${g.isAccessible ? '♿ Step-free' : 'Standard Turnstiles'}</div>
                      </div>
                    </div>
                    <span class="${densityClass}" style="font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px;">${g.density.toUpperCase()}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Stadium Facts -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">🏟️</span> Stadium Facts</div>
            <div class="venue-stat"><span class="venue-stat__label">Capacity</span><span class="venue-stat__value">${venue.capacity.toLocaleString()}</span></div>
            <div class="venue-stat"><span class="venue-stat__label">City</span><span class="venue-stat__value">${venue.city}</span></div>
            <div class="venue-stat"><span class="venue-stat__label">WC 2026 Role</span><span class="venue-stat__value">${venue.role || 'Venue'}</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Surface</span><span class="venue-stat__value">Natural Grass (FIFA Quality Pro)</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Roof</span><span class="venue-stat__value">${venue.id === 'mercedes-benz-stadium' || venue.id === 'nrg-stadium' || venue.id === 'bc-place' || venue.id === 'att-stadium' ? 'Retractable' : venue.id === 'sofi-stadium' ? 'Open-air with translucent canopy' : 'Open-air'}</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Pitch Size</span><span class="venue-stat__value">105m x 68m (FIFA Standard)</span></div>
          </div>
        </div>

        <div>
          <!-- Weather Forecast Card -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">🌦️</span> Live Weather Alert</div>
            <div style="display:flex; align-items:center; gap:var(--space-md); background:rgba(255,255,255,0.02); padding:var(--space-md); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
              <div style="font-size:2.5rem; text-shadow:0 0 10px rgba(255,255,255,0.1);">${weather.icon}</div>
              <div>
                <div style="font-size:1.3rem; font-weight:700; color:var(--text-primary);">${weather.tempC}°C</div>
                <div style="font-size:0.82rem; color:var(--text-secondary);">${weather.condition}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">Wind: ${weather.windKmH} km/h · Rain probability: ${weather.rainProbability}%</div>
              </div>
            </div>
          </div>

          <!-- Transport Routes Card -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">🚇</span> Transit Hub Connections</div>
            <div class="transport-routes">
              ${routes.map(r => `
                <div class="transport-route">
                  <div class="transport-route__icon">${r.icon}</div>
                  <div class="transport-route__info">
                    <div class="transport-route__name">${r.name}</div>
                    <div class="transport-route__desc">${r.desc}</div>
                  </div>
                  <div class="transport-route__time">${r.time}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Food & Beverage -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">🍔</span> Food & Beverage</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-weight:600;font-size:0.85rem;">In-Stadium Concessions</span>
                <span style="font-size:0.78rem;color:var(--text-muted);">All levels, 100+ outlets</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-weight:600;font-size:0.85rem;">Premium Dining</span>
                <span style="font-size:0.78rem;color:var(--text-muted);">Club & Suite levels</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-weight:600;font-size:0.85rem;">Halal / Kosher / Vegan</span>
                <span style="font-size:0.78rem;color:var(--accent-green);">Available at designated stalls</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="font-weight:600;font-size:0.85rem;">Water Stations</span>
                <span style="font-size:0.78rem;color:var(--accent-green);">Free refill points at every level</span>
              </div>
            </div>
          </div>

          <!-- Security & Bag Policy -->
          <div class="venue-info-card motion-fade-in" style="margin-bottom:var(--space-xl);">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">🔒</span> Security & Bag Policy</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-weight:600;font-size:0.85rem;">Bag Size Limit</span>
                <span style="font-size:0.78rem;color:var(--text-muted);">12" x 6" x 12" (clear bags only)</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-weight:600;font-size:0.85rem;">Gates Open</span>
                <span style="font-size:0.78rem;color:var(--text-muted);">2 hours before kickoff</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle);">
                <span style="font-weight:600;font-size:0.85rem;">Prohibited</span>
                <span style="font-size:0.78rem;color:var(--accent-red);">Umbrellas, drones, large cameras</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="font-weight:600;font-size:0.85rem;">ADA Services</span>
                <span style="font-size:0.78rem;color:var(--accent-green);">Wheelchair escort, assistive listening</span>
              </div>
            </div>
          </div>

          <!-- Accessibility Checklist -->
          <div class="venue-info-card motion-fade-in">
            <div class="venue-info-card__title"><span class="venue-info-card__icon">♿</span> Inclusive Stadium Operations</div>
            <div class="venue-stat"><span class="venue-stat__label">Tactile Ground Indicators</span><span class="venue-stat__value">All Plazas</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Dedicated Accessible Entry</span><span class="venue-stat__value">Gate 7 priority</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Audio Description Headsets</span><span class="venue-stat__value">Booth 12 (West)</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Sensory Calm Rooms</span><span class="venue-stat__value">Level 1 & Level 3</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Wheelchair Spaces</span><span class="venue-stat__value">300+ with companion seats</span></div>
            <div class="venue-stat"><span class="venue-stat__label">Sign Language Interpreters</span><span class="venue-stat__value">Available on request (48h notice)</span></div>
          </div>
        </div>
      `;

      // Bind events inside the content Container
      const useGpsBtn = contentContainer.querySelector('#btn-use-gps');
      useGpsBtn?.addEventListener('click', async () => {
        const gpsStatus = contentContainer.querySelector('#venue-gps-status');
        useGpsBtn.disabled = true;
        useGpsBtn.textContent = 'Checking location...';
        if (gpsStatus) gpsStatus.textContent = 'Requesting browser location permission...';
        try {
          const position = await this.venueMapService.getCurrentPosition();
          const nearest = await this.venueMapService.findNearestVenue(position);
          Toast.show({
            message: position
              ? `Nearest venue: ${nearest.name} (${nearest.distanceKm} km away).`
              : 'Location unavailable. Showing the default matchday venue.',
            type: position ? 'success' : 'warning',
            duration: 3000,
          });
          renderPage(nearest);
        } catch (error) {
          Toast.show({ message: 'GPS unavailable. Showing nearest venue.', type: 'warning', duration: 3000 });
        } finally {
          useGpsBtn.disabled = false;
          useGpsBtn.textContent = 'Check My Location';
        }
      });

      const selector = contentContainer.querySelector('#venue-selector');
      selector?.addEventListener('change', (e) => {
        const selectedId = e.target.value;
        const selectedVenue = VenueMapService.STADIUMS.find(s => s.id === selectedId);
        if (selectedVenue) {
          renderPage(selectedVenue);
        }
      });

      const gateRows = contentContainer.querySelectorAll('.select-gate-row');
      gateRows.forEach(row => {
        row.addEventListener('click', () => {
          selectedGateId = row.dataset.gateId;
          renderPage(activeVenue);
        });
      });

      initVenueLeafletMap(this, contentContainer, venue, selectedGateId);
    };
    this._renderVenuePage = renderPage;

    // Render Selector Chips at top
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      VenueMapService.STADIUMS.forEach(s => {
        const chip = document.createElement('button');
        chip.className = 'venue-chip';
        chip.textContent = s.name.split(' (')[0];
        chip.dataset.venueId = s.id;
        chipsContainer.appendChild(chip);
      });

      if (!this._venueChipsBound) {
        chipsContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.venue-chip');
          if (!chip) return;
          const venue = VenueMapService.STADIUMS.find(s => s.id === chip.dataset.venueId);
          if (venue) this._renderVenuePage?.(venue);
        });
        this._venueChipsBound = true;
      }
    }

    // Auto load current position or default
    this.venueMapService.findNearestVenue(null).then(defaultVenue => {
      renderPage(defaultVenue);
    });
  }

  // ─── Scroll Animations ──────────────────────────────────
};
