/**
 * Stadium Finder & Venue Map Service
 */

export class VenueMapService {
  constructor() {}

  static LUSAIL_STADIUM = {
    id: 'lusail-stadium',
    name: 'Lusail Iconic Stadium',
    city: 'Lusail, Qatar',
    capacity: 88966,
    lat: 25.4208,
    lng: 51.4904,
    distanceKm: 1.2,
    weather: {
      tempC: 24,
      condition: 'Clear Night',
      icon: '🌙',
      rainProbability: 0,
      windKmH: 12,
      alert: null
    },
    gates: [
      { id: 'gate-1', name: 'Gate 1 (North Main)', density: 'high', waitMinutes: 18, isAccessible: true, hasCover: true },
      { id: 'gate-3', name: 'Gate 3 (East VIP)', density: 'low', waitMinutes: 3, isAccessible: true, hasCover: true },
      { id: 'gate-5', name: 'Gate 5 (South Concourse)', density: 'medium', waitMinutes: 10, isAccessible: false, hasCover: false },
      { id: 'gate-7', name: 'Gate 7 (West Accessible)', density: 'low', waitMinutes: 4, isAccessible: true, hasCover: true }
    ]
  };

  async getCurrentPosition() {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({ lat: 25.4208, lng: 51.4904 })
        );
      } else {
        resolve({ lat: 25.4208, lng: 51.4904 });
      }
    });
  }

  async findNearestVenue() {
    return { ...VenueMapService.LUSAIL_STADIUM };
  }

  getAccessibleRoute(gateId = 'gate-7') {
    return {
      destination: `Lusail Stadium — ${gateId}`,
      totalDistance: '450m',
      estimatedTime: '6 mins',
      isWheelchairAccessible: true,
      hasElevators: true,
      hasCoveredWalkway: true,
      steps: [
        { instruction: 'Exit Metro Station via Elevator 2 to Ground Level', distance: '50m', accessible: true },
        { instruction: 'Follow covered tactile paving pathway towards West Plaza', distance: '200m', accessible: true },
        { instruction: 'Proceed via step-free ramp to Gate 7 Priority Turnstiles', distance: '200m', accessible: true }
      ]
    };
  }
}
