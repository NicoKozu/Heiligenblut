import { D } from './data.js';
import * as B from './build.js';
import { cannons } from './snow.js';
import { pl } from './area.js';

const P = D.build.projects;
const cache = new Map();

export function finTab(G, h) {
  const { eur, tr, dec } = h, pl_ = B.seasonPL(G), bv = B.bookValue(G), rate = D.start.rate;
  const rev = Object.entries(pl_.rev).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const cost = Object.entries(pl_.cost).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const lb = k => D.tickets[k]?.label || D.side.areas[k]?.label || k;
  const btn = (a, t, dis) => '<button class="btn" data-act="loan:' + a + '"' + (dis ? ' disabled' : '') + '>' + t + '</button>';
  const [s1, s2] = D.fin.step;
  const warn = G.fin.insolv > 0 || (G.cash < 0 && B.room(G) <= 0) ? '<p class="note biz-bad">Kasse im Minus und Kreditrahmen ausgeschöpft – nach ' + D.fin.insolvDays + ' Tagen droht die Insolvenz (Tag ' + G.fin.insolv + ').</p>' : '';
  return warn + '<h2>Bilanz</h2><table>' + tr('Kasse', eur(G.cash)) + tr('Anlagevermögen (Buchwert)', eur(bv)) + tr('<b>Aktiva</b>', '<b>' + eur(G.cash + bv) + '</b>', 'sum') +
    tr('Kredit', eur(G.loan)) + tr('Eigenkapital', '<span class="' + (G.cash + bv - G.loan >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(G.cash + bv - G.loan) + '</span>') + '</table>' +
    '<h2>Kredit</h2><table>' + tr('Stand / Rahmen', eur(G.loan) + ' / ' + eur(D.start.credit)) + tr('Zins', dec(rate * 100) + ' % p. a. · ' + eur(G.loan * rate / 365) + ' je Tag') +
    tr('Aufnehmen', btn(s1, '+ ' + eur(s1), B.room(G) <= 0) + ' ' + btn(s2, '+ ' + eur(s2), B.room(G) <= 0)) +
    tr('Tilgen', btn(-s1, '− ' + eur(s1), G.loan <= 0 || G.cash <= 0) + ' ' + btn(-s2, '− ' + eur(s2), G.loan <= 0 || G.cash <= 0) + ' ' + btn('all', 'alles', G.loan <= 0 || G.cash <= 0)) + '</table>' +
    '<h2>Gewinn- und Verlustrechnung Saison ' + G.season + '/' + String(G.season + 1).slice(2) + '</h2><table>' +
    rev.map(([k, v]) => tr(lb(k), eur(v))).join('') + tr('<b>Erlöse</b>', '<b>' + eur(pl_.R) + '</b>', 'sum') +
    cost.map(([k, v]) => tr(D.costLabels[k] || k, eur(-v))).join('') + tr('<b>Betriebsaufwand</b>', '<b>' + eur(-pl_.C) + '</b>', 'sum') +
    tr('Betriebsergebnis vor Abschreibung', eur(pl_.ebitda)) + tr('Abschreibungen', eur(-pl_.depr)) +
    tr('<b>Ergebnis</b>', '<b class="' + (pl_.result >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(pl_.result) + '</b>', 'sum') +
    tr('Investitionen (nicht im Ergebnis)', eur(pl_.invest)) + tr('Betriebstage · Gäste', pl_.days + ' · ' + h.num(pl_.guests)) + '</table>' +
    '<h2>Anlagenspiegel</h2><table>' + G.fin.items.map(x => tr(x.label + (x.n != null ? ' (' + x.n + ')' : ''), 'Buchwert ' + eur(x.val) + ' · Anschaffung ' + eur(x.cost) + ' · ' + x.life + ' J.')).join('') + '</table>' +
    '<p class="note">Abschreibung linear (Lifte ' + P.tunnelbahn.life + ' Jahre), je Betriebstag 1/' + D.fin.days + ' des Jahresbetrags. Kasse unter 0 → Kredit wird automatisch erhöht, bis der Rahmen ausgeschöpft ist.</p>';
}

function gainOf(G, id, fc) {
  const k = id + G.date + G.phase + G.build.done.join() + G.build.jobs.length + G.lifts.map(l => +l.open).join('') + Object.values(G.pistes).map(p => +p.open).join('');
  if (!cache.has(k)) { if (cache.size > 40) cache.clear(); cache.set(k, B.benefit(G, id, fc)); }
  return cache.get(k);
}

export function buildTab(G, h) {
  const { eur, tr, num } = h;
  const card = id => {
    const p = P[id], why = B.check(G, id), j = B.job(G, id), done = B.done(G, id), b = gainOf(G, id, h.fc);
    const use = [b.cap ? '+' + num(b.cap) + ' P/h' : '', b.km ? '+' + b.km.toLocaleString('de-DE') + ' Pisten-km' : '', b.seats ? '+' + b.seats + ' Sitzplätze' : '', b.park ? '+' + b.park + ' Stellplätze' : '', b.gain != null ? 'Nachfrage ' + (b.gain >= 0 ? '+' : '') + Math.round(b.gain * 100) + ' %' + (p.needs ? ' (mit Voraussetzungen)' : '') : ''].filter(Boolean).join(' · ');
    const sat = b.km ? 'Zufriedenheit: mehr Angebot, weniger Gedränge' : b.cap ? 'Zufriedenheit: kürzere Wartezeiten' : b.seats ? 'Zufriedenheit: Service (Hütte)' : b.park ? 'weniger umkehrende Gäste' : '';
    let st;
    if (done) st = '<span class="biz-good">fertig</span>';
    else if (j) st = j.left == null ? '<span class="biz-warn">im Sommer</span>' : '<span class="biz-warn">im Bau · noch ' + j.left + ' Tage</span>' + '<div class="biz-bar"><i style="width:' + Math.round((1 - j.left / j.days) * 100) + '%;background:#ffd84a"></i></div>';
    else if (why) st = '<span class="biz-bad">' + why + '</span>';
    else st = '<button class="btn primary" data-act="build:' + id + '">Bauen · ' + p.days + ' Tage</button> <button class="btn" data-act="build:' + id + ':s">Im Sommer</button>';
    return tr('<b>' + p.label + '</b><br><small style="opacity:.75">' + p.info + (p.close ? ' Sperre während Bau.' : '') + (p.closeHut ? ' Hütte während Bau zu.' : '') + '</small><br><small>' + use + (sat ? '<br>' + sat : '') + '</small>', eur(p.price) + '<br>' + st);
  };
  const c = cannons(G), dis = (x) => x ? ' disabled' : '';
  const money = G.cash + B.room(G);
  const rank = id => B.job(G, id) ? 0 : B.done(G, id) ? 3 : /^erst /.test(B.check(G, id)) ? 2 : 1;
  const ids = [...B.PROJECTS].sort((a, b) => rank(a) - rank(b));
  const fin = ids.filter(id => rank(id) === 3).map(id => P[id].label);
  return '<h2>Projekte</h2><p class="note">Du startest mit Gondel Rossbach und Talabfahrt. Alles andere wird hier gekauft und gebaut.</p><table>' + ids.filter(id => rank(id) < 3).map(card).join('') + '</table>' +
    (fin.length ? '<p class="note">Fertig: ' + fin.join(', ') + '</p>' : '') +
    '<h2>Beschneiung</h2><table>' + pl(G).map(p => {
      const has = G.pipes.includes(p.id), n = c[p.id] || 0;
      return tr(p.id + ' ' + p.name, has ? n + ' Kanonen <button class="btn" data-act="can:' + p.id + ':-1"' + dis(!n) + '>−</button><button class="btn" data-act="can:' + p.id + ':1"' + dis(money < D.snow.price) + '>+ ' + eur(D.snow.price) + '</button>' : 'keine Leitung <button class="btn" data-act="pipe:' + p.id + '"' + dis(money < B.pipeCost(p)) + '>Leitung · ' + eur(B.pipeCost(p)) + '</button>');
    }).join('') + '</table>' +
    '<h2>Pistengeräte</h2><table>' + tr('Geräte', G.groom.machines + ' <button class="btn" data-act="mach:-1"' + dis(!G.groom.machines) + '>Verkaufen</button><button class="btn" data-act="mach:1"' + dis(money < D.groom.price) + '>Kaufen · ' + eur(D.groom.price) + '</button>') + '</table>' +
    '<p class="note">Bezahlt wird bei Auftrag (fehlt Geld, wird der Kredit erhöht). „Im Sommer“: Bau nach Saisonende ohne Sperren, fertig zur nächsten Saison. Leitungen ' + eur(D.build.pipe) + ' je km, danach Kanonen auf der Piste möglich. Verkauf zu ' + Math.round(D.build.sell * 100) + ' % des Buchwerts. Neue Lifte brauchen Liftpersonal (Tab Personal).</p>';
}

export function overView(G, h) {
  const { eur, tr } = h, o = G.fin.over;
  return '<h1>Insolvenz</h1><p class="sub">' + h.fmtDate(o.date) + ' – ' + D.fin.insolvDays + ' Tage zahlungsunfähig</p><h2>Schlussbilanz</h2><table>' + tr('Kasse', eur(o.cash)) + tr('Kredit', eur(o.loan)) + tr('Anlagevermögen', eur(o.assets)) + tr('Eigenkapital', eur(o.cash + o.assets - o.loan)) + tr('Spieltage', h.num(G.day)) + tr('Ruf', Math.round(G.rep)) + '</table>' +
    '<div class="go"><button class="primary" data-act="newgame">Neues Spiel</button></div>';
}
