export const D = {
  version: 1,
  saveKey: 'hb-biz-v1',
  startDate: '2026-12-01',
  start: { cash: 1200000, loan: 0, credit: 6000000, rate: 0.055, rep: 55, cond: [70, 85] },
  time: { open: 510, close: 990, gameSecPerSec: 8, factors: [1, 2, 5, 10, 20], maxSteps: 40, warn: 15 },
  lifts: [
    { id: 'rossbach', name: 'Gondel Rossbach', cap: 1400, kw: 260, staff: 4, ride: 9 },
    { id: 'schareck', name: 'Gondel Schareck', cap: 1200, kw: 300, staff: 4, ride: 8 },
    { id: 'panorama', name: 'Panoramabahn', cap: 1800, kw: 220, staff: 3, ride: 6 }
  ],
  power: { price: 0.24, base: 0.4, load: 0.6 },
  maintPerLift: 350,
  admin: 3200,
  tickets: {
    day: { label: 'Tageskarte Erw.', price: 62 },
    youth: { label: 'Jugend (15–18)', price: 47 },
    child: { label: 'Kind (6–14)', price: 31 },
    half: { label: 'Halbtag ab 11:30', price: 50, from: 690 },
    season: { label: 'Saisonkarte Erw.', price: 520 }
  },
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
  costLabels: { admin: 'Verwaltung', maint: 'Wartung Lifte', power: 'Strom Lifte', interest: 'Kreditzinsen' },
  phaseLabels: { prep: 'Vorbereitung', open: 'Betrieb', closed: 'Feierabend' }
};
