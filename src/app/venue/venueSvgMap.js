const GATE_POSITIONS = {
  'gate-1': { x: 200, y: 90 },
  'gate-3': { x: 290, y: 150 },
  'gate-5': { x: 200, y: 210 },
  'gate-7': { x: 110, y: 150 },
};

export function renderVenueSvgMap(venue, selectedGateId) {
  const targetCoords = GATE_POSITIONS[selectedGateId] || GATE_POSITIONS['gate-7'];
  const plazaY = 240;
  const pathData = `M 200 275 L 200 ${plazaY} L ${targetCoords.x} ${plazaY} L ${targetCoords.x} ${targetCoords.y}`;

  return `
    <div class="venue-map-wrap" style="position:relative;width:100%;height:300px;background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:var(--space-md);">
      <svg viewBox="0 0 400 300" style="width:100%;height:100%;">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="200" cy="275" r="10" fill="var(--accent-blue)" opacity="0.3" />
        <circle cx="200" cy="275" r="6" fill="var(--accent-blue)" />
        <text x="200" y="293" fill="var(--text-secondary)" font-size="9" text-anchor="middle" font-family="var(--font-body)">TRANSIT STATION</text>
        <ellipse cx="200" cy="150" rx="100" ry="60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="8" />
        <ellipse cx="200" cy="150" rx="90" ry="50" fill="rgba(8, 217, 115, 0.03)" stroke="var(--accent-green)" stroke-width="2" />
        <text x="200" y="154" fill="var(--text-primary)" font-size="12" font-weight="bold" font-family="var(--font-heading)" text-anchor="middle" letter-spacing="1">ARENA</text>
        ${venue.gates.map((gate) => renderGateMarker(gate, selectedGateId)).join('')}
        <path d="${pathData}" fill="none" stroke="var(--accent-blue)" stroke-width="3" stroke-dasharray="6,4" stroke-linecap="round">
          <animate attributeName="stroke-dashoffset" values="20;0" dur="2s" repeatCount="indefinite" />
        </path>
        <circle cx="${targetCoords.x}" cy="${targetCoords.y}" r="15" fill="none" stroke="var(--accent-blue)" stroke-width="1.5" opacity="0.8">
          <animate attributeName="r" values="9;18;9" dur="1.8s" repeatCount="indefinite" />
        </circle>
      </svg>
      <div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);padding:4px 8px;border-radius:4px;font-size:0.68rem;color:#fff;">
        Accessible path shown in blue
      </div>
    </div>
  `;
}

function renderGateMarker(gate, selectedGateId) {
  const coords = GATE_POSITIONS[gate.id];
  if (!coords) return '';

  const isSelected = gate.id === selectedGateId;
  return `
    <circle cx="${coords.x}" cy="${coords.y}" r="${isSelected ? 9 : 6}" fill="${isSelected ? 'var(--accent-green)' : 'rgba(255,255,255,0.3)'}" stroke="${isSelected ? '#fff' : 'none'}" stroke-width="1.5" />
    <text x="${coords.x}" y="${coords.y - 12}" fill="${isSelected ? 'var(--accent-green)' : 'var(--text-muted)'}" font-size="9" font-weight="${isSelected ? 'bold' : 'normal'}" text-anchor="middle">${gate.id.toUpperCase()}</text>
  `;
}
