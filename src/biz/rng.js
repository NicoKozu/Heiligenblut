export function next(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const range = (s, a, b) => a + (b - a) * next(s);
export const int = (s, a, b) => Math.floor(range(s, a, b + 1));
export const seed = () => (Math.random() * 4294967296) | 0;
