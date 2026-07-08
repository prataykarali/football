/**
 * AI Commentary Service — streams from Gemini via backend proxy
 */
export class CommentaryService {
  constructor() {
    this._consecutiveFailures = 0;
    this._isOffline = false;
    this._offlineSince = null;
  }

  async generateCommentary(event, options = {}) {
    const { language = 'en', pace = 'medium', register = 'casual' } = options;

    if (this._isOffline && this._offlineSince && (Date.now() - this._offlineSince < 30000)) {
      return {
        text: this._getFallbackCommentary(event, pace, register),
        isStreaming: false,
        isFallback: true,
        error: 'Commentary in cooldown',
      };
    }

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const safeEvent = {
          type: String(event?.type || 'possession'),
          minute: Number.isFinite(Number(event?.minute)) ? Number(event.minute) : 0,
          player: String(event?.player || event?.team || 'Unknown'),
          team: String(event?.team || 'Neutral'),
          details: String(event?.details || event?.type || 'Play continues'),
        };
        const response = await fetch('/api/commentary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: safeEvent, language, pace, register }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const text = await response.text();
        if (!text.trim() || text.includes('[Commentary generation error]')) {
          throw new Error('Gemini commentary unavailable');
        }

        this._consecutiveFailures = 0;
        this._isOffline = false;
        this._offlineSince = null;

        return {
          text: text.trim(),
          isStreaming: false,
          isFallback: false,
        };
      } catch (error) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }

        this._consecutiveFailures++;
        if (this._consecutiveFailures >= 3) {
          this._isOffline = true;
          this._offlineSince = Date.now();
        }

        return {
          text: this._getFallbackCommentary(event, pace, register),
          isStreaming: false,
          isFallback: true,
          error: error.message,
        };
      }
    }
  }

  _getFallbackCommentary(event, pace, register) {
    const details = event.details || event.type || 'Play continues';
    const prefix = event.minute ? `${event.minute}' — ` : '';
    if (register === 'tactical') return `${prefix}[Tactical] ${details}`;
    if (pace === 'fast') return `${prefix}${details.split('.')[0]}.`;
    return `${prefix}${details}`;
  }
}
