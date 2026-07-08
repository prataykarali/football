import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SustainabilityService } from '../src/services/sustainability.js';

describe('SustainabilityService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      _store: {},
      getItem(k) { return this._store[k] ?? null; },
      setItem(k, v) { this._store[k] = String(v); },
      removeItem(k) { delete this._store[k]; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates carbon emissions correctly', () => {
    const service = new SustainabilityService();
    
    // 10km transit
    const transit = service.calculateEmissions(10, 'transit');
    expect(transit.co2Kg).toBe(0.4);
    expect(transit.points).toBe(30);

    // 10km driving
    const driving = service.calculateEmissions(10, 'driving');
    expect(driving.co2Kg).toBe(2.7);
    expect(driving.points).toBe(0);
  });

  it('calculates carbon savings correctly compared to personal car driving', () => {
    const service = new SustainabilityService();
    const saving = service.getCarbonSaving(10, 'transit');
    
    // baseline: 2.7, transit: 0.4 -> saving: 2.3
    expect(saving).toBe(2.3);
  });

  it('completes actions and increases points', () => {
    const service = new SustainabilityService();
    expect(service.getPoints()).toBe(0);

    const action = service.completeAction('water-refill');
    expect(action).toBeDefined();
    expect(action.points).toBe(20);
    expect(service.getPoints()).toBe(20);
    expect(service.isActionCompleted('water-refill')).toBe(true);
  });

  it('avoids double completion of same action', () => {
    const service = new SustainabilityService();
    service.completeAction('water-refill');
    const action2 = service.completeAction('water-refill');
    expect(action2).toBe(false);
    expect(service.getPoints()).toBe(20);
  });

  it('provides helpful AI eco tips', () => {
    const service = new SustainabilityService();
    const tip = service.getAIEcoTip(10, 'transit');
    expect(tip).toContain('CO2');
    expect(tip).toContain('smartphone');
  });
});
