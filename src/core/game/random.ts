/** mulberry32: small deterministic PRNG. Returns a value in [0, 1) and the next seed. */
export function nextRandom(seed: number): [value: number, nextSeed: number] {
  const nextSeed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(nextSeed ^ (nextSeed >>> 15), nextSeed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextSeed];
}

/** Fisher–Yates shuffle driven by `seed`; returns the shuffled copy and the next seed. */
export function shuffle<T>(items: readonly T[], seed: number): [T[], number] {
  const result = [...items];
  let state = seed;
  for (let i = result.length - 1; i > 0; i--) {
    const [value, next] = nextRandom(state);
    state = next;
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return [result, state];
}
