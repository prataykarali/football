import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommentaryService } from '../src/services/commentary.js';

global.fetch = vi.fn();

describe('CommentaryService', () => {
  let service;

  beforeEach(() => {
    service = new CommentaryService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateCommentary', () => {
    it('should call /api/commentary with correct payload', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Goal! Brilliant strike!',
      });

      const event = { type: 'goal', player: 'Messi', minute: 23 };
      await service.generateCommentary(event);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/commentary');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.event.type).toBe('goal');
      expect(body.event.player).toBe('Messi');
      expect(body.event.minute).toBe(23);
    });

    it('should include pace in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Quick commentary',
      });

      const event = { type: 'goal', player: 'Ronaldo', minute: 45 };
      await service.generateCommentary(event, { pace: 'fast' });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.pace).toBe('fast');
    });

    it('should include register in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Casual commentary',
      });

      const event = { type: 'pass', player: 'Xavi', minute: 30 };
      await service.generateCommentary(event, { register: 'casual' });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.register).toBe('casual');
    });

    it('should include language in request body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => '¡Gol!',
      });

      const event = { type: 'goal', player: 'Pedri', minute: 55 };
      await service.generateCommentary(event, { language: 'es' });

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.language).toBe('es');
    });

    it('should return fallback text on API errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const event = { type: 'goal', player: 'Haaland', minute: 78, details: 'Goal by Haaland' };
      const result = await service.generateCommentary(event);

      expect(result).toHaveProperty('text');
      expect(result.text).toContain('78');
    });

    it('should return text from API response', async () => {
      const expectedText = 'What a save by the goalkeeper!';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => expectedText,
      });

      const event = { type: 'save', player: 'Courtois', minute: 62 };
      const result = await service.generateCommentary(event);

      expect(result.text).toBe(expectedText);
    });

    it('should return fallback text on network failures', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const event = { type: 'goal', player: 'Mbappé', minute: 89, details: 'Goal by Mbappé' };
      const result = await service.generateCommentary(event);

      expect(result).toHaveProperty('text');
      expect(result.text).toContain('89');
    });

    it('should set Content-Type header to application/json', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Header test',
      });

      const event = { type: 'corner', player: 'Trent', minute: 15 };
      await service.generateCommentary(event);

      const headers = global.fetch.mock.calls[0][1].headers;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
