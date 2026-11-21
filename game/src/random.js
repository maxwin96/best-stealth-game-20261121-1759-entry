// A tiny seeded random generator (mulberry32) so the screenshot
// autopilot and any shuffled detail play the same way for one seed.
// Gameplay itself does not depend on randomness for its rules;
// the seed only steadies the deterministic shot modes.

export function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a value in [min, max) from a seeded generator. */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** Shuffle a copy of an array with a seeded generator. */
export function shuffle(rng, items) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
