import * as THREE from 'three';

const fmt = n => n.toLocaleString('de-AT');

export function createPeakLabels(pano) {
  const root = document.createElement('div');
  root.id = 'peaks';
  document.body.appendChild(root);
  const v = new THREE.Vector3();
  const items = pano.peaks.map(p => {
    const el = document.createElement('div');
    el.className = 'peak';
    el.innerHTML = '<b>' + p.name + '</b><span></span><i></i>';
    root.appendChild(el);
    return { p, el, info: el.querySelector('span'), seen: false, on: false, km: '' };
  });
  let show = true, rr = 0;

  function toggle() {
    show = !show;
    root.style.display = show ? '' : 'none';
    return show;
  }

  function update(cam) {
    if (!show) return;
    const w = innerWidth, h = innerHeight, c = cam.position;
    const it = items[rr++ % items.length];
    it.seen = pano.visibleFrom(cam, it.p);
    const placed = [];
    const vis = [];
    for (const o of items) {
      const D = Math.hypot(o.p.x - c.x, o.p.z - c.z);
      v.set(o.p.x, o.p.y - D * D * pano.earth, o.p.z).project(cam);
      const sx = (v.x + 1) / 2 * w, sy = (1 - v.y) / 2 * h;
      const ok = o.seen && D > 400 && v.z < 1 && sx > -80 && sx < w + 80 && sy > 40 && sy < h;
      if (ok) vis.push({ o, sx, sy, D });
      else if (o.on) { o.on = false; o.el.classList.remove('on'); }
    }
    vis.sort((a, b) => b.o.p.h - a.o.p.h);
    for (const q of vis) {
      const km = (q.D / 1000).toFixed(q.D < 10000 ? 1 : 0).replace('.', ',');
      if (km !== q.o.km) { q.o.km = km; q.o.info.textContent = fmt(q.o.p.h) + ' m · ' + km + ' km'; }
      const bw = q.o.el.offsetWidth || 120;
      let lift = 0;
      for (let k = 0; k < 4; k++) {
        const top = q.sy - 54 - lift;
        if (!placed.some(r => Math.abs(r.x - q.sx) < (r.w + bw) / 2 + 6 && Math.abs(r.y - top) < 34)) break;
        lift += 34;
      }
      placed.push({ x: q.sx, y: q.sy - 54 - lift, w: bw });
      q.o.el.style.transform = 'translate(' + q.sx.toFixed(1) + 'px,' + q.sy.toFixed(1) + 'px)';
      q.o.el.style.setProperty('--stem', (42 + lift) + 'px');
      if (!q.o.on) { q.o.on = true; q.o.el.classList.add('on'); }
    }
  }

  return { update, toggle };
}
