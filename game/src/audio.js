// Synthesized sound for The Velvet Fox, built only with WebAudio.
// No audio files are shipped: every effect is an oscillator or a
// short burst of filtered noise, created lazily on the first user
// gesture so browsers allow it.

export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    master: null,
    // Last time a footstep tick played, to keep steps spaced out.
    lastStepAt: 0,
  };
  return audio;
}

/** Create the AudioContext on first use (needs a user gesture). */
export function ensureAudio(audio) {
  if (audio.ctx !== null) {
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
    return;
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
  } catch (err) {
    audio.ctx = null;
  }
}

/** Toggle mute; returns the new muted state. */
export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
  return audio.muted;
}

function tone(audio, freq, seconds, type, volume, when = 0, slideTo = null) {
  if (!audio.ctx || audio.muted || !audio.master) return;
  const start = audio.ctx.currentTime + when;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + seconds);
  }
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

function noiseBurst(audio, seconds, volume, cutoff, when = 0) {
  if (!audio.ctx || audio.muted || !audio.master) return;
  const start = audio.ctx.currentTime + when;
  const length = Math.max(1, Math.floor(audio.ctx.sampleRate * seconds));
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = audio.ctx.createBufferSource();
  source.buffer = buffer;
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start(start);
}

/** A soft footstep tick; the game spaces these by distance walked. */
export function playStep(audio, sneaking) {
  if (!audio.ctx || audio.muted) return;
  const now = audio.ctx.currentTime;
  if (now - audio.lastStepAt < 0.24) return;
  audio.lastStepAt = now;
  noiseBurst(audio, 0.07, sneaking ? 0.05 : 0.12, sneaking ? 500 : 900);
}

/** A bright two-note chime when loot is pocketed. */
export function playPickup(audio) {
  tone(audio, 880, 0.12, 'sine', 0.22);
  tone(audio, 1318, 0.2, 'sine', 0.18, 0.09);
}

/** The sharp sting when a guard's suspicion fills and the chase starts. */
export function playAlert(audio) {
  tone(audio, 220, 0.16, 'square', 0.14, 0, 330);
  tone(audio, 330, 0.22, 'square', 0.12, 0.12, 440);
}

/** A low thud when the fox is caught. */
export function playCaught(audio) {
  tone(audio, 160, 0.5, 'sawtooth', 0.2, 0, 55);
  noiseBurst(audio, 0.3, 0.18, 400);
}

/** A little rising arpeggio for a clean getaway. */
export function playWin(audio) {
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => tone(audio, freq, 0.22, 'triangle', 0.2, i * 0.11));
}

/** The clink of a pebble landing and rolling. */
export function playPebble(audio) {
  tone(audio, 1900, 0.05, 'square', 0.08);
  tone(audio, 1400, 0.07, 'square', 0.06, 0.09);
  tone(audio, 1100, 0.09, 'square', 0.05, 0.2);
}

/** A short rising blip when the exit door unlocks. */
export function playUnlock(audio) {
  tone(audio, 660, 0.12, 'triangle', 0.18);
  tone(audio, 990, 0.18, 'triangle', 0.18, 0.1);
}
