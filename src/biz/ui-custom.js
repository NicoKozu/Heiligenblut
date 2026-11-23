import * as THREE from 'three';
import { D } from './data.js';
import * as C from './custom.js';
import * as B from './build.js';
import { buildSection } from '../lift.js';

export const CSS = `
#biz-cpl{position:fixed;left:14px;top:64px;z-index:22;width:300px;max-height:calc(100vh - 90px);overflow:auto;background:rgba(12,20,30,.9);color:#dfe8f2;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;font:13px system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.4)}
#biz-cpl h4{margin:0 0 6px;font-size:15px;color:#fff;display:flex;justify-content:space-between}
#biz-cpl .r{display:flex;justify-content:space-between;gap:8px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.06)}
#biz-cpl .r span{opacity:.75}
#biz-cpl .step{background:rgba(90,162,255,.15);border-radius:6px;padding:5px 8px;margin:4px 0 8px}
#biz-cpl .bad{color:#ff6b5a}#biz-cpl .good{color:#7be07b}#biz-cpl .link{color:#ff8a1e}
#biz-cpl input[type=text]{width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:5px;padding:3px 6px;font:inherit;margin:2px 0 6px}
#biz-cpl input[type=range]{width:100%}
#biz-cpl .a{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
#biz-cpl button{font:inherit;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:4px 10px;cursor:pointer}
#biz-cpl button.p{background:#2f6fd0;border-color:#5aa2ff}
#biz-cpl button:disabled{opacity:.4;cursor:default}
#biz-ctip{position:fixed;z-index:23;pointer-events:none;background:rgba(12,20,30,.85);color:#fff;font:12px system-ui,sans-serif;padding:3px 7px;border-radius:5px;white-space:nowrap}
`;

const eur = v => Math.round(v).toLocaleString('de-AT') + ' €';
const m = v => Math.round(v).toLocaleString('de-AT') + ' m';
const row = (k, v) => '<div class="r"><span>' + k + '</span><b>' + v + '</b></div>';
const GOOD = 0x7be07b, BAD = 0xff6b5a, PLAN = 0x5aa2ff, LINK = 0xff8a1e;

export function createCustom({ scene, cam, terrain, lift, village, props, hud, scenery, act, note }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'biz-cpl';
  panel.hidden = true;
  const tip = document.createElement('div');
  tip.id = 'biz-ctip';
  tip.hidden = true;
  document.body.append(panel, tip);
  const grp = new THREE.Group(), marks = new THREE.Group();
  scene.add(grp, marks);
  const camera = cam.camera;
  let G = null, st = null, mx = 0, my = 0, dx0 = 0, dy0 = 0, pend = false, tAcc = 0, mkey = '', ckey = '', on = false;
  const bases = new Map();
  const lineMat = c => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: 0.95 });
  const ghostMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, depthTest: false });

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

  const live = () => lift.sections.filter(s => !s.tunnel);
  const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const blockedAt = (x, z, r) => village?.blocked?.(x, z, r) || props?.blocked?.(x, z, r);

  function lotOf(p, q, spots) {
    const W = Math.min(120, Math.max(40, Math.sqrt(spots * 25 * 1.4))), rows = Math.ceil(spots / (2 * Math.floor(W / 2.5))), L = rows * 16 + 4;
    const h = Math.hypot(q[0] - p[0], q[2] - p[2]) || 1, dx = (q[0] - p[0]) / h, dz = (q[2] - p[2]) / h, off = 22 + L / 2;
    return { c: [p[0] - dx * off, p[2] - dz * off], dx, dz, W, L, rows };
  }
  const lotPts = (lt, k = 1) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [lt.c[0] + (-lt.dz * u * lt.W / 2 + lt.dx * v * lt.L / 2) * k, lt.c[1] + (lt.dx * u * lt.W / 2 + lt.dz * v * lt.L / 2) * k]);
  function roadTo(lt) {
    let best = null;
    for (const r of village?.roads || []) for (const p of r[3]) { const d = Math.hypot(p[0] - lt.c[0], p[1] - lt.c[1]); if (!best || d < best.d) best = { p, d }; }
    if (!best) return null;
    const e = lotPts(lt).reduce((a, q) => Math.hypot(q[0] - best.p[0], q[1] - best.p[1]) < Math.hypot(a[0] - best.p[0], a[1] - best.p[1]) ? q : a);
    return { a: [(e[0] + lt.c[0]) / 2 + (e[0] - lt.c[0]) * 0.5, (e[1] + lt.c[1]) / 2 + (e[1] - lt.c[1]) * 0.5], b: best.p, len: Math.hypot(best.p[0] - e[0], best.p[1] - e[1]) };
  }

  function geo(s, hv) {
    const t = D.custom.types[s.type], pts = s.pts.slice(), out = { blocked: '', forest: 0, maxSlope: 0, towers: 0, secs: [] };
    if (hv && s.hover && pts.length < (t.mid ? 3 : 2) && !s.done) pts.push(s.hover);
    out.pts = pts;
    if (pts.length < 2) return out;
    const snaps = pts.map((p, i) => (i === 0 || i === pts.length - 1) && C.snap(G, p[0], p[2]));
    const ends = [...live(), ...lift.planned.filter(x => x.custom && !lift.sections.includes(x))].flatMap(x => [x.a, x.b]);
    pts.forEach((p, i) => {
      if (out.blocked) return;
      if (!terrain.inside(p[0], p[2])) out.blocked = 'außerhalb des Geländes';
      else if (blockedAt(p[0], p[2], 6)) out.blocked = 'Station auf Straße oder Gebäude';
      else { const d = Math.min(...ends.map(e => Math.hypot(e[0] - p[0], e[1] - p[2]))); if (d < (snaps[i] ? 24 : 60)) out.blocked = 'zu nah an bestehender Station'; }
    });
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], h = Math.hypot(b[0] - a[0], b[2] - a[2]);
      for (let d = 0; d <= h; d += 5) {
        const k = d / h, x = a[0] + (b[0] - a[0]) * k, z = a[2] + (b[2] - a[2]) * k;
        if (terrain.forestAt(x, z) > 0.35) out.forest += 5;
        if (out.blocked || d < 30 || d > h - 30) continue;
        if (t.drag && props?.blocked?.(x, z, 2)) out.blocked = 'Schlepptrasse über Gebäude';
        else if (t.drag && village?.blocked?.(x, z, 1)) out.blocked = 'Schlepptrasse kreuzt Straße';
        else if (t.drag && d % 10 === 0) { const s2 = Math.abs(terrain.heightAt(x + (b[0] - a[0]) / h * 10, z + (b[2] - a[2]) / h * 10) - terrain.heightAt(x, z)) / 10; out.maxSlope = Math.max(out.maxSlope, s2); }
        if (!out.blocked && d % 10 === 0) for (const sc of live()) if (segDist(x, z, sc.a, sc.b) < 14) { out.blocked = 'zu nah an ' + sc.name; break; }
      }
      if (h > 20 && h < 6000) {
        const sec = buildSection({ id: '_p', a: [a[0], a[2]], b: [b[0], b[2]], drag: t.drag, h: t.h }, terrain, [a[1], b[1]], []);
        out.towers += sec.towers.length;
        if (!out.blocked && !t.drag) { const tw = sec.towers.find(w => props?.blocked?.(w.x, w.z, 4)); if (tw) out.blocked = 'Stütze auf Gebäude oder Straße – Trasse leicht verschieben'; }
        out.secs.push(sec);
      }
    }
    return out;
  }

  function baseReq(s, gq) {
    if (!s.base.on || !gq.canBase || s.pts.length < 2) return null;
    const p = s.pts[0], q = s.pts[1], lt = lotOf(p, q, s.base.spots), rd = roadTo(lt);
    let why = '';
    for (const c of lotPts(lt, 0.9)) if (!terrain.inside(c[0], c[1]) || props?.blocked?.(c[0], c[1], 1)) why = 'Parkplatz auf Gebäude/außerhalb';
    if (!why && !rd) why = 'keine Straße gefunden';
    if (!why && rd.len > D.custom.base.maxRoad) why = 'nächste Straße zu weit (' + m(rd.len) + ')';
    return { name: s.base.name, spots: s.base.spots, roadLen: rd?.len || 0, why, lot: { c: lt.c, dx: lt.dx, dz: lt.dz, W: lt.W, L: lt.L }, road: rd ? [rd.a, rd.b] : null };
  }

  function req(s, g) {
    const r = { type: s.type, pts: g.pts, forest: g.forest, towers: g.towers, maxSlope: g.maxSlope, blocked: g.blocked, name: s.name };
    const q0 = C.quote(G, r);
    const b = baseReq({ ...s, pts: g.pts }, q0);
    if (b) r.base = b;
    return r;
  }

  function suggest(s) {
    const t = D.custom.types[s.type], p = s.pts[s.pts.length - 1];
    let best = null;
    for (const q of Object.values(terrain.pois)) { const d = Math.hypot(q.x - p[0], q.z - p[2]); if (d < 1500 && (!best || d < best.d)) best = { n: q.name.replace(/^(Talstation|Mittelstation|Bergstation) /, ''), d }; }
    return t.label + ' ' + (best ? best.n : (G.custom.n + 1));
  }

  function clear(g) { while (g.children.length) { const o = g.children.pop(); o.geometry?.dispose(); } }

  function draw(g, q) {
    clear(grp);
    const col = q.why ? BAD : GOOD, lm = lineMat(col), gm = ghostMat(col), t = D.custom.types[st.type];
    for (const sec of g.secs) {
      const up = sec.pts.slice(0, Math.floor(sec.pts.length / 2) - 3);
      const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(up), lm);
      ln.renderOrder = 999;
      grp.add(ln);
      const tw = [];
      for (const w of sec.towers) tw.push(new THREE.Vector3(w.x, w.g, w.z), new THREE.Vector3(w.x, w.y, w.z));
      if (tw.length) { const ls = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tw), lm); ls.renderOrder = 999; grp.add(ls); }
    }
    g.pts.forEach((p, i) => {
      const n = g.pts[Math.min(i + 1, g.pts.length - 1)], o = g.pts[Math.max(0, i - 1)], hd = Math.atan2(n[0] - o[0], n[2] - o[2]);
      const b = new THREE.Mesh(new THREE.BoxGeometry(t.drag ? 4 : 13, t.drag ? 3 : 7, t.drag ? 4 : 22), gm);
      b.position.set(p[0], p[1] + (t.drag ? 1.5 : 3.5), p[2]);
      b.rotation.y = hd;
      b.renderOrder = 999;
      grp.add(b);
    });
    const rb = st.req?.base;
    if (rb?.lot) {
      const lt = rb.lot, y = terrain.heightAt(...lt.c) + 1, pl = lotPts(lt).map(c => new THREE.Vector3(c[0], y, c[1]));
      const ln = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pl), lineMat(rb.why ? BAD : PLAN));
      ln.renderOrder = 999;
      grp.add(ln);
      if (rb.road) { const r = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rb.road.map(c => new THREE.Vector3(c[0], terrain.heightAt(c[0], c[1]) + 1, c[1]))), lineMat(PLAN)); r.renderOrder = 999; grp.add(r); }
    }
  }

  function refresh() {
    pend = false;
    if (!st) return;
    const gh = geo(st, true), g = st.pts.length >= 2 ? geo(st, false) : gh, r = req(st, g), q = C.quote(G, r);
    st.g = g; st.req = r; st.q = q;
    const qh = gh === g ? q : C.quote(G, req(st, gh));
    draw(gh, qh);
    const hv = st.hover && !st.done ? C.snap(G, st.hover[0], st.hover[2]) : null;
    tip.hidden = !st.hover || st.done;
    if (!tip.hidden) {
      tip.innerHTML = (st.pts.length ? (gh.pts.length > 1 ? m(qh.len) + ' · ' + m(qh.rise) + ' Hm · ' + eur(qh.price) : '') : 'Talstation') + (hv ? ' · <span style="color:#7be07b">an ' + D.nodes[hv.node] + '</span>' : '') + (qh.why && gh.pts.length > 1 ? '<br><span style="color:#ff6b5a">' + qh.why + '</span>' : '');
      tip.style.left = mx + 16 + 'px';
      tip.style.top = my + 12 + 'px';
    }
    renderPanel();
  }

  function renderPanel() {
    if (!st) { panel.hidden = true; return; }
    const t = D.custom.types[st.type], q = st.q, n = st.pts.length, maxP = t.mid ? 3 : 2;
    const step = n === 0 ? 'Klick: Talstation setzen' : n === 1 ? 'Klick: Bergstation setzen' : n < maxP && !st.done ? 'Klick: weiterer Punkt = bisheriger Berg wird Mittelstation · Enter bauen' : 'Enter oder „Bauen“';
    let h = '<h4>' + t.label + ' bauen<button data-c="x">✕</button></h4><div class="step">' + step + '<br><small>Rechtsklick: letzten Punkt entfernen · Esc: abbrechen</small></div>';
    if (n >= 2 && q) {
      h += '<label>Name<input type="text" data-c="name" value="' + (st.name || '').replace(/"/g, '') + '"></label>';
      h += row('Länge · Höhe', m(q.len) + ' · ' + m(q.rise) + ' Hm') + row('Fahrzeit', q.ride.map(v => v.toLocaleString('de-DE') + ' min').join(' + ')) +
        row('Förderleistung', q.cap.toLocaleString('de-AT') + ' P/h · ' + t.places + ' je ' + t.gap + ' s') + row('Stützen', st.g.towers) +
        row('Strom · Personal', q.kw + ' kW · ' + q.staff) + row('Wartung je Tag', eur(q.maint)) +
        row('Anschluss', (q.from ? D.nodes[q.from] : '<span style="opacity:.7">frei</span>') + ' → ' + (q.to ? D.nodes[q.to] : '<span style="opacity:.7">frei</span>')) +
        (q.link ? row('Verbindungslift', '<span class="link">⇄ ' + q.areas.join(' – ') + '</span>') : '');
      if (q.canBase) {
        h += '<div style="margin-top:6px"><label><input type="checkbox" data-c="base"' + (st.base.on ? ' checked' : '') + '> Tallift: Talstation mit Kassa + Parkplatz</label></div>';
        if (st.base.on) h += '<label>Name Talstation<input type="text" data-c="bname" value="' + (st.base.name || '').replace(/"/g, '') + '"></label>' + row('Stellplätze', st.base.spots) + '<input type="range" data-c="spots" min="' + D.custom.base.spots[0] + '" max="' + D.custom.base.spots[1] + '" step="' + D.custom.base.step + '" value="' + st.base.spots + '">' + (st.req.base ? row('Zufahrt', m(st.req.base.roadLen)) : '');
      }
      const P = q.parts;
      h += '<div style="margin-top:6px">' + row('Lift', eur(P.lift)) + (P.mid ? row('Mittelstation', eur(P.mid)) : '') + (P.clear ? row('Rodung (' + m(q.forest) + ')', eur(P.clear)) : '') + (P.base ? row('Talstation + Kassa', eur(P.base)) : '') + (P.park ? row('Parkplatz', eur(P.park)) : '') + (P.road ? row('Zufahrt', eur(P.road)) : '') + row('<b>Gesamt</b>', eur(q.price)) + '</div>';
      h += (q.why ? '<div class="bad" style="margin-top:6px">' + q.why + '</div>' : '<div class="good" style="margin-top:6px">gültig – fertig über Nacht</div>');
    }
    h += '<div class="a"><button class="p" data-c="ok"' + (n >= 2 && q && !q.why ? '' : ' disabled') + '>Bauen</button><button data-c="x">Abbrechen</button></div>';
    if (panel.dataset.h !== h) {
      const f = document.activeElement, k = f && panel.contains(f) ? f.dataset.c : null, sel = k && f.selectionStart;
      panel.innerHTML = h;
      panel.dataset.h = h;
      if (k) { const e = panel.querySelector('[data-c="' + k + '"]'); if (e) { e.focus(); if (sel != null && e.setSelectionRange) e.setSelectionRange(sel, sel); } }
    }
    panel.hidden = false;
  }

  panel.addEventListener('keydown', e => { e.stopPropagation(); if (e.code === 'Enter' && e.target.dataset.c !== 'spots') confirm(); if (e.code === 'Escape') cancel(); });
  panel.addEventListener('keyup', e => e.stopPropagation());
  panel.addEventListener('input', e => {
    const k = e.target.dataset.c;
    if (k === 'name') st.name = e.target.value;
    else if (k === 'bname') st.base.name = e.target.value;
    else if (k === 'spots') st.base.spots = Number(e.target.value);
    else return;
    refresh();
  });
  panel.addEventListener('change', e => { if (e.target.dataset.c === 'base') { st.base.on = e.target.checked; if (st.base.on && !st.base.name) st.base.name = 'Talstation ' + (st.name || '').replace(/^\S+ /, ''); refresh(); } });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.c === 'x') cancel();
    else if (b.dataset.c === 'ok') confirm();
  });
  panel.addEventListener('mousedown', e => e.stopPropagation());

  function start(type) {
    if (!G?.open || !D.custom.types[type]) return false;
    if (cam.mode !== 'fly') cam.startFly();
    st = { type, pts: [], hover: null, done: false, name: '', base: { on: false, spots: D.custom.base.def, name: '' } };
    refresh();
    return true;
  }
  function cancel() { st = null; clear(grp); tip.hidden = true; panel.hidden = true; panel.dataset.h = ''; }
  function confirm() {
    if (!st || !st.q || st.q.why || st.pts.length < 2) return;
    st.done = true;
    const r = req(st, geo(st, false));
    const id = C.place(G, r);
    if (id) { const nm = st.name; cancel(); act('custom:built'); note(nm + ' beauftragt – fertig über Nacht', 3); }
    else { st.done = false; refresh(); }
  }

  const mine = e => st && e.target.tagName === 'CANVAS' && !document.body.classList.contains('menu');
  addEventListener('keydown', e => {
    if (!st || document.body.classList.contains('menu')) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); confirm(); }
  }, true);
  addEventListener('mousedown', e => { dx0 = e.clientX; dy0 = e.clientY; if (mine(e) && e.button === 2) { e.stopPropagation(); if (st.pts.length) { st.pts.pop(); st.done = false; if (st.pts.length === 1 && !st.name) st.name = ''; } refresh(); } }, true);
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
    const t = D.custom.types[st.type], p = ground(e.clientX, e.clientY);
    if (!p || st.pts.length >= (t.mid ? 3 : 2)) return;
    st.pts.push(p);
    if (st.pts.length >= 2 && !st.name) st.name = suggest(st);
    if (st.pts.length >= (t.mid ? 3 : 2)) st.done = true;
    refresh();
  }, true);
  addEventListener('dblclick', e => { if (mine(e)) e.stopPropagation(); }, true);

  function flatten(lt, y) {
    const sm = t => t * t * (3 - 2 * t);
    terrain.groom((x, z, h) => {
      const ex = x - lt.c[0], ez = z - lt.c[1], u = Math.abs(-ex * lt.dz + ez * lt.dx) - lt.W / 2, v = Math.abs(ex * lt.dx + ez * lt.dz) - lt.L / 2, e = Math.max(u, v);
      if (e > 14) return null;
      const k = e <= 0 ? 1 : 1 - sm(e / 14);
      return [h + (y - h) * k, 0.6 * k];
    });
  }

  function lotTex(rows) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#5d6166'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#e8e8e0'; x.lineWidth = 2;
    for (let r = 0; r < rows; r++) {
      const y0 = 8 + r * 248 / rows;
      for (const yy of [y0, y0 + 248 / rows * 0.62]) { x.beginPath(); x.moveTo(4, yy); x.lineTo(252, yy); x.stroke(); }
      for (let i = 0; i < 40; i++) { const xx = 4 + i * 6.3; x.beginPath(); x.moveTo(xx, y0); x.lineTo(xx, y0 + 248 / rows * 0.62); x.stroke(); }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function buildBase(b) {
    const g = new THREE.Group(), lt = b.lot;
    if (!lt) return g;
    const y = lotPts(lt).reduce((a, c) => a + terrain.heightAt(c[0], c[1]), terrain.heightAt(...lt.c)) / 5;
    flatten(lt, y);
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(lt.W, lt.L).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: lotTex(Math.ceil(b.spots / (2 * Math.floor(lt.W / 2.5)))) }));
    lot.position.set(lt.c[0], y + 0.15, lt.c[1]);
    lot.rotation.y = Math.atan2(lt.dx, lt.dz);
    lot.receiveShadow = true;
    g.add(lot);
    const kas = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: 0x8a5a32 }), roof = new THREE.MeshLambertMaterial({ color: 0x3d3430 }), sign = new THREE.MeshLambertMaterial({ color: 0x2f6fd0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 5), wood); body.position.y = 1.6;
    const top = new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 6), roof); top.position.y = 3.4;
    const sg = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 0.1), sign); sg.position.set(0, 2.6, 2.56);
    kas.add(body, top, sg);
    const kp = [lt.c[0] + lt.dx * (lt.L / 2 + 8) - lt.dz * (lt.W / 2 - 6), lt.c[1] + lt.dz * (lt.L / 2 + 8) + lt.dx * (lt.W / 2 - 6)];
    kas.position.set(kp[0], terrain.heightAt(...kp), kp[1]);
    kas.rotation.y = Math.atan2(lt.dx, lt.dz);
    kas.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(kas);
    if (b.road) {
      const [a, c] = b.road, n = Math.max(2, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 8)), L = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, px = -(c[1] - a[1]) / L * 3, pz = (c[0] - a[0]) / L * 3, pos = [];
      for (let i = 0; i <= n; i++) { const k = i / n, x = a[0] + (c[0] - a[0]) * k, z = a[1] + (c[1] - a[1]) * k; for (const s of [-1, 1]) pos.push(x + px * s, terrain.heightAt(x + px * s, z + pz * s) + 0.25, z + pz * s); }
      const idx = [];
      for (let i = 0; i < n; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      const geo2 = new THREE.BufferGeometry();
      geo2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo2.setIndex(idx);
      geo2.computeVertexNormals();
      const road = new THREE.Mesh(geo2, new THREE.MeshLambertMaterial({ color: 0x55595e, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      road.receiveShadow = true;
      g.add(road);
    }
    return g;
  }

  function sync3d(g, active) {
    G = g;
    const want = new Map();
    if (active && G) for (const s of D.lifts) if (s.custom) want.set(s.id, s);
    for (const sec of [...lift.planned]) if (sec.custom && !want.has(sec.id)) lift.dropCustom(sec.id);
    for (const s of want.values()) {
      lift.addCustom({ id: s.id, name: s.name, from: D.nodes[s.from], to: D.nodes[s.to], a: s.a, b: s.b, drag: s.drag, h: s.h, chair: s.chair, color: s.color });
      const j = B.job(G, s.proj);
      if (B.done(G, s.proj)) lift.addSection(s.id); else lift.removeSection(s.id);
      lift.site(s.id, !!(j && j.left != null));
    }
    const bw = new Set(active && G ? G.custom.bases.filter(b => B.done(G, C.lift(G, b.lift)?.id)).map(b => b.id) : []);
    for (const [id, o] of bases) if (!bw.has(id)) { scene.remove(o); bases.delete(id); }
    for (const id of bw) if (!bases.has(id)) { const o = buildBase(C.base(G, id)); scene.add(o); bases.set(id, o); }
    const built = active && G ? G.custom.lifts.filter(c => B.done(G, c.id)) : [];
    const ck = built.map(c => c.id).join();
    if (ck !== ckey) {
      ckey = ck;
      const segs = built.flatMap(c => c.pts.slice(1).map((b, i) => [[c.pts[i][0], c.pts[i][2]], [b[0], b[2]]]));
      const st2 = built.flatMap(c => c.pts.map(p => [p[0], p[2]]));
      const lots = built.map(c => c.base && C.base(G, c.base)).filter(b => b?.lot);
      const inLot = (b, x, z) => { const lt = b.lot, ex = x - lt.c[0], ez = z - lt.c[1]; return Math.abs(-ex * lt.dz + ez * lt.dx) < lt.W / 2 + 8 && Math.abs(ex * lt.dx + ez * lt.dz) < lt.L / 2 + 8; };
      scenery?.cut?.('custom', segs.length ? (x, z) => segs.some(([a, b]) => segDist(x, z, a, b) < 9) || st2.some(p => Math.hypot(p[0] - x, p[1] - z) < 28) || lots.some(b => inLot(b, x, z) || (b.road && segDist(x, z, b.road[0], b.road[1]) < 6)) : null);
    }
    const key = active && G ? G.custom.lifts.map(c => c.id + (B.done(G, c.id) ? 1 : 0)).join() + on : '';
    if (key !== mkey) {
      mkey = key;
      clear(marks);
      const L = [];
      if (active && G) for (const c of G.custom.lifts) {
        const col = c.link ? LINK : PLAN, d = !B.done(G, c.id);
        for (let i = 0; i + 1 < c.pts.length; i++) {
          const a = c.pts[i], b = c.pts[i + 1];
          L.push({ a: [a[0], a[2]], b: [b[0], b[2]], color: c.link ? D.custom.linkColor : d ? '#5aa2ff' : '#ffffff', dash: d });
          const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], a[1] + 25, a[2]), new THREE.Vector3(b[0], b[1] + 25, b[2])]), new THREE.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.85 }));
          ln.renderOrder = 998;
          marks.add(ln);
        }
        if (c.link) {
          const mid = c.pts[Math.floor(c.pts.length / 2)], p = c.pts.length > 2 ? mid : [(c.pts[0][0] + c.pts[1][0]) / 2, (c.pts[0][1] + c.pts[1][1]) / 2, (c.pts[0][2] + c.pts[1][2]) / 2];
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badge('⇄'), depthTest: false, sizeAttenuation: false }));
          s.scale.set(0.05, 0.05, 1);
          s.position.set(p[0], p[1] + 40, p[2]);
          s.renderOrder = 999;
          marks.add(s);
        }
      }
      hud?.lines?.(L);
    }
    marks.visible = on;
  }

  const badges = new Map();
  function badge(t) {
    if (badges.has(t)) return badges.get(t);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ff8a1e'; x.beginPath(); x.arc(32, 32, 28, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = 'bold 34px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 32, 34);
    const tx = new THREE.CanvasTexture(c);
    badges.set(t, tx);
    return tx;
  }

  function tab(G2, h) {
    const T = D.custom.types, P = D.build.projects;
    if (!G2.open) return '<h2>Freier Bau</h2><p class="note">Wird freigeschaltet, sobald alle Lifte und Pisten des echten Gebiets gebaut sind (Tab Bau). Danach baust du eigene Lifte und Pisten überall im Gelände: im Gebiet, als Tallift mit Talstation und Parkplatz oder als Verbindungslift zwischen Gebieten.</p>';
    const own = C.custLifts(G2);
    let s = '<h2>Neuen Lift platzieren</h2><p class="note">Öffnet den Flugmodus: Talstation und Bergstation anklicken (Gondel/Sessel optional mit Mittelstation). Liegt die Talstation frei, kann sie als Tallift mit Kassa und Parkplatz gebaut werden. Endpunkte bis ' + D.custom.snap + ' m an einer Station werden angeschlossen.</p><table>';
    for (const k of C.TYPES) { const t = T[k]; s += h.tr('<b>' + t.label + '</b><br><small style="opacity:.75">' + t.places + ' Plätze' + (t.max ? ' (Ausbau bis ' + t.max + ')' : '') + ' · ' + Math.round(3600 / t.gap * t.places).toLocaleString('de-AT') + ' P/h · ' + t.len[0] + '–' + t.len[1].toLocaleString('de-AT') + ' m · max. ' + Math.round(t.slope * 100) + ' %</small>', h.eur(t.base) + ' + ' + t.perM + ' €/m + ' + t.perHm + ' €/Hm<br><button class="btn primary" data-act="cplace:' + k + '">Platzieren</button>'); }
    s += '</table><h2>Eigene Lifte (' + own.length + '/' + D.custom.max + ')</h2>';
    if (!own.length) return s + '<p class="note">Noch keine eigenen Lifte.</p>';
    s += '<table>';
    for (const c of own) {
      const ups = c.segs.flatMap(id => Object.keys(P).filter(k => P[k].cab === id && !B.done(G2, k) && !/^erst /.test(B.check(G2, k))));
      const why = C.canDemolish(G2, c.id), r = C.refundOf(G2, c.id);
      s += h.tr('<b>' + c.name + '</b>' + (c.link ? ' <span style="color:' + D.custom.linkColor + '">⇄ Verbindung</span>' : '') + (c.base ? ' · Tallift' : '') + '<br><small style="opacity:.75">' + T[c.type].label + ' · ' + m(c.len) + ' · ' + m(c.rise) + ' Hm · ' + c.nodes.map(n => D.nodes[n]).join(' → ') + '</small>',
        (c.job ? '<span class="biz-warn">im Bau</span>' : '<span class="biz-good">in Betrieb</span>') + '<br>' + ups.map(k => '<button class="btn" data-act="build:' + k + (G2.summer ? ':s' : '') + '">' + P[k].label.replace(c.name, '').trim() + ' ' + h.eur(P[k].price) + '</button>').join(' ') +
        ' <button class="btn" data-act="cdemo:' + c.id + '"' + (why ? ' disabled title="' + why + '"' : '') + '>' + (c.job ? 'Stornieren ' : 'Abriss +') + h.eur(r) + '</button>');
    }
    return s + '</table><p class="note">Abriss erstattet ' + Math.round(D.custom.refund * 100) + ' % der Baukosten, nur außerhalb des Betriebs. Gäste nutzen eigene Lifte, wenn Tal- und Bergstation an Stationen mit Pisten anschließen.</p>';
  }

  return {
    start, cancel, sync: sync3d, tab,
    get active() { return !!st; },
    setOn(v) { on = v; marks.visible = v; },
    update(g, dt) {
      G = g;
      if (st && cam.mode !== 'fly') cancel();
      tAcc += dt;
    }
  };
}
