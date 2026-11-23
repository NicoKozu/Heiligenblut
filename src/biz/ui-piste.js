import * as THREE from 'three';
import { D } from './data.js';
import * as C from './custom.js';
import * as B from './build.js';
import { CSS } from './ui-custom.js';

const PC = D.custom.piste;
const LVC = { leicht: '#5aa2ff', mittel: '#ff5a5a', schwer: '#f2f2f2' };
const LVN = { leicht: 'blau', mittel: 'rot', schwer: 'schwarz' };
const eur = v => Math.round(v).toLocaleString('de-AT') + ' €';
const m = v => Math.round(v).toLocaleString('de-AT') + ' m';
const row = (k, v) => '<div class="r"><span>' + k + '</span><b>' + v + '</b></div>';
const lvl = l => '<span style="color:' + LVC[l] + '">' + LVN[l] + '</span>';

function spline(P, step) {
  if (P.length < 2) return P.map(p => [p[0], p[1]]);
  const d = [];
  for (let i = 0; i + 1 < P.length; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      d.push([0, 1].map(j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  d.push([P[P.length - 1][0], P[P.length - 1][1]]);
  const out = [d[0]];
  let acc = 0;
  for (let i = 1; i < d.length; i++) {
    let a = d[i - 1];
    const b = d[i];
    let l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    while (acc + l >= step) {
      const k = (step - acc) / l, q = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      out.push(q);
      a = q; l = Math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0;
    }
    acc += l;
  }
  const e = d[d.length - 1], o = out[out.length - 1];
  if (Math.hypot(e[0] - o[0], e[1] - o[1]) > step * 0.3) out.push(e); else out[out.length - 1] = e;
  return out;
}

export function createPisteTool({ scene, cam, terrain, pistes, village, props, hud, scenery, crowd, act, note }) {
  const style = document.createElement('style');
  style.textContent = CSS.replaceAll('#biz-cpl', '#biz-ppl').replaceAll('#biz-ctip', '#biz-ptip');
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'biz-ppl';
  panel.hidden = true;
  const tip = document.createElement('div');
  tip.id = 'biz-ptip';
  tip.hidden = true;
  document.body.append(panel, tip);
  const grp = new THREE.Group(), marks = new THREE.Group();
  scene.add(grp, marks);
  const camera = cam.camera;
  let G = null, st = null, mx = 0, my = 0, dx0 = 0, dy0 = 0, pend = false, key3 = '', mkey = '', on = false;
  const have = new Set();

  function ground(x, y) {
    const ndc = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = 0;
    for (let i = 0; i < 2000 && t < 15000; i++) {
      const px = o.x + d.x * t, pz = o.z + d.z * t, py = o.y + d.y * t, h = terrain.heightAt(px, pz);
      if (py <= h) return [px, h, pz];
      t += Math.max(1.5, (py - h) * 0.5);
    }
    return null;
  }

  function joinAt(x, z) {
    const s = C.snap(G, x, z);
    if (s) return { node: s.node };
    const q = pistes.nearest(x, z, PC.join);
    if (!q || !G.pistes[q.p.id] || q.p.unbuilt) return null;
    const sAt = q.p.s[q.i] + q.t * (q.p.s[q.i + 1] - q.p.s[q.i]), P = q.p.pts;
    const px = P[q.i][0] + (P[q.i + 1][0] - P[q.i][0]) * q.t, pz = P[q.i][1] + (P[q.i + 1][1] - P[q.i][1]) * q.t;
    return { piste: q.p, at: [px, pz], s: sAt, len: q.p.len };
  }

  function geo(withHover) {
    const ctrl = st.pts.map(p => [p[0], p[2]]);
    if (withHover && st.hover) ctrl.push([st.hover[0], st.hover[2]]);
    const out = { ctrl, pts: [], forest: 0, blocked: '', pre: null, post: null, j0: null, j1: null };
    if (ctrl.length < 2) return out;
    const j0 = joinAt(...ctrl[0]), j1 = joinAt(...ctrl[ctrl.length - 1]);
    if (j0?.piste) ctrl[0] = j0.at.slice();
    if (j1?.piste) ctrl[ctrl.length - 1] = j1.at.slice();
    out.j0 = j0; out.j1 = j1;
    if (j0?.piste) out.pre = { of: j0.piste.id, upto: j0.at, km: Math.round(j0.s) / 1000 };
    if (j1?.piste) out.post = { of: j1.piste.id, at: j1.at, km: Math.round(j1.len - j1.s) / 1000 };
    const S = spline(ctrl, PC.step);
    let y = S.map(([x, z]) => terrain.heightAt(x, z));
    for (let r = 0; r < 2; r++) y = y.map((_, i) => { const k = Math.min(3, i, y.length - 1 - i); let a = 0; for (let j = i - k; j <= i + k; j++) a += y[j]; return a / (2 * k + 1); });
    out.pts = S.map(([x, z], i) => [x, y[i], z]);
    const w = st.width, n = S.length;
    for (let i = 0; i < n; i++) {
      const [x, z] = S[i], a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
      const f = (terrain.forestAt(x, z) + terrain.forestAt(x + nx * w / 3, z + nz * w / 3) + terrain.forestAt(x - nx * w / 3, z - nz * w / 3)) / 3;
      if (f > 0.2) out.forest += f * w * PC.step;
      if (out.blocked) continue;
      if (!terrain.inside(x, z)) out.blocked = 'außerhalb des Geländes';
      else if (props?.blocked?.(x, z, 2)) out.blocked = 'Trasse über Gebäude';
      else if (i * PC.step > 80 && (n - i) * PC.step > 80 && village?.blocked?.(x, z, 1)) out.blocked = 'Trasse kreuzt Straße';
    }
    return out;
  }

  const req = g => ({ pts: g.pts, width: st.width, name: st.name, pre: g.pre, post: g.post, forest: g.forest, blocked: g.blocked });

  function clear(g) { while (g.children.length) { const o = g.children.pop(); o.geometry?.dispose(); o.material?.dispose?.(); } }

  function draw(g, q) {
    clear(grp);
    const ok = !q?.why, P = g.pts;
    if (P.length > 1) {
      const pr = C.profile(P), pos = [], col = [], c = new THREE.Color();
      for (let i = 0; i + 1 < P.length; i++) {
        c.set(LVC[['leicht', 'mittel', 'schwer'][pr.lv[i]]]);
        pos.push(P[i][0], P[i][1] + 2, P[i][2], P[i + 1][0], P[i + 1][1] + 2, P[i + 1][2]);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const ln = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
      ln.renderOrder = 999;
      grp.add(ln);
      for (const sg of [1, -1]) {
        const e = [];
        for (let i = 0; i < P.length; i++) {
          const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1, x = P[i][0] - (b[2] - a[2]) / l * st.width / 2 * sg, z = P[i][2] + (b[0] - a[0]) / l * st.width / 2 * sg;
          e.push(new THREE.Vector3(x, terrain.heightAt(x, z) + 1.5, z));
        }
        const el = new THREE.Line(new THREE.BufferGeometry().setFromPoints(e), new THREE.LineBasicMaterial({ color: ok ? 0x7be07b : 0xff6b5a, depthTest: false, transparent: true, opacity: 0.8 }));
        el.renderOrder = 999;
        grp.add(el);
      }
    }
    for (const [x, z] of g.ctrl) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshBasicMaterial({ color: ok ? 0x7be07b : 0xff6b5a, depthTest: false, transparent: true, opacity: 0.7 }));
      b.position.set(x, terrain.heightAt(x, z) + 3, z);
      b.renderOrder = 999;
      grp.add(b);
    }
  }

  const joinTxt = j => !j ? '<span style="opacity:.7">frei</span>' : j.node ? D.nodes[j.node] : 'Piste ' + j.piste.id;

  function refresh() {
    pend = false;
    if (!st) return;
    const gh = geo(true), g = st.pts.length >= 2 ? geo(false) : gh;
    st.g = g;
    st.q = g.pts.length > 1 ? C.pquote(G, req(g)) : null;
    const qh = gh === g ? st.q : gh.pts.length > 1 ? C.pquote(G, req(gh)) : null;
    draw(gh, qh);
    tip.hidden = !st.hover;
    if (!tip.hidden) {
      const j = joinAt(st.hover[0], st.hover[2]);
      tip.innerHTML = (qh ? m(qh.len) + ' · ' + m(qh.drop) + ' Hm · ' + lvl(qh.level) + ' · ' + eur(qh.price) : st.pts.length ? '' : 'Start') + (j ? ' · <span style="color:#7be07b">an ' + (j.node ? D.nodes[j.node] : 'Piste ' + j.piste.id) + '</span>' : '') + (qh?.why ? '<br><span style="color:#ff6b5a">' + qh.why + '</span>' : '');
      tip.style.left = mx + 16 + 'px';
      tip.style.top = my + 12 + 'px';
    }
    renderPanel();
  }

  function renderPanel() {
    if (!st) { panel.hidden = true; return; }
    const q = st.q, n = st.pts.length;
    const step = n === 0 ? 'Klick: Start an Bergstation oder Piste' : n === 1 ? 'Klick: Punkte setzen, letzter Punkt = Ende an Station, Lift oder Piste' : 'Weitere Punkte setzen · Enter bauen';
    let h = '<h4>Piste zeichnen<button data-c="x">✕</button></h4><div class="step">' + step + '<br><small>Rechtsklick: letzten Punkt entfernen · Esc: abbrechen</small></div>';
    h += '<label>Name<input type="text" data-c="name" value="' + (st.name || '').replace(/"/g, '') + '"></label>' + row('Breite', st.width + ' m') + '<input type="range" data-c="width" min="' + PC.width[0] + '" max="' + PC.width[1] + '" step="5" value="' + st.width + '">';
    if (q) {
      const seg = [0, 0, 0];
      const P = st.g.pts;
      q.lv.forEach((v, i) => { seg[v] += Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][2] - P[i][2]); });
      h += row('Länge · Höhe', m(q.len) + ' · ' + m(q.drop) + ' Hm') + row('Gefälle max.', Math.round(q.max * 100) + ' %') + row('Schwierigkeit', lvl(q.level)) +
        row('Abschnitte', ['leicht', 'mittel', 'schwer'].map((l, i) => seg[i] > 1 ? '<span style="color:' + LVC[l] + '">' + m(seg[i]) + '</span>' : '').filter(Boolean).join(' · ')) +
        row('Anschluss', joinTxt(st.g.j0) + ' → ' + joinTxt(st.g.j1)) +
        (q.from && q.to ? row('Netz', D.nodes[q.from] + ' → ' + D.nodes[q.to]) : '') +
        row('Rodung', Math.round(q.forest).toLocaleString('de-AT') + ' m²');
      h += '<div style="margin-top:6px">' + row('Piste', eur(q.parts.piste)) + (q.parts.clear ? row('Rodung', eur(q.parts.clear)) : '') + row('<b>Gesamt</b>', eur(q.price)) + '</div>';
      h += q.why ? '<div class="bad" style="margin-top:6px">' + q.why + '</div>' : '<div class="good" style="margin-top:6px">gültig – fertig über Nacht</div>';
    }
    h += '<div class="a"><button class="p" data-c="ok"' + (q && !q.why ? '' : ' disabled') + '>Bauen</button><button data-c="x">Abbrechen</button></div>';
    if (panel.dataset.h !== h) {
      const f = document.activeElement, k = f && panel.contains(f) ? f.dataset.c : null, sel = k && f.selectionStart;
      panel.innerHTML = h;
      panel.dataset.h = h;
      if (k) { const e = panel.querySelector('[data-c="' + k + '"]'); if (e) { e.focus(); if (sel != null && e.setSelectionRange) e.setSelectionRange(sel, sel); } }
    }
    panel.hidden = false;
  }

  panel.addEventListener('keydown', e => { e.stopPropagation(); if (e.code === 'Enter' && e.target.dataset.c !== 'width') confirm(); if (e.code === 'Escape') cancel(); });
  panel.addEventListener('keyup', e => e.stopPropagation());
  panel.addEventListener('input', e => {
    const k = e.target.dataset.c;
    if (k === 'name') st.name = e.target.value;
    else if (k === 'width') st.width = Number(e.target.value);
    else return;
    refresh();
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.c === 'x') cancel();
    else if (b.dataset.c === 'ok') confirm();
  });
  panel.addEventListener('mousedown', e => e.stopPropagation());

  function suggest() {
    const p = st.pts[0];
    let best = null;
    for (const q of Object.values(terrain.pois)) { const d = Math.hypot(q.x - p[0], q.z - p[2]); if (d < 2000 && (!best || d < best.d)) best = { n: q.name.replace(/^(Talstation|Mittelstation|Bergstation) /, ''), d }; }
    return (best ? best.n : 'Neue') + 'abfahrt';
  }

  function start() {
    if (!G?.open) return false;
    if (cam.mode !== 'fly') cam.startFly();
    st = { pts: [], hover: null, name: '', width: PC.def };
    refresh();
    return true;
  }
  function cancel() { st = null; clear(grp); tip.hidden = true; panel.hidden = true; panel.dataset.h = ''; }
  function confirm() {
    if (!st || !st.q || st.q.why) return;
    const g = geo(false), id = C.pplace(G, req(g));
    if (id) { const nm = st.name; cancel(); act('custom:built'); note('Piste ' + nm + ' beauftragt – fertig über Nacht', 3); }
    else refresh();
  }

  const mine = e => st && e.target.tagName === 'CANVAS' && !document.body.classList.contains('menu');
  addEventListener('keydown', e => {
    if (!st || document.body.classList.contains('menu')) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); confirm(); }
  }, true);
  addEventListener('mousedown', e => { dx0 = e.clientX; dy0 = e.clientY; if (mine(e) && e.button === 2) { e.stopPropagation(); st.pts.pop(); refresh(); } }, true);
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (!mine(e)) return;
    st.hover = ground(mx, my);
    if (!pend) { pend = true; setTimeout(refresh, 80); }
  }, true);
  addEventListener('click', e => {
    if (!mine(e) || e.button) return;
    e.stopPropagation();
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 5) return;
    const p = ground(e.clientX, e.clientY);
    if (!p || st.pts.length >= 60) return;
    st.pts.push(p);
    if (st.pts.length === 1 && !st.name) st.name = suggest();
    refresh();
  }, true);
  addEventListener('dblclick', e => { if (mine(e)) e.stopPropagation(); }, true);

  const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };

  function sync3d(g, active) {
    G = g;
    const want = active && G ? G.custom.pistes.filter(p => B.done(G, p.id)) : [];
    const k = want.map(p => p.id).join();
    if (k !== key3) {
      key3 = k;
      const ids = new Set(want.map(p => p.id));
      for (const id of [...have]) if (!ids.has(id)) { pistes.removeCustom(id); have.delete(id); }
      for (const p of want) if (!have.has(p.id) && pistes.addCustom({ id: p.id, name: p.name, level: p.level, width: p.width, pts: p.pts.map(v => [v[0], v[2]]) })) have.add(p.id);
      crowd?.repath?.();
      const T = want.map(p => { const pts = p.pts.map(v => [v[0], v[2]]), r = p.width / 2 + 4, box = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, z] of pts) { box[0] = Math.min(box[0], x - r); box[1] = Math.min(box[1], z - r); box[2] = Math.max(box[2], x + r); box[3] = Math.max(box[3], z + r); } return { pts, r, box }; });
      scenery?.cut?.('cpiste', T.length ? (x, z) => T.some(t => x > t.box[0] && x < t.box[2] && z > t.box[1] && z < t.box[3] && t.pts.some((a, i) => i && segDist(x, z, t.pts[i - 1], a) < t.r)) : null);
    }
    const mk = active && G ? G.custom.pistes.map(p => p.id + (B.done(G, p.id) ? 1 : 0)).join() : '';
    if (mk !== mkey) {
      mkey = mk;
      clear(marks);
      const L = [];
      if (active && G) for (const p of G.custom.pistes) {
        const d = !B.done(G, p.id), pts = p.pts.filter((_, i) => i % 3 === 0 || i === p.pts.length - 1);
        L.push({ pts: pts.map(v => [v[0], v[2]]), color: LVC[p.level], dash: d, w: 1.2 });
        if (!d) continue;
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(v => new THREE.Vector3(v[0], v[1] + 3, v[2]))), new THREE.LineDashedMaterial({ color: LVC[p.level], dashSize: 12, gapSize: 8, depthTest: false, transparent: true }));
        ln.computeLineDistances();
        ln.renderOrder = 998;
        marks.add(ln);
      }
      hud?.lines?.(L, 'piste');
    }
    marks.visible = on;
  }

  function tab(G2, h) {
    if (!G2.open) return '';
    const own = C.custPistes(G2);
    let s = '<h2>Neue Piste zeichnen</h2><p class="note">Öffnet den Flugmodus: Start an einer Bergstation oder Piste anklicken, Kurvenpunkte setzen, Ende an Talstation, Lift oder Piste. Schwierigkeit automatisch aus dem Gefälle (blau ≤ ' + Math.round(PC.steep[0] * 100) + ' %, rot ≤ ' + Math.round(PC.steep[1] * 100) + ' %, schwarz darüber). ' + h.eur(PC.base) + ' + ' + PC.perM + ' €/m bei ' + PC.wRef + ' m Breite, Rodung ' + PC.clearM2.toLocaleString('de-AT') + ' €/m².</p><p><button class="btn primary" data-act="pplace">Piste zeichnen</button></p>';
    s += '<h2>Eigene Pisten (' + own.length + '/' + PC.max + ')</h2>';
    if (!own.length) return s + '<p class="note">Noch keine eigenen Pisten.</p>';
    s += '<table>';
    for (const p of own) {
      const why = C.canDemolishPiste(G2, p.id), r = C.prefundOf(G2, p.id);
      s += h.tr('<b>' + p.id + ' ' + p.name + '</b><br><small style="opacity:.75">' + lvl(p.level) + ' · ' + m(p.km * 1000) + ' · ' + p.width + ' m · ' + D.nodes[p.from] + ' → ' + D.nodes[p.to] + '</small>',
        (p.job ? '<span class="biz-warn">im Bau</span>' : '<span class="biz-good">offen</span>') + ' <button class="btn" data-act="pdemo:' + p.id + '"' + (why ? ' disabled title="' + why + '"' : '') + '>' + (p.job ? 'Stornieren ' : 'Abriss +') + h.eur(r) + '</button>');
    }
    return s + '</table>';
  }

  return {
    start, cancel, sync: sync3d, tab,
    get active() { return !!st; },
    setOn(v) { on = v; marks.visible = v; },
    update(g) { G = g; if (st && cam.mode !== 'fly') cancel(); }
  };
}
