export const D = {
  version: 1,
  saveKey: 'hb-biz-v1',
  startDate: '2026-12-01',
  start: { cash: 1200000, loan: 0, credit: 6000000, rate: 0.055, rep: 55, cond: [70, 85] },
  time: { open: 510, close: 990, gameSecPerSec: 8, factors: [1, 2, 5, 10, 20], maxSteps: 40, warn: 15 },
  lifts: [
    { id: 'rossbach', name: 'Gondel Rossbach', cap: 1400, kw: 260, staff: 4, ride: 9, from: 'tal', to: 'rossbach' },
    { id: 'schareck', name: 'Gondel Schareck', cap: 1200, kw: 300, staff: 4, ride: 8, from: 'rossbach', to: 'schareck' },
    { id: 'panorama', name: 'Panoramabahn', cap: 1800, kw: 220, staff: 3, ride: 6, from: 'fallbichl', to: 'schareck' }
  ],
  nodes: { tal: 'Talstation', rossbach: 'Rossbach', schareck: 'Schareck', fallbichl: 'Fallbichl' },
  pistes: [
    { id: '4', name: 'Schareckabfahrt', level: 'mittel', km: 2.33, from: 'schareck', to: 'rossbach' },
    { id: '5', name: 'Kärntnerabfahrt', level: 'leicht', km: 2.86, from: 'schareck', to: 'rossbach' },
    { id: '5a', name: 'Kärntnerabfahrt Variante', level: 'mittel', km: 3.1, from: 'schareck', to: 'rossbach' },
    { id: '1', name: 'Fallbichlabfahrt', level: 'schwer', km: 1.39, from: 'schareck', to: 'fallbichl' },
    { id: '2', name: 'Seppenalmabfahrt', level: 'mittel', km: 3.03, from: 'schareck', to: 'rossbach' },
    { id: '10', name: 'Talabfahrt', level: 'mittel', km: 1.83, from: 'rossbach', to: 'tal' }
  ],
  demandModel: { priceExp: 1.4, priceClamp: [0.3, 1.6], rep: [0.4, 1.2], offer: [0.3, 0.7], eps: [0.9, 1.1] },
  flow: {
    arrive: { from: 495, peak: 570, to: 660 },
    half: { from: 690, peak: 720, to: 780 },
    leave: { from: 870, to: 990 },
    lunch: { from: 705, to: 810, share: 0.6, dur: 40, nodes: ['rossbach', 'schareck'] },
    speed: { leicht: 25, mittel: 32, schwer: 38 },
    pause: { leicht: 4, mittel: 3, schwer: 2 },
    skill: { leicht: 0.35, mittel: 0.45, schwer: 0.2 },
    pref: {
      leicht: { leicht: 1, mittel: 0.15, schwer: 0 },
      mittel: { leicht: 0.5, mittel: 1, schwer: 0.2 },
      schwer: { leicht: 0.2, mittel: 0.8, schwer: 1 }
    },
    liftW: 1,
    queueTau: 12,
    seasonShare: 0.08,
    densityRef: 2500,
    pulkWait: 5,
    wait: [5, 15]
  },
  power: { price: 0.24, base: 0.4, load: 0.6 },
  maintPerLift: 350,
  wear: { perHour: 0.3, base: 0.5 },
  fault: {
    base: 0.0015, ref: 20,
    types: [
      { id: 'minor', label: 'Kleinstörung', w: 0.75, min: [30, 90], cost: [2000, 6000], gain: 0 },
      { id: 'drive', label: 'Antrieb', w: 0.2, min: [1440, 2880], cost: [25000, 60000], gain: 6 },
      { id: 'rope', label: 'Seil/Klemme', w: 0.05, min: [4320, 7200], cost: [80000, 150000], gain: 12 }
    ]
  },
  express: { cost: 1.8, time: 0.5 },
  inspect: { cost: 4000, gain: 8, min: 120 },
  night: 960,
  pisteStart: { cond: 80, snow: 80 },
  logMax: 60,
  admin: 3200,
  tickets: {
    day: { label: 'Tageskarte Erw.', price: 62 },
    youth: { label: 'Jugend (15–18)', price: 47 },
    child: { label: 'Kind (6–14)', price: 31 },
    half: { label: 'Halbtag ab 11:30', price: 50, from: 690 },
    season: { label: 'Saisonkarte Erw.', price: 520 }
  },
  guestLabels: { adult: 'Erwachsene', youth: 'Jugend', child: 'Kinder', half: 'Halbtag', season: 'Saisonkarte' },
  ticketOf: { adult: 'day', youth: 'youth', child: 'child', half: 'half' },
  priceStep: 1,
  priceRange: [0, 300],
  mix: { adult: 0.62, youth: 0.13, child: 0.25, half: 0.15 },
  demand: {
    early: { label: '1.–19. Dez', wd: 350, we: 750 },
    xmas: { label: 'Weihnachtsferien', wd: 1900, we: 1900 },
    jan: { label: 'Jänner', wd: 550, we: 1150 },
    febHol: { label: 'Semesterferien', wd: 1700, we: 2000 },
    feb: { label: 'Februar', wd: 750, we: 1250 },
    mar: { label: 'März', wd: 800, we: 1300 },
    easter: { label: 'Osterferien', wd: 1300, we: 1400 },
    late: { label: 'nach Ostern', wd: 300, we: 550 }
  },
  demandRef: { rep: 50 },
  febHolidays: [8, 28],
  easterHolidays: [-8, 1],
  seasonEnd: { month: 4, day: 6 },
  staffCost: { lift: 210, tech: 270, groomer: 250, patrol: 240, cashier: 190, instructor: 220, gastro: 185 },
  groom: { price: 190000, perHour: 145, hoursPerKm: 1.3, start: 4 },
  snow: { perM3: 4.2, price: 22000, m3PerHour: 55, maxTemp: -3, baseCm: 40, start: 30, pistes: ['10', '4', '5'] },
  side: {
    gastro: { perGuest: 19, margin: 0.38 },
    rental: { share: 0.18, price: 36 },
    school: { share: 0.06, price: 75 },
    parking: { share: 0.55, price: 6 }
  },
  invest: {
    fleissbahn: { label: 'Fleißbahn (Gondel)', price: 4800000 },
    tunnelbahn: { label: 'Tunnelbahn', price: 3200000 },
    hochfleiss: { label: 'Sessellift Hochfleiß', price: 2400000 },
    rossbach10: { label: 'Gondel Rossbach 10er (+60 %)', price: 3600000, capBoost: 0.6 },
    pisteKm: { label: 'Neue Piste je km', price: 180000 },
    hut: { label: 'Hütte ausbauen', price: 350000 },
    garage: { label: 'Parkhaus', price: 900000 }
  },
  balance: { skierDays: [90000, 130000], revenue: [5e6, 7e6], profit: [4e5, 1.2e6], badRep: 35, sat: [60, 80] },
  costLabels: { admin: 'Verwaltung', maint: 'Wartung Lifte', power: 'Strom Lifte', repair: 'Reparaturen', inspect: 'Inspektionen', interest: 'Kreditzinsen' },
  liftStatus: { run: 'in Betrieb', closed: 'geschlossen', fault: 'Störung', repair: 'Reparatur', insp: 'Inspektion' },
  phaseLabels: { prep: 'Vorbereitung', open: 'Betrieb', closed: 'Feierabend' }
};
