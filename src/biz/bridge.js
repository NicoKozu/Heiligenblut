import * as S from './sim.js';
import { createUI } from './ui.js';
import { D } from './data.js';
import * as A from './assets.js';
import { consume } from '../input.js';

export function createBiz({ lift, player, crowd, pistes }) {
  const ui = createUI({ refresh: () => ui.render(G), action, price: (k, v) => { S.setPrice(G, k, v); save(); ui.render(G); } });
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
    else if (a === 'close') ui.close();
    else if (a.startsWith('price:') && G.phase !== 'open') { const [, k, d] = a.split(':'); S.setPrice(G, k, G.prices[k] + Number(d)); save(); }
    else if (a.startsWith('tog:')) { const [, k, id] = a.split(':'), o = k === 'lift' ? G.lifts.find(x => x.id === id) : G.pistes[id]; if (o && A.setOpen(G, k, id, !o.open)) save(); }
    else if (a.startsWith('repair:')) { const [, id, x] = a.split(':'); if (A.repair(G, id, x === 'x')) { ui.drop(id); save(); note('Reparatur beauftragt', 2); } }
    else if (a.startsWith('insp:')) { if (A.inspect(G, a.slice(5))) save(); }
    else if (a.startsWith('drop:')) ui.drop(a.slice(5));
    else if (a === 'tab:assets') ui.open(ui.view || 'office', 'assets');
    ui.render(G);
  }

  function park() {
    const v = lift.valleySpawn;
    lift.leave(player.state);
    player.spawnAt(v.x, v.z, v.heading);
  }

  const why = { closed: 'geschlossen', fault: 'Störung', repair: 'Störung – Reparatur', insp: 'Inspektion' };
  function sync() {
    lift.shut.clear();
    for (const s of lift.sections) {
      const l = G && G.lifts.find(x => x.id === s.id);
      if (active && (G.phase !== 'open' || (l && !A.running(l)))) lift.shut.add(s.name);
      const st = active && l ? A.status(l) : 'run';
      if (st === 'run') lift.setOpen(s.id, true);
      else lift.setOpen(s.id, false, why[st]);
    }
    for (const p of pistes?.list || []) pistes.setOpen(p.id, !active || !G.pistes[p.id] || G.pistes[p.id].open);
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
  }

  function end() {
    if (!active) return;
    save();
    active = false;
    hold = false;
    ui.show(false);
    sync();
    crowd?.setDensity(1);
    crowd?.setQueue(0);
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
    if ((consume('Enter') || consume('NumpadEnter')) && (ui.view === 'prep' || ui.view === 'daily')) action(ui.view === 'prep' ? 'start' : 'next');

    for (const e of clk(G, dt)) {
      if (e === 'warn') note('Lifte schließen in 15 min', 3);
      if (e === 'closed') { note('16:30 – Lifte schließen', 3); save(); }
      if (e.t === 'fault') { ui.toast(G, e.id); save(); }
      if (e.t === 'fixed' || e.t === 'insp') { const l = G.lifts.find(x => x.id === e.id); note(l.name + (e.t === 'fixed' ? ' läuft wieder' : ' – Inspektion fertig'), 2.5); ui.drop(e.id); }
    }
    sync();
    if (crowd) {
      const f = G.flow, open = G.phase === 'open';
      crowd.setDensity(open ? f.present / D.flow.densityRef : 0);
      crowd.setQueue(open && f.wait.rossbach > D.flow.pulkWait ? f.queue.rossbach * 0.12 : 0);
    }

    const rc = lift.rideCabin();
    if (rc && G.phase !== 'open' && lift.stop.has(rc.sec.name)) park();
    const want = G.phase !== 'open' && !lift.riding();
    if (want && !hold) park();
    else if (hold) player.state.reset = false;
    hold = want;
    if (hold) {
      const v = G.phase === 'prep' ? 'prep' : 'daily';
      if (ui.view !== v) ui.open(v);
      if (player.state.noteT > 0) player.state.noteT -= dt;
    } else if (G.phase === 'closed') player.state.hint = 'Lifte geschlossen – Fahrt endet an der Bergstation';

    acc += dt;
    if (acc > 0.1 || hold) { acc = 0; ui.render(G); }
  }

  return { begin, end, update, save, get hold() { return active && hold; }, get active() { return active; } };
}
