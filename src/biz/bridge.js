import * as S from './sim.js';
import { createUI } from './ui.js';
import { D } from './data.js';
import { consume } from '../input.js';

export function createBiz({ lift, player, crowd }) {
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
    ui.render(G);
  }

  function park() {
    const v = lift.valleySpawn;
    lift.leave(player.state);
    player.spawnAt(v.x, v.z, v.heading);
  }

  function sync() {
    lift.shut.clear();
    for (const s of lift.sections) {
      const l = G.lifts.find(x => x.name === s.name);
      if (G.phase !== 'open' || (l && !l.open)) lift.shut.add(s.name);
    }
  }

  function begin(fresh) {
    if (fresh) S.clear();
    G = (!fresh && S.load()) || S.newGame();
    save();
    active = true;
    hold = false;
    ui.show(true);
    ui.close();
    sync();
    ui.render(G);
  }

  function end() {
    if (!active) return;
    save();
    active = false;
    hold = false;
    ui.show(false);
    lift.shut.clear();
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
    }
    sync();
    if (crowd) {
      const f = G.flow, open = G.phase === 'open';
      crowd.setDensity(open ? f.present / D.flow.densityRef : 0);
      crowd.setQueue(open && f.wait.rossbach > D.flow.pulkWait ? f.queue.rossbach * 0.12 : 0);
    }

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
