import * as S from './sim.js';
import { createUI } from './ui.js';
import { D } from './data.js';
import * as A from './assets.js';
import * as N from './snow.js';
import * as M from './marketing.js';
import * as X from './side.js';
import * as B from './build.js';
import { consume } from '../input.js';
import { createView3d } from './view3d.js';
import { createCustom } from './ui-custom.js';
import * as CU from './custom.js';

export function createBiz({ lift, player, crowd, pistes, env, scenery, cam, scene, terrain, village, props, hud }) {
  const ui = createUI({ refresh: () => ui.render(G), action, custom: (g, h) => cust.tab(g, h), price: (k, v) => { if (k.startsWith('side:')) X.setSidePrice(G, k.slice(5), v); else S.setPrice(G, k, v); save(); ui.render(G); } });
  const clk = S.clock();
  const keys = [];
  let G = null, active = false, hold = false, acc = 0, htxt = '';

  addEventListener('keydown', e => {
    if (!active || document.body.classList.contains('menu')) return;
    if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) keys.push('tab'); }
    else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') keys.push('+');
    else if (e.key === '-' || e.code === 'NumpadSubtract') keys.push('-');
    else if (!e.repeat && e.code === 'KeyH') keys.push('h');
    else if (!e.repeat && e.code === 'KeyO') keys.push('o');
  });
  const v3 = createView3d({ scene, cam, terrain, lift, pistes, scenery, act: a => action(a) });
  const cust = createCustom({ scene, cam, terrain, lift, village, props, hud, scenery, act: a => action(a), note: (t, s) => note(t, s) });
  function mgr(on) {
    if (on === v3.mgr) return;
    v3.setMgr(on);
  }

  function note(t, s = 2.5) { player.state.note = t; player.state.noteT = s; }

  function save() { if (G) S.save(G); }

  function action(a) {
    if (a === 'start' && S.startDay(G)) { ui.close(); save(); note('Lifte offen', 2); }
    else if (a === 'next' && S.nextDay(G)) { ui.open('prep'); save(); }
    else if (a === 'splan' && S.summerStage(G, 'plan')) save();
    else if (a === 'srep' && S.summerStage(G, 'report')) save();
    else if (a === 'sstart' && S.startSeason(G)) { ui.open('prep'); save(); note('Neue Saison ' + G.season + '/' + String(G.season + 1).slice(2), 3); }
    else if (a === 'close') ui.close();
    else if (a.startsWith('price:') && G.phase !== 'open') { const [, k, d] = a.split(':'); S.setPrice(G, k, G.prices[k] + Number(d)); save(); }
    else if (a.startsWith('tog:hut:')) { if (X.toggleHut(G, a.slice(8))) save(); }
    else if (a.startsWith('lvl:')) { const [, id, lv] = a.split(':'); if (X.setLevel(G, id, lv)) save(); }
    else if (a.startsWith('sp:')) { const [, k, d] = a.split(':'), o = k === 'rental' ? G.side.rental : k === 'school' ? G.side.school : G.side.park; if (X.setSidePrice(G, k, o.price + Number(d))) save(); }
    else if (a.startsWith('rent:')) { if (X.rentalAct(G, a.slice(5))) { save(); note(a === 'rent:buy' ? 'Neue Leihausrüstung gekauft' : 'Leihausrüstung gewartet', 2); } }
    else if (a.startsWith('tog:')) { const [, k, id] = a.split(':'), o = k === 'lift' ? G.lifts.find(x => x.id === id) : G.pistes[id]; if (!o) return; if (A.setOpen(G, k, id, !o.open)) save(); }
    else if (a.startsWith('repair:')) { const [, id, x] = a.split(':'); if (A.repair(G, id, x === 'x')) { ui.drop(id); save(); note('Reparatur beauftragt', 2); } }
    else if (a.startsWith('insp:')) { if (A.inspect(G, a.slice(5))) { save(); note('Revision durchgeführt', 2); } }
    else if (a.startsWith('drop:')) ui.drop(a.slice(5));
    else if (a.startsWith('grm:')) { if (N.setGroom(G, a.slice(4))) save(); }
    else if (a.startsWith('gun:')) { const [, id, d] = a.split(':'); if (N.setGun(G, id, Number(d))) save(); }
    else if (a.startsWith('mid:')) { if (N.setMid(G, a.slice(4))) save(); }
    else if (a.startsWith('mkt:')) { const id = a.slice(4); if (M.act(G, id)) { save(); note(D.mkt.campaigns[id].label + (D.mkt.campaigns[id].kind === 'weekly' ? (G.mkt.on[id] ? ' gestartet' : ' gestoppt') : ' gebucht'), 2); } }
    else if (a === 'tab:assets') ui.open(ui.view || 'office', 'assets');
    else if (a.startsWith('build:')) { const m = a.slice(6), w = m.endsWith(':s') ? 's' : '', id = w ? m.slice(0, -2) : m; if (B.order(G, id, w === 's')) { save(); note(D.build.projects[id].label + ' beauftragt', 2.5); } }
    else if (a.startsWith('loan:')) { const v = a.slice(5), n = v === 'all' ? -G.loan : Number(v), r = n > 0 ? B.borrow(G, n) : B.repay(G, -n); if (r) { save(); note(n > 0 ? 'Kredit aufgenommen' : 'Kredit getilgt', 1.5); } }
    else if (a.startsWith('mach:')) { if (B.groomer(G, Number(a.slice(5)))) save(); }
    else if (a.startsWith('can:')) { const [, id, d] = a.split(':'); if (B.cannon(G, id, Number(d))) save(); }
    else if (a.startsWith('pipe:')) { if (B.pipe(G, a.slice(5))) save(); }
    else if (a.startsWith('cplace:')) { if (cust.start(a.slice(7))) ui.close(); else note('Freier Ausbau noch nicht freigeschaltet', 2); }
    else if (a.startsWith('cdemo:')) { if (CU.demolish(G, a.slice(6))) { save(); note('Lift abgerissen', 2); } }
    else if (a === 'custom:built') save();
    else if (a === 'newgame') { begin(true); note('Neues Spiel', 2); return; }
    ui.render(G);
  }

  function park() {
    const v = lift.valleySpawn;
    lift.leave(player.state);
    player.spawnAt(v.x, v.z, v.heading);
  }

  const why = { build: 'Umbau', closed: 'geschlossen', fault: 'Störung', repair: 'Störung – Reparatur', insp: 'Inspektion', wind: 'Sturm', staff: 'kein Personal' };
  const LIFTS = Object.entries(D.build.projects).flatMap(([id, p]) => (p.lifts || []).map(l => [id, l]));
  const PROJ = Object.fromEntries(D.pistes.filter(p => p.proj).map(p => [p.id, p.proj]));
  function sync() {
    for (const [pid, lid] of LIFTS) {
      if (active ? B.done(G, pid) : !lift.planned.some(s => s.id === lid)) lift.addSection(lid);
      else lift.removeSection(lid);
    }
    for (const id in D.build.projects) {
      const j = active && B.job(G, id), p = D.build.projects[id];
      for (const lid of p.lifts || []) lift.site(lid, !!(j && j.left != null));
    }
    lift.shut.clear();
    for (const s of lift.sections) {
      const l = G && G.lifts.find(x => x.id === s.id);
      if (active && (G.phase !== 'open' || (l && !A.running(l)))) lift.shut.add(s.name);
      const st = active && l ? A.status(l) : 'run';
      if (st === 'run') lift.setOpen(s.id, true);
      else lift.setOpen(s.id, false, why[st]);
    }
    for (const p of pistes?.list || []) {
      const o = active && G.pistes[p.id];
      const nb = active && PROJ[p.id] && !o;
      pistes.setOpen(p.id, nb ? false : !o || o.open);
      pistes.setBuilt?.(p.id, !nb);
      if (!pistes.setSurface) continue;
      if (!o) { pistes.setSurface(p.id, nb ? -1 : 1, 0, 0); continue; }
      const lb = N.label(o), C = D.cover;
      pistes.setSurface(p.id, o.groomed && lb !== 'pulvrig' ? Math.min(1, Math.max(0, (o.cond - 40) / 45)) : 0, lb === 'pulvrig' ? 0 : Math.min(1, Math.max(0, (88 - o.cond) / 50)), Math.min(1, Math.max(0, (C.thin - o.snow) / (C.thin - C.minOpen + 6))));
    }
    cust.sync(G, active);
    env?.set(active ? G.weather?.today : null);
    if (scenery) scenery.wind = active && G.weather?.today ? G.weather.today.wind / 70 : 0.2;
    if (scenery?.setHut) for (const h of D.side.huts) scenery.setHut(h.name, !active || (G.side.huts[h.id].open && G.side.huts[h.id].own && G.phase !== 'closed'));
  }

  function begin(fresh) {
    if (fresh) S.clear();
    G = (!fresh && S.load()) || S.newGame();
    save();
    active = true;
    hold = false;
    ui.show(true);
    ui.close();
    ui.drop();
    for (const l of G.lifts) if (l.broken && !l.repairLeft) ui.toast(G, l.id);
    sync();
    ui.render(G);
    crowd?.setSource?.(view);
    village?.setSource?.(() => active && G.flow ? (G.flow.cars || 0) / Math.max(1, G.side.park.cap) : 0);
    v3.set(true, G);
  }

  const huts = Object.fromEntries(D.side.huts.map(h => [h.id, scenery?.huts?.find(x => x.name === h.name)]).filter(e => e[1]));
  const view = () => active && G.flow ? { f: G.flow, now: G.min - 1 + (G.phase === 'open' ? clk.frac() : 0), pace: lift.pace || 0, huts, places: id => G.lifts.find(x => x.id === id)?.places || D.lifts.find(x => x.id === id)?.places } : null;

  function end() {
    if (!active) return;
    save();
    mgr(false);
    v3.set(false, null);
    active = false;
    hold = false;
    ui.show(false);
    sync();
    crowd?.setSource?.(null);
    village?.setSource?.(null);
    village?.setScale?.(1);
    lift.pace = null;
  }

  function update(dt) {
    if (!active) return;
    mgr(cam.mode === 'fly');
    cust.setOn(v3.mgr);
    cust.update(G, dt);
    while (keys.length) {
      const k = keys.shift();
      if (k === '+' || k === '-') { const f = S.setFactor(G, k === '+' ? 1 : -1); note(f < 1 ? 'Zeitfaktor Echtzeit' : 'Zeitfaktor ×' + f, 1.2); }
      else if (k === 'tab') ui.togglePanel();
      else if (k === 'h') note(v3.toggleIcons() ? 'Symbole an' : 'Symbole aus', 1.2);
      else if (k === 'o') { const m = v3.cycle(); if (m) note('Pisten-Overlay: ' + m, 1.5); }
    }
    if (consume('KeyB')) {
      if (ui.view === 'office') ui.close();
      else if (!ui.view) ui.open('office');
    }
    const hv = !G.fin?.over && hold && (G.summer ? (G.summer.stage === 'plan' ? 'summer' : 'season') : G.phase === 'prep' ? 'prep' : 'daily');
    const ev = ['prep', 'daily', 'season', 'summer'].includes(ui.view) ? ui.view : v3.mgr && !ui.view ? hv : null;
    if ((consume('Enter') || consume('NumpadEnter')) && ev) action({ prep: 'start', daily: 'next', season: 'splan', summer: 'sstart' }[ev]);

    for (const e of clk(G, dt)) {
      if (e === 'warn') note('Lifte schließen in 15 min', 3);
      if (e === 'closed') { note('16:30 – Lifte schließen', 3); save(); }
      if (e.t === 'fault') { ui.toast(G, e.id); save(); }
      if (e.t === 'fixed' || e.t === 'insp') { const l = G.lifts.find(x => x.id === e.id); note(l.name + (e.t === 'fixed' ? ' läuft wieder' : ' – Inspektion fertig'), 2.5); ui.drop(e.id); }
    }
    sync();
    lift.pace = G.phase === 'open' ? D.time.gameSecPerSec * G.factor / 60 : null;
    village?.setScale?.(G.phase === 'open' ? G.factor : 1);

    const rc = lift.rideCabin();
    if (rc && G.phase !== 'open' && lift.stop.has(rc.sec.name)) park();
    const want = G.phase !== 'open' && !lift.riding();
    if (want && !hold) park();
    else if (hold) player.state.reset = false;
    hold = want;
    if (hold) {
      const v = G.fin?.over ? 'over' : G.summer ? (G.summer.stage === 'plan' ? 'summer' : 'season') : G.phase === 'prep' ? 'prep' : 'daily';
      if (ui.view !== v && !cust.active) ui.open(v);
      if (player.state.noteT > 0) player.state.noteT -= dt;
    } else if (G.phase === 'closed') player.state.hint = 'Lifte geschlossen – Fahrt endet an der Bergstation';

    v3.update(G, dt);
    if (v3.mgr) {
      const t = '<b>Flugmodus</b> · WASD/Leertaste/Shift fliegen · Maus ziehen schauen · Rad Tempo · Klick Objekt · Doppelklick hinfliegen · O Overlay · H Symbole · F landen' + (hold && !ui.view ? ' · <b>Enter ' + ({ prep: 'Tag starten', daily: 'nächster Tag', season: 'weiter', summer: 'Saison starten' }[hv] || '') + '</b>' : '');
      if (t !== htxt) { htxt = t; v3.hint(t); }
    }
    acc += dt;
    if (acc > 0.1 || hold) { acc = 0; ui.render(G); }
  }

  return { begin, end, update, save, get hold() { return active && hold; }, get active() { return active; }, get mgr() { return active && v3.mgr; } };
}
