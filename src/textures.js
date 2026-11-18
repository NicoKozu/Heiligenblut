import * as THREE from 'three';

function rng(s) {
  return () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function canvas(n, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  draw(c.getContext('2d'), n);
  return c;
}

function tex(c, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function grain(g, r, x, y, w, h, base, dark, n) {
  for (let i = 0; i < n; i++) {
    const yy = y + r() * h, a = 0.05 + r() * 0.12;
    g.strokeStyle = `rgba(${dark},${a})`;
    g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath();
    g.moveTo(x, yy);
    for (let k = 1; k <= 8; k++) g.lineTo(x + w * k / 8, yy + Math.sin(k * 0.9 + r() * 6) * h * 0.04);
    g.stroke();
  }
}

function logs(seed, tone) {
  const r = rng(seed), rows = 8;
  const draw = (bump) => canvas(512, (g, n) => {
    const h = n / rows;
    for (let i = 0; i < rows; i++) {
      const y = i * h, k = 0.85 + r() * 0.3;
      const grd = g.createLinearGradient(0, y, 0, y + h);
      if (bump) { grd.addColorStop(0, '#222'); grd.addColorStop(0.15, '#aaa'); grd.addColorStop(0.5, '#fff'); grd.addColorStop(0.85, '#aaa'); grd.addColorStop(1, '#222'); }
      else {
        const c = tone.map(v => Math.round(v * k));
        grd.addColorStop(0, `rgb(${c.map(v => v * 0.45 | 0)})`); grd.addColorStop(0.18, `rgb(${c})`);
        grd.addColorStop(0.55, `rgb(${c.map(v => Math.min(255, v * 1.12 | 0))})`); grd.addColorStop(0.88, `rgb(${c.map(v => v * 0.8 | 0)})`); grd.addColorStop(1, `rgb(${c.map(v => v * 0.35 | 0)})`);
      }
      g.fillStyle = grd;
      g.fillRect(0, y, n, h);
      if (!bump) {
        grain(g, r, 0, y + h * 0.15, n, h * 0.7, 0, '30,18,8', 26);
        for (let j = 0; j < 3; j++) { g.fillStyle = 'rgba(40,24,10,0.35)'; g.beginPath(); g.ellipse(r() * n, y + h * (0.3 + r() * 0.4), 3 + r() * 5, 2 + r() * 2, 0, 0, 7); g.fill(); }
      }
    }
  });
  return { map: tex(draw(false), true), bump: tex(draw(true)) };
}

function planks(seed, tone) {
  const r = rng(seed);
  return tex(canvas(256, (g, n) => {
    const cols = 6, w = n / cols;
    for (let i = 0; i < cols; i++) {
      const k = 0.8 + r() * 0.35, c = tone.map(v => Math.round(v * k));
      g.fillStyle = `rgb(${c})`;
      g.fillRect(i * w, 0, w, n);
      g.save(); g.translate(i * w, 0); g.rotate(Math.PI / 2); g.translate(0, -w);
      grain(g, r, 0, 0, n, w, 0, '25,14,6', 14);
      g.restore();
      g.fillStyle = 'rgba(15,8,3,0.7)';
      g.fillRect(i * w, 0, 2, n);
    }
  }), true);
}

function stones(seed) {
  const draw = bump => canvas(256, (g, n) => {
    g.fillStyle = bump ? '#000' : '#5d5a55';
    g.fillRect(0, 0, n, n);
    const rr = rng(seed);
    for (let i = 0; i < 70; i++) {
      const x = rr() * n, y = rr() * n, w = 18 + rr() * 26, h = 12 + rr() * 16, v = 105 + rr() * 60;
      for (const dx of [-n, 0, n]) for (const dy of [-n, 0, n]) {
        g.fillStyle = bump ? `rgb(${190 + rr() * 60 | 0},0,0)` : `rgb(${v | 0},${v * 0.97 | 0},${v * 0.92 | 0})`;
        g.beginPath(); g.ellipse(x + dx, y + dy, w / 2, h / 2, rr() * 0.6 - 0.3, 0, 7); g.fill();
      }
    }
  });
  return { map: tex(draw(false), true), bump: tex(draw(true)) };
}

function shingles(seed) {
  const r = rng(seed);
  return tex(canvas(256, (g, n) => {
    g.fillStyle = '#2c2420';
    g.fillRect(0, 0, n, n);
    const rows = 10, h = n / rows;
    for (let i = 0; i < rows; i++) {
      const off = i % 2 ? 0.5 : 0, w = n / 8;
      for (let j = -1; j < 9; j++) {
        const v = 55 + r() * 35;
        g.fillStyle = `rgb(${v | 0},${v * 0.86 | 0},${v * 0.74 | 0})`;
        g.fillRect((j + off) * w + 1, i * h + 1, w - 2, h - 1);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect((j + off) * w + 1, i * h + h - 3, w - 2, 3);
      }
    }
  }), true);
}

let cache = null;
export function materials() {
  if (cache) return cache;
  const L = logs(11, [128, 84, 50]), D = logs(23, [96, 62, 38]), S = stones(5);
  const lam = o => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
  cache = {
    log: lam({ map: L.map, bumpMap: L.bump, bumpScale: 0.8 }),
    logDark: lam({ map: D.map, bumpMap: D.bump, bumpScale: 0.8 }),
    stone: lam({ map: S.map, bumpMap: S.bump, bumpScale: 0.8 }),
    plank: lam({ map: planks(7, [150, 104, 64]) }),
    plankDark: lam({ map: planks(9, [92, 60, 36]) }),
    shingle: lam({ map: shingles(3), roughness: 0.95 })
  };
  return cache;
}

export function worldUV(geo, tile = 2, swap = false) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, (swap ? z : x) / tile, (swap ? x : z) / tile);
    else if (ax >= az) uv.setXY(i, z / tile, y / tile);
    else uv.setXY(i, x / tile, y / tile);
  }
  uv.needsUpdate = true;
  return geo;
}
