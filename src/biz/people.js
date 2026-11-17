export const out = (f, key, v) => {
  if (!(v > 0)) return;
  if (!f.out) f.out = {};
  f.out[key] = (f.out[key] || 0) + v;
};

function parts(f, cb) {
  const o = f.out || {};
  for (const k in f.queue || {}) cb('q', k, [f.queue[k]], o['q:' + k] || 0);
  cb('hold', 'tal', [f.hold || 0], o.hold || 0);
  cb('cash', 'tal', [f.cashQ || 0], o.cash || 0);
  for (const k in f.ride || {}) cb('r', k, f.ride[k], o['r:' + k] || 0);
  for (const k in f.run || {}) cb('p', k, f.run[k], o['p:' + k] || 0);
  for (const k in f.hutQ || {}) cb('hq', k, [f.hutQ[k]], o['hq:' + k] || 0);
  for (const k in f.hut || {}) cb('h', k, f.hut[k], o['h:' + k] || 0);
}

const first = a => Math.ceil(a - 0.5);

export function count(f) {
  if (!f) return 0;
  let n = 0;
  parts(f, (kind, id, arr, o) => {
    let m = 0;
    for (const x of arr) if (x > 0) m += x;
    n += first(o + m) - first(o);
  });
  return n;
}

export function each(f, cb) {
  if (!f) return;
  parts(f, (kind, id, arr, o) => {
    const k0 = first(o);
    let a = o;
    for (let j = 0; j < arr.length; j++) {
      const m = arr[j];
      if (!(m > 0)) continue;
      const b = a + m;
      for (let k = first(a), e = first(b); k < e; k++) cb(kind, id, k, j, (k + 0.5 - a) / m, arr.length, k - k0);
      a = b;
    }
  });
}
