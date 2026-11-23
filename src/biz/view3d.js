import * as THREE from 'three';
import { D } from './data.js';
import * as CU from './custom.js';
import { status, repairQuote, fmtDur, serviced } from './assets.js';
import * as X from './side.js';
import * as N from './snow.js';
import * as B from './build.js';

const CSS = `
#biz-card{position:fixed;z-index:30;width:270px;background:rgba(12,20,30,.92);color:#e8eef5;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:10px 12px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.45)}
#biz-card h4{margin:0 0 4px;font-size:15px;display:flex;justify-content:space-between;gap:8px}
#biz-card h4 button{background:none;border:0;color:#aab;cursor:pointer;font-size:15px;padding:0}
#biz-card .r{display:flex;justify-content:space-between;gap:8px;padding:1px 0}
#biz-card .r span{opacity:.7}
#biz-card .a{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
#biz-card .a button{flex:1 1 auto;background:#24364a;color:#e8eef5;border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:4px 7px;cursor:pointer;font:12px system-ui,sans-serif}
#biz-card .a button.p{background:#2f6fb0}
#biz-card .a button:disabled{opacity:.4;cursor:default}
#biz-card small{opacity:.7}
#biz-card .bar{height:5px;background:rgba(255,255,255,.12);border-radius:3px;margin:3px 0 2px}
#biz-card .bar i{display:block;height:100%;border-radius:3px}
#biz-mgr{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:20;background:rgba(12,20,30,.78);color:#dfe8f2;padding:6px 14px;border-radius:8px;font:12px system-ui,sans-serif;white-space:nowrap;pointer-events:none}
#biz-mgr b{color:#fff}
`;

const why = { build: 'Umbau', closed: 'geschlossen', fault: 'Störung', repair: 'Reparatur läuft', insp: 'Inspektion', wind: 'Sturm', staff: 'kein Personal', run: 'in Betrieb' };
const MODES = ['aus', 'Zustand', 'Schneehöhe', 'Gedränge'];
const C3 = [new THREE.Color(0.85, 0.15, 0.1), new THREE.Color(0.95, 0.8, 0.1), new THREE.Color(0.15, 0.75, 0.25)];
const ramp = (t, c) => { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? c.copy(C3[0]).lerp(C3[1], t * 2) : c.copy(C3[1]).lerp(C3[2], (t - 0.5) * 2); };
const GREY = new THREE.Color(0.35, 0.36, 0.42), PLAN = new THREE.Color(0.35, 0.65, 1);
const sum = a => a ? a.reduce((x, y) => x + y, 0) : 0;
const eur = n => Math.abs(n) >= 1e6 ? (n / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' Mio €' : Math.round(n).toLocaleString('de-DE') + ' €';
const wcol = w => w < D.flow.wait[0] ? '#7be07b' : w < D.flow.wait[1] ? '#ffd84a' : '#ff6b5a';
const ccol = c => c >= 70 ? '#7be07b' : c >= 45 ? '#ffd84a' : '#ff6b5a';
const bar = (v, c) => '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, v)) + '%;background:' + c + '"></i></div>';
const row = (a, b) => '<div class="r"><span>' + a + '</span><b>' + b + '</b></div>';
const btn = (act, t, o = {}) => '<button data-act="' + act + '"' + (o.p ? ' class="p"' : '') + (o.off ? ' disabled' : '') + (o.tip ? ' title="' + o.tip + '"' : '') + '>' + t + '</button>';

export function createView3d({ scene, cam, terrain, lift, pistes, scenery, act }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const card = document.createElement('div');
  card.id = 'biz-card';
  card.hidden = true;
  const hint = document.createElement('div');
  hint.id = 'biz-mgr';
  hint.hidden = true;
  document.body.append(card, hint);
  const group = new THREE.Group();
  scene.add(group);
  const camera = cam.camera;
  let sel = null, G = null, on = false, mgr = false, icons = true, mode = 0, last = '', cx = 0, cy = 0;

  const LIFTP = {}, HUTP = {};
  for (const [pid, p] of Object.entries(D.build.projects)) {
    for (const l of p.lifts || []) LIFTP[l] = pid;
    if (p.hut) HUTP[p.hut] = pid;
  }
  const PROJ = Object.fromEntries(D.pistes.filter(p => p.proj).map(p => [p.id, p.proj]));
  const HUTS = D.side.huts.map(h => ({ ...h, s: scenery.huts.find(x => x.name === h.name) })).filter(h => h.s);
  const secs = () => [...lift.all, ...lift.planned.filter(s => !lift.all.includes(s))];
  const built = s => lift.sections.includes(s);

  const plans = new Map();
  const dash = new THREE.LineDashedMaterial({ color: 0x5aa2ff, dashSize: 25, gapSize: 15, depthTest: false, transparent: true, opacity: 0.9 });
  for (const s of secs()) {
    const ya = terrain.heightAt(...s.a) + 20, yb = terrain.heightAt(...s.b) + 20;
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(s.a[0], ya, s.a[1]), new THREE.Vector3(s.b[0], yb, s.b[1])]), dash);
    ln.computeLineDistances();
    ln.renderOrder = 998;
    ln.visible = false;
    group.add(ln);
    plans.set(s, ln);
  }

  const texCache = new Map();
  function icon(key, text, color) {
    if (texCache.has(key)) return texCache.get(key);
    const c = document.createElement('canvas');
    c.width = 160; c.height = 72;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12,20,30,0.85)';
    g.beginPath(); g.roundRect(4, 4, 152, 52, 14); g.fill();
    g.beginPath(); g.moveTo(68, 56); g.lineTo(80, 70); g.lineTo(92, 56); g.fill();
    g.strokeStyle = color; g.lineWidth = 4;
    g.beginPath(); g.roundRect(4, 4, 152, 52, 14); g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 34px system-ui,sans-serif';
    g.fillText(text, 80, 31);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
    return t;
  }
  const sprites = new Map();
  function sprite(key) {
    let s = sprites.get(key);
    if (!s) {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true, sizeAttenuation: false, fog: false }));
      s.center.set(0.5, 0);
      s.renderOrder = 999;
      group.add(s);
      sprites.set(key, s);
    }
    return s;
  }
  function badge(key, pos, k, text, color) {
    const s = sprite(key), m = s.material, t = icon(k, text, color);
    if (m.map !== t) { m.map = t; m.needsUpdate = true; }
    s.position.copy(pos);
    s.visible = true;
    const d = camera.position.distanceTo(pos), f = 0.042 * Math.max(0.7, Math.min(1.15, 1.3 - d / 8000));
    s.scale.set(f * 160 / 72, f, 1);
  }

  const v3 = new THREE.Vector3();
  const liftState = (G, s) => {
    const l = G.lifts.find(x => x.id === s.id), pid = LIFTP[s.id], j = pid && B.job(G, pid);
    if (j && j.left != null) return { k: 'build' };
    if (!l || !built(s)) return null;
    const st = status(l);
    if (st === 'fault' || st === 'repair' || st === 'insp') return { k: 'tool' };
    if (st === 'wind') return { k: 'wind' };
    if (st !== 'run') return { k: 'lock' };
    if (G.phase !== 'open') return null;
    return { k: 'wait', w: G.flow?.wait[l.id] || 0 };
  };
  const hutState = (G, h) => {
    const o = G.side.huts[h.id], pid = HUTP[h.id], j = (pid && B.job(G, pid)) || B.job(G, 'hut:' + h.id);
    if (j && j.left != null) return { k: 'build' };
    if (!o?.own) return null;
    if (!o.open) return { k: 'lock' };
    if (G.phase !== 'open') return null;
    return { k: 'wait', w: G.flow?.hutWait?.[h.id] || 0, n: (G.flow?.hut?.[h.id] || 0) + (G.flow?.hutQ?.[h.id] || 0) };
  };
  const SYM = { build: ['🏗', '#ffb14a'], tool: ['🔧', '#ff6b5a'], wind: ['💨', '#9fd3ff'], lock: ['🔒', '#c8ccd4'] };
  function show(key, pos, st, near) {
    if (!st || !near(pos)) return;
    if (st.k === 'wait') {
      const c = st.w < 0.5 ? '#7be07b' : wcol(st.w), t = st.w >= 0.5 ? Math.round(st.w) + ' min' : st.n != null ? '🍴 ' + Math.round(st.n) : '0 min';
      badge(key, pos, t + c, t, c);
    } else badge(key, pos, st.k, SYM[st.k][0], SYM[st.k][1]);
  }

  function symbols() {
    for (const s of sprites.values()) s.visible = false;
    if (!icons || !G) return;
    const cp = camera.position, near = p => mgr || Math.hypot(p.x - cp.x, p.z - cp.z) < 1500;
    for (const s of secs()) show('l:' + s.id, v3.set(s.a[0], terrain.heightAt(...s.a) + 16, s.a[1]).clone(), liftState(G, s), near);
    for (const h of HUTS) show('h:' + h.id, new THREE.Vector3(h.s.x, h.s.y + h.s.top + 5, h.s.z), hutState(G, h), near);
    for (const p of pistes.list) {
      const pid = PROJ[p.id], j = pid && B.job(G, pid);
      if (!j || j.left == null) continue;
      const m = p.pts[p.pts.length >> 1];
      show('p:' + p.id, new THREE.Vector3(m[0], terrain.heightAt(m[0], m[1]) + 10, m[1]), { k: 'build' }, near);
    }
  }

  const tc = new THREE.Color();
  function overlay() {
    for (const p of pistes.list) {
      const o = G?.pistes[p.id];
      if (!mgr || !G) { pistes.setTint(p.id, null); continue; }
      if (!o) { pistes.setTint(p.id, PROJ[p.id] ? PLAN : null, 0.45); continue; }
      if (!mode) { pistes.setTint(p.id, null); continue; }
      if (!o.open) { pistes.setTint(p.id, GREY, 0.75); continue; }
      const dp = D.pistes.find(x => x.id === p.id);
      const t = mode === 1 ? (o.cond - 40) / 50 : mode === 2 ? ((o.snow || 0) - D.cover.minOpen) / 70 : 1 - (G.phase === 'open' ? (G.flow?.run?.[p.id] || 0) / dp.km : 0) / 45;
      pistes.setTint(p.id, ramp(t, tc), 0.6);
    }
    for (const [s, ln] of plans) ln.visible = mgr && !built(s);
  }

  const ndc = new THREE.Vector2(), pa = new THREE.Vector3(), pb = new THREE.Vector3();
  function scr(x, y, z, out) {
    out.set(x, y, z).project(camera);
    return out.z < 1 ? { x: (out.x + 1) / 2 * innerWidth, y: (1 - out.y) / 2 * innerHeight } : null;
  }
  function segD(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
    return Math.hypot(px - a.x - dx * t, py - a.y - dy * t);
  }
  function ground(mx, my) {
    ndc.set(mx / innerWidth * 2 - 1, -(my / innerHeight) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = 0;
    for (let i = 0; i < 2000 && t < 15000; i++) {
      const x = o.x + d.x * t, z = o.z + d.z * t, y = o.y + d.y * t, h = terrain.heightAt(x, z);
      if (y <= h) return { x, z };
      t += Math.max(1.5, (y - h) * 0.5);
    }
    return null;
  }
  function pick(mx, my) {
    let best = null, bd = 26;
    const cand = (d, o) => { if (d < bd) { bd = d; best = o; } };
    for (const s of secs()) {
      if (!built(s) && !mgr) continue;
      const o = built(s) ? { k: 'lift', id: s.id, x: s.a[0], z: s.a[1] } : { k: 'proj', id: LIFTP[s.id], x: s.a[0], z: s.a[1] };
      if (!o.id) continue;
      const a = scr(s.a[0], terrain.heightAt(...s.a) + 8, s.a[1], pa), b = scr(s.b[0], terrain.heightAt(...s.b) + 8, s.b[1], pb);
      if (a) cand(Math.hypot(mx - a.x, my - a.y), o);
      if (b) cand(Math.hypot(mx - b.x, my - b.y), { ...o, x: s.b[0], z: s.b[1] });
      if (a && b && !s.tunnel) cand(segD(mx, my, a, b) + 12, o);
    }
    for (const h of HUTS) {
      const own = G.side.huts[h.id]?.own;
      if (!own && !mgr) continue;
      const a = scr(h.s.x, h.s.y + 5, h.s.z, pa);
      if (a) cand(Math.hypot(mx - a.x, my - a.y) - 4, own ? { k: 'hut', id: h.id, x: h.s.x, z: h.s.z } : { k: 'proj', id: HUTP[h.id], x: h.s.x, z: h.s.z });
    }
    if (best) return best;
    const g = ground(mx, my), q = g && pistes.nearest(g.x, g.z, 80);
    if (!q || q.d > q.p.width / 2 + 6) return null;
    if (G.pistes[q.p.id]) return { k: 'piste', id: q.p.id, x: g.x, z: g.z };
    if (PROJ[q.p.id] && mgr) return { k: 'proj', id: PROJ[q.p.id], x: g.x, z: g.z };
    return null;
  }

  function liftCard(id) {
    const l = G.lifts.find(x => x.id === id), d = D.lifts.find(x => x.id === id);
    if (!l) return '';
    const st = status(l), run = G.phase === 'open' && st === 'run', w = run ? G.flow.wait[id] || 0 : 0;
    let h = '<h4>' + l.name + '<button data-act="x">✕</button></h4>' +
      row('Status', '<span style="color:' + (st === 'run' ? '#7be07b' : st === 'closed' ? '#c8ccd4' : '#ff6b5a') + '">' + why[st] + (l.broken ? ' (' + l.broken.label + ')' : '') + '</span>') +
      row('Zustand', '<span style="color:' + ccol(l.cond) + '">' + Math.round(l.cond) + ' %</span>') + bar(l.cond, ccol(l.cond)) +
      row('Wartezeit', run ? '<span style="color:' + wcol(w) + '">' + (w < 0.5 ? '–' : Math.round(w) + ' min') + '</span>' : '–') +
      row('Auslastung', run ? Math.round((l.util || 0) * 100) + ' %' : '–') +
      (d.custom ? row('Typ', D.custom.types[d.type].label + (d.link ? ' · <span style="color:' + D.custom.linkColor + '">⇄ Verbindungslift</span>' : '') + (CU.lift(G, id)?.base ? ' · Tallift' : '')) : '') +
      row('Kapazität', Math.round(3600 / d.gap * (l.places || d.places)).toLocaleString('de-DE') + ' P/h · ' + (l.places || d.places) + ' Plätze alle ' + d.gap + ' s · ' + d.ride + ' min');
    if (l.repairLeft > 0) h += row('Reparatur', 'noch ' + fmtDur(l.repairLeft));
    h += '<div class="a">';
    if (!l.build) h += btn('tog:lift:' + id, l.open ? 'Schließen' : 'Öffnen', { p: !l.open });
    if (l.broken && !l.repairLeft) {
      const q = repairQuote(l, false, G), qx = repairQuote(l, true, G);
      h += btn('repair:' + id, 'Reparieren ' + eur(q.cost), { p: true, tip: fmtDur(q.min) }) + btn('repair:' + id + ':x', 'Express ' + eur(qx.cost), { tip: fmtDur(qx.min) });
    }
    if (!l.build) h += btn('insp:' + id, serviced(G, l) ? 'Revision erledigt' : 'Revision ' + eur(D.inspect.cost), { off: !!(l.broken || serviced(G, l)) });
    if (d.custom) { const w = CU.canDemolish(G, d.proj); h += btn('cdemo:' + d.proj, 'Abriss +' + eur(CU.refundOf(G, d.proj)), { off: !!w, tip: w }); }
    const up = Object.keys(D.build.projects).find(k => D.build.projects[k].cab === id && !B.done(G, k) && !/^erst /.test(B.check(G, k)));
    if (up) h += '</div><div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:6px">' + projBody(up, true);
    return h + '</div>';
  }

  function pisteCard(id) {
    const o = G.pistes[id], d = D.pistes.find(x => x.id === id), lb = N.label(o), sc = N.score(G, id);
    const crowd = G.phase === 'open' ? (G.flow?.run?.[id] || 0) / d.km : 0, can = N.cannons(G)[id];
    let h = '<h4>Piste ' + id + ' ' + d.name + '<button data-act="x">✕</button></h4>' +
      row('Status', o.open ? '<span style="color:#7be07b">offen</span>' : '<span style="color:#ff6b5a">gesperrt</span>') +
      row('Schwierigkeit · Länge', d.level + ' · ' + d.km.toLocaleString('de-DE') + ' km') +
      row('Zustand', '<span style="color:' + ccol(o.cond) + '">' + Math.round(o.cond) + ' % · ' + lb + '</span>') + bar(o.cond, ccol(o.cond)) +
      row('Schneehöhe', Math.round(o.snow || 0) + ' cm') +
      row('Qualität', Math.round(sc)) +
      row('Gedränge', G.phase === 'open' ? Math.round(crowd) + ' Gäste/km' : '–') +
      row('Präparieren (Nacht)', o.grm ? 'ja' : 'nein') +
      row('Mittagspräparierung', o.mid ? 'ja' : 'nein') +
      (can ? row('Beschneiung (Nacht)', (o.gun || 0) + ' h · ' + can + ' Kanonen') : '') +
      (d.custom ? row('Eigene Piste', d.width + ' m breit · ' + (D.nodes[d.from] || '') + ' → ' + (D.nodes[d.to] || '')) : '');
    h += '<div class="a">' + btn('tog:piste:' + id, o.open ? 'Sperren' : 'Öffnen', { p: !o.open, off: !o.open && o.aper }) + btn('grm:' + id, o.grm ? 'Nicht präparieren' : 'Präparieren', { p: !o.grm }) + btn('mid:' + id, o.mid ? 'Mittag aus' : 'Mittag präparieren', { p: !o.mid });
    if (can) h += btn('gun:' + id + ':-' + D.snow.hStep, 'Beschneien −') + btn('gun:' + id + ':' + D.snow.hStep, 'Beschneien +', { p: true });
    if (d.custom) { const w = CU.canDemolishPiste(G, id); h += btn('pdemo:' + id, 'Abriss +' + eur(CU.prefundOf(G, id)), { off: !!w, tip: w }); }
    return h + '</div>';
  }

  function hutCard(id) {
    const o = G.side.huts[id], d = X.HUT[id], live = G.phase === 'open', w = live ? G.flow?.hutWait?.[id] || 0 : 0, lv = D.side.levels;
    let h = '<h4>' + d.name + '<button data-act="x">✕</button></h4>' +
      row('Status', o.build ? '<span style="color:#ffb14a">Umbau</span>' : o.open ? '<span style="color:#7be07b">offen</span>' : '<span style="color:#c8ccd4">geschlossen</span>') +
      row('Plätze', Math.round(X.seats(G, id)) + (live ? ' · belegt ' + Math.round(G.flow?.hut?.[id] || 0) : '')) +
      row('Wartezeit', live ? '<span style="color:' + wcol(w) + '">' + (w < 0.5 ? '–' : Math.round(w) + ' min') + '</span>' : '–') +
      row('Preisniveau', lv[o.level]?.label || o.level) +
      row('Personal nötig', X.hutNeed(G, id));
    h += '<div class="a">' + btn('tog:hut:' + id, o.open ? 'Schließen' : 'Öffnen', { p: !o.open, off: !!o.build });
    for (const k in lv) h += btn('lvl:' + id + ':' + k, lv[k].label, { p: o.level === k, off: G.phase === 'open', tip: G.phase === 'open' ? 'nur vor/nach dem Betrieb' : '' });
    const up = 'hut:' + id;
    if (D.build.projects[up] && !B.done(G, up)) h += '</div><div style="margin-top:8px;border-top:1px solid rgba(255,255,255,.1);padding-top:6px">' + projBody(up, true);
    return h + '</div>';
  }

  function projBody(id, sub) {
    const p = D.build.projects[id], why = B.check(G, id), j = B.job(G, id), done = B.done(G, id);
    let h = (sub ? '<b>' + p.label + '</b><br>' : '') + '<small>' + p.info + '</small>' + row('Kosten', eur(p.price)) + row('Bauzeit', 'über Nacht');
    if (done) return h + row('Status', '<span style="color:#7be07b">fertig</span>');
    if (j) return h + row('Status', j.left == null ? 'bis Saisonstart' : j.left === 0 ? 'fertig, wartet' : 'fertig morgen früh');
    h += '<div class="a">';
    if (G.summer && !why) h += btn('build:' + id + ':s', 'Bis Saisonstart bauen', { p: true });
    else if (why) h += '<small style="color:#ff6b5a;width:100%">' + why + '</small>';
    else h += btn('build:' + id, 'Bauen · über Nacht', { p: true });
    return h + '</div>';
  }

  const projCard = id => '<h4>' + D.build.projects[id].label + '<button data-act="x">✕</button></h4>' + projBody(id);

  function render(force) {
    if (!sel || !G) { card.hidden = true; last = ''; return; }
    const html = sel.k === 'lift' ? liftCard(sel.id) : sel.k === 'piste' ? (G.pistes[sel.id] ? pisteCard(sel.id) : '') : sel.k === 'hut' ? hutCard(sel.id) : projCard(sel.id);
    if (!html) { sel = null; card.hidden = true; return; }
    if (html !== last || force) { card.innerHTML = html; last = html; }
    card.hidden = false;
    const w = card.offsetWidth, h = card.offsetHeight;
    card.style.left = Math.max(8, Math.min(innerWidth - w - 300, cx + 14)) + 'px';
    card.style.top = Math.max(8, Math.min(innerHeight - h - 8, cy - 20)) + 'px';
  }

  card.addEventListener('pointerdown', e => {
    const b = e.target.closest('button');
    e.stopPropagation();
    if (!b || b.disabled) return;
    e.preventDefault();
    if (b.dataset.act === 'x') { sel = null; render(); return; }
    act(b.dataset.act);
    render(true);
  });
  const clickable = e => on && e.target.tagName === 'CANVAS' && !document.body.classList.contains('menu') && (mgr || e.altKey);
  let dx0 = 0, dy0 = 0;
  addEventListener('mousedown', e => { dx0 = e.clientX; dy0 = e.clientY; });
  addEventListener('click', e => {
    if (!clickable(e) || e.button || Math.hypot(e.clientX - dx0, e.clientY - dy0) > 5) return;
    const o = pick(e.clientX, e.clientY);
    cx = e.clientX; cy = e.clientY;
    sel = o;
    render(true);
  });
  addEventListener('dblclick', e => {
    if (!on || !mgr || e.target.tagName !== 'CANVAS') return;
    const o = pick(e.clientX, e.clientY) || ground(e.clientX, e.clientY);
    if (o) cam.goTo(o.x, o.z);
  });
  addEventListener('keydown', e => { if (on && (e.code === 'AltLeft' || e.code === 'AltRight')) e.preventDefault(); });

  let tAcc = 0;
  return {
    set(on2, g) { on = on2; G = g; if (!on) { sel = null; render(); setMgr(false); } },
    toggleIcons() { icons = !icons; return icons; },
    cycle() { if (!mgr) return null; mode = (mode + 1) % MODES.length; return MODES[mode]; },
    setMgr,
    get mgr() { return mgr; },
    hint(t) { hint.innerHTML = t; },
    update(g, dt) {
      G = g;
      if (!on) return;
      symbols();
      tAcc += dt;
      if (tAcc > 0.25) { tAcc = 0; overlay(); if (sel) render(); }
    }
  };

  function setMgr(v) {
    mgr = v;
    hint.hidden = !v;
    if (!v) { sel = null; render(); }
    overlay();
  }
}
