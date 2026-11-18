import { D } from './data.js';
import { count } from './people.js';
import { pl } from './area.js';
import { fmtDate, fmtClock, phase as calPhase } from './calendar.js';
import { costToday, report, prev, forecast } from './sim.js';
import { avgPrice, priceFactor } from './demand.js';
import { status, repairQuote, fmtDur } from './assets.js';
import { live, stars } from './satisfaction.js';
import { label as wLabel, fmtT, stormy, avalClose } from './weather.js';
import { GROUPS, duty, needs, wages, heads, dayCost, pendingOf, nextArrival, bonusCost, bonusDone } from './staff.js';
import { label as qLabel, score, avgSnow, gunPlan, nightTotals, nightTemp, demandExtra } from './snow.js';
import * as X from './side.js';
import { finTab, buildTab, overView } from './ui-build.js';
import { seasonView, summerView, drawSeason } from './ui-season.js';
import { SEGS, CAMPAIGNS, status as mStatus, weeklyCost, pending, canEarly, earlyQuote, kFactor, mFactor, wearF } from './marketing.js';

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
#biz-over .cap{font-size:12px;opacity:.7;margin:8px 0 2px}
#biz-over canvas[data-sc]{width:100%;height:120px;display:block}
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
#biz-over .price{display:flex;align-items:center;gap:6px;justify-content:flex-end}
#biz-over .price button{font:inherit;width:30px;height:28px;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:6px;cursor:pointer}
#biz-over .price input{font:inherit;width:64px;height:26px;text-align:right;color:#fff;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:0 6px}
#biz-over .fc{font-size:22px;font-weight:700}
#biz-panel .lift{display:grid;grid-template-columns:1fr auto auto;gap:8px;padding:2px 0}
#biz-panel .lift span{opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#biz-panel .lift b.st{font-size:12px}
#biz-panel .lift b{font-variant-numeric:tabular-nums;font-weight:600;min-width:44px;text-align:right}
#biz-panel .as{display:grid;grid-template-columns:10px 1fr 46px 40px;align-items:center;gap:6px;padding:2px 0;font-size:13px}
#biz-panel .as span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.85}
#biz-panel .as b{font-variant-numeric:tabular-nums;font-weight:600;text-align:right;font-size:12px}
.biz-dot{width:9px;height:9px;border-radius:50%;display:inline-block;background:#7be07b}
.biz-dot.warn{background:#ffd84a}.biz-dot.bad{background:#ff6b5a}
.biz-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
.biz-bar i{display:block;height:100%}
.biz-seg{display:flex;height:8px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,.12);margin:3px 0 2px}
.biz-seg i{display:block;height:100%}
.biz-legend{display:flex;flex-wrap:wrap;gap:2px 9px;font-size:11px;opacity:.85}
.biz-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:3px}
.biz-sw{font:inherit;font-size:11px;font-weight:600;padding:1px 0;width:40px;border-radius:9px;cursor:pointer;color:#fff;border:1px solid rgba(255,255,255,.25);background:#2fae5e88}
.biz-sw.off{background:#c0392b88}
.biz-sw[disabled]{opacity:.4;cursor:default}
#biz-toast{position:fixed;left:260px;right:304px;top:12px;z-index:4;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}
#biz-toast .t{width:100%;max-width:460px;box-sizing:border-box}
@media (max-width:820px){#biz-toast{left:12px;right:12px;top:auto;bottom:12px}}
#biz-toast .t{pointer-events:auto;display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(120,24,20,.92);border:1px solid #ff6b5a;border-radius:9px;color:#fff;font:14px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35)}
#biz-toast .t span{flex:1}
#biz-toast button,#biz-over .btn{font:inherit;font-size:12px;font-weight:600;color:#fff;padding:4px 9px;border-radius:6px;cursor:pointer;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.3);white-space:nowrap}
#biz-toast button.primary,#biz-over .btn.primary{background:#2f7de1;border-color:#5aa2ff}
#biz-over .btn[disabled]{opacity:.4;cursor:default}
#biz-over .acts{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
#biz-over .log{font-size:13px;opacity:.85;max-height:160px;overflow:auto}
#biz-over .log div{padding:1px 0}
body.menu #biz-toast{display:none}
body.biz #hud-panel{right:auto;left:12px}
body.biz #fps{top:auto;bottom:12px}
body.menu #biz-panel,body.menu #biz-over{display:none}
#biz-panel .satb{display:flex;align-items:center;gap:10px;width:100%;font:inherit;color:#fff;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 8px;margin:4px 0 6px;cursor:pointer;text-align:left}
#biz-panel .satb b{font-size:28px;font-variant-numeric:tabular-nums;line-height:1}
#biz-panel .satb span{flex:1;font-size:12px;opacity:.75;line-height:1.25}
#biz-panel .satb em{font-style:normal;font-size:11px;opacity:.6}
.biz-part{display:grid;grid-template-columns:104px 1fr 28px;align-items:center;gap:6px;padding:1px 0;font-size:12px}
.biz-part span{opacity:.8;white-space:nowrap}
.biz-part b{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
#biz-over .biz-part{grid-template-columns:150px 1fr 36px;font-size:14px;padding:3px 0}
#biz-over .satbig{display:flex;align-items:center;gap:14px;margin:6px 0}
#biz-over .satbig b{font-size:34px}
#biz-over .stars{color:#ffd84a;letter-spacing:2px}
#biz-over .voice{padding:6px 10px;margin:4px 0;background:rgba(255,255,255,.06);border-left:3px solid #5aa2ff;border-radius:4px}
#biz-over .voice small{display:block;opacity:.65;font-size:12px}
#biz-over canvas{width:100%;height:130px;display:block}
#biz-over .pie{display:flex;gap:18px;align-items:center}
#biz-over .pie canvas{width:130px;height:130px;flex:none}
#biz-over .lvs{display:inline-flex;gap:3px;margin-top:4px}
#biz-over .lvs button{font:inherit;font-size:12px;color:#fff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);border-radius:5px;padding:2px 8px;cursor:pointer}
#biz-over .lvs button.on{background:rgba(255,177,74,.3);border-color:#ffb14a}
#biz-over .lvs button:disabled{cursor:default;opacity:.55}
#biz-over .lvs button.on:disabled{opacity:.9}
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
const mins = w => w < 0.5 ? '–' : Math.round(w) + ' min';
const wtone = w => w < D.flow.wait[0] ? 'biz-good' : w < D.flow.wait[1] ? 'biz-warn' : 'biz-bad';
const sumv = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const revLabel = k => D.tickets[k]?.label || D.side.areas[k]?.label || k;
const ticketSum = o => Object.entries(o || {}).reduce((a, [k, v]) => a + (k in D.tickets ? v : 0), 0);
const DOT = { run: '', closed: 'bad', fault: 'bad', repair: 'bad', insp: 'warn', wind: 'bad', staff: 'bad', build: 'warn' };
const bar = v => '<div class="biz-bar"><i style="width:' + Math.round(v) + '%;background:' + (v >= 75 ? '#7be07b' : v >= 50 ? '#ffd84a' : '#ff6b5a') + '"></i></div>';
const sw = (k, id, on, dis) => '<button class="biz-sw' + (on ? '' : ' off') + '" data-act="tog:' + k + ':' + id + '"' + (dis ? ' disabled' : '') + '>' + (on ? 'auf' : 'zu') + '</button>';
const pName = id => D.pistes.find(p => p.id === id).name;
const ztone = z => z >= 70 ? 'biz-good' : z >= 50 ? 'biz-warn' : 'biz-bad';
const zcol = z => z >= 70 ? '#7be07b' : z >= 50 ? '#ffd84a' : '#ff6b5a';
const dec = (n, d = 1) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const starStr = n => { const r = Math.round(n); return '★'.repeat(r) + '☆'.repeat(5 - r); };
function face(z, s = 30) {
  const k = (z - 50) / 50 * 4;
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 30 30" style="flex:none"><circle cx="15" cy="15" r="14" fill="' + zcol(z) + '"/><circle cx="10.5" cy="12" r="1.8" fill="#13263a"/><circle cx="19.5" cy="12" r="1.8" fill="#13263a"/><path d="M9 19.5 Q15 ' + (19.5 + k).toFixed(1) + ' 21 19.5" stroke="#13263a" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
}
function parts(sat) {
  return Object.entries(D.sat.labels).map(([k, v]) => '<div class="biz-part"><span>' + v + ' <em style="opacity:.55;font-style:normal">' + Math.round(D.sat.w[k] * 100) + '%</em></span>' + bar(sat.parts[k]) + '<b>' + Math.round(sat.parts[k]) + '</b></div>').join('') +
    (sat.lost >= 1 ? '<div class="biz-part"><span>Ohne Fahrt abgereist</span><span></span><b class="biz-bad">' + num(sat.lost) + '</b></div>' : '') +
    (sat.ded ? '<div class="biz-part"><span>Ereignis-Abzug</span><span></span><b class="biz-bad">−' + Math.round(sat.ded) + '</b></div>' : '');
}
const guestsN = G => G.phase === 'prep' ? forecast(G).n : Math.max(G.today.expected || 0, G.today.guests || 0);
const sumK = o => GROUPS.reduce((a, k) => a + o[k], 0);
const ddmm = d => d.slice(8) + '.' + d.slice(5, 7) + '.';
const tr = (k, v, c = '') => '<tr class="' + c + '"><td>' + k + '</td><td>' + v + '</td></tr>';
const atone = a => a >= 4 ? 'biz-bad' : a >= 3 ? 'biz-warn' : 'biz-good';
const stone = s => s >= 60 ? 'biz-good' : s >= 30 ? 'biz-warn' : 'biz-bad';
const wx = d => wLabel(d.type).icon + ' ' + wLabel(d.type).label;
const wline = d => wx(d) + ' · Tal ' + fmtT(d.tTal) + ' · Berg ' + fmtT(d.tBerg) + ' · Wind ' + d.wind + ' km/h' + (d.cm ? ' · Neuschnee ' + d.cm + ' cm' : '');
function weatherTable(G) {
  const w = G.weather;
  if (!w) return '';
  const t = w.today;
  return '<table>' + tr('<b>Heute</b> ' + wx(t), 'Tal ' + fmtT(t.tTal) + ' · Berg ' + fmtT(t.tBerg) + ' · <span class="' + (stormy(t) ? 'biz-bad' : '') + '">' + t.wind + ' km/h</span>' + (t.cm ? ' · ' + t.cm + ' cm' : '')) +
    w.ahead.map((d, i) => tr(fmtDate(d.date).slice(0, 9) + ' ' + wx(d.fc) + ' <span style="opacity:.55">' + Math.round(D.weather.acc[i] * 100) + ' %</span>', 'Tal ' + fmtT(d.fc.tTal) + ' · Berg ' + fmtT(d.fc.tBerg) + ' · ' + d.fc.wind + ' km/h' + (d.fc.cm ? ' · ~' + d.fc.cm + ' cm' : ''))).join('') +
    tr('Lawinenwarnstufe', '<span class="' + atone(w.aval) + '">' + w.aval + '</span>' + (w.aval >= 4 ? ' – Piste ' + avalClose(G).join('/') + ' sperren!' : '')) +
    tr('Ø Schneehöhe Pisten', '<span class="' + stone(avgSnow(G)) + '">' + Math.round(avgSnow(G)) + ' cm</span>') + '</table>';
}

const segBar = o => { const t = SEGS.reduce((a, s) => a + (o[s] || 0), 0) || 1; return '<div class="biz-seg">' + SEGS.map(s => '<i style="width:' + ((o[s] || 0) / t * 100).toFixed(1) + '%;background:' + D.segs[s].color + '"></i>').join('') + '</div>'; };
const segLegend = (o, f = v => num(v)) => '<div class="biz-legend">' + SEGS.map(s => '<span><i style="background:' + D.segs[s].color + '"></i>' + D.segs[s].label + ' ' + f(o[s] || 0) + '</span>').join('') + '</div>';
const pct = f => (f >= 1 ? '+' : '−') + dec(Math.abs(f - 1) * 100) + ' %';
export function createUI(h) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.id = 'biz-panel';
  const over = document.createElement('div');
  over.id = 'biz-over';
  over.hidden = true;
  const toastEl = document.createElement('div');
  toastEl.id = 'biz-toast';
  document.body.append(panel, over, toastEl);
  let view = null, tab = 'over', last = '', satOpen = false;
  const toasts = new Map();
  toastEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) h.action(b.dataset.act); });

  over.addEventListener('pointerdown', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled || e.button) return;
    e.preventDefault();
    if (b.dataset.tab) { tab = b.dataset.tab; h.refresh(); }
    else if (b.dataset.act) h.action(b.dataset.act);
  });
  over.addEventListener('change', e => { const k = e.target.dataset.price; if (k) h.price(k, e.target.value); });
  over.addEventListener('keydown', e => {
    if (e.target.tagName !== 'INPUT') return;
    e.stopPropagation();
    if (e.key === 'Enter') e.target.blur();
  });
  over.addEventListener('keyup', e => { if (e.target.tagName === 'INPUT') e.stopPropagation(); });
  panel.addEventListener('pointerdown', e => {
    if (panel.classList.contains('off')) { panel.classList.remove('off'); return; }
    const b = e.target.closest('button');
    if (b && b.dataset.act === 'sat') { e.preventDefault(); satOpen = !satOpen; h.refresh(); }
    else if (b && !b.disabled && b.dataset.act) { e.preventDefault(); h.action(b.dataset.act); }
  });

  function renderPanel(G) {
    const p = prev(G), c = costToday(G), open = G.phase === 'open', sat = live(G);
    const pz = open ? G.sat?.z : G.history[G.history.length - 2]?.sat?.z;
    const html =
      '<span class="tab">Tab</span>' +
      '<h3>Skigebiet Heiligenblut</h3>' +
      '<div class="big"><span>' + fmtDate(G.date) + '</span><b>' + fmtClock(G.min) + '</b></div>' +
      (sat ? '<button class="satb" data-act="sat">' + face(sat.z) + '<b class="' + ztone(sat.z) + '">' + Math.round(sat.z) + '</b>' + trend(sat.z, pz) + '<span>Zufriedenheit<br><em>' + (open ? 'live' : 'Tageswert') + ' · ' + (satOpen ? 'zuklappen' : 'Details') + '</em></span></button>' + (satOpen ? parts(sat) : '')
        : '<button class="satb" data-act="sat"><b>–</b><span>Zufriedenheit<br><em>noch kein Betriebstag</em></span></button>') +
      row('Ruf', num(G.rep) + trend(G.rep, p && p.rep), tone(G.rep, 60, 40)) +
      '<div class="sep"></div>' +
      (G.weather ? row(wx(G.weather.today), fmtT(G.weather.today.tTal) + ' / ' + fmtT(G.weather.today.tBerg)) + row('Wind Berg · Lawine', '<span class="' + (stormy(G.weather.today) ? 'biz-bad' : '') + '">' + G.weather.today.wind + ' km/h</span> · <span class="' + atone(G.weather.aval) + '">' + G.weather.aval + '</span>') + row('Ø Schneehöhe', Math.round(avgSnow(G)) + ' cm', stone(avgSnow(G))) + '<div class="sep"></div>' : '') +
      row('Phase', '<span class="biz-phase ' + G.phase + '">' + D.phaseLabels[G.phase] + '</span>') +
      row('Zeitfaktor', '×' + G.factor + (G.phase === 'open' ? '' : ' (steht)')) +
      '<div class="sep"></div>' +
      row('Kasse', eur(G.cash) + trend(G.cash, p && p.cash), tone(G.cash, 500000, 0)) +
      (G.loan > 0 ? row('Kredit', eur(G.loan), G.loan > D.start.credit * 0.8 ? 'biz-bad' : '') : '') +
      (G.build?.jobs.length ? row('Baustellen', G.build.jobs.map(j => D.build.projects[j.id].label.replace(/ \(.*\)/, '') + ' ' + (j.left == null ? 'Sommer' : j.left + ' T.')).join(', ')) : '') +
      row('Kosten heute', eur(c)) +
      row('Umsatz heute', eur(sumv(G.today.revenue))) +
      row('davon Nebengeschäfte', eur(sumv(G.today.revenue) - ticketSum(G.today.revenue))) +
      (open ? row('Hütten · Parkplatz', (X.hutWaitNow(G.flow) >= 0.5 ? '<span class="' + wtone(X.hutWaitNow(G.flow)) + '">' + mins(X.hutWaitNow(G.flow)) + '</span> · ' : num(X.inHuts(G.flow)) + ' Gäste · ') + '<span class="' + (G.flow.cars >= G.side.park.cap - 0.5 ? 'biz-bad' : G.flow.cars > G.side.park.cap * 0.85 ? 'biz-warn' : '') + '">' + num(G.flow.cars) + '/' + num(G.side.park.cap) + '</span>') : '') +
      '<div class="sep"></div>' +
      row('Gäste jetzt / heute', num(count(G.flow)) + ' / ' + num(G.today.guests)) +
      (o => segBar(o) + segLegend(o, v => G.today.guests >= 1 ? num(v) : Math.round(v / (SEGS.reduce((a, s) => a + o[s], 0) || 1) * 100) + ' %'))(G.today.guests >= 1 ? G.today.seg : G.phase === 'prep' ? forecast(G).seg : Object.fromEntries(SEGS.map(s => [s, D.segs[s].share]))) +
      row('Ø-Wartezeit', open ? mins(G.flow.avgWait) : '–', open ? wtone(G.flow.avgWait) : '') +
      (open && G.flow.cashWait >= 0.5 ? row('Kassenschlange', mins(G.flow.cashWait), wtone(G.flow.cashWait)) : '') +
      '<div class="sep"></div>' +
      (st => { const nd = sumK(needs(G, guestsN(G))), du = GROUPS.reduce((a, k) => a + duty(G, k), 0); return row('Personal im Dienst / benötigt', du + ' / ' + nd, du >= nd ? 'biz-good' : du >= nd * 0.85 ? 'biz-warn' : 'biz-bad') + row('Moral', Math.round(st.morale), tone(st.morale, 60, 40)) + row('Lohnkosten heute', eur(G.today.costs.staff || wages(G))); })(G.staff) +
      '<div class="sep"></div>' +
      G.lifts.map(l => {
        const st = status(l), on = open && st === 'run', w = on ? G.flow.wait[l.id] : 0;
        return '<div class="lift"><span><i class="biz-dot ' + DOT[st] + '"></i> ' + l.name + '</span><b class="st ' + (on ? wtone(w) : st === 'run' ? '' : 'biz-' + (DOT[st] || 'warn')) + '">' + (on ? mins(w) : st === 'run' ? '–' : st === 'repair' ? 'Reparatur' : D.liftStatus[st]) + '</b><b>' + (on ? Math.round(l.util * 100) + ' %' : '') + '</b></div>' +
          '<div class="as"><span></span>' + bar(l.cond) + '<b>' + Math.round(l.cond) + ' %</b>' + sw('lift', l.id, l.open) + '</div>';
      }).join('') +
      '<div class="sep"></div>' +
      pl(G).map(p => {
        const o = G.pistes[p.id];
        return '<div class="as"><i class="biz-dot ' + (o.open ? '' : 'bad') + '"></i><span>' + p.id + ' ' + p.name + '</span><b class="' + stone(o.snow) + '">' + Math.round(o.snow) + ' cm</b>' + sw('piste', p.id, o.open, o.aper) + '</div>';
      }).join('') +
      '<div class="keys">+/− Zeit · B Büro · Tab Panel</div>';
    if (html !== last) { last = html; panel.innerHTML = html; }
  }

  const tabs = () => '<div class="tabs">' + [['over', 'Übersicht'], ['assets', 'Anlagen'], ['prices', 'Preise'], ['staff', 'Personal'], ['mkt', 'Marketing'], ['snow', 'Schnee'], ['side', 'Gastro & Service'], ['fin', 'Finanzen'], ['build', 'Bau']].map(([k, v]) => '<button data-tab="' + k + '" class="' + (tab === k ? 'on' : '') + '">' + v + '</button>').join('') + '</div>';

  function overview(G) {
    const r = report(G), dem = D.demand[calPhase(G.date)];
    return '<h2>Saison</h2>' +
      '<table>' + tr('Saisonphase', dem.label) + tr('Nachfrage-Basis heute', num(G.today.demand) + ' Gäste') + tr('Spieltag', num(G.day)) + '</table>' +
      '<h2>Gäste</h2><table>' + tr('Ruf', '<span class="' + tone(G.rep, 60, 40) + '">' + dec(G.rep) + '</span>') + (G.sat ? tr('Zufriedenheit letzter Tag', '<span class="' + ztone(G.sat.z) + '">' + Math.round(G.sat.z) + '</span> · <span class="stars">' + starStr(stars(G.sat.z)) + '</span>') : '') + tr('Saisonkarten-Anteil', dec((G.seasonShare ?? D.flow.seasonShare) * 100) + ' %') + '</table>' +
      '<h2>Finanzen</h2>' +
      '<table>' + tr('Kasse', eur(G.cash)) + tr('Kredit', eur(G.loan)) + tr('Kreditrahmen', eur(D.start.credit)) + (r ? tr('Gäste Vortag', num(r.guests)) + tr('Umsatz Vortag', eur(r.revenue)) + tr('Kosten Vortag', eur(r.cost)) : '') + '</table>' +
      '<h2>Anlagen</h2>' +
      '<table>' + G.lifts.map(l => tr('<i class="biz-dot ' + DOT[status(l)] + '"></i> ' + l.name, D.liftStatus[status(l)] + ' · Zustand <span class="' + tone(l.cond, 75, 50) + '">' + Math.round(l.cond) + ' %</span>')).join('') + '</table>' + logView(G, 6);
  }

  function logView(G, n) {
    const L = (G.log || []).slice(-n).reverse();
    return L.length ? '<h2>Meldungen</h2><div class="log">' + L.map(e => '<div class="' + (e.lvl === 'bad' ? 'biz-bad' : e.lvl === 'good' ? 'biz-good' : '') + '">' + fmtDate(e.date).replace(/^\S+ /, '').slice(0, 6) + ' ' + fmtClock(e.min) + ' · ' + e.text + '</div>').join('') + '</div>' : '';
  }

  function liftActs(G, l) {
    const st = status(l);
    if (st === 'fault') {
      const a = repairQuote(l, false, G), b = repairQuote(l, true, G);
      return '<button class="btn primary" data-act="repair:' + l.id + '">Reparieren · ' + eur(a.cost) + ' · ' + fmtDur(a.min) + '</button><button class="btn" data-act="repair:' + l.id + ':x">Express · ' + eur(b.cost) + ' · ' + fmtDur(b.min) + '</button>';
    }
    if (st === 'repair') return '<span class="biz-warn">Reparatur läuft · noch ' + fmtDur(l.repairLeft) + '</span>';
    const ins = l.inspPlan ? '<span class="biz-warn">Inspektion heute Nacht</span>' : st === 'insp' ? '<span class="biz-warn">Inspektion läuft · noch ' + fmtDur(l.insp) + '</span>' : '<button class="btn" data-act="insp:' + l.id + '">Inspektion · ' + eur(D.inspect.cost) + ' · +' + D.inspect.gain + ' %</button>';
    return ins;
  }

  function assets(G) {
    return '<h2>Lifte</h2><table>' + G.lifts.map(l => {
      const st = status(l);
      return '<tr><td><i class="biz-dot ' + DOT[st] + '"></i> <b>' + l.name + '</b><br><span style="opacity:.75">' + D.liftStatus[st] + (l.broken ? ' – ' + l.broken.label : '') + ' · Zustand <span class="' + tone(l.cond, 75, 50) + '">' + Math.round(l.cond) + ' %</span></span></td><td><div class="acts">' + liftActs(G, l) + sw('lift', l.id, l.open) + '</div></td></tr>';
    }).join('') + '</table>' +
      '<p class="note">Verschleiß im Betrieb; je schlechter der Zustand, desto häufiger Störungen. Inspektion sperrt den Lift morgens 2 h. Geschlossene Lifte verursachen keine Stromkosten.</p>' +
      '<h2>Pisten</h2><table>' + pl(G).map(p => {
        const o = G.pistes[p.id];
        return '<tr><td><i class="biz-dot ' + (o.open ? '' : 'bad') + '"></i> ' + p.id + ' ' + p.name + ' <span style="opacity:.7">· ' + p.level + ' · ' + p.km.toLocaleString('de-DE') + ' km · Schnee ' + Math.round(o.snow) + ' cm' + (o.aper ? ' · <span class="biz-bad">aper</span>' : '') + '</span></td><td>' + sw('piste', p.id, o.open, o.aper) + '</td></tr>';
      }).join('') + '</table>' + logView(G, 12);
  }

  function prices(G) {
    const edit = G.phase !== 'open', fc = forecast(G);
    const line = k => tr(D.tickets[k].label, edit && k !== 'season'
      ? '<span class="price"><button data-act="price:' + k + ':-' + D.priceStep + '">−</button><input data-price="' + k + '" type="number" min="' + D.priceRange[0] + '" max="' + D.priceRange[1] + '" value="' + G.prices[k] + '"> €<button data-act="price:' + k + ':' + D.priceStep + '">+</button></span>'
      : eur(G.prices[k]));
    return '<h2>Ticketpreise</h2><table>' + Object.keys(D.tickets).map(line).join('') + '</table>' +
      '<h2>Wirkung</h2><table>' +
      tr('Ø-Ticketpreis (nach Gästemix)', eur(avgPrice(G.prices))) +
      tr('Preisfaktor Nachfrage', '×' + priceFactor(G.prices).toFixed(2)) +
      (x => tr('Wetter · Schnee ' + fmtDate(fc.date).slice(0, 9), '×' + x.weather.toFixed(2) + ' · ×' + x.snow.toFixed(2)))(demandExtra(G, fc.date)) +
      tr('Erwartete Gäste ' + fmtDate(fc.date), '<span class="fc">' + num(fc.n) + '</span>') + '</table>' +
      (edit ? '<p class="note">Saisonkarten werden vor Saisonbeginn verkauft; ' + dec((G.seasonShare ?? D.flow.seasonShare) * 100) + ' % der Gäste fahren mit Saisonkarte (nächste Saison abhängig vom Ruf). Der Erlös wird je Besuch verbucht (Preis ÷ ' + D.flow.cardVisits + ' Skitage).</p>' : '<p class="note">Preise sind während des Betriebs gesperrt.</p>');
  }

  function snow(G) {
    const t = nightTotals(G), g = t.groom;
    return '<h2>Wetter</h2>' + weatherTable(G) +
      '<h2>Nacht-Aufträge</h2><table>' + pl(G).map(p => {
        const o = G.pistes[p.id], q = gunPlan(G, p.id), lb = qLabel(o), sc = score(G, p.id);
        const gun = q.n ? '<span class="price"><button data-act="gun:' + p.id + ':-' + D.snow.hStep + '">−</button><b style="min-width:44px;text-align:center">' + o.gun + ' h</b><button data-act="gun:' + p.id + ':' + D.snow.hStep + '">+</button></span>' +
          '<span style="opacity:.7;font-size:12px">' + q.n + ' Kanonen' + (o.gun ? ' · ' + num(q.m3) + ' m³ · +' + dec(q.cm) + ' cm · ' + eur(q.cost) : '') + (q.cold ? '' : ' · <span class="biz-warn">zu warm (' + fmtT(nightTemp(G, p)) + ')</span>') + '</span>' : '<span style="opacity:.5;font-size:12px">keine Kanonen</span>';
        return '<tr><td><i class="biz-dot ' + (o.open ? '' : 'bad') + '"></i> <b>' + p.id + ' ' + p.name + '</b><br><span style="opacity:.8;font-size:13px"><span class="' + stone(o.snow) + '">' + Math.round(o.snow) + ' cm</span> · ' + D.cover.qLabels[lb] + ' · Zustand <span class="' + tone(o.cond, 75, 50) + '">' + Math.round(o.cond) + ' %</span> · Qualität <span class="' + tone(sc, 70, 50) + '">' + Math.round(sc) + '</span>' + (o.aper ? ' · <span class="biz-bad">apert aus</span>' : '') + '</span></td>' +
          '<td><div class="acts" style="align-items:center"><button class="btn' + (o.grm ? ' primary' : '') + '" data-act="grm:' + p.id + '">' + (o.grm ? (g.list.includes(p.id) ? 'präparieren ✓' : 'keine Kapazität') : 'nicht präparieren') + '</button>' + gun + '</div></td></tr>';
      }).join('') + '</table>' +
      '<h2>Bedarf heute Nacht</h2><table>' +
      tr('Gerätestunden', dec(g.hours) + ' / ' + dec(g.cap) + ' h' + (g.want > g.cap + 1e-6 ? ' <span class="biz-warn">(Bedarf ' + dec(g.want) + ' h)</span>' : '')) +
      tr('Pistengeräte · Fahrer', G.groom.machines + ' Geräte · ' + g.drivers + ' / ' + duty(G, 'groomer') + ' Fahrer im Einsatz') +
      tr('Präparierung', eur(g.cost)) +
      tr('Beschneiung', num(t.gun.m3) + ' m³ Schnee · ' + num(t.gun.water) + ' m³ Wasser · ' + num(t.gun.kwh) + ' kWh') +
      tr('Kosten Beschneiung', eur(t.gun.cost)) + tr('Summe Nacht', eur(t.total), 'sum') + '</table>' +
      '<p class="note">Aufträge gelten jede Nacht, bis du sie änderst. Präparieren: ' + D.groom.hoursPerKm.toLocaleString('de-DE') + ' h je km, ' + eur(D.groom.perHour) + '/h, je Fahrer max. ' + D.groomNight.shift + ' h. Beschneien nur bei ≤ ' + D.snow.maxTemp + ' °C (Nacht), ' + D.snow.m3PerHour + ' m³/h je Kanone, ' + D.snow.perM3.toLocaleString('de-DE') + ' €/m³. Unter ' + D.cover.minOpen + ' cm apert eine Piste aus und wird gesperrt.</p>';
  }

  function mkt(G) {
    const fc = forecast(G), C = D.mkt.campaigns, x = demandExtra(G, fc.date);
    const btn = id => {
      const c = C[id];
      if (c.kind === 'weekly') return '<button class="btn' + (G.mkt.on[id] ? '' : ' primary') + '" data-act="mkt:' + id + '">' + (G.mkt.on[id] ? 'Stoppen' : 'Starten') + '</button>';
      if (c.kind === 'once') return pending(G, id) ? '' : '<button class="btn primary" data-act="mkt:' + id + '"' + (G.cash < c.cost ? ' disabled' : '') + '>Buchen</button>';
      return canEarly(G) ? '<button class="btn primary" data-act="mkt:' + id + '">Verkaufen</button>' : '';
    };
    const cost = id => { const c = C[id]; return c.kind === 'weekly' ? (c.cost ? eur(c.cost) + '/Woche' : 'Einnahmeverlust') : c.kind === 'once' ? eur(c.cost) + ' einmalig' : (q => q.n + ' × ' + eur(q.price) + ' = ' + eur(q.sum))(earlyQuote(G)); };
    const st = id => { const t = mStatus(G, id, fc.date); return '<span class="' + (/aktiv/.test(t) ? (/abgenutzt/.test(t) ? 'biz-warn' : 'biz-good') : /wirkt/.test(t) ? 'biz-warn' : '') + '">' + t + '</span>'; };
    const lsd = G.history[G.history.length - 1];
    return '<h2>Kampagnen</h2><table>' + CAMPAIGNS.map(id => tr('<b>' + C[id].label + '</b><br><small style="opacity:.7">' + C[id].info + ' · ' + (C[id].kind === 'pre' ? '+' + Math.round(C[id].eff * 100) + ' % Nachfrage, +' + Math.round(C[id].share * 100) + ' Pp. Saisonkarten' : '+' + Math.round(C[id].eff * 100) + ' %') + '</small>', cost(id) + '<br>' + st(id) + ' ' + btn(id))).join('') + '</table>' +
      '<h2>Budget</h2><table>' + tr('Ausgaben Saison', eur(G.mkt.spent)) + tr('Laufende Wochenkosten', eur(weeklyCost(G))) + tr('Abnutzung', 'nach ' + D.mkt.wear.after + ' Tagen Dauerschaltung ' + pct(D.mkt.wear.f) + ' Wirkung') + '</table>' +
      '<h2>Geschätzte Wirkung ' + fmtDate(fc.date) + '</h2><table>' + SEGS.map(s => tr('<i class="biz-dot" style="background:' + D.segs[s].color + '"></i> ' + D.segs[s].label, num(fc.seg[s]) + ' Gäste · Marketing ' + pct(mFactor(G, fc.date, s)) + ' · Konkurrenz ' + pct(kFactor(G, s, x.snow)))).join('') +
      tr('Gesamt', num(fc.n) + ' (ohne Marketing ' + num(fc.base) + ', <span class="' + (fc.n >= fc.base ? 'biz-good' : 'biz-bad') + '">' + (fc.n >= fc.base ? '+' : '−') + num(Math.abs(fc.n - fc.base)) + '</span>)', 'sum') + '</table>' +
      '<h2>Zielgruppen</h2><table>' + SEGS.map(s => tr(D.segs[s].label + '<br><small style="opacity:.7">' + D.segs[s].info + '</small>', 'Preisempfindlichkeit ' + dec(D.segs[s].el) + (lsd?.sat?.seg ? ' · Zufriedenheit <span class="' + ztone(lsd.sat.seg[s]) + '">' + Math.round(lsd.sat.seg[s]) + '</span>' : ''))).join('') + '</table>' +
      '<h2>Konkurrenz</h2><table>' + G.comp.map(c => tr(D.mkt.comp.list.find(b => b.id === c.id).name, 'Tageskarte ' + eur(c.price) + ' · Schnee <span class="' + (c.snow >= 0.9 ? 'biz-good' : c.snow >= 0.6 ? 'biz-warn' : 'biz-bad') + '">' + (c.snow >= 0.9 ? 'gut' : c.snow >= 0.6 ? 'mäßig' : 'schlecht') + '</span>')).join('') + tr('Unsere Tageskarte', eur(G.prices.day) + ' · Schnee ×' + x.snow.toFixed(2)) + '</table>' +
      '<p class="note">Kampagnen wirken je Zielgruppe (Hauptgruppe voll, andere ' + Math.round(D.mkt.spill * 100) + ' %). Wochenkosten werden täglich bei Betriebsbeginn gebucht. „Kinder gratis am Samstag“: Kinderkarten an Samstagen 0 €.</p>';
  }

  function staffTab(G) {
    const st = G.staff, nd = needs(G, guestsN(G)), open = G.phase === 'open', SG = D.staff.groups;
    const pm = (act, dis) => '<button data-act="' + act + '"' + (dis ? ' disabled' : '') + '>' + (act.startsWith('fire') || act.endsWith('-' + D.staff.wageStep) ? '−' : '+') + '</button>';
    return '<h2>Personal · Bedarf für ' + num(guestsN(G)) + ' Gäste</h2><table>' + GROUPS.map(k => {
      const d = duty(G, k), pd = pendingOf(G, k), sk = st.sick[k] || 0;
      return '<tr><td><b>' + SG[k].label + '</b> <span style="opacity:.6;font-size:12px">' + eur(dayCost(G, k)) + '/Tag</span><br><span style="opacity:.8;font-size:13px">im Dienst <span class="' + (d >= nd[k] ? 'biz-good' : d >= nd[k] * 0.85 ? 'biz-warn' : 'biz-bad') + '">' + d + '</span> / benötigt ' + nd[k] +
        (sk ? ' · <span class="biz-bad">' + sk + ' krank</span>' : '') + (pd ? ' · <span class="biz-good">+' + pd + ' ab ' + ddmm(nextArrival(G, k)) + '</span>' : '') + '</span><br><span style="opacity:.55;font-size:12px">' + SG[k].info + '</span></td>' +
        '<td><span class="price">' + pm('fire:' + k, open || (!st.n[k] && !pd)) + '<b style="min-width:34px;text-align:center">' + st.n[k] + '</b>' + pm('hire:' + k) + '</span></td></tr>';
    }).join('') + tr('Gesamt', heads(G) + ' Köpfe · ' + eur(wages(G)) + '/Tag', 'sum') + '</table>' +
      '<h2>Lohn und Moral</h2><table>' +
      tr('Lohnniveau', '<span class="price">' + pm('wage:-' + D.staff.wageStep, st.wage <= D.staff.wage[0]) + '<b style="min-width:44px;text-align:center">' + st.wage + ' %</b>' + pm('wage:' + D.staff.wageStep, st.wage >= D.staff.wage[1]) + '</span>') +
      tr('Moral', '<span class="' + tone(st.morale, 60, 40) + '">' + Math.round(st.morale) + '</span>' + (st.morale < D.staff.morale.sickBelow ? ' · <span class="biz-bad">Krankmeldungen!</span>' : '')) +
      tr('Überlastung letzter Tag', '<span class="' + (st.over > 0.1 ? 'biz-bad' : st.over > 0.02 ? 'biz-warn' : 'biz-good') + '">' + Math.round(st.over * 100) + ' %</span>') +
      tr('Prämie', '<button class="btn' + (bonusDone(G) ? '' : ' primary') + '" data-act="bonus"' + (bonusDone(G) ? ' disabled' : '') + '>' + (bonusDone(G) ? 'heute ausgezahlt' : 'Prämie zahlen · ' + eur(bonusCost(G)) + ' · Moral +' + D.staff.bonus.gain) + '</button>') +
      '</table><p class="note">Einstellung wirkt nach ' + D.staff.delay + ' Tagen, Kündigung kostet ' + D.staff.fireDays + ' Tageslöhne (nicht während des Betriebs). Moral sinkt bei Überlastung (zu wenig Leute) und Lohnkürzung, steigt mit Lohn und Prämie; unter ' + D.staff.morale.sickBelow + ' gibt es Krankmeldungen. Saisonkräfte enden am Saisonende, je nach Moral kommt ein Teil wieder.</p>';
  }

  function sideTab(G) {
    const edit = G.phase !== 'open', L = D.side.levels, sd = G.side, fc = forecast(G), o = X.outlook(G, fc.n), f = G.flow, live = G.phase === 'open';
    const pr = (k, v, max) => edit ? '<span class="price"><button data-act="sp:' + k + ':-1">−</button><input data-price="side:' + k + '" type="number" min="0" max="' + max + '" value="' + v + '"> €<button data-act="sp:' + k + ':1">+</button></span>' : eur(v);
    const lv = id => Object.entries(L).map(([k, v]) => '<button class="lv' + (sd.huts[id].level === k ? ' on' : '') + '" data-act="lvl:' + id + ':' + k + '"' + (edit ? '' : ' disabled') + '>' + v.label + '</button>').join('');
    const gd = duty(G, 'gastro'), gn = X.gastroNeed(G), ts = G.today.side || {};
    return '<h2>Hütten</h2><table>' + D.side.huts.filter(h => sd.huts[h.id].own).map(h => {
      const s = sd.huts[h.id], eff = X.seatsEff(G, h.id), w = live ? f.hutWait[h.id] : 0;
      return '<tr><td><b>' + h.name + '</b><br><span style="opacity:.75;font-size:13px">bei ' + D.nodes[h.node] + ' · ' + num(X.seats(G, h.id)) + ' Plätze' + (s.open && eff < X.seats(G, h.id) - 0.5 ? ' (<span class="biz-warn">' + num(eff) + ' besetzt</span>)' : '') + ' · Personal ' + X.hutNeed(G, h.id) + ' · Ø ' + eur(X.spend(G, h.id)) + '/Gast' +
        (live && s.open ? ' · jetzt ' + num(f.hut[h.id].reduce((a, b) => a + b, 0)) + (w >= 0.5 ? ' · <span class="' + wtone(w) + '">Wartezeit ' + mins(w) + '</span>' : '') : '') + (ts['h_' + h.id] ? ' · heute ' + eur(ts['h_' + h.id]) : '') + '</span><br><span class="lvs">' + lv(h.id) + '</span></td><td>' + sw('hut', h.id, s.open) + '</td></tr>';
    }).join('') +
      tr('Gastro-Personal im Dienst / benötigt', '<span class="' + (gd >= gn ? 'biz-good' : gd >= gn * 0.8 ? 'biz-warn' : 'biz-bad') + '">' + gd + '</span> / ' + gn + ' · <button class="btn" data-tab="staff">Personal</button>') + '</table>' +
      '<p class="note">Preisniveau: günstig ×' + dec(L.cheap.price, 2) + ' (weniger Marge, Familien zufriedener), gehoben ×' + dec(L.upscale.price, 2) + ' (mehr Marge, Familien unzufriedener). Je Gastro-Kraft ' + D.side.seatsPerStaff + ' Plätze; volle Hütte mittags → Wartezeit, zählt in die Service-Note. Fixkosten ' + eur(D.side.hutFix) + ' je offener Hütte und Tag. Weitere Hütten im Tab Bau.</p>' +
      '<h2>Verleih</h2><table>' + tr('Mietpreis Tag', pr('rental', sd.rental.price, 300)) + tr('Ausrüstung', '<span class="' + tone(sd.rental.cond, 70, 45) + '">' + Math.round(sd.rental.cond) + ' %</span> · −' + dec(D.side.rental.wear * 100, 1) + ' Pp. je 100 Mieten') +
      tr('Wartung (+' + D.side.rental.service.gain + ' Pp., bis ' + D.side.rental.service.max + ' %)', eur(D.side.rental.service.cost) + ' <button class="btn" data-act="rent:svc"' + (sd.rental.cond >= D.side.rental.service.max || G.cash < D.side.rental.service.cost ? ' disabled' : '') + '>Warten</button>') +
      tr('Neukauf (100 %)', eur(D.side.rental.buy) + ' <button class="btn" data-act="rent:buy"' + (G.cash < D.side.rental.buy ? ' disabled' : '') + '>Kaufen</button>') + tr('Mietquote', dec(X.rentShare(G) * 100) + ' % der Gäste') + '</table>' +
      '<h2>Skischule</h2><table>' + tr('Kurspreis Tag', pr('school', sd.school.price, 300)) + tr('Plätze', num(duty(G, 'instructor') * D.staff.pupils) + ' (' + duty(G, 'instructor') + ' Skilehrer × ' + D.staff.pupils + ') · <button class="btn" data-tab="staff">Personal</button>') + (ts.schoolWant ? tr('Heute gebucht / gewünscht', num(ts.pupils || 0) + ' / ' + num(ts.schoolWant)) : '') + '</table>' +
      '<h2>Parkplatz</h2><table>' + tr('Gebühr je Auto', pr('park', sd.park.price, 40)) + tr('Kapazität', num(sd.park.cap) + ' Plätze' + (live ? ' · belegt <span class="' + (f.cars >= sd.park.cap - 0.5 ? 'biz-bad' : '') + '">' + num(f.cars) + '</span>' : '')) + tr('Autos je 100 Gäste', dec(X.parkShare(G) / D.side.parking.persons * 100)) + (ts.turned >= 1 ? tr('Heute umgekehrt', '<span class="biz-bad">' + num(ts.turned) + ' Gäste</span>') : '') + '</table>' +
      '<p class="note">Parkplatz voll → ankommende Autogäste kehren um. Hohe Gebühr: weniger Autos, aber schlechtere Preis-Leistung.' + (edit ? '' : ' Preise und Preisniveau sind während des Betriebs gesperrt.') + '</p>' +
      '<h2>Prognose ' + fmtDate(fc.date) + ' (' + num(fc.n) + ' Gäste)</h2><table>' + ['gastro', 'rental', 'school', 'parking'].map(k => tr(D.side.areas[k].label, eur(o[k]))).join('') +
      (o.cars > sd.park.cap ? tr('Parkplatz', '<span class="biz-bad">voll – ' + num((o.cars - sd.park.cap) * D.side.parking.persons) + ' Gäste kehren um</span>') : '') + tr('Summe Nebengeschäfte', eur(o.gastro + o.rental + o.school + o.parking), 'sum') + '</table>';
  }

  function areaReport(r) {
    const a = X.byArea(r.revs), t = sumv(a), s = r.side || {};
    return '<h2>Umsatz nach Bereich</h2><div class="pie"><canvas data-chart="pie" data-v="' + X.AREAS.map(k => a[k].toFixed(0)).join(',') + '" width="130" height="130"></canvas><table>' + X.AREAS.map(k => tr('<i class="biz-dot" style="background:' + D.side.areas[k].color + '"></i> ' + D.side.areas[k].label, eur(a[k]) + ' · ' + Math.round(t ? a[k] / t * 100 : 0) + ' %')).join('') + tr('Summe', eur(t), 'sum') + '</table></div>' +
      '<h2>Nebengeschäfte</h2><table>' + tr('Mittagessen in Hütten', num(s.lunch || 0) + ' Gäste · Spitze Wartezeit <span class="' + wtone(s.hutPeak || 0) + '">' + mins(s.hutPeak || 0) + '</span>' + (s.lunchMiss >= 1 ? ' · <span class="biz-bad">' + num(s.lunchMiss) + ' ohne Essen</span>' : '')) +
      tr('Wareneinsatz Gastro', eur(r.costs.goods || 0)) + tr('Verleih', num(s.rent || 0) + ' Mieten') + tr('Skischule', num(s.pupils || 0) + ' Schüler' + (s.schoolMiss >= 1 ? ' · <span class="biz-bad">' + num(s.schoolMiss) + ' abgewiesen</span>' : '')) +
      tr('Parkplatz', num(s.cars || 0) + ' Autos' + (s.turned >= 1 ? ' · <span class="biz-bad">' + num(s.turned) + ' Gäste umgekehrt</span>' : '')) + '</table>';
  }

  function nightReport(G) {
    const n = G.night;
    if (!n || n.date !== G.date) return '';
    const gr = D.pistes.filter(p => n.pistes[p.id]?.groomed).map(p => p.id), gun = D.pistes.filter(p => n.pistes[p.id]?.gun > 0);
    return '<h2>Nachtbericht</h2><table>' +
      tr('Neuschnee (Berg)', n.newCm ? n.newCm + ' cm' : '–') +
      tr('Präpariert', gr.length ? 'Piste ' + gr.join(', ') + ' · ' + eur(n.groomCost) : '<span class="biz-warn">nichts</span>') +
      tr('Beschneit', gun.length ? gun.map(p => p.id + ' +' + dec(n.pistes[p.id].gun) + ' cm').join(', ') + ' · ' + num(n.m3) + ' m³ · ' + eur(n.gunCost) : '–') +
      (n.skipped.length ? tr('Beschneiung ausgefallen', '<span class="biz-warn">zu warm: ' + n.skipped.join(', ') + '</span>') : '') +
      (n.closed.length ? tr('Ausgeapert, gesperrt', '<span class="biz-bad">Piste ' + n.closed.join(', ') + '</span>') : '') +
      (n.opened.length ? tr('Wieder offen', '<span class="biz-good">Piste ' + n.opened.join(', ') + '</span>') : '') +
      (G.lifts.some(l => l.wind) ? tr('Sturm', '<span class="biz-bad">' + G.lifts.filter(l => l.wind).map(l => l.name).join(', ') + ' geschlossen</span>') : '') +
      '</table>';
  }

  const H = () => ({ eur, tr, num, dec, fmtDate, fc: X0 => forecast(X0).n });
  const body = G => tab === 'fin' ? finTab(G, H()) : tab === 'build' ? buildTab(G, H()) : tab === 'side' ? sideTab(G) : tab === 'mkt' ? mkt(G) : tab === 'staff' ? staffTab(G) : tab === 'prices' ? prices(G) : tab === 'assets' ? assets(G) : tab === 'snow' ? snow(G) : null;

  function prep(G) {
    return '<h1>Vorbereitung</h1><p class="sub">' + fmtDate(G.date) + ' · Betrieb 08:30–16:30</p>' + tabs() +
      (body(G) || '<h2>Wetter</h2>' + weatherTable(G) + nightReport(G) +
      '<h2>Prognose</h2><table>' + tr('Erwartete Gäste heute', num(forecast(G).n)) + '</table>' + overview(G)) +
      '<div class="go"><button class="primary" data-act="start">Lifte öffnen / Tag starten ⏎</button></div>';
  }

  function daily(G) {
    const r = report(G);
    const costs = Object.entries(r.costs).filter(([, v]) => v > 0).map(([k, v]) => tr(D.costLabels[k] || k, eur(-v))).join('');
    return '<h1>Tagesbericht</h1><p class="sub">' + fmtDate(r.date) + ' · Feierabend 16:30</p>' + tabs() +
      (body(G) || satReport(G, r) +
        '<h2>Gäste</h2><table>' + Object.entries(D.guestLabels).map(([k, v]) => tr(v, num(r.types?.[k] || 0))).join('') + tr('Gäste gesamt', num(r.guests), 'sum') + tr('Umsatz je Gast (Tickets)', eur(ticketSum(r.revs) / Math.max(1, r.guests))) + tr('Umsatz je Gast (gesamt)', eur(r.revenue / Math.max(1, r.guests))) + (r.free >= 1 ? tr('Kinder gratis (Samstag)', num(r.free)) : '') + '</table>' +
        (r.seg ? '<h2>Zielgruppen</h2>' + segBar(r.seg) + '<table>' + SEGS.map(s => tr('<i class="biz-dot" style="background:' + D.segs[s].color + '"></i> ' + D.segs[s].label, num(r.seg[s] || 0) + (r.sat?.seg ? ' · Zufriedenheit <span class="' + ztone(r.sat.seg[s]) + '">' + Math.round(r.sat.seg[s]) + '</span>' : ''))).join('') + '</table>' : '') +
        '<h2>Einnahmen nach Ticketart</h2><table>' + Object.entries(r.revs || {}).filter(([k]) => k in D.tickets).map(([k, v]) => tr(revLabel(k), eur(v))).join('') + tr('Summe Tickets', eur(ticketSum(r.revs)), 'sum') + '</table>' + areaReport(r) +
        '<h2>Lifte</h2><table>' + G.lifts.map(l => tr(l.name, num(r.rides?.[l.id] || 0) + ' Fahrten · Spitze <span class="' + wtone(r.peak?.[l.id] || 0) + '">' + mins(r.peak?.[l.id] || 0) + '</span>')).join('') + tr('Ø-Wartezeit', mins(r.avgWait || 0)) + (r.faults ? tr('Störungen', '<span class="biz-bad">' + r.faults + (r.rescued >= 1 ? ' · ' + num(r.rescued) + ' Gäste geborgen' : '') + '</span>') : '') + '</table>' +
        (r.staff ? '<h2>Personal</h2><table>' + tr('Lohnkosten', eur(r.costs.staff || 0)) + tr('Im Dienst / benötigt', r.staff.duty + ' / ' + r.staff.need + (r.staff.sick ? ' · <span class="biz-bad">' + r.staff.sick + ' krank</span>' : '')) + tr('Moral', '<span class="' + tone(r.staff.morale, 60, 40) + '">' + Math.round(r.staff.morale) + '</span> · Überlastung ' + Math.round(r.staff.over * 100) + ' %') + tr('Kassenschlange Spitze', '<span class="' + wtone(r.staff.cashPeak) + '">' + mins(r.staff.cashPeak) + '</span>') + '</table>' : '') +
        '<h2>Kosten nach Posten</h2><table>' + costs + tr('Summe Kosten', eur(-r.cost), 'sum') + '</table>' +
        '<h2>Kasse</h2><table>' + tr('vorher', eur(r.cashStart)) + tr('Ergebnis', '<span class="' + (r.cash >= r.cashStart ? 'biz-good' : 'biz-bad') + '">' + eur(r.cash - r.cashStart) + '</span>') + tr('nachher', eur(r.cash), 'sum') + '</table>' +
        '<h2>Morgen</h2><table>' + (G.weather?.ahead[0] ? tr('Wetter (Prognose)', wline(G.weather.ahead[0].fc)) : '') + tr('Erwartete Gäste ' + fmtDate(forecast(G).date), num(forecast(G).n)) + tr('Nacht-Aufträge', eur(nightTotals(G).total) + ' · <button class="btn" data-tab="snow">Schnee planen</button>') + '</table>') +
      '<div class="go"><button class="primary" data-act="next">Nächster Tag ⏎</button></div>';
  }

  function satReport(G, r) {
    const s = r.sat;
    if (!s) return '';
    const dr = r.rep - (s.rep0 ?? r.rep);
    return '<h2>Zufriedenheit</h2><div class="satbig">' + face(s.z, 44) + '<b class="' + ztone(s.z) + '">' + Math.round(s.z) + '</b><div><span class="stars">' + starStr(stars(s.z)) + '</span> ' + dec(stars(s.z)) + ' / 5<br><span style="opacity:.75">Ruf ' + dec(r.rep) + ' (' + (dr >= 0 ? '+' : '−') + dec(Math.abs(dr)) + ')</span></div></div>' +
      parts(s) +
      (s.quotes?.length ? '<h2>Gästestimmen</h2>' + s.quotes.map(q => '<div class="voice">„' + q.text + '“<small>' + q.who + ' · <span class="stars">' + starStr(q.stars) + '</span></small></div>').join('') : '') +
      '<h2>Ruf – letzte ' + D.sat.quotes.chart + ' Tage</h2><canvas data-chart="rep" width="620" height="130"></canvas>';
  }

  function pie(cv) {
    const v = cv.dataset.v.split(',').map(Number), t = v.reduce((a, b) => a + b, 0), dpr = Math.min(2, devicePixelRatio || 1), w = 130;
    cv.width = w * dpr; cv.height = w * dpr;
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    let a = -Math.PI / 2;
    if (!t) return;
    X.AREAS.forEach((k, i) => {
      const d = v[i] / t * Math.PI * 2;
      c.fillStyle = D.side.areas[k].color;
      c.beginPath(); c.moveTo(w / 2, w / 2); c.arc(w / 2, w / 2, w / 2 - 2, a, a + d); c.closePath(); c.fill();
      a += d;
    });
    c.fillStyle = 'rgba(12,32,54,1)';
    c.beginPath(); c.arc(w / 2, w / 2, w * 0.24, 0, 7); c.fill();
  }

  function chart(G) {
    for (const cv of over.querySelectorAll('canvas[data-sc]')) { const sn = G.seasons?.find(x => x.sy === +cv.dataset.sy); if (sn) drawSeason(cv, sn); }
    const pc = over.querySelector('canvas[data-chart="pie"]');
    if (pc) pie(pc);
    const cv = over.querySelector('canvas[data-chart="rep"]');
    if (!cv) return;
    const H = G.history.filter(h => h.sat).slice(-D.sat.quotes.chart);
    const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 620, h = cv.clientHeight || 130;
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d');
    c.scale(dpr, dpr);
    const L = 30, R = 8, T = 8, B = 20, n = Math.max(2, H.length);
    const X = i => L + (w - L - R) * (H.length < 2 ? 0.5 : i / (n - 1)), Y = v => T + (h - T - B) * (1 - v / 100);
    c.font = '11px system-ui,sans-serif';
    c.textAlign = 'right';
    for (const v of [0, 25, 50, 75, 100]) {
      c.strokeStyle = 'rgba(255,255,255,' + (v === 50 ? 0.25 : 0.1) + ')';
      c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(v, L - 5, Y(v) + 4);
    }
    if (!H.length) return;
    c.textAlign = 'center';
    H.forEach((e, i) => { if (i === 0 || i === H.length - 1 || H.length <= 7) c.fillText(e.date.slice(8) + '.' + e.date.slice(5, 7) + '.', X(i), h - 5); });
    for (const [i, e] of H.entries()) { c.fillStyle = zcol(e.sat.z); c.globalAlpha = 0.75; c.beginPath(); c.arc(X(i), Y(e.sat.z), 3, 0, 7); c.fill(); }
    c.globalAlpha = 1;
    c.strokeStyle = '#5aa2ff'; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath();
    H.forEach((e, i) => i ? c.lineTo(X(i), Y(e.rep)) : c.moveTo(X(i), Y(e.rep)));
    c.stroke();
    c.fillStyle = '#5aa2ff';
    for (const [i, e] of H.entries()) { c.beginPath(); c.arc(X(i), Y(e.rep), 2.5, 0, 7); c.fill(); }
    c.textAlign = 'left'; c.fillStyle = '#5aa2ff'; c.fillText('Ruf', L + 4, T + 10);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillText('● Zufriedenheit', L + 34, T + 10);
  }

  function office(G) {
    return '<h1>Büro</h1><p class="sub">' + fmtDate(G.date) + ' · ' + fmtClock(G.min) + ' · ' + D.phaseLabels[G.phase] + (G.phase === 'open' ? ' – Zeit läuft weiter' : '') + '</p>' + tabs() +
      (body(G) || overview(G)) + '<div class="go"><button data-act="close">Schließen (B)</button></div>';
  }

  const views = { prep, daily, office, over: G => overView(G, H()), season: G => seasonView(G, H()), summer: G => summerView(G, H(), tabs(), body(G)) };

  return {
    render(G) {
      renderPanel(G);
      if (view) { const html = '<div class="card">' + views[view](G) + '</div>'; if (over.dataset.v !== html) { over.innerHTML = html; over.dataset.v = html; chart(G); } }
    },
    open(v, t) { if (view !== v) tab = 'over'; if (t) tab = t; view = v; over.hidden = false; over.dataset.v = ''; },
    toast(G, id) {
      const l = G.lifts.find(x => x.id === id);
      if (!l || !l.broken) return;
      const q = repairQuote(l, false, G);
      const el = toasts.get(id) || document.createElement('div');
      el.className = 't';
      el.innerHTML = '<span>Störung ' + l.name + ' (' + l.broken.label + ') – Reparatur ca. ' + fmtDur(q.min) + ', ' + eur(q.cost) + '</span><button class="primary" data-act="repair:' + id + '">Reparieren</button><button data-act="tab:assets">Details</button><button data-act="drop:' + id + '">✕</button>';
      toasts.set(id, el);
      toastEl.appendChild(el);
    },
    drop(id) {
      for (const [k, el] of toasts) if (id == null || k === id) { el.remove(); toasts.delete(k); }
    },
    close() { view = null; over.hidden = true; over.innerHTML = ''; },
    get view() { return view; },
    togglePanel() { panel.classList.toggle('off'); },
    show(on) { panel.hidden = !on; toastEl.hidden = !on; if (!on) { this.close(); this.drop(); } document.body.classList.toggle('biz', on); }
  };
}
