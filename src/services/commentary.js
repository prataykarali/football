/**
 * AI Commentary Service — streams from Gemini via backend proxy
 */
export class CommentaryService {
  constructor() {}

  async generateCommentary(event, options = {}) {
    const { language = 'en', pace = 'medium', register = 'casual' } = options;

    try {
      const safeEvent = {
        ...event,
        player: event?.player || event?.team || 'Unknown',
      };
      const response = await fetch('/api/commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: safeEvent, language, pace, register }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Backend streams plain text
      const text = await response.text();
      if (!text.trim() || text.includes('[Commentary generation error]')) {
        throw new Error('Gemini commentary unavailable');
      }
      return {
        text: text.trim(),
        isStreaming: false,
        isFallback: false,
      };
    } catch (error) {
      return {
        text: this._getFallbackCommentary(event, pace, register),
        isStreaming: false,
        isFallback: true,
        error: error.message,
      };
    }
  }

  _getFallbackCommentary(event, pace, register) {
    const details = event.details || event.type || 'Play continues';
    const prefix = event.minute ? `${event.minute}' — ` : '';
    if (register === 'tactical') return `${prefix}[Tactical] ${details}`;
    if (pace === 'fast') return `${prefix}${details.split('.')[0]}.`;
    return `${prefix}${details}`;
  }

  batchEvents(events) {
    if (!events || events.length <= 1) return events;
    if (events.some(e => e.isKeyMoment)) return events;
    return [events[events.length - 1]];
  }
}
