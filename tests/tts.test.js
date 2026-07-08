import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelSpeech, setTTSEnabled, speak } from '../src/utils/tts.js';

describe('TTS utility (vision-impaired narration)', () => {
  let speakSpy;
  let cancelSpy;

  beforeEach(() => {
    speakSpy = vi.fn();
    cancelSpy = vi.fn();
    vi.stubGlobal('window', {
      speechSynthesis: { speak: speakSpy, cancel: cancelSpy, getVoices: () => [] },
      SpeechSynthesisUtterance: class {
        constructor(text) { this.text = text; }
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setTTSEnabled(false);
  });

  it('is disabled by default and does not call the synth', () => {
    speak('Goal!');
    expect(speakSpy).not.toHaveBeenCalled();
  });

  it('speaks when enabled', () => {
    setTTSEnabled(true);
    speak('Goal by Messi');
    expect(speakSpy).toHaveBeenCalledTimes(1);
    expect(speakSpy.mock.calls[0][0].text).toBe('Goal by Messi');
  });

  it('passes the configured language to the utterance', () => {
    setTTSEnabled(true);
    speak('Gol', { lang: 'es' });
    expect(speakSpy.mock.calls[0][0].lang).toBe('es');
  });

  it('cancels any in-flight speech before speaking', () => {
    setTTSEnabled(true);
    speak('first');
    speak('second');
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('disabling cancels active speech', () => {
    setTTSEnabled(true);
    speak('hello');
    setTTSEnabled(false);
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('no-ops gracefully when SpeechSynthesis is unavailable', () => {
    vi.stubGlobal('window', {});
    setTTSEnabled(true);
    expect(() => speak('anything')).not.toThrow();
  });
});
