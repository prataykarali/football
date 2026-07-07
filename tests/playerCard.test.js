import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayerCardService } from '../src/services/playerCard.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock crypto.subtle for any hashing needs
const mockDigest = vi.fn().mockResolvedValue(new ArrayBuffer(32));
vi.stubGlobal('crypto', {
  subtle: {
    digest: mockDigest,
  },
  getRandomValues: (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    return arr;
  },
});

describe('PlayerCardService', () => {
  let service;

  beforeEach(() => {
    service = new PlayerCardService();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('confidence gating', () => {
    it('should return isUncertain=true when confidence < 0.7', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          player: 'Unknown',
          confidence: 0.45,
          stats: {},
        }),
      });

      const frame = new Blob(['fake-image-data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 }); // 100KB
      const result = await service.identifyPlayer(frame);

      expect(result.isUncertain).toBe(true);
    });

    it('should return isUncertain=false when confidence >= 0.7', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          player: 'Messi',
          confidence: 0.95,
          stats: { goals: 800 },
        }),
      });

      const frame = new Blob(['fake-image-data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });
      const result = await service.identifyPlayer(frame);

      expect(result.isUncertain).toBe(false);
    });

    it('should return isUncertain=false at exact threshold boundary (0.7)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          player: 'Borderline',
          confidence: 0.7,
          stats: {},
        }),
      });

      const frame = new Blob(['fake-image-data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });
      const result = await service.identifyPlayer(frame);

      // At exactly 0.7, should NOT be uncertain (>= 0.7 is confident)
      expect(result.isUncertain).toBe(false);
    });
  });

  describe('frame validation', () => {
    it('should reject files over 4MB', async () => {
      const largeFrame = new Blob(['x'.repeat(100)], { type: 'image/png' });
      Object.defineProperty(largeFrame, 'size', { value: 5 * 1024 * 1024 }); // 5MB

      const result = await service.identifyPlayer(largeFrame);

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/size|too large|4MB|exceeds/i);
    });

    it('should accept files under 4MB', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          player: 'Neymar',
          confidence: 0.88,
          stats: {},
        }),
      });

      const validFrame = new Blob(['valid-data'], { type: 'image/jpeg' });
      Object.defineProperty(validFrame, 'size', { value: 2 * 1024 * 1024 }); // 2MB

      const result = await service.identifyPlayer(validFrame);

      expect(result.error).toBeUndefined();
    });
  });

  describe('rate limiting', () => {
    it('should reject second call within 3 seconds', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          player: 'Messi',
          confidence: 0.95,
          stats: {},
        }),
      });

      const frame = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });

      // First call should succeed
      await service.identifyPlayer(frame);

      // Second call within 3s should be rate-limited
      const result = await service.identifyPlayer(frame);

      expect(result.error || result.rateLimited).toBeTruthy();
    });

    it('should allow call after rate limit window expires', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          player: 'Ronaldo',
          confidence: 0.92,
          stats: {},
        }),
      });

      const frame = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });

      await service.identifyPlayer(frame);

      // Advance time past rate limit window
      vi.advanceTimersByTime(4000);

      const result = await service.identifyPlayer(frame);

      expect(result.error).toBeUndefined();
      expect(result.rateLimited).toBeFalsy();
    });
  });

  describe('player database lookup', () => {
    it('should return known player data from database', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          player: 'Messi',
          confidence: 0.98,
          stats: { goals: 800, assists: 350, caps: 180 },
        }),
      });

      const frame = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });

      const result = await service.identifyPlayer(frame);

      expect(result.player).toBe('Messi');
      expect(result.stats).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const frame = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });

      const result = await service.identifyPlayer(frame);

      expect(result.error).toBeDefined();
    });

    it('should handle network failures', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const frame = new Blob(['data'], { type: 'image/png' });
      Object.defineProperty(frame, 'size', { value: 1024 * 100 });

      const result = await service.identifyPlayer(frame);

      expect(result.error).toBeDefined();
    });
  });
});
