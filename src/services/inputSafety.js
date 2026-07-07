/**
 * Security & Input Safety Service
 */

export class InputSafety {
  validateFrame(blob) { return InputSafety.validateFrame(blob); }
  validateGPS(arg1, arg2) { return InputSafety.validateGPS(arg1, arg2); }
  sanitizeText(text) { return InputSafety.sanitizeText(text); }
  scrubPromptInjection(text) { return InputSafety.scrubPromptInjection(text); }
  clampOutput(text, maxLength) { return InputSafety.clampOutput(text, maxLength); }
  sanitizeForDOM(str) { return InputSafety.sanitizeForDOM(str); }
  validateQuizPayload(payload) { return InputSafety.validateQuizPayload(payload); }

  static validateFrame(blob) {
    if (!blob) return { valid: false, reason: 'No frame provided', error: 'No frame provided' };
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (blob.type && !allowedTypes.includes(blob.type.toLowerCase())) {
      return { valid: false, reason: `Unsupported file type: ${blob.type}`, error: `Invalid image type: ${blob.type}` };
    }
    const maxBytes = 4 * 1024 * 1024; // 4MB
    if (blob.size && blob.size > maxBytes) {
      return { valid: false, reason: 'Frame size exceeds 4MB cap', error: 'Frame exceeds 4MB cap' };
    }
    return { valid: true };
  }

  static validateGPS(arg1, arg2) {
    let lat, lng;
    if (typeof arg1 === 'object' && arg1 !== null) {
      lat = arg1.lat;
      lng = arg1.lng;
    } else {
      lat = arg1;
      lng = arg2;
    }

    if (lat === undefined || lng === undefined) {
      return { valid: false, reason: 'Missing lat/lng' };
    }

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return { valid: false, reason: 'Latitude out of range [-90, 90]' };
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return { valid: false, reason: 'Longitude out of range [-180, 180]' };
    }
    return { valid: true };
  }

  static sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .trim();
  }

  static scrubPromptInjection(text) {
    if (!text || typeof text !== 'string') return '';
    const injectionPatterns = [
      /ignore\s+(all\s+)?previous\s+instructions/gi,
      /\[?system\]?\s*:\s*/gi,
      /you\s+are\s+now\s+(a|DAN)?/gi,
      /override\s+prompt/gi
    ];

    let cleaned = text;
    injectionPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    return cleaned;
  }

  static clampOutput(text, maxLength = 2000) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength);
  }

  static sanitizeForDOM(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static validateQuizPayload(payload) {
    if (!payload || typeof payload !== 'object') return { valid: false, reason: 'Payload must be an object' };

    // Format A: { questionId, answer, timestamp }
    if (payload.questionId !== undefined || payload.answer !== undefined) {
      if (!payload.questionId) return { valid: false, reason: 'Missing required field: questionId' };
      if (!payload.answer || (typeof payload.answer === 'string' && !payload.answer.trim())) {
        return { valid: false, reason: 'Missing or empty required field: answer' };
      }
      if (!payload.timestamp) return { valid: false, reason: 'Missing required field: timestamp' };
      return { valid: true };
    }

    // Format B: { question, options }
    if (!payload.question || typeof payload.question !== 'string') return { valid: false, reason: 'Missing question' };
    if (!Array.isArray(payload.options) || payload.options.length < 2) return { valid: false, reason: 'Requires at least 2 options' };
    return { valid: true };
  }
}
