/**
 * Sustainability Service - Carbon Footprint & Eco-Actions Tracker
 */
import { LocalDatabase } from './localDatabase.js';

export class SustainabilityService {
  constructor() {
    this.points = 0;
    this.completedActions = new Set();
    this.loadState();
  }

  static TRAVEL_MODES = {
    transit: { label: 'Transit Rail', co2PerKm: 0.04, points: 30, icon: '🚇' },
    bus: { label: 'Shuttle Bus', co2PerKm: 0.09, points: 25, icon: '🚌' },
    rideshare: { label: 'Rideshare', co2PerKm: 0.20, points: 5, icon: '🚕' },
    driving: { label: 'Personal Car', co2PerKm: 0.27, points: 0, icon: '🚗' }
  };

  static ECO_ACTIONS = [
    { id: 'water-refill', label: 'Refilled water bottle in stadium', points: 20, icon: '💧' },
    { id: 'public-transit', label: 'Traveled via green public transit', points: 30, icon: '🚇' },
    { id: 'recycle-waste', label: 'Recycled waste at sorting gate', points: 15, icon: '♻️' },
    { id: 'plant-meals', label: 'Chose plant-based dining concession', points: 15, icon: '🥗' }
  ];

  loadState() {
    try {
      const data = LocalDatabase.read();
      this.points = data.sustainability?.points || 0;
      this.completedActions = new Set(data.sustainability?.completedActions || []);
    } catch {
      this.points = 0;
      this.completedActions = new Set();
    }
  }

  saveState() {
    try {
      LocalDatabase.patch({
        sustainability: {
          points: this.points,
          completedActions: Array.from(this.completedActions)
        }
      });
    } catch (err) {
      console.warn('Could not save sustainability state:', err);
    }
  }

  calculateEmissions(distanceKm, mode) {
    const travelMode = SustainabilityService.TRAVEL_MODES[mode];
    if (!travelMode) return { co2Kg: 0, points: 0 };
    
    const co2Kg = Number((distanceKm * travelMode.co2PerKm).toFixed(2));
    const points = travelMode.points;
    return { co2Kg, points };
  }

  getCarbonSaving(distanceKm, modeChosen) {
    // Compare chosen mode to driving (baseline)
    const baseline = this.calculateEmissions(distanceKm, 'driving').co2Kg;
    const current = this.calculateEmissions(distanceKm, modeChosen).co2Kg;
    const saving = Number(Math.max(0, baseline - current).toFixed(2));
    return saving;
  }

  completeAction(actionId) {
    const action = SustainabilityService.ECO_ACTIONS.find(a => a.id === actionId);
    if (!action || this.completedActions.has(actionId)) return false;

    this.completedActions.add(actionId);
    this.points += action.points;
    this.saveState();
    return action;
  }

  isActionCompleted(actionId) {
    return this.completedActions.has(actionId);
  }

  getPoints() {
    return this.points;
  }

  getActionsList() {
    return SustainabilityService.ECO_ACTIONS.map(action => ({
      ...action,
      completed: this.completedActions.has(action.id)
    }));
  }

  getAIEcoTip(distanceKm, modeChosen) {
    const saving = this.getCarbonSaving(distanceKm, modeChosen);
    if (saving <= 0) {
      return `Driving contributes to stadium congestion and carbon emissions. Consider using special FIFA transit rails next time to save carbon!`;
    }
    const phoneHours = Math.round(saving * 82); // ~82 hours of smartphone use per kg of CO2
    return `By choosing public transit today, you prevented ${saving} kg of CO2 emissions. That's equivalent to powering a smartphone for ${phoneHours} hours!`;
  }
}
