/**
 * Player Zoom Card Service
 */

import { InputSafety } from './inputSafety.js';

export class PlayerCardService {
  constructor() {
    this.lastCaptureTime = 0;
  }

  static KNOWN_PLAYERS = {
    'Lionel Messi': {
      player: 'Lionel Messi',
      position: 'Forward / Playmaker',
      nationality: 'Argentina',
      nationalityFlag: '🇦🇷',
      confidence: 0.98,
      isUncertain: false,
      stats: { goals: 7, assists: 3, passes: 284 },
      funFact: 'Lionel Messi has scored in every World Cup round in a single tournament (Group, R16, QF, SF, Final).'
    },
    'Kylian Mbappé': {
      player: 'Kylian Mbappé',
      position: 'Forward / Winger',
      nationality: 'France',
      nationalityFlag: '🇫🇷',
      confidence: 0.96,
      isUncertain: false,
      stats: { goals: 8, assists: 2, passes: 192 },
      funFact: 'Mbappé became only the second player in history to score a hat-trick in a World Cup Final (after Geoff Hurst in 1966).'
    },
    'Ángel Di María': {
      player: 'Ángel Di María',
      position: 'Winger / Attacker',
      nationality: 'Argentina',
      nationalityFlag: '🇦🇷',
      confidence: 0.94,
      isUncertain: false,
      stats: { goals: 1, assists: 2, passes: 145 },
      funFact: 'Di María has scored in the Olympics Final, Copa América Final, and World Cup Final for Argentina.'
    },
    'Mohamed Salah': {
      player: 'Mohamed Salah',
      position: 'Forward / Right Winger',
      nationality: 'Egypt',
      nationalityFlag: '🇪🇬',
      confidence: 0.92,
      isUncertain: false,
      stats: { goals: 3, assists: 1, passes: 118 },
      funFact: 'Salah is Egypt’s focal point in transition and one of the most dangerous left-footed forwards in world football.'
    }
  };



  async identifyPlayer(frameBlob) {
    if (frameBlob) {
      const validation = InputSafety.validateFrame(frameBlob);
      if (!validation.valid) {
        return { error: validation.error || validation.reason || 'Invalid frame' };
      }
    }

    const now = Date.now();
    if (now - this.lastCaptureTime < 3000) {
      return {
        error: 'Rate limit exceeded: Please wait 3 seconds between player scans.',
        rateLimited: true
      };
    }
    this.lastCaptureTime = now;

    try {
      const frame = await this._blobToBase64(frameBlob);

      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame })
      });

      if (!response.ok) {
        return { error: `API error ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      const conf = data.confidence ?? 0.5;

      // Scene-read result: what Gemini actually sees in the frame (teams read from
      // the on-screen scoreboard, phase of play, the player in focus). Legacy
      // player/stats fields are preserved so older callers/tests keep working.
      return {
        homeTeam: data.homeTeam || 'Unknown',
        awayTeam: data.awayTeam || 'Unknown',
        score: data.score || 'unknown',
        minute: data.minute || 'unknown',
        inFocus: data.inFocus || 'Player in focus',
        phase: data.phase || 'open play',
        player: data.player || 'Unknown',
        confidence: conf,
        isUncertain: conf < 0.7,
        stats: data.stats || { goals: 1, assists: 0, passes: 30 },
        funFact: data.funFact || 'The frame was scanned but details were not fully legible.',
        source: data.source || 'gemini-vision'
      };
    } catch (err) {
      return { error: err.message || 'Network error' };
    }
  }

  _blobToBase64(blob) {
    if (typeof FileReader === 'undefined' && typeof blob.arrayBuffer === 'function') {
      return blob.arrayBuffer().then((buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
        if (typeof btoa === 'function') return btoa(binary);
        return Buffer.from(bytes).toString('base64');
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(new Error('Could not read video frame'));
      reader.readAsDataURL(blob);
    });
  }
}
