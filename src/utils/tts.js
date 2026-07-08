/**
 * Text-to-Speech helper for vision-impaired mode.
 * Uses the browser SpeechSynthesis API when available; silently no-ops otherwise.
 */

let _enabled = false;

export function setTTSEnabled(enabled) {
  _enabled = Boolean(enabled);
  if (!_enabled) cancelSpeech();
}


function synthesizer() {
  return (typeof window !== 'undefined' && 'speechSynthesis' in window)
    ? window.speechSynthesis
    : null;
}

function utteranceCtor() {
  return (typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window)
    ? window.SpeechSynthesisUtterance
    : null;
}

export function speak(text, { lang = 'en' } = {}) {
  if (!_enabled) return;
  const synth = synthesizer();
  const Utterance = utteranceCtor();
  if (!synth || !Utterance) return;
  const utterance = new Utterance(String(text || ''));
  utterance.lang = lang;
  utterance.rate = 1;
  try {
    synth.cancel();
    synth.speak(utterance);
  } catch {
    // SpeechSynthesis can throw if called too early; ignore.
  }
}

export function cancelSpeech() {
  const synth = synthesizer();
  try {
    synth?.cancel();
  } catch {
    // ignore
  }
}
