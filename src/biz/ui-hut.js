import * as THREE from 'three';
import { D } from './data.js';
import * as C from './custom.js';
import * as B from './build.js';
import { seasonOf } from './calendar.js';
import { CSS as CCSS } from './ui-custom.js';

const CSS = CCSS.replaceAll('#biz-cpl', '#biz-hpl').replaceAll('#biz-ctip', '#biz-htip') + `
#biz-amap{position:fixed;inset:40px 60px;z-index:30;background:rgba(10,16,24,.96);color:#dfe8f2;border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:12px 16px;font:13px system-ui,sans-serif;display:flex;gap:14px;box-shadow:0 8px 30px rgba(0,0,0,.5)}
#biz-amap[hidden]{display:none}
#biz-amap svg{flex:1;min-width:0;background:#e9eef3;border-radius:8px}
#biz-amap .side{width:360px;overflow:auto}
#biz-amap h3{margin:0 0 8px;color:#fff;display:flex;justify-content:space-between}
#biz-amap table{width:100%;border-collapse:collapse}#biz-amap td,#biz-amap th{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right}#biz-amap td:first-child,#biz-amap th:first-child{text-align:left}
#biz-amap input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:5px;padding:3px 6px;font:inherit}
#biz-amap button{font:inherit;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:3px 10px;cursor:pointer}
#biz-amap .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px}
`;

const eur = v => Math.round(v).toLocaleString('de-AT') + ' €';
const num = v => Math.round(v).toLocaleString('de-AT');
const row = (k, v) => '<div class="r"><span>' + k + '</span><b>' + v + '</b></div>';
const esc = s => String(s || '').replace(/[<>"&]/g, '');
const LVC = { leicht: '#2f6fd0', mittel: '#d03a2f', schwer: '#222' };

export function areaTable(G, rows, h) {
  const L = C.areaList(G), n = L.filter(a => rows[a.id]).length;
  if (n < 2) return '';
  let s = '<table><tr><th>Gebiet</th><th>Gäste</th><th>Erlös</th><th>dir. Kosten</th><th>Beitrag</th></tr>';
  for (const a of L) { const x = rows[a.id]; if (!x) continue; const d = x.rev - x.cost; s += '<tr><td><span class="sw" style="background:' + a.color + '"></span>' + esc(a.name) + '</td><td>' + num(x.g) + '</td><td>' + h.eur(x.rev) + '</td><td>' + h.eur(x.cost) + '</td><td class="' + (d >= 0 ? 'biz-good' : 'biz-bad') + '">' + h.eur(d) + '</td></tr>'; }
  return s + '</table><p class="note">Erlös: Tickets/Verleih/Schule/Parken nach Heim-Talstation der Gäste, Gastro je Hütte. Direkte Kosten: Lifte (Wartung, Strom, Personal, Verwaltung je Lift), Hütten, Präparierung/Beschneiung nach Pisten-km. Zentrale Kosten (Verwaltung, Marketing, Zinsen, AfA) nicht verteilt.</p>';
}

export const seasonAreas = G => C.areaSeason(G.history.filter(h => seasonOf(h.date) === G.season));

export function createHutTool({ scene, cam, terrain, scenery, huts, act, note }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const panel = document.createElement('div'), tip = document.createElement('div'), map = document.createElement('div');
  panel.id = 'biz-hpl'; tip.id = 'biz-htip'; map.id = 'biz-amap';
  panel.hidden = tip.hidden = map.hidden = true;
  document.body.append(panel, tip, map);
  const ghost = new THREE.Group();
  scene.add(ghost);
  const gm = new THREE.MeshBasicMaterial({ color: 0x7be07b, transparent: true, opacity: 0.45, depthTest: false });
  let G = null, st = null, mx = 0, my = 0, dx0 = 0, dy0 = 0, hkey = '', mapRef = null;

  function ground(x, y) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1), cam.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = 0;
    for (let i = 0; i < 2000 && t < 15000; i++) {
      const px = o.x + d.x * t, pz = o.z + d.z * t, py = o.y + d.y * t, h = terrain.heightAt(px, pz);
      if (py <= h) return [px, h, pz];
      t += Math.max(1.5, (py - h) * 0.5);
    }
    return null;
  }

  const req = () => st.p ? { size: st.size, x: st.p[0], y: st.p[1], z: st.p[2], name: st.name, level: st.level, rot: Math.atan2(...(n => [n.x, n.z])(terrain.normalAt(st.p[0], st.p[2]))), blocked: terrain.inside(st.p[0], st.p[2]) ? (terrain.normalAt(st.p[0], st.p[2]).y < 0.8 ? 'Gelände zu steil' : '') : 'außerhalb des Geländes' } : { size: st.size };

  function refresh() {
    if (!st) return;
    const p = st.p || st.hover, z = D.custom.hut.sizes[st.size];
    st.q = C.hquote(G, p ? { ...req(), x: p[0], y: p[1], z: p[2] } : req());
    ghost.clear();
    if (p) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(z.w, z.h * 1.6, z.l), gm);
      gm.color.set(st.q.why ? 0xff6b5a : 0x7be07b);
      m.position.set(p[0], p[1] + z.h * 0.8, p[2]);
      m.rotation.y = Math.atan2(...(n => [n.x, n.z])(terrain.normalAt(p[0], p[2])));
      m.renderOrder = 999;
      ghost.add(m);
    }
    tip.hidden = !st.hover || !!st.p;
    if (!tip.hidden) {
      tip.innerHTML = (st.q.node ? 'an ' + D.nodes[st.q.node] + ' · ' + eur(st.q.price) : '') + (st.q.why ? '<br><span style="color:#ff6b5a">' + st.q.why + '</span>' : '');
      tip.style.left = mx + 16 + 'px'; tip.style.top = my + 12 + 'px';
    }
    const S = D.custom.hut.sizes, L = D.side.levels, q = st.q;
    let h = '<h4>Hütte bauen<button data-c="x">✕</button></h4><div class="step">' + (st.p ? 'Enter oder „Bauen“' : 'Klick: Standort bis ' + D.custom.hut.snap + ' m neben einer Station') + '<br><small>Rechtsklick: Standort lösen · Esc: abbrechen</small></div>';
    h += '<label>Name<input type="text" data-c="name" value="' + esc(st.name) + '"></label>';
    h += '<div class="a">' + Object.entries(S).map(([k, v]) => '<button data-c="size:' + k + '"' + (st.size === k ? ' class="p"' : '') + '>' + v.label + ' · ' + v.seats + '</button>').join('') + '</div>';
    h += '<div class="a">' + Object.entries(L).map(([k, v]) => '<button data-c="lv:' + k + '"' + (st.level === k ? ' class="p"' : '') + '>' + v.label + '</button>').join('') + '</div>';
    h += '<div style="margin-top:6px">' + row('Plätze', z.seats) + row('Anziehung', Math.round(z.draw * 100) + ' %') + row('Fixkosten je Tag', eur(z.fix)) + row('Personal', Math.ceil(z.seats / D.side.seatsPerStaff) + ' Gastro') + row('Station', q.node ? D.nodes[q.node] : '–') + row('<b>Preis</b>', eur(z.price)) + '</div>';
    if (st.p) h += q.why ? '<div class="bad" style="margin-top:6px">' + q.why + '</div>' : '<div class="good" style="margin-top:6px">gültig – fertig über Nacht</div>';
    h += '<div class="a"><button class="p" data-c="ok"' + (st.p && !q.why ? '' : ' disabled') + '>Bauen</button><button data-c="x">Abbrechen</button></div>';
    if (panel.dataset.h !== h) {
      const f = document.activeElement, foc = f && panel.contains(f) && f.dataset.c === 'name', sel = foc && f.selectionStart;
      panel.innerHTML = h; panel.dataset.h = h;
      if (foc) { const e = panel.querySelector('[data-c="name"]'); e.focus(); e.setSelectionRange(sel, sel); }
    }
    panel.hidden = false;
  }

  function start() {
    if (!G?.open) return false;
    if (cam.mode !== 'fly') cam.startFly();
    st = { size: D.custom.hut.def, level: 'normal', name: 'Hütte ' + (G.custom.hn + 1), p: null, hover: null };
    refresh();
    return true;
  }
  function cancel() { st = null; ghost.clear(); panel.hidden = tip.hidden = true; panel.dataset.h = ''; }
  function confirm() {
    if (!st?.p || st.q?.why) return;
    const id = C.hplace(G, req()), nm = st.name;
    if (id) { cancel(); act('custom:built'); note(nm + ' beauftragt – fertig über Nacht', 3); } else refresh();
  }

  panel.addEventListener('keydown', e => { e.stopPropagation(); if (e.code === 'Enter') confirm(); if (e.code === 'Escape') cancel(); });
  panel.addEventListener('keyup', e => e.stopPropagation());
  panel.addEventListener('mousedown', e => e.stopPropagation());
  panel.addEventListener('input', e => { if (e.target.dataset.c === 'name') { st.name = e.target.value; refresh(); } });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'), c = b?.dataset.c;
    if (!b || b.disabled) return;
    if (c === 'x') cancel(); else if (c === 'ok') confirm();
    else if (c.startsWith('size:')) { st.size = c.slice(5); refresh(); }
    else if (c.startsWith('lv:')) { st.level = c.slice(3); refresh(); }
  });
  const mine = e => st && e.target.tagName === 'CANVAS' && !document.body.classList.contains('menu');
  addEventListener('keydown', e => {
    if (!map.hidden && e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); map.hidden = true; return; }
    if (!st || document.body.classList.contains('menu')) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); }
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopPropagation(); confirm(); }
  }, true);
  addEventListener('mousedown', e => { dx0 = e.clientX; dy0 = e.clientY; if (mine(e) && e.button === 2) { e.stopPropagation(); st.p = null; refresh(); } }, true);
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (mine(e) && !st.p) { st.hover = ground(mx, my); refresh(); } }, true);
  addEventListener('click', e => {
    if (!mine(e) || e.button) return;
    e.stopPropagation();
    if (Math.hypot(e.clientX - dx0, e.clientY - dy0) > 5) return;
    const p = ground(e.clientX, e.clientY);
    if (p) { st.p = p; refresh(); }
  }, true);
  addEventListener('dblclick', e => { if (mine(e)) e.stopPropagation(); }, true);

  let okey = '';
  function ow(active) {
    const A = active && G ? C.areas(G) : {}, L = active && G ? G.custom.lifts.filter(c => B.done(G, c.id) && !c.link) : [];
    const k = L.map(c => c.id).join() + (G?.custom.pistes.length || 0);
    if (k === okey) return;
    okey = k;
    const o = [];
    for (const b of active && G ? G.custom.bases : []) {
      const P = [...L.filter(c => A[c.nodes[0]] === b.id).flatMap(c => c.pts.map(p => [p[0], p[2]])), ...G.custom.pistes.filter(p => A[p.from] === b.id).flatMap(p => p.pts.map(q => [q[0], q[2]]))];
      if (!P.length) continue;
      const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cz = P.reduce((a, p) => a + p[1], 0) / P.length, r = Math.max(...P.map(p => Math.hypot(p[0] - cx, p[1] - cz))) + 350;
      o.push([cx, cz, r, 0.75]);
    }
    terrain.openWorld?.(o.slice(0, 4));
  }

  function sync3d(g, active) {
    G = g;
    ow(active);
    const want = active && G ? G.custom.huts.filter(h => B.done(G, h.id)) : [];
    const key = want.map(h => h.id + h.name).join();
    if (key === hkey) return;
    hkey = key;
    for (const s of [...(scenery?.huts || [])]) if (s.custom && !want.some(h => h.name === s.name)) { scenery.removeHut(s.name); for (const k in huts) if (huts[k] === s) delete huts[k]; }
    for (const h of want) {
      let s = scenery?.huts.find(x => x.name === h.name && x.custom);
      if (!s && scenery?.addHut) { const z = D.custom.hut.sizes[h.size]; s = scenery.addHut({ name: h.name, x: h.x, z: h.z, rot: h.rot, w: z.w, l: z.l, h: z.h, color: z.color }); }
      if (s) huts[h.id] = s;
    }
  }

  function tab(G2, h) {
    if (!G2.open) return '';
    const own = C.custHuts(G2), S = D.custom.hut.sizes;
    let s = '<h2>Hütten</h2><p class="note">Eigene Hütte neben einer Station platzieren (bis ' + D.custom.hut.snap + ' m). Gäste kehren dort mittags ein; Preisniveau und Öffnung im Tab Gastro & Service.</p><table>';
    s += h.tr(Object.values(S).map(v => v.label + ' ' + v.seats + ' Plätze ' + h.eur(v.price)).join(' · '), '<button class="btn primary" data-act="hplace">Hütte platzieren</button>');
    for (const x of own) { const why = C.canDemolishHut(G2, x.id); s += h.tr('<b>' + esc(x.name) + '</b><br><small style="opacity:.75">' + S[x.size].label + ' · ' + x.seats + ' Plätze · ' + (D.nodes[x.node] || '') + '</small>', (x.job ? '<span class="biz-warn">im Bau</span>' : '<span class="biz-good">' + (x.open ? 'offen' : 'geschlossen') + '</span>') + ' <button class="btn" data-act="hdemo:' + x.id + '"' + (why ? ' disabled title="' + why + '"' : '') + '>' + (x.job ? 'Stornieren ' : 'Abriss +') + h.eur(C.hrefundOf(G2, x.id)) + '</button>'); }
    s += '</table>';
    const bs = G2.custom.bases;
    if (bs.length) {
      s += '<h2>Talstationen: Verleih & Skischule</h2><table>';
      for (const b of bs) { const id = 'svc:' + b.id, why = B.check(G2, id); s += h.tr('<b>' + esc(b.name) + '</b><br><small style="opacity:.75">' + (b.svc ? 'Verleih und Skischule vorhanden' : 'ohne: Gäste leihen/buchen hier nur ' + Math.round(D.custom.svc.k * 100) + ' %') + '</small>', b.svc ? '<span class="biz-good">vorhanden</span>' : B.job(G2, id) ? '<span class="biz-warn">im Bau</span>' : '<button class="btn" data-act="build:' + id + (G2.summer ? ':s' : '') + '"' + (why ? ' disabled title="' + why + '"' : '') + '>Bauen ' + h.eur(D.build.projects[id].price) + '</button>'); }
      s += '</table>';
    }
    s += '<h2>Gebiete</h2><table>';
    for (const a of C.areaList(G2)) s += h.tr('<span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;background:' + a.color + '"></span><b>' + esc(a.name) + '</b>', '<input type="text" data-aname="' + a.id + '" value="' + esc(a.name) + '" style="width:150px">');
    s += '</table><p><button class="btn primary" data-act="amap">Gebietskarte öffnen</button></p>' + areaTable(G2, seasonAreas(G2), h);
    return s;
  }

  function mapSvg(G2) {
    const A = C.areas(G2), L = C.areaList(G2), col = Object.fromEntries(L.map(a => [a.id, a.color])), aOf = n => A[n] || 'hb';
    const lines = [], dots = [], P = [];
    const spec = id => D.lifts.find(l => l.id === id);
    for (const p of mapRef.pistes?.list || []) { if (!G2.pistes[p.id] || !p.pts?.length) continue; lines.push({ pts: p.pts, c: LVC[p.level] || '#555', w: 1.6, o: 0.55 }); P.push(...p.pts); }
    const secs = [...(mapRef.lift.sections || []), ...(mapRef.lift.planned || [])];
    const seen = new Set();
    for (const s of secs) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      const l = G2.lifts.find(x => x.id === s.id), sp = spec(s.id);
      if (!l || !sp || !s.a) continue;
      const lk = sp.link;
      lines.push({ pts: [s.a, s.b], c: lk ? D.custom.linkColor : col[aOf(sp.from)] || '#333', w: 3.2, dash: lk, o: 1 });
      dots.push({ p: s.b, c: '#333', r: 3 });
      P.push(s.a, s.b);
    }
    const bs = [{ id: 'tal', name: D.nodes.tal, p: D.net.home }, ...G2.custom.bases.filter(b => G2.lifts.some(l => l.id === b.lift)).map(b => ({ id: b.id, name: b.name, p: [b.x, b.z] }))];
    for (const b of bs) P.push(b.p);
    const hs = D.side.huts.filter(h => G2.side.huts[h.id]?.own).map(h => { const s = huts[h.id]; return s ? { name: h.name, p: [s.x, s.z] } : null; }).filter(Boolean);
    if (!P.length) return '';
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const pad = 400, W = x1 - x0 + 2 * pad, H = z1 - z0 + 2 * pad, k = W / 1000;
    const pt = ([x, z]) => ((x - x0 + pad) / k).toFixed(1) + ',' + ((z - z0 + pad) / k).toFixed(1);
    let s = '<svg viewBox="0 0 1000 ' + Math.round(H / k) + '" preserveAspectRatio="xMidYMid meet">';
    for (const l of lines) if (l.w > 3) s += '<polyline points="' + l.pts.map(pt).join(' ') + '" fill="none" stroke="#fff" stroke-width="' + (l.w + 3) + '" stroke-linecap="round"/>';
    for (const l of lines) s += '<polyline points="' + l.pts.map(pt).join(' ') + '" fill="none" stroke="' + l.c + '" stroke-width="' + l.w + '" stroke-opacity="' + l.o + '"' + (l.dash ? ' stroke-dasharray="8 4"' : '') + ' stroke-linecap="round"/>';
    for (const d of dots) { const [x, y] = pt(d.p).split(','); s += '<circle cx="' + x + '" cy="' + y + '" r="' + d.r + '" fill="' + d.c + '"/>'; }
    for (const h of hs) { const [x, y] = pt(h.p).split(',').map(Number); s += '<path d="M' + (x - 6) + ' ' + (y + 4) + 'L' + x + ' ' + (y - 6) + 'L' + (x + 6) + ' ' + (y + 4) + 'Z" fill="#8a5a2e" stroke="#fff"/><text x="' + (x + 8) + '" y="' + (y + 4) + '" font-size="11" fill="#5a3a1e">' + esc(h.name) + '</text>'; }
    for (const b of bs) { const [x, y] = pt(b.p).split(',').map(Number), a = aOf(b.id); s += '<rect x="' + (x - 7) + '" y="' + (y - 7) + '" width="14" height="14" rx="3" fill="' + (col[a] || '#5aa2ff') + '" stroke="#fff" stroke-width="2"/><text x="' + (x + 10) + '" y="' + (y + 16) + '" font-size="13" font-weight="bold" fill="#123">' + esc(b.name) + '</text>'; }
    for (const a of L) {
      const ps = [...a.nodes.flatMap(n => D.nodeAt[n] || []), ...G2.custom.lifts.flatMap(c => c.pts.filter((p, i) => aOf(c.nodes[i]) === a.id).map(p => [p[0], p[2]]))];
      if (!ps.length) continue;
      const c = [ps.reduce((v, p) => v + p[0], 0) / ps.length, ps.reduce((v, p) => v + p[1], 0) / ps.length], [x, y] = pt(c).split(',');
      s += '<text x="' + x + '" y="' + y + '" font-size="22" font-weight="bold" fill="' + a.color + '" stroke="#fff" stroke-width="4" paint-order="stroke" text-anchor="middle">' + esc(a.name) + '</text>';
    }
    return s + '</svg>';
  }

  function openMap(G2, h) {
    G = G2;
    const t = seasonAreas(G2), today = G2.phase === 'open' ? C.areaDay(G2) : null;
    let side = '<h3>Gebietskarte<button data-m="x">✕</button></h3><p style="opacity:.75;margin:0 0 8px">Quadrat = Talstation · Linie = Lift (Farbe des Gebiets, orange gestrichelt = Verbindung) · Pisten blau/rot/schwarz · Dreieck = Hütte</p>';
    side += '<h4>Saison bisher</h4>' + (areaTable(G2, t, h) || '<p style="opacity:.7">Kennzahlen je Gebiet ab zwei Gebieten mit Gästen.</p>');
    if (today) side += '<h4>Heute</h4>' + areaTable(G2, today, h);
    map.innerHTML = '<div style="flex:1;display:flex;min-width:0">' + mapSvg(G2) + '</div><div class="side">' + side + '</div>';
    map.hidden = false;
  }
  map.addEventListener('click', e => { if (e.target.closest('[data-m="x"]')) map.hidden = true; });
  map.addEventListener('mousedown', e => e.stopPropagation());

  return {
    start, cancel, sync: sync3d, tab, openMap,
    setRef(r) { mapRef = r; },
    get active() { return !!st; },
    update(g) { G = g; if (st && cam.mode !== 'fly') cancel(); }
  };
}
