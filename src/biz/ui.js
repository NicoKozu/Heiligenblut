import { D } from './data.js';
import { fmtDate, fmtClock, phase as calPhase } from './calendar.js';
import { costToday, report, prev } from './sim.js';

const CSS = `
#biz-panel{position:fixed;right:12px;top:12px;z-index:3;width:280px;box-sizing:border-box;max-height:calc(100vh - clamp(140px,22vw,240px) - 36px);overflow:auto;padding:10px 14px;background:rgba(12,32,54,.82);border:1px solid rgba(255,255,255,.15);border-radius:10px;color:#fff;font:14px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);backdrop-filter:blur(6px);transition:transform .25s}
#biz-panel.off{transform:translateX(calc(100% - 26px))}
#biz-panel h3{margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;opacity:.65;font-weight:600}
#biz-panel .big{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
#biz-panel .big b{font-size:24px;font-variant-numeric:tabular-nums}
#biz-panel .row{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
#biz-panel .row span{opacity:.75}
#biz-panel .row b{font-variant-numeric:tabular-nums;font-weight:600}
#biz-panel .sep{height:1px;background:rgba(255,255,255,.12);margin:6px 0}
#biz-panel .keys{margin-top:6px;font-size:11px;opacity:.55}
#biz-panel .tab{display:none;position:absolute;left:6px;top:8px;font-size:11px;writing-mode:vertical-rl}
#biz-panel.off .tab{display:block;opacity:.9}
.biz-good{color:#7be07b}.biz-warn{color:#ffd84a}.biz-bad{color:#ff6b5a}
.biz-phase{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;font-weight:600}
.biz-phase.prep{background:#7a5cff55;color:#d6ccff}.biz-phase.open{background:#2fae5e55;color:#a6f0c0}.biz-phase.closed{background:#e0803055;color:#ffd0a6}
#biz-over{position:fixed;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,22,40,.45);color:#fff;font:15px system-ui,sans-serif}
#biz-over[hidden]{display:none}
#biz-over .card{width:min(680px,100%);max-height:100%;overflow:auto;box-sizing:border-box;padding:20px 24px;background:rgba(12,32,54,.9);border:1px solid rgba(255,255,255,.15);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);backdrop-filter:blur(6px)}
#biz-over h1{margin:0;font-size:26px}
#biz-over h2{margin:16px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;opacity:.65;font-weight:600}
#biz-over .sub{opacity:.75;margin:2px 0 0}
#biz-over .tabs{display:flex;gap:4px;margin:14px 0 4px;flex-wrap:wrap}
#biz-over .tabs button{font:inherit;font-size:13px;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:6px;padding:4px 10px;cursor:pointer}
#biz-over .tabs button.on{background:rgba(90,162,255,.28);border-color:#5aa2ff}
#biz-over table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
#biz-over td{padding:4px 0;border-bottom:1px solid rgba(255,255,255,.08)}
#biz-over td:last-child{text-align:right}
#biz-over tr.sum td{font-weight:700;border-top:1px solid rgba(255,255,255,.3)}
#biz-over .note{padding:8px 10px;background:rgba(255,255,255,.06);border-radius:6px;opacity:.85}
#biz-over .go{display:flex;gap:8px;margin-top:18px;position:sticky;bottom:-20px;padding:10px 0 4px;background:rgba(12,32,54,.96)}
#biz-over .go button{flex:1;font:inherit;font-weight:600;color:#fff;padding:11px;border-radius:8px;cursor:pointer;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}
#biz-over .go button.primary{background:#2f7de1;border-color:#5aa2ff}
#biz-over .go button.primary:hover{background:#3b8cf2}
body.biz #hud-panel{right:auto;left:12px}
body.biz #fps{top:auto;bottom:12px}
body.menu #biz-panel,body.menu #biz-over{display:none}
`;

export function eur(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Mio €';
  return Math.round(n).toLocaleString('de-DE') + ' €';
}

const num = n => Math.round(n).toLocaleString('de-DE');
const trend = (a, b) => b == null || Math.round(a) === Math.round(b) ? '' : a > b ? ' <span class="biz-good">▲</span>' : ' <span class="biz-bad">▼</span>';
const tone = (v, good, warn) => v >= good ? 'biz-good' : v >= warn ? 'biz-warn' : 'biz-bad';
const row = (k, v, c = '') => '<div class="row"><span>' + k + '</span><b class="' + c + '">' + v + '</b></div>';
const tr = (k, v, c = '') => '<tr class="' + c + '"><td>' + k + '</td><td>' + v + '</td></tr>';

export function createUI(h) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'biz-panel';
  const over = document.createElement('div');
  over.id = 'biz-over';
  over.hidden = true;
  document.body.append(panel, over);
  let view = null, tab = 'over', last = '';

  over.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tab) { tab = b.dataset.tab; h.refresh(); }
    else if (b.dataset.act) h.action(b.dataset.act);
  });
  panel.addEventListener('click', () => { if (panel.classList.contains('off')) panel.classList.remove('off'); });

  function renderPanel(G) {
    const p = prev(G), c = costToday(G);
    const html =
      '<span class="tab">Tab</span>' +
      '<h3>Skigebiet Heiligenblut</h3>' +
      '<div class="big"><span>' + fmtDate(G.date) + '</span><b>' + fmtClock(G.min) + '</b></div>' +
      row('Phase', '<span class="biz-phase ' + G.phase + '">' + D.phaseLabels[G.phase] + '</span>') +
      row('Zeitfaktor', '×' + G.factor + (G.phase === 'open' ? '' : ' (steht)')) +
      '<div class="sep"></div>' +
      row('Kasse', eur(G.cash) + trend(G.cash, p && p.cash), tone(G.cash, 500000, 0)) +
      row('Kosten heute', eur(c)) +
      row('Umsatz heute', eur(0)) +
      row('Ruf', num(G.rep) + trend(G.rep, p && p.rep), tone(G.rep, 60, 40)) +
      '<div class="sep"></div>' +
      G.lifts.map(l => row(l.name, (G.phase === 'open' && l.open ? '● offen' : '○ zu'), G.phase === 'open' && l.open ? 'biz-good' : '')).join('') +
      '<div class="keys">+/− Zeit · B Büro · Tab Panel</div>';
    if (html !== last) { last = html; panel.innerHTML = html; }
  }

  const tabs = () => '<div class="tabs">' + [['over', 'Übersicht']].map(([k, v]) => '<button data-tab="' + k + '" class="' + (tab === k ? 'on' : '') + '">' + v + '</button>').join('') + '</div>';

  function overview(G) {
    const r = report(G), dem = D.demand[calPhase(G.date)];
    return '<h2>Saison</h2>' +
      '<table>' + tr('Saisonphase', dem.label) + tr('Nachfrage-Basis heute', num(G.today.demand) + ' Gäste') + tr('Spieltag', num(G.day)) + '</table>' +
      '<h2>Finanzen</h2>' +
      '<table>' + tr('Kasse', eur(G.cash)) + tr('Kredit', eur(G.loan)) + tr('Kreditrahmen', eur(D.start.credit)) + (r ? tr('Kosten Vortag', eur(r.cost)) : '') + '</table>' +
      '<h2>Anlagen</h2>' +
      '<table>' + G.lifts.map(l => tr(l.name, 'Zustand <span class="' + tone(l.cond, 75, 50) + '">' + l.cond + ' %</span>')).join('') + '</table>';
  }

  function prep(G) {
    return '<h1>Vorbereitung</h1><p class="sub">' + fmtDate(G.date) + ' · Betrieb 08:30–16:30</p>' + tabs() +
      '<h2>Wettervorschau</h2><p class="note">Noch kein Wetterdienst – Schnee und Wetter folgen.</p>' +
      overview(G) +
      '<div class="go"><button class="primary" data-act="start">Lifte öffnen / Tag starten ⏎</button></div>';
  }

  function daily(G) {
    const r = report(G);
    const costs = Object.entries(r.costs).filter(([, v]) => v > 0).map(([k, v]) => tr(D.costLabels[k] || k, eur(-v))).join('');
    return '<h1>Tagesbericht</h1><p class="sub">' + fmtDate(r.date) + ' · Feierabend 16:30</p>' + tabs() +
      (tab === 'over' ?
        '<h2>Kosten nach Posten</h2><table>' + costs + tr('Summe Kosten', eur(-r.cost), 'sum') + '</table>' +
        '<h2>Einnahmen</h2><table>' + tr('Tickets', eur(r.revenue)) + tr('Gäste', num(r.guests)) + '</table>' +
        '<h2>Kasse</h2><table>' + tr('vorher', eur(r.cashStart)) + tr('Ergebnis', '<span class="' + (r.cash >= r.cashStart ? 'biz-good' : 'biz-bad') + '">' + eur(r.cash - r.cashStart) + '</span>') + tr('nachher', eur(r.cash), 'sum') + '</table>'
        : '') +
      '<div class="go"><button class="primary" data-act="next">Nächster Tag ⏎</button></div>';
  }

  function office(G) {
    return '<h1>Büro</h1><p class="sub">' + fmtDate(G.date) + ' · ' + fmtClock(G.min) + ' · ' + D.phaseLabels[G.phase] + (G.phase === 'open' ? ' – Zeit läuft weiter' : '') + '</p>' + tabs() +
      overview(G) + '<div class="go"><button data-act="close">Schließen (B)</button></div>';
  }

  const views = { prep, daily, office };

  return {
    render(G) {
      renderPanel(G);
      if (view) { const html = '<div class="card">' + views[view](G) + '</div>'; if (over.dataset.v !== html) { over.innerHTML = html; over.dataset.v = html; } }
    },
    open(v) { if (view !== v) tab = 'over'; view = v; over.hidden = false; over.dataset.v = ''; },
    close() { view = null; over.hidden = true; over.innerHTML = ''; },
    get view() { return view; },
    togglePanel() { panel.classList.toggle('off'); },
    show(on) { panel.hidden = !on; if (!on) this.close(); document.body.classList.toggle('biz', on); }
  };
}
