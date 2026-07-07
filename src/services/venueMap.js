import { STADIUMS } from '../data/venues.js';

/**
 * Stadium Finder & Venue Map Service
 * Real FIFA World Cup 2026 venues with Haversine distance calculation.
 */

export class VenueMapService {
  constructor() {}

  static STADIUMS = STADIUMS;

  async getCurrentPosition() {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  }

  async findNearestVenue(coords) {
    if (!coords) {
      // Default to MetLife Stadium (Final venue) when GPS unavailable
      return {
        ...VenueMapService.STADIUMS[0],
        distanceKm: 0.0,
        isSimulated: true,
      };
    }

    let nearest = null;
    let minDistance = Infinity;

    for (const stadium of VenueMapService.STADIUMS) {
      const dist = this._calculateDistance(coords.lat, coords.lng, stadium.lat, stadium.lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = stadium;
      }
    }

    return {
      ...nearest,
      distanceKm: parseFloat(minDistance.toFixed(1)),
      isSimulated: false,
    };
  }

  getVenueById(venueId) {
    return VenueMapService.STADIUMS.find(s => s.id === venueId) || null;
  }

  findVenueByName(name = '') {
    const normalizedName = this._normalizeVenueText(name);
    if (!normalizedName) return null;

    return VenueMapService.STADIUMS.find((stadium) => {
      const stadiumName = this._normalizeVenueText(stadium.name);
      const stadiumCity = this._normalizeVenueText(stadium.city);
      return normalizedName.includes(stadiumName)
        || stadiumName.includes(normalizedName)
        || normalizedName.includes(stadiumCity)
        || stadiumCity.includes(normalizedName);
    }) || null;
  }

  buildTripPlan(coords, venueId) {
    const venue = this.getVenueById(venueId) || VenueMapService.STADIUMS[0];
    const hasUserLocation = Boolean(coords);
    const origin = coords || {
      lat: venue.lat + 0.055,
      lng: venue.lng - 0.065,
    };
    const distanceKm = this._calculateDistance(origin.lat, origin.lng, venue.lat, venue.lng);
    const routeDistanceKm = Math.max(distanceKm * 1.22, distanceKm + 0.4);
    const bestGate = this._getBestEntryGate(venue);
    const alternatives = this._buildTravelAlternatives(routeDistanceKm, bestGate, hasUserLocation);
    const recommended = alternatives[0];

    return {
      venue,
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      routeDistanceKm: parseFloat(routeDistanceKm.toFixed(1)),
      hasUserLocation,
      recommended,
      alternatives,
      bestGate,
    };
  }

  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  _normalizeVenueText(text = '') {
    return String(text)
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  _getBestEntryGate(venue) {
    const gates = [...(venue.gates || [])];
    return gates.sort((a, b) => {
      const accessibilityScore = Number(b.isAccessible) - Number(a.isAccessible);
      if (accessibilityScore !== 0) return accessibilityScore;
      return a.waitMinutes - b.waitMinutes;
    })[0] || venue.gates?.[0] || null;
  }

  _buildTravelAlternatives(routeDistanceKm, gate, hasUserLocation) {
    const gateWait = gate?.waitMinutes || 8;
    const gateName = gate?.name || 'best available gate';
    const longDistance = routeDistanceKm > 350;
    const regionalDistance = routeDistanceKm > 80;

    if (longDistance) {
      return [
        {
          id: 'fly-transit',
          label: 'Fly + stadium transit',
          etaMinutes: Math.round((routeDistanceKm / 760) * 60 + 150 + gateWait),
          distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
          cost: '$$$',
          badge: 'BEST FOR DISTANCE',
          reason: `Fastest practical option, then enter via ${gateName}.`,
        },
        {
          id: 'rail',
          label: 'Intercity rail + local transit',
          etaMinutes: Math.round((routeDistanceKm / 145) * 60 + 70 + gateWait),
          distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
          cost: '$$',
          badge: 'LOWER STRESS',
          reason: 'Useful when airports are crowded or matchday roads are restricted.',
        },
        {
          id: 'drive',
          label: 'Drive + pre-booked parking',
          etaMinutes: Math.round((routeDistanceKm / 82) * 60 + 38 + gateWait),
          distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
          cost: '$$$',
          badge: 'MOST CONTROL',
          reason: 'Best only if you already have parking and can arrive early.',
        },
      ];
    }

    const alternatives = [
      {
        id: 'transit',
        label: regionalDistance ? 'Regional transit + stadium shuttle' : 'Public transit + stadium walk',
        etaMinutes: Math.round((routeDistanceKm / (regionalDistance ? 72 : 34)) * 60 + 18 + gateWait),
        distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
        cost: '$',
        badge: 'RECOMMENDED',
        reason: `Avoids parking queues and routes you to ${gateName}.`,
      },
      {
        id: 'rideshare',
        label: 'Rideshare drop-off',
        etaMinutes: Math.round((routeDistanceKm / 44) * 60 + 12 + gateWait),
        distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
        cost: '$$',
        badge: 'FAST ARRIVAL',
        reason: 'Good for small groups, but surge pricing can spike near kickoff.',
      },
      {
        id: 'park-walk',
        label: 'Drive + park-and-walk',
        etaMinutes: Math.round((routeDistanceKm / 52) * 60 + 25 + gateWait),
        distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
        cost: '$$',
        badge: 'BACKUP',
        reason: 'Reliable if parking is pre-booked before stadium traffic locks in.',
      },
    ];

    if (routeDistanceKm <= 5.5) {
      alternatives.push({
        id: 'walk',
        label: 'Walk direct',
        etaMinutes: Math.round((routeDistanceKm / 4.8) * 60 + gateWait),
        distanceKm: parseFloat(routeDistanceKm.toFixed(1)),
        cost: 'FREE',
        badge: 'LOWEST COST',
        reason: hasUserLocation ? 'Best low-cost option from nearby hotels or fan zones.' : 'Shown as a local demo option until GPS is enabled.',
      });
    }

    return alternatives.sort((a, b) => a.etaMinutes - b.etaMinutes);
  }

  getAccessibleRoute(venueId, gateId = 'gate-7') {
    const venue = VenueMapService.STADIUMS.find(s => s.id === venueId) || VenueMapService.STADIUMS[0];
    const gate = venue.gates.find(g => g.id === gateId) || venue.gates[3];

    const isCovered = gate.hasCover;
    const isAccessible = gate.isAccessible;

    return {
      destination: `${venue.name} — ${gate.name}`,
      totalDistance: '450m',
      estimatedTime: '6 mins',
      isWheelchairAccessible: isAccessible,
      hasElevators: true,
      hasCoveredWalkway: isCovered,
      steps: [
        { instruction: `Exit Transit Station / Hub via Lift 2 to Plaza level`, distance: '60m', accessible: true },
        { instruction: `Follow ${isCovered ? 'covered tactile-guided path' : 'uncovered plaza walk'} toward the ${gate.name}`, distance: '240m', accessible: true },
        { instruction: `Proceed via ${isAccessible ? 'step-free accessible turnstile' : 'standard turnstile'} to secure line`, distance: '150m', accessible: isAccessible },
      ],
    };
  }
}
