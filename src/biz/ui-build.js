import { D } from './data.js';
import * as B from './build.js';
import { cannons } from './snow.js';
import { pl } from './area.js';
import { fixed } from './season.js';
import { areaTable, seasonAreas } from './ui-hut.js';

const P = D.build.projects;
const cache = new Map();

export function finTab(G, h) {
  const { eur, tr, dec } = h, pl_ = B.seasonPL(G), bv = B.bookValue(G), rate = B.rate(G), f = fixed(G), dp = B.dep(G), tier = B.scoreTier(G), sf = f.admin + f.interest;
  const rev = Object.entries(pl_.rev).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const cost = Object.entries(pl_.cost).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const lb = k => k === 'dep' ? 'Erträge Geldanlage' : D.tickets[k]?.label || D.side.areas[k]?.label || k;
  const btn = (a, t, dis) => '<button class="btn" data-act="loan:' + a + '"' + (dis ? ' disabled' : '') + '>' + t + '</button>';
  const dbtn = (a, t, dis) => '<button class="btn" data-act="dep:' + a + '"' + (dis ? ' disabled' : '') + '>' + t + '</button>';
  const [s1, s2] = D.fin.step, sc = B.score(G), w = B.depWork(G);
  const warn = G.fin.insolv > 0 || (G.cash < 0 && B.room(G) <= 0) ? '<p class="note biz-bad">Kasse im Minus und Kreditrahmen ausgeschöpft – nach ' + D.fin.insolvDays + ' Tagen droht die Insolvenz (Tag ' + G.fin.insolv + ').</p>' : '';
  const eq = G.cash + dp + bv - G.loan;
  return warn + '<h2>Bilanz</h2><table>' + tr('Kasse', eur(G.cash)) + (dp > 0 ? tr('Geldanlage', eur(dp)) : '') + tr('Anlagevermögen (Buchwert)', eur(bv)) + tr('<b>Aktiva</b>', '<b>' + eur(G.cash + dp + bv) + '</b>', 'sum') +
    tr('Kredit', eur(G.loan)) + tr('Eigenkapital', '<span class="' + (eq >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(eq) + '</span>') + '</table>' +
    '<h2>Bonität</h2><table>' + tr('Score', '<b class="' + (tier[2] ? 'biz-' + tier[2] : '') + '">' + Math.round(sc) + '</b> · ' + tier[1]) +
    tr('Wirkung', 'Kreditzins ×' + dec(B.rateK(G)) + ' · Anlage ' + dec(B.depRate(G) * 100) + ' % je Spieltag · Kreditrahmen ' + eur(B.credit(G))) + '</table>' +
    '<p class="note">100 = normal. Der Score bildet sich langsam über viele Spieltage: Gewinnmarge, kein oder wenig Kredit (Verschuldung über 40 % der Aktiva drückt) und eine Kasse im Plus heben ihn; Verluste und Minus senken ihn. Besser → weniger Zinsen, höherer Rahmen (bis ' + eur(D.fin.score.creditMax) + '), mehr Anlageertrag.</p>' +
    '<h2>Geldanlage</h2><table>' + tr('Angelegt', eur(dp) + (dp > w ? ' (davon verzinst ' + eur(w) + ', nur Eigenmittel über dem Kredit)' : '')) + tr('Ertrag', dec(B.depRate(G) * 100) + ' % je Spieltag · ' + eur(w * B.depRate(G)) + ' am Abend') +
    tr('Anlegen', dbtn(s1, '+ ' + eur(s1), G.cash <= 0) + ' ' + dbtn(s2, '+ ' + eur(s2), G.cash <= 0) + ' ' + dbtn('cash', 'ganze Kasse', G.cash <= 0)) +
    tr('Abheben', dbtn(-s1, '− ' + eur(s1), dp <= 0) + ' ' + dbtn(-s2, '− ' + eur(s2), dp <= 0) + ' ' + dbtn('all', 'alles', dp <= 0)) + '</table>' +
    '<h2>Kredit</h2><table>' + tr('Stand / Rahmen', eur(G.loan) + ' / ' + eur(B.credit(G)) + (G.open ? ' (wächst mit eigenem Anlagevermögen)' : '')) + tr('Zins', dec(rate * 100) + ' % p. a. · ' + eur(G.loan * rate * D.dayStep / 365) + ' je Spieltag') +
    tr('Aufnehmen', btn(s1, '+ ' + eur(s1), B.room(G) <= 0) + ' ' + btn(s2, '+ ' + eur(s2), B.room(G) <= 0)) +
    tr('Tilgen', btn(-s1, '− ' + eur(s1), G.loan <= 0 || G.cash <= 0) + ' ' + btn(-s2, '− ' + eur(s2), G.loan <= 0 || G.cash <= 0) + ' ' + btn('all', 'alles', G.loan <= 0 || G.cash <= 0)) + '</table>' +
    '<h2>Gewinn- und Verlustrechnung Saison ' + G.season + '/' + String(G.season + 1).slice(2) + '</h2><table>' +
    rev.map(([k, v]) => tr(lb(k), eur(v))).join('') + tr('<b>Erlöse</b>', '<b>' + eur(pl_.R) + '</b>', 'sum') +
    cost.map(([k, v]) => tr(D.costLabels[k] || k, eur(-v))).join('') + tr('<b>Betriebsaufwand</b>', '<b>' + eur(-pl_.C) + '</b>', 'sum') +
    tr('Betriebsergebnis vor Abschreibung', eur(pl_.ebitda)) + tr('Abschreibungen', eur(-pl_.depr)) +
    tr('<b>Ergebnis Winterbetrieb</b>', '<b class="' + (pl_.result >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(pl_.result) + '</b>', 'sum') +
    tr('Sommer: Verwaltung + Zinsen (geschätzt, fällig zum Saisonstart)', eur(-sf)) +
    tr('<b>Jahresergebnis (Stand heute)</b>', '<b class="' + (pl_.result - sf >= 0 ? 'biz-good' : 'biz-bad') + '">' + eur(pl_.result - sf) + '</b>', 'sum') +
    tr('Investitionen (nicht im Ergebnis)', eur(pl_.invest)) + tr('Betriebstage · Gäste', pl_.days + ' · ' + h.num(pl_.guests)) + '</table>' +
    (areaTable(G, seasonAreas(G), h) ? '<h2>Gebiete (Saison)</h2>' + areaTable(G, seasonAreas(G), h) + '<button class="btn" data-act="amap">Gebietskarte</button>' : '') +
    '<h2>Anlagenspiegel</h2><table>' + G.fin.items.map(x => tr(x.label + (x.n != null ? ' (' + x.n + ')' : ''), 'Buchwert ' + eur(x.val) + ' · Anschaffung ' + eur(x.cost) + ' · ' + x.life + ' J.')).join('') + '</table>' +
    '<p class="note">Abschreibung linear (Lifte ' + P.tunnelbahn.life + ' Jahre), je Betriebstag 1/' + D.fin.days + ' des Jahresbetrags. Kasse unter 0 → erst Geldanlage aufgelöst, dann Kredit automatisch erhöht, bis der Rahmen ausgeschöpft ist.</p>';
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
    else if (j && j.left === 0) st = '<span class="biz-warn">fertig, wartet auf ' + B.waitFor(G, id).join(', ') + '</span>';
    else if (j) st = '<span class="biz-warn">' + (j.left == null ? 'bis Saisonstart' : 'fertig morgen früh') + '</span>';
    else if (G.summer && !why) st = '<button class="btn primary" data-act="build:' + id + ':s">Bis Saisonstart bauen</button>';
    else if (why) st = '<span class="biz-bad">' + why + '</span>';
    else st = '<button class="btn primary" data-act="build:' + id + '">Bauen · über Nacht</button>';
    return tr('<b>' + p.label + '</b><br><small style="opacity:.75">' + p.info + '</small><br><small>' + use + (sat ? '<br>' + sat : '') + '</small>', eur(p.price) + '<br>' + st);
  };
  const c = cannons(G), dis = (x) => x ? ' disabled' : '';
  const money = G.cash + B.room(G);
  const rank = id => B.job(G, id) ? 0 : B.done(G, id) ? 3 : /^erst /.test(B.check(G, id)) ? 2 : 1;
  const ids = Object.keys(P).filter(id => !P[id].custom).filter(id => !(P[id].cab || P[id].chain) || B.done(G, id) || B.job(G, id) || !/^erst /.test(B.check(G, id))).sort((a, b) => rank(a) - rank(b));
  const fin = ids.filter(id => rank(id) === 3 && !((P[id].cab || P[id].chain) && ids.some(x => P[x].needs?.includes(id) && B.done(G, x)))).map(id => P[id].label);
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
