import { D } from './data.js';
import { label, fixed } from './season.js';
import { serviced } from './assets.js';
import { fmtDate } from './calendar.js';

const P = D.build.projects;
const sum = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
const ztone = z => z >= 70 ? 'biz-good' : z >= 50 ? 'biz-warn' : 'biz-bad';

function dl(a, b, f, up = true) {
  if (b == null) return '';
  const d = a - b;
  if (Math.abs(d) < 1e-9 || !Number.isFinite(d)) return '';
  return ' <small class="' + ((d > 0) === up ? 'biz-good' : 'biz-bad') + '">' + (d > 0 ? '+' : '−') + f(Math.abs(d)) + '</small>';
}

function areaRows(s, h) {
  const A = s.areas || {}, ids = Object.keys(A).filter(k => A[k].g > 0 || A[k].rev > 0);
  if (ids.length < 2) return '';
  return '<h2>Gebiete</h2><table>' + ids.map(k => { const x = A[k], d = x.rev - x.cost; return h.tr((s.anames?.[k] || k) + ' <small style="opacity:.6">' + h.num(x.g) + ' Gäste</small>', h.eur(x.rev) + ' − ' + h.eur(x.cost) + ' = <b class="' + (d >= 0 ? 'biz-good' : 'biz-bad') + '">' + h.eur(d) + '</b>'); }).join('') + '</table><p class="note">Erlös − direkte Kosten je Gebiet (ohne Verwaltung, Marketing, Zinsen, Abschreibung).</p>';
}

export function seasonView(G, h) {
  const { eur, tr, num, dec } = h, s = G.seasons[G.seasons.length - 1];
  if (!s) return '<h1>Saisonende</h1><p class="sub">Keine Betriebstage in dieser Saison.</p><div class="go"><button class="primary" data-act="splan">Zur Sommerplanung ⏎</button></div>';
  const o = G.seasons.find(x => x.sy === s.sy - 1), pc = v => dec(v, 0) + ' %';
  const z = Math.round(s.sat), res = s.year ?? s.result, ores = o ? o.year ?? o.result : null;
  const rev = Object.entries(s.rev).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const cost = Object.entries(s.cost).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const lb = k => k === 'dep' ? 'Erträge Geldanlage' : D.tickets[k]?.label || D.side.areas[k]?.label || k;
  const day = (t, d) => tr(t, fmtDate(d.date) + ' · ' + num(d.guests) + ' Gäste · ' + eur(d.result));
  const seg = Object.entries(s.seg).filter(([, v]) => v > 0);
  const segT = sum(s.seg);
  return '<h1>Saisonbilanz ' + label(s.sy) + '</h1><p class="sub">' + fmtDate(s.from) + ' – ' + fmtDate(s.to) + ' · ' + s.days + ' Betriebstage</p>' +
    '<div class="satbig"><b class="' + (res >= 0 ? 'biz-good' : 'biz-bad') + '" style="font-size:34px">' + eur(res) + '</b><div>Jahresergebnis inkl. Sommer' + dl(res, ores, eur) + '<br><span style="opacity:.75">Vorjahr: ' + (o ? eur(ores) : '–') + '</span></div></div>' +
    '<h2>Kennzahlen</h2><table>' +
    tr('Skitage (Gäste gesamt)', num(s.guests) + dl(s.guests, o?.guests, num)) +
    tr('Ø Gäste je Betriebstag', num(s.avgGuests) + dl(s.avgGuests, o?.avgGuests, num)) +
    tr('Umsatz', eur(s.R) + dl(s.R, o?.R, eur)) +
    tr('Kosten', eur(-s.C) + dl(s.C, o?.C, eur, false)) +
    tr('Betriebsergebnis vor Abschreibung', '<span class="' + (s.ebitda >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(s.ebitda) + '</span>' + dl(s.ebitda, o?.ebitda, eur)) +
    tr('Abschreibungen', eur(-s.depr)) +
    tr('Ergebnis Winterbetrieb', '<span class="' + (s.result >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(s.result) + '</span>' + dl(s.result, o?.result, eur)) +
    tr('Sommer: Verwaltung, Zinsen' + (s.sumCosts ? ', Revisionen' : ' (geplant)'), eur(-(s.sumCost || 0))) +
    tr('Umsatz je Gast', eur(s.perGuest) + dl(s.perGuest, o?.perGuest, eur)) +
    tr('Ø Zufriedenheit', '<span class="' + ztone(z) + '">' + z + '</span>' + dl(s.sat, o?.sat, v => dec(v, 0))) +
    tr('Ruf Saisonstart → Saisonende', dec(s.rep0) + ' → <b>' + dec(s.rep1) + '</b>' + dl(s.rep1, o?.rep1, v => dec(v))) +
    tr('Ø Wartezeit an den Liften', dec(s.wait, 1) + ' min' + dl(s.wait, o?.wait, v => dec(v, 1), false)) +
    tr('Störungen', s.faults + (s.rescued >= 1 ? ' · ' + num(s.rescued) + ' Gäste geborgen' : '') + dl(s.faults, o?.faults, num, false)) +
    tr('Ø Schneehöhe Pisten', dec(s.snow, 0) + ' cm') + '</table>' +
    '<h2>Verlauf über die Saison</h2><div class="cap">Ø Gäste je Betriebstag</div><canvas data-sc="guests" data-sy="' + s.sy + '" width="620" height="120"></canvas>' +
    '<div class="cap">Ø Tagesergebnis</div><canvas data-sc="result" data-sy="' + s.sy + '" width="620" height="120"></canvas>' +
    '<div class="cap">Ruf und Zufriedenheit</div><canvas data-sc="rep" data-sy="' + s.sy + '" width="620" height="120"></canvas>' +
    '<h2>Beste und schlechteste Tage</h2><table>' + day('Meiste Gäste', s.best) + day('Wenigste Gäste', s.worst) + day('Bestes Ergebnis', s.bestR) + day('Schlechtestes Ergebnis', s.worstR) + '</table>' +
    '<h2>Erlöse</h2><table>' + rev.map(([k, v]) => tr(lb(k), eur(v) + ' <small style="opacity:.6">' + pc(v / s.R * 100) + '</small>')).join('') + tr('<b>Summe</b>', '<b>' + eur(s.R) + '</b>', 'sum') + '</table>' +
    '<h2>Kosten</h2><table>' + cost.map(([k, v]) => tr(D.costLabels[k] || k, eur(-v) + ' <small style="opacity:.6">' + pc(v / s.C * 100) + '</small>')).join('') + tr('<b>Summe</b>', '<b>' + eur(-s.C) + '</b>', 'sum') + '</table>' +
    areaRows(s, h) +
    '<h2>Gebaut und investiert</h2><table>' + (s.built.length ? s.built.map(id => tr(P[id]?.label || id, eur(P[id]?.price || 0))).join('') : tr('Keine Bauprojekte fertiggestellt', '–')) + tr('Investitionen in der Saison', eur(s.invest), 'sum') + '</table>' +
    '<h2>Personal</h2><table>' + tr('Mitarbeiter Saisonende', num(s.heads)) +
    tr('Mitarbeiter zuletzt', num(s.heads)) + tr('Lohnkosten', eur(s.wages)) + '</table>' +
    (seg.length ? '<h2>Gäste nach Zielgruppe</h2><table>' + seg.map(([k, v]) => tr('<i class="biz-dot" style="background:' + D.segs[k].color + '"></i> ' + D.segs[k].label, num(v) + ' <small style="opacity:.6">' + pc(v / segT * 100) + '</small>')).join('') + '</table>' : '') +
    '<h2>Finanzen am Saisonende</h2><table>' + tr('Kasse', eur(s.cash1) + dl(s.cash1, s.cash0, eur)) + tr('Kredit', eur(s.debt1)) + tr('Anlagevermögen (Buchwert)', eur(s.book)) + tr('Eigenkapital', '<span class="' + (s.equity >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(s.equity) + '</span>' + dl(s.equity, o?.equity, eur)) + '</table>' +
    '<div class="go"><button class="primary" data-act="splan">Zur Sommerplanung ⏎</button></div>';
}

export function summerView(G, h, tabs, body) {
  const { eur, tr, num, dec, fmtDate: fd } = h, S = G.summer, f = fixed(G), n = S.next;
  const lifts = G.lifts.filter(l => !l.build);
  const revTot = Object.values(S.costs).reduce((a, b) => a + b, 0);
  const fcN = h.fc(G);
  const rows = lifts.map(l => {
    const st = serviced(G, l) ? '<span class="biz-good">Revision erledigt</span>' : l.broken ? '<span class="biz-bad">defekt – erst reparieren</span>' : '<button class="btn" data-act="insp:' + l.id + '"' + (G.cash < D.inspect.cost ? ' disabled' : '') + '>Revision ' + eur(D.inspect.cost) + '</button>';
    return tr(l.name + '<br><small style="opacity:.7">Zustand ' + Math.round(l.cond) + ' %</small>', st);
  }).join('');
  const jobs = G.build.jobs.filter(j => j.left == null);
  const over = body ||
    '<h2>Sommerpause</h2><table>' + tr('Saisonstart', fd(n)) + tr('Kasse', eur(G.cash)) + tr('Kredit', eur(G.loan)) + tr('Erwartete Gäste am ersten Tag', num(fcN)) + '</table>' +
    '<h2>Revision der Lifte</h2><table>' + rows + '</table><p class="note">Einmal je Saison: Revision setzt den Zustand auf ' + D.inspect.to + ' % (zählt für die kommende Saison). Weniger Verschleiß bedeutet weniger Defekte.</p>' +
    '<h2>Bauprojekte im Sommer</h2><table>' + (jobs.length ? jobs.map(j => tr(P[j.id].label, '<span class="biz-warn">fertig zum Saisonstart</span>')).join('') : tr('Keine beauftragt', '<button class="btn" data-tab="build">Bau planen</button>')) + '</table>' +
    '<h2>Personal</h2><table>' + tr('Mitarbeiter im Winter', num(Object.values(G.staff.n).reduce((a, b) => a + b, 0)) + ' (automatisch)') + '</table>' +
    '<h2>Fixkosten im Sommer (pauschal beim Saisonstart)</h2><table>' + tr('Verwaltung', eur(-f.admin)) + tr('Kreditzinsen', eur(-f.interest)) + (S.costs.revision ? tr('Revisionen (bereits bezahlt)', eur(-S.costs.revision)) : '') +
    tr('<b>Summe</b>', '<b>' + eur(-(f.admin + f.interest + revTot)) + '</b>', 'sum') + '</table>';
  return '<h1>Sommerplanung</h1><p class="sub">Saison ' + label(S.sy) + ' ist beendet · nächste Saison ' + label(S.sy + 1) + '</p>' + tabs +
    over +
    '<div class="go"><button data-act="srep">Saisonbilanz</button> <button class="primary" data-act="sstart">Saison ' + label(S.sy + 1) + ' starten ⏎</button></div>';
}

export function drawSeason(cv, s) {
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 620, h = cv.clientHeight || 120, kind = cv.dataset.sc;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  const A = s.series, n = A.length, L = 46, R = 8, T = 8, B = 18;
  c.font = '11px system-ui,sans-serif';
  if (!n) return;
  const val = kind === 'guests' ? A.map(a => a.guests) : kind === 'result' ? A.map(a => a.result) : A.map(a => a.rep);
  let lo = kind === 'rep' ? 0 : Math.min(0, ...val), hi = kind === 'rep' ? 100 : Math.max(1, ...val);
  if (kind === 'result' && hi === lo) hi = lo + 1;
  const X = i => L + (w - L - R) * (i + 0.5) / n, Y = v => T + (h - T - B) * (1 - (v - lo) / (hi - lo));
  const fmt = v => kind === 'rep' ? Math.round(v) : Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 0 }) + 'k' : Math.round(v);
  c.textAlign = 'right';
  for (const v of [lo, (lo + hi) / 2, hi]) {
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(fmt(v), L - 5, Y(v) + 4);
  }
  c.textAlign = 'center';
  const step = Math.max(1, Math.ceil(n / 8));
  A.forEach((a, i) => { if (i % step === 0) { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillText(a.date.slice(8) + '.' + a.date.slice(5, 7) + '.', X(i), h - 4); } });
  if (kind === 'rep') {
    const line = (f, col) => { c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 2.2; c.beginPath(); let m = false; A.forEach((a, i) => { const v = f(a); if (v == null) return; m ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)); m = true; }); c.stroke(); A.forEach((a, i) => { const v = f(a); if (v != null) { c.beginPath(); c.arc(X(i), Y(v), 2.4, 0, 7); c.fill(); } }); };
    line(a => a.rep, '#5aa2ff'); line(a => a.sat, '#ffd84a');
    c.textAlign = 'left'; c.fillStyle = '#5aa2ff'; c.fillText('Ruf', L + 4, T + 10); c.fillStyle = '#ffd84a'; c.fillText('Zufriedenheit', L + 34, T + 10);
    return;
  }
  const bw = Math.max(3, (w - L - R) / n * 0.7);
  A.forEach((a, i) => { const v = val[i]; c.fillStyle = kind === 'result' && v < 0 ? '#ff6b5a' : kind === 'result' ? '#7be07b' : '#5aa2ff'; const y0 = Y(Math.max(0, lo)), y1 = Y(v); c.fillRect(X(i) - bw / 2, Math.min(y0, y1), bw, Math.max(1, Math.abs(y1 - y0))); });
}
