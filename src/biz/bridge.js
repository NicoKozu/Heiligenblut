import * as S from './sim.js';
import { createUI } from './ui.js';
import { D } from './data.js';
import * as A from './assets.js';
import * as N from './snow.js';
import * as P from './staff.js';
import * as M from './marketing.js';
import * as X from './side.js';
import * as B from './build.js';
import * as V from './season.js';
import { consume } from '../input.js';

export function createBiz({ lift, player, crowd, pistes, env, scenery }) {
  const ui = createUI({ refresh: () => ui.render(G), action, price: (k, v) => { if (k.startsWith('side:')) X.setSidePrice(G, k.slice(5), v); else S.setPrice(G, k, v); save(); ui.render(G); } });
  const clk = S.clock();
  const keys = [];
  let G = null, active = false, hold = false, acc = 0;

  addEventListener('keydown', e => {
    if (!active || document.body.classList.contains('menu')) return;
    if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) keys.push('tab'); }
    else if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') keys.push('+');
    else if (e.key === '-' || e.code === 'NumpadSubtract') keys.push('-');
  });

  function note(t, s = 2.5) { player.state.note = t; player.state.noteT = s; }

  function save() { if (G) S.save(G); }

  function action(a) {
    if (a === 'start' && S.startDay(G)) { ui.close(); save(); note('Lifte offen', 2); }
    else if (a === 'next' && S.nextDay(G)) { ui.open('prep'); save(); }
    else if (a === 'splan' && S.summerStage(G, 'plan')) save();
    else if (a === 'srep' && S.summerStage(G, 'report')) save();
    else if (a === 'sstart' && S.startSeason(G)) { ui.open('prep'); save(); note('Neue Saison ' + G.season + '/' + String(G.season + 1).slice(2), 3); }
    else if (a.startsWith('rev:')) { if (V.revise(G, a.slice(4))) { save(); note('Revision durchgeführt', 2); } }
    else if (a === 'close') ui.close();
    else if (a.startsWith('price:') && G.phase !== 'open') { const [, k, d] = a.split(':'); S.setPrice(G, k, G.prices[k] + Number(d)); save(); }
    else if (a.startsWith('tog:hut:')) { if (X.toggleHut(G, a.slice(8))) save(); }
    else if (a.startsWith('lvl:')) { const [, id, lv] = a.split(':'); if (X.setLevel(G, id, lv)) save(); }
    else if (a.startsWith('sp:')) { const [, k, d] = a.split(':'), o = k === 'rental' ? G.side.rental : k === 'school' ? G.side.school : G.side.park; if (X.setSidePrice(G, k, o.price + Number(d))) save(); }
    else if (a.startsWith('rent:')) { if (X.rentalAct(G, a.slice(5))) { save(); note(a === 'rent:buy' ? 'Neue Leihausrüstung gekauft' : 'Leihausrüstung gewartet', 2); } }
    else if (a.startsWith('tog:')) { const [, k, id] = a.split(':'), o = k === 'lift' ? G.lifts.find(x => x.id === id) : G.pistes[id]; if (!o) return; if (A.setOpen(G, k, id, !o.open)) save(); else if (k === 'lift' && !o.open && !P.canOpen(G, id)) note('Zu wenig Liftpersonal für ' + o.name, 3); }
    else if (a.startsWith('repair:')) { const [, id, x] = a.split(':'); if (A.repair(G, id, x === 'x')) { ui.drop(id); save(); note('Reparatur beauftragt', 2); } }
    else if (a.startsWith('insp:')) { if (A.inspect(G, a.slice(5))) save(); }
    else if (a.startsWith('drop:')) ui.drop(a.slice(5));
    else if (a.startsWith('grm:')) { if (N.setGroom(G, a.slice(4))) save(); }
    else if (a.startsWith('gun:')) { const [, id, d] = a.split(':'); if (N.setGun(G, id, Number(d))) save(); }
    else if (a.startsWith('hire:')) { if (P.hire(G, a.slice(5))) save(); }
    else if (a.startsWith('fire:')) { if (P.fire(G, a.slice(5))) save(); }
    else if (a.startsWith('wage:')) { if (P.setWage(G, Number(a.slice(5)))) save(); }
    else if (a.startsWith('mkt:')) { const id = a.slice(4); if (M.act(G, id)) { save(); note(D.mkt.campaigns[id].label + (D.mkt.campaigns[id].kind === 'weekly' ? (G.mkt.on[id] ? ' gestartet' : ' gestoppt') : ' gebucht'), 2); } }
    else if (a === 'bonus') { if (P.bonus(G)) { save(); note('Prämie ausgezahlt', 2); } }
    else if (a === 'tab:assets') ui.open(ui.view || 'office', 'assets');
    else if (a.startsWith('build:')) { const m = a.slice(6), w = m.endsWith(':s') ? 's' : '', id = w ? m.slice(0, -2) : m; if (B.order(G, id, w === 's')) { save(); note(D.build.projects[id].label + ' beauftragt', 2.5); } }
    else if (a.startsWith('loan:')) { const v = a.slice(5), n = v === 'all' ? -G.loan : Number(v), r = n > 0 ? B.borrow(G, n) : B.repay(G, -n); if (r) { save(); note(n > 0 ? 'Kredit aufgenommen' : 'Kredit getilgt', 1.5); } }
    else if (a.startsWith('mach:')) { if (B.groomer(G, Number(a.slice(5)))) save(); }
    else if (a.startsWith('can:')) { const [, id, d] = a.split(':'); if (B.cannon(G, id, Number(d))) save(); }
    else if (a.startsWith('pipe:')) { if (B.pipe(G, a.slice(5))) save(); }
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
      for (const lid of [...(p.lifts || []), ...(p.close || [])]) lift.site(lid, !!(j && j.left != null));
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
    env?.set(active ? G.weather?.today : null);
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
  }

  const huts = Object.fromEntries(D.side.huts.map(h => [h.id, scenery?.huts?.find(x => x.name === h.name)]).filter(e => e[1]));
  const view = () => active && G.flow ? { f: G.flow, frac: G.phase === 'open' ? clk.frac() : 0, pace: lift.pace || 0, huts } : null;

  function end() {
    if (!active) return;
    save();
    active = false;
    hold = false;
    ui.show(false);
    sync();
    crowd?.setSource?.(null);
    lift.pace = null;
  }

  function update(dt) {
    if (!active) return;
    while (keys.length) {
      const k = keys.shift();
      if (k === '+' || k === '-') note('Zeitfaktor ×' + S.setFactor(G, k === '+' ? 1 : -1), 1.2);
      else if (k === 'tab') ui.togglePanel();
    }
    if (consume('KeyB')) {
      if (ui.view === 'office') ui.close();
      else if (!ui.view) ui.open('office');
    }
    if ((consume('Enter') || consume('NumpadEnter')) && ['prep', 'daily', 'season', 'summer'].includes(ui.view)) action({ prep: 'start', daily: 'next', season: 'splan', summer: 'sstart' }[ui.view]);

    for (const e of clk(G, dt)) {
      if (e === 'warn') note('Lifte schließen in 15 min', 3);
      if (e === 'closed') { note('16:30 – Lifte schließen', 3); save(); }
      if (e.t === 'fault') { ui.toast(G, e.id); save(); }
      if (e.t === 'fixed' || e.t === 'insp') { const l = G.lifts.find(x => x.id === e.id); note(l.name + (e.t === 'fixed' ? ' läuft wieder' : ' – Inspektion fertig'), 2.5); ui.drop(e.id); }
    }
    sync();
    lift.pace = G.phase === 'open' ? D.time.gameSecPerSec * G.factor / 60 : null;

    const rc = lift.rideCabin();
    if (rc && G.phase !== 'open' && lift.stop.has(rc.sec.name)) park();
    const want = G.phase !== 'open' && !lift.riding();
    if (want && !hold) park();
    else if (hold) player.state.reset = false;
    hold = want;
    if (hold) {
      const v = G.fin?.over ? 'over' : G.summer ? (G.summer.stage === 'plan' ? 'summer' : 'season') : G.phase === 'prep' ? 'prep' : 'daily';
      if (ui.view !== v) ui.open(v);
      if (player.state.noteT > 0) player.state.noteT -= dt;
    } else if (G.phase === 'closed') player.state.hint = 'Lifte geschlossen – Fahrt endet an der Bergstation';

    acc += dt;
    if (acc > 0.1 || hold) { acc = 0; ui.render(G); }
  }

  return { begin, end, update, save, get hold() { return active && hold; }, get active() { return active; } };
}
