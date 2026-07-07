const GATE_OFFSETS = {
  'gate-1': [0.0015, 0],
  'gate-3': [0, 0.0015],
  'gate-5': [-0.0015, 0],
  'gate-7': [0, -0.0015],
};

export function initVenueLeafletMap(app, contentContainer, venue, selectedGateId) {
  if (typeof L === 'undefined') return;

  const mapEl = contentContainer.querySelector('#leaflet-map');
  if (!mapEl) return;

  if (app._leafletMap) {
    app._leafletMap.remove();
    app._leafletMap = null;
  }

  try {
    app._leafletMap = L.map('leaflet-map').setView([venue.lat, venue.lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(app._leafletMap);

    L.marker([venue.lat, venue.lng])
      .addTo(app._leafletMap)
      .bindPopup(`<b>${escapeHtml(venue.name)}</b><br>${escapeHtml(venue.city)}<br>Capacity: ${venue.capacity.toLocaleString()}`)
      .openPopup();

    venue.gates.forEach((gate) => addGateMarker(app, venue, gate, selectedGateId));
    setTimeout(() => app._leafletMap?.invalidateSize(), 200);
  } catch {
    mapEl.textContent = 'Map loading...';
    mapEl.style.display = 'flex';
    mapEl.style.alignItems = 'center';
    mapEl.style.justifyContent = 'center';
    mapEl.style.color = 'var(--text-muted)';
    mapEl.style.fontSize = '0.85rem';
  }
}

function addGateMarker(app, venue, gate, selectedGateId) {
  const offset = GATE_OFFSETS[gate.id];
  if (!offset) return;

  const pos = [venue.lat + offset[0], venue.lng + offset[1]];
  L.circleMarker(pos, {
    radius: 6,
    fillColor: gate.id === selectedGateId ? '#08d973' : '#6b7a8c',
    color: gate.id === selectedGateId ? '#fff' : '#333',
    weight: 2,
    fillOpacity: 0.9,
  }).addTo(app._leafletMap).bindPopup(
    `<b>${escapeHtml(gate.name)}</b><br>Wait: ${Number(gate.waitMinutes) || 0}min<br>${gate.isAccessible ? 'Accessible' : 'Standard'}`
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
