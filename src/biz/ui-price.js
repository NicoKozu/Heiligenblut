import { D } from './data.js';
import { expectedSeg } from './demand.js';
import { SEGS } from './marketing.js';

export const CURVE_KEYS = ['day', 'youth', 'child', 'half'];

export const CURVE_CSS = `
#biz-over .pcurves{display:grid;grid-template-columns:1fr 1fr;gap:10px}
#biz-over .pcurve{background:rgba(255,255,255,.05);border-radius:8px;padding:8px 8px 6px}
#biz-over .pcurve b{font-size:12px}
#biz-over .pcurve svg{display:block;width:100%;height:auto;cursor:crosshair}
#biz-over .pcurve small{display:block;opacity:.8;font-variant-numeric:tabular-nums;line-height:1.45}
#biz-over .pleg{display:flex;gap:14px;font-size:12px;opacity:.8;margin:0 0 6px}
#biz-over .pleg i{display:inline-block;width:14px;height:3px;vertical-align:middle;margin-right:5px;border-radius:2px}
`;

const W = 260, Hh = 130, L = 6, R = 6, T = 8, B = 18;

export function curve(G, k, date, x) {
  const s = G.seasonShare ?? D.flow.seasonShare, h = D.mix.half, def = D.tickets[k].price;
  const max = Math.min(D.priceRange[1], Math.max(def * 2.5, G.prices[k] * 1.3, 20));
  const at = p => {
    const P = { ...G.prices, [k]: p }, seg = expectedSeg({ ...G, prices: P }, date, x);
    let n = 0, rev = 0;
    for (const sg of SEGS) {
      const v = seg[sg], mx = D.segs[sg].mix, tm = mx.adult + mx.youth + mx.child;
      n += v;
      rev += v * (1 - s) * ((1 - h) * (mx.adult * P.day + mx.youth * P.youth + mx.child * P.child) / tm + h * P.half);
    }
    return { p, n, db: rev - n * D.guestCost };
  };
  const pts = [];
  for (let i = 0; i <= 60; i++) pts.push(at(Math.round(max * i / 60)));
  let best = pts[0];
  for (let p = 0; p <= max; p++) { const q = at(p); if (q.db > best.db) best = q; }
  return { pts, best, cur: at(G.prices[k]), max };
}

export function curveSvg(k, c, edit) {
  const nMax = Math.max(1, ...c.pts.map(q => q.n)) * 1.08, dHi = Math.max(1, ...c.pts.map(q => q.db)), dLo = Math.max(0, Math.min(...c.pts.map(q => q.db))), dLo2 = Math.max(0, dLo - (dHi - dLo) * 0.25), dMax = dHi + (dHi - dLo2) * 0.08;
  const X = p => L + (W - L - R) * p / c.max, Yn = n => T + (Hh - T - B) * (1 - n / nMax), Yd = v => T + (Hh - T - B) * (1 - Math.max(0, v - dLo2) / Math.max(1, dMax - dLo2));
  const path = f => c.pts.map((q, i) => (i ? 'L' : 'M') + X(q.p).toFixed(1) + ' ' + f(q).toFixed(1)).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(c.max * t)).map(p => '<line x1="' + X(p) + '" x2="' + X(p) + '" y1="' + T + '" y2="' + (Hh - B) + '" stroke="rgba(255,255,255,.08)"/><text x="' + X(p) + '" y="' + (Hh - 5) + '" fill="rgba(255,255,255,.55)" font-size="9" text-anchor="' + (p === 0 ? 'start' : p === Math.round(c.max) ? 'end' : 'middle') + '">' + p + ' €</text>').join('');
  const bx = X(c.best.p), cx = X(c.cur.p);
  return '<svg viewBox="0 0 ' + W + ' ' + Hh + '"' + (edit ? ' data-curve="' + k + '" data-max="' + c.max + '"' : '') + '>' + ticks +
    '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (Hh - B) + '" y2="' + (Hh - B) + '" stroke="rgba(255,255,255,.3)"/>' +
    '<path d="' + path(q => Yn(q.n)) + '" fill="none" stroke="#5aa2ff" stroke-width="1.6" stroke-dasharray="4 3"/>' +
    '<path d="' + path(q => Yd(q.db)) + '" fill="none" stroke="#ffb14a" stroke-width="2.2"/>' +
    '<line x1="' + bx + '" x2="' + bx + '" y1="' + T + '" y2="' + (Hh - B) + '" stroke="#7be07b" stroke-dasharray="2 3"/>' +
    '<circle cx="' + bx + '" cy="' + Yd(c.best.db) + '" r="3.5" fill="#7be07b"/>' +
    '<line x1="' + cx + '" x2="' + cx + '" y1="' + T + '" y2="' + (Hh - B) + '" stroke="rgba(255,255,255,.35)"/>' +
    '<circle cx="' + cx + '" cy="' + Yn(c.cur.n) + '" r="4" fill="#5aa2ff" stroke="#fff" stroke-width="1.2"/>' +
    '<circle cx="' + cx + '" cy="' + Yd(c.cur.db) + '" r="5" fill="#ffb14a" stroke="#fff" stroke-width="1.5"/></svg>';
}

export function curvesView(G, date, x, edit, { eur, num }) {
  const cards = CURVE_KEYS.map(k => {
    const c = curve(G, k, date, x), d = c.cur.db - c.best.db;
    return '<div class="pcurve"><b>' + D.tickets[k].label + '</b>' + curveSvg(k, c, edit) +
      '<small>Jetzt ' + eur(c.cur.p) + ' · ' + num(c.cur.n) + ' Gäste · ' + eur(c.cur.db) + '</small>' +
      '<small><span class="biz-good">Optimum ' + eur(c.best.p) + '</span> · ' + num(c.best.n) + ' Gäste · ' + eur(c.best.db) + (Math.abs(d) >= 1 ? ' <span class="biz-bad">(' + eur(d) + ')</span>' : '') + '</small></div>';
  }).join('');
  return '<h2>Preiskurven</h2><div class="pleg"><span><i style="background:#ffb14a"></i>Ticketerlös − Gästebetrieb</span><span><i style="background:#5aa2ff"></i>Gäste</span><span><i style="background:#7be07b"></i>Optimum</span></div><div class="pcurves">' + cards + '</div>' +
    '<p class="note">Prognose für den nächsten Betriebstag, je Kurve nur dieser Preis verändert (die anderen bleiben). ' + (edit ? 'Klick in eine Grafik setzt den Preis. ' : '') + 'Nicht enthalten: Gastro/Verleih/Parkplatz je Gast, Liftkapazität (Wartezeit) und die Wirkung des Preises auf Zufriedenheit und Ruf – das Optimum ist also eher eine Obergrenze.</p>';
}
