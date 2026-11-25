export const D = {
  version: 1,
  saveKey: 'hb-biz-v1',
  startDate: '2026-12-01',
  dayStep: 6,
  start: { cash: 250000, loan: 0, credit: 1000000, rate: 0.055, rep: 55, cond: [70, 85] },
  time: { open: 510, close: 990, gameSecPerSec: 8, factors: [0.125, 1, 2, 5, 10, 20, 60], maxSteps: 40, warn: 15 },
  lifts: [
    { id: 'rossbach', name: 'Gondel Rossbach', gap: 10, places: 4, kw: 260, staff: 4, maint: 1800, ride: 9, from: 'tal', to: 'rossbach' },
    { id: 'schareck', name: 'Gondel Schareck', gap: 12, places: 4, kw: 300, staff: 4, maint: 2400, ride: 8, from: 'rossbach', to: 'schareck', exposed: true, proj: 'schareck' },
    { id: 'panorama', name: 'Panoramabahn', gap: 8, places: 4, kw: 220, staff: 3, maint: 2000, ride: 6, from: 'fallbichl', to: 'schareck', exposed: true, proj: 'panorama' },
    { id: 'tunnelbahn', name: 'Tunnelbahn Fleißalm', gap: 14, places: 4, kw: 240, staff: 2, maint: 800, ride: 5, from: 'rossbach', to: 'fleissalm', both: true, proj: 'tunnelbahn' },
    { id: 'fleissbahn', name: 'Fleißbahn', gap: 7, places: 4, kw: 320, staff: 3, maint: 1500, ride: 8, from: 'fleissalm', to: 'fleisstop', proj: 'fleissbahn' },
    { id: 'hochfleiss', name: 'Schlepplift Hochfleiß', gap: 10, places: 4, kw: 160, staff: 2, maint: 1000, ride: 6, from: 'fleisstop', to: 'hochfleiss', exposed: true, drag: true, proj: 'hochfleiss' },
    { id: 'tauernberg', name: 'Schlepplift Tauernberg', gap: 5, places: 2, kw: 110, staff: 2, maint: 600, ride: 6, from: 'tauern', to: 'seppen', drag: true, proj: 'tauernberg' },
    { id: 'viehbuehel', name: 'Schlepplift Viehbühel', gap: 5, places: 2, kw: 90, staff: 2, maint: 500, ride: 4, from: 'fallbichl', to: 'vieh', exposed: true, drag: true, proj: 'viehbuehel' },
    { id: 'ederfeld', name: 'Tellerlift Ederfeld', gap: 5, places: 1, kw: 45, staff: 1, maint: 300, ride: 3, from: 'fleissalm', to: 'eder', drag: true, proj: 'ederfeld' },
    { id: 'schulwiese', name: 'Tellerlift Schulwiese', gap: 4, places: 1, kw: 20, staff: 1, maint: 200, ride: 2, from: 'tal', to: 'schule', drag: true, proj: 'schulwiese' },
    { id: 'kidsworld', name: 'Seillift Kidsworld', gap: 3, places: 1, kw: 8, staff: 1, maint: 120, ride: 1, from: 'tal', to: 'kids', drag: true, proj: 'kidsworld' }
  ],
  nodes: { tal: 'Talstation', rossbach: 'Rossbach', schareck: 'Schareck', fallbichl: 'Fallbichl', fleissalm: 'Fleißalm', fleisstop: 'Fleißbahn Berg', hochfleiss: 'Hochfleiß', tauern: 'Tauernberg Tal', seppen: 'Seppenalm', vieh: 'Viehbühel', eder: 'Ederfeld', schule: 'Schulwiese', kids: 'Kidsworld' },
  nodeH: { tal: 1309, rossbach: 1750, schareck: 2556, fallbichl: 2219, fleissalm: 1808, fleisstop: 2470, hochfleiss: 2920, tauern: 1698, seppen: 2066, vieh: 2417, eder: 1916, schule: 1259, kids: 1244 },
  pistes: [
    { id: '4', name: 'Schareckabfahrt', level: 'mittel', km: 2.33, from: 'schareck', to: 'rossbach', proj: 'p4' },
    { id: '5', name: 'Kärntnerabfahrt', level: 'leicht', km: 2.86, from: 'schareck', to: 'rossbach', proj: 'p5' },
    { id: '5a', name: 'Kärntnerabfahrt Variante', level: 'mittel', km: 3.1, from: 'schareck', to: 'rossbach', proj: 'p5a' },
    { id: '1', name: 'Fallbichlabfahrt', level: 'schwer', km: 1.39, from: 'schareck', to: 'fallbichl', proj: 'p1' },
    { id: '1a', name: 'Fallbichlabfahrt Variante', level: 'mittel', km: 2.0, from: 'schareck', to: 'fallbichl', proj: 'p1a', exp: true },
    { id: '2', name: 'Seppenalmabfahrt', level: 'mittel', km: 3.03, from: 'schareck', to: 'rossbach', proj: 'p2' },
    { id: '10', name: 'Talabfahrt', level: 'mittel', km: 1.83, from: 'rossbach', to: 'tal' },
    { id: '11', name: 'Wiesenabfahrt', level: 'leicht', km: 2.38, from: 'fleisstop', to: 'fleissalm', proj: 'p11', exp: true },
    { id: '12', name: 'Muldenabfahrt', level: 'mittel', km: 2.15, from: 'fleisstop', to: 'fleissalm', proj: 'p12', exp: true },
    { id: '11a', name: 'Gratabfahrt', level: 'mittel', km: 3.58, from: 'hochfleiss', to: 'fleissalm', proj: 'p11a', exp: true },
    { id: '2b', name: 'Tauernabfahrt', level: 'leicht', km: 3.73, from: 'schareck', to: 'rossbach', proj: 'p2b', exp: true },
    { id: '2c', name: 'Seppenbaur', level: 'mittel', km: 1.2, from: 'seppen', to: 'tauern', proj: 'p2c', exp: true },
    { id: '8', name: 'Viehbühel', level: 'leicht', km: 1.26, from: 'vieh', to: 'fallbichl', proj: 'p8', exp: true },
    { id: 'S', name: 'Schulwiese', level: 'leicht', km: 0.25, from: 'schule', to: 'tal', proj: 'schulwiese', exp: true },
    { id: 'K', name: 'Kidsworld', level: 'leicht', km: 0.13, from: 'kids', to: 'tal', proj: 'kidsworld', exp: true },
    { id: '10o', name: 'Talabfahrt bis Tauernberg', level: 'mittel', km: 0.52, from: 'rossbach', to: 'tauern', proj: 'tauernberg', of: '10', upto: [723.2, -548.8] },
    { id: '10t', name: 'Talabfahrt ab Tauernberg', level: 'mittel', km: 1.31, from: 'tauern', to: 'tal', proj: 'tauernberg', of: '10', at: [723.2, -548.8] },
    { id: '11e', name: 'Wiesenabfahrt ab Ederfeld', level: 'leicht', km: 0.46, from: 'eder', to: 'fleissalm', proj: 'ederfeld', of: '11', at: [2451.2, -1514.2] }
  ],
  demandModel: { priceExp: 1.4, priceClamp: [0.3, 1.6], rep: [0.3, 1.4], offer: [0.2, 0.8], expW: 1.7, eps: [0.9, 1.1] },
  flow: {
    arrive: { from: 495, peak: 570, to: 660 },
    half: { from: 690, peak: 720, to: 780 },
    leave: { from: 870, to: 990 },
    lunch: { from: 705, to: 810, share: 0.65, dur: 40 },
    holdGiveUp: 0.008,
    speed: { leicht: 25, mittel: 32, schwer: 38 },
    pause: { leicht: 4, mittel: 3, schwer: 2 },
    pauseKm: 1,
    skill: { leicht: 0.35, mittel: 0.45, schwer: 0.2 },
    pref: {
      leicht: { leicht: 1, mittel: 0.15, schwer: 0 },
      mittel: { leicht: 0.5, mittel: 1, schwer: 0.35 },
      schwer: { leicht: 0.2, mittel: 0.6, schwer: 1 }
    },
    liftW: 1,
    queueTau: 12,
    seasonShare: 0.08,
    cardVisits: 14,
    densityRef: 2500,
    pulkWait: 5,
    wait: [5, 15],
    group: { fam: [0.05, 0.15, 0.4, 0.4], sport: [0.45, 0.45, 0.1, 0], day: [0.25, 0.45, 0.2, 0.1], week: [0.15, 0.4, 0.25, 0.2] },
    tempo: [0.85, 1.2],
    over: 0.12,
    under: 0.05,
    lead: [0.0167, 0.0167],
    eatHalf: 0.3,
    lateLunch: 60,
    stay: [0.75, 1.25],
    backW: 0.3,
    destMin: 0.15,
    homeW: 8,
    hungryW: 6,
    hutDist: 0.8,
    variety: 0.6,
    look: 10
  },
  net: { home: [-158, -109], funEl: 1.2, cond: [0.6, 0.4], variety: 0.25, varRef: 8, waitTau: 15, park: [0.25, 0.75], distTau: 6, memK: 0.3, mem0: 0.5, memA: 0.25, memWait: 30, shuttle: 6, shuttleMin: 20, walk: 60, walkMax: 2500, lastRide: 980, homeBy: 960, early: 12, awayW: 0.15, dead: 0.002, offerBase: 0.1, offerLink: 0.03, offerMax: 0.2, repKm: 0.03, repMax: 0.15 },
  power: { price: 0.24, base: 0.4, load: 0.6 },
  maintPerLift: 2000,
  guestCost: 9,
  wear: { perHour: 0.15, base: 0.5, night: 0.6, keep: 70 },
  fault: {
    base: 0.0015, ref: 20,
    types: [
      { id: 'minor', label: 'Kleinstörung', w: 0.75, min: [30, 90], cost: [2000, 6000], gain: 0 },
      { id: 'drive', label: 'Antrieb', w: 0.2, min: [480, 960], cost: [25000, 60000], gain: 6 },
      { id: 'rope', label: 'Seil/Klemme', w: 0.05, min: [960, 1920], cost: [80000, 150000], gain: 12 }
    ]
  },
  express: { cost: 1.8, time: 0.5 },
  inspect: { cost: 10000, to: 100 },
  night: 960,
  summer: { adminDays: 4, interestDays: 240, revTarget: 95, revPerKw: 4, evMax: 400, keep: 12 },
  pisteStart: { cond: 80, snow: 80 },
  logMax: 60,
  admin: 2500, adminLift: 1200,
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
    early: { label: '1.–19. Dez', wd: 220, we: 490 },
    xmas: { label: 'Weihnachtsferien', wd: 1230, we: 1230 },
    jan: { label: 'Jänner', wd: 360, we: 750 },
    febHol: { label: 'Semesterferien', wd: 1100, we: 1300 },
    feb: { label: 'Februar', wd: 490, we: 810 },
    mar: { label: 'März', wd: 520, we: 850 },
    easter: { label: 'Osterferien', wd: 850, we: 910 },
    late: { label: 'nach Ostern', wd: 200, we: 360 }
  },
  demandBase: 600,
  demandRef: { rep: 50 },
  febHolidays: [8, 28],
  easterHolidays: [-8, 1],
  seasonEnd: { month: 4, day: 6 },
  staffCost: { lift: 210, tech: 270, groomer: 250, patrol: 240, cashier: 190, instructor: 220, gastro: 185 },
  groom: { price: 32000, perHour: 190, hoursPerKm: 1.3, start: 1, mid: { from: 690, to: 810, hoursPerKm: 0.5, target: 85 } },
  snow: { perM3: 2.2, price: 9000, m3PerHour: 55, maxTemp: -3, baseCm: 40, start: 10, pistes: ['10'], water: 0.4, kwh: 3.5, width: 40, hours: [0, 12], hStep: 2, night: -4 },
  groomNight: { shift: 8 },
  staff: {
    groups: {
      lift: { label: 'Liftpersonal', start: 5, perm: 2, info: 'je Lift laut Mindestbesetzung, mit Ablöse' },
      tech: { label: 'Techniker', start: 2, perm: 1, info: '1 je Lift + 1' },
      groomer: { label: 'Pistengerätefahrer', start: 1, perm: 1, info: 'nach geplanter Präparierung' },
      patrol: { label: 'Pistenrettung', start: 1, perm: 1, info: '1 je 3 Pisten' },
      cashier: { label: 'Kassa', start: 2, perm: 1, info: 'nach erwarteten Gästen am Morgen' },
      instructor: { label: 'Skilehrer', start: 3, perm: 1, info: '8 Schüler je Skilehrer' },
      gastro: { label: 'Gastro', start: 5, perm: 2, info: '36 Sitzplätze je Kraft in offenen Hütten' }
    },
    delay: 2, fireDays: 5, max: 80,
    wage: [90, 120], wageStep: 5,
    morale: { fix: 70, start: 65, base: 70, wageK: 1.5, over: 60, rate: 0.2, cut: 1.5, fire: 0.5, sickBelow: 40, sick: [0.02, 0.12] },
    bonus: { perHead: 200, gain: 12 },
    relief: 1.25, techPerLift: 1, techBase: 1, techRef: 2, techMin: 0.5, techRisk: 0.3,
    patrolPer: 3, accident: 0.002, pupils: 8,
    cash: { rate: 4, online: 0.3, auto: 0.5, wait: [2, 20] },
    service: { gastro: 0.7, side: 0.3 },
    returnRate: [0.3, 0.9]
  },
  cover: {
    natural: [25, 0.04], cannonStart: 30, minOpen: 12, thin: 30, melt: 1.6, meltBy: { sun: 1.3, foehn: 1.6 }, rainAt: 1.5, rainMelt: 0.35,
    wear: 0.016, wearBy: { pulvrig: 1.6, sulzig: 1.4, eisig: 0.7 }, worn: 45, wearKm: 2, floor: 0, rough: 1.5,
    groomed: 92, groomedHard: 82, powder: 62, newSnow: 5, refreeze: 0, settle: 0.5, compact: 0.012,
    q: { pulvrig: 1.0, griffig: 1.0, sulzig: 0.82, eisig: 0.68, abgefahren: 0.85 },
    qLabels: { pulvrig: 'pulvrig', griffig: 'griffig', eisig: 'eisig', sulzig: 'sulzig', abgefahren: 'abgefahren' },
    depth: [10, 35, 0.45]
  },
  weather: {
    types: {
      sun: { label: 'Sonne', icon: '☀️', f: 1.15, dT: 1, wind: [5, 25], snow: [0, 0, 0] },
      cloud: { label: 'bewölkt', icon: '☁️', f: 1.0, dT: 0, wind: [10, 35], snow: [0.3, 1, 4] },
      snow: { label: 'Schneefall', icon: '🌨️', f: 0.8, dT: -2, wind: [10, 40], snow: [1, 5, 25] },
      storm: { label: 'Sturm', icon: '🌪️', f: 0.4, dT: -3, wind: [72, 110], snow: [1, 10, 35] },
      fog: { label: 'Nebel', icon: '🌫️', f: 0.85, dT: 0, wind: [0, 15], snow: [0, 0, 0] },
      foehn: { label: 'Föhn/warm', icon: '🌡️', f: 1.05, dT: 6, wind: [30, 76], snow: [0, 0, 0] }
    },
    trans: {
      sun: { sun: 0.47, cloud: 0.27, snow: 0.1, storm: 0.02, fog: 0.09, foehn: 0.05 },
      cloud: { sun: 0.3, cloud: 0.3, snow: 0.25, storm: 0.04, fog: 0.07, foehn: 0.04 },
      snow: { sun: 0.2, cloud: 0.3, snow: 0.35, storm: 0.08, fog: 0.07, foehn: 0 },
      storm: { sun: 0.15, cloud: 0.3, snow: 0.4, storm: 0.1, fog: 0.05, foehn: 0 },
      fog: { sun: 0.35, cloud: 0.3, snow: 0.15, storm: 0.02, fog: 0.18, foehn: 0 },
      foehn: { sun: 0.3, cloud: 0.25, snow: 0.2, storm: 0.1, fog: 0, foehn: 0.15 }
    },
    start: 'sun',
    valley: [[12, 1, -3], [12, 15, -4], [1, 15, -5], [2, 15, -3], [3, 15, 3], [4, 15, 6]],
    lapse: 0.6, ref: 1309, top: 2556, anom: [0.7, 2.4], noise: 3,
    acc: [0.9, 0.75, 0.6], tErr: [1, 2, 3.5],
    stormWind: 70,
    lowSnow: 0.45
  },
  snowFactor: { steps: [[20, 0.3], [40, 0.7], [60, 0.9]], top: 1.05, powder: 15, powderAdd: 0.2 },
  aval: { decay: 0.6, wind: 40, windAdd: 12, levels: [10, 25, 45, 70], close: ['1', '1a', '12'], risk: 0.0006 },
  segs: {
    fam: { label: 'Familien', color: '#ffb14a', share: 0.35, el: 1.8, wx: 1, mix: { adult: 0.5, youth: 0.1, child: 0.4 }, skill: { leicht: 0.6, mittel: 0.35, schwer: 0.05 }, pref: { leicht: 1, mittel: 0.5, schwer: 0.1 }, fair: 0.85, w: { wait: 0.2, offer: 0.12, quality: 0.13, price: 0.25, crowd: 0.2, service: 0.1 }, gastro: 1, info: 'preisbewusst, leichte Pisten, Gedränge stört' },
    sport: { label: 'Sportliche', color: '#ff6b5a', share: 0.2, el: 1.0, wx: 0.9, mix: { adult: 0.8, youth: 0.17, child: 0.03 }, skill: { leicht: 0.1, mittel: 0.45, schwer: 0.45 }, pref: { leicht: 0.3, mittel: 0.8, schwer: 1 }, fair: 1.1, w: { wait: 0.2, offer: 0.25, quality: 0.3, price: 0.08, crowd: 0.07, service: 0.1 }, gastro: 0.3, info: 'Präparierung und schwere Pisten zählen' },
    day: { label: 'Tagesgäste', color: '#5aa2ff', share: 0.25, el: 1.4, wx: 1.4, mix: { adult: 0.62, youth: 0.13, child: 0.25 }, skill: { leicht: 0.35, mittel: 0.45, schwer: 0.2 }, pref: { leicht: 1, mittel: 1, schwer: 1 }, fair: 1, w: null, gastro: 0.6, info: 'kommen spontan bei gutem Wetter' },
    week: { label: 'Wochengäste', color: '#7be07b', share: 0.2, el: 1.2, wx: 0.5, mix: { adult: 0.62, youth: 0.13, child: 0.25 }, skill: { leicht: 0.35, mittel: 0.45, schwer: 0.2 }, pref: { leicht: 1, mittel: 1, schwer: 1 }, fair: 1.05, w: null, gastro: 0.5, info: 'gebucht, wetterunabhängig (NL/DE)' }
  },
  mkt: {
    campaigns: {
      social: { label: 'Social Media', kind: 'weekly', cost: 2500, delay: 0, eff: 0.06, target: { sport: 1, day: 0.6, fam: 0.25, week: 0.25 }, info: 'jung/sportlich, sofort' },
      radio: { label: 'Radio Kärnten', kind: 'weekly', cost: 9000, delay: 3, eff: 0.1, target: { day: 1, fam: 0.5, sport: 0.4, week: 0.1 }, info: 'Tagesgäste, ab 3 Tagen' },
      travel: { label: 'Reisebüros NL/DE', kind: 'once', cost: 5000, delay: 14, dur: 28, eff: 0.12, target: { week: 1, fam: 0.3, sport: 0, day: 0 }, info: 'Wochengäste, ab 14 Tagen für 4 Wochen' },
      poster: { label: 'Plakate Lienz/Spittal', kind: 'once', cost: 1200, delay: 5, dur: 14, eff: 0.05, target: { day: 1, fam: 1, sport: 0.5, week: 0 }, info: 'Region, ab 5 Tagen für 2 Wochen' },
      sportmag: { label: 'Sportmagazine & Bergsport-Portale', kind: 'weekly', cost: 4000, delay: 3, eff: 0.18, target: { sport: 1, day: 0.15, fam: 0, week: 0.15 }, info: 'gezielt Sportliche, ab 3 Tagen' },
      race: { label: 'Rennwochenende (Riesentorlauf/Skicross)', kind: 'once', cost: 7000, delay: 7, dur: 14, eff: 0.35, target: { sport: 1, day: 0.2, fam: 0, week: 0 }, info: 'Sportliche, ab 7 Tagen für 2 Wochen' },
      family: { label: 'Kinder gratis am Samstag', kind: 'weekly', cost: 0, delay: 2, eff: 0.25, sat: true, noWear: true, target: { fam: 1, sport: 0, day: 0, week: 0 }, info: 'Familien +25 % am Samstag, Kinderkarten gratis' },
      early: { label: 'Frühbucher-Saisonkarte', kind: 'pre', disc: 0.15, cards: 220, share: 0.02, eff: 0.03, info: 'nur vor Saisonstart: −15 %, mehr Stammgäste' }
    },
    spill: 0.25,
    wear: { after: 4, f: 0.7, recover: 2 }
  },
  side: {
    gastro: { perGuest: 19, margin: 0.38, goods: 0.5, lunchRef: 0.55 },
    rental: { share: 0.18, price: 36, el: 1.3, start: 68, wear: 0.004, upkeep: 8, cond: [0.7, 0.3], buy: 16000, service: { cost: 1000, gain: 8, max: 80 } },
    school: { share: 0.06, price: 75, el: 1.4 },
    parking: { share: 0.55, persons: 2, price: 12, el: 0.5, maxShare: 0.8, cap: 600, fix: 150, satK: 1.5 },
    huts: [
      { id: 'rossbach', name: 'Rossbach Alm', node: 'rossbach', seats: 180, draw: 1 },
      { id: 'schareck', name: 'Panoramarestaurant Schareck', node: 'schareck', seats: 240, draw: 1.2 },
      { id: 'spatzl', name: 'Spatzl Alm', node: 'schareck', seats: 100, draw: 0.8 },
      { id: 'fleiss', name: 'Skihütte Fleißalm', node: 'fleissalm', seats: 80, draw: 0.5 }
    ],
    levels: {
      cheap: { label: 'günstig', price: 0.8, goods: 1, draw: 1.15, sat: 8 },
      normal: { label: 'normal', price: 1, goods: 1, draw: 1, sat: 0 },
      upscale: { label: 'gehoben', price: 1.3, goods: 1.12, draw: 0.85, sat: -18 }
    },
    hutStep: 120, hutUp: 60000, spendEl: 0.8, priceK: 0.6, seatsPerStaff: 36, hutFix: 700, maxWait: 25, giveUp: 0.08, eatTau: 20, wait: [5, 30], miss: 100,
    score: { lunch: 0.6, staff: 0.4 },
    areas: { tickets: { label: 'Tickets', color: '#5aa2ff' }, gastro: { label: 'Gastro', color: '#ffb14a' }, rental: { label: 'Verleih', color: '#7be07b' }, school: { label: 'Skischule', color: '#ff6b5a' }, parking: { label: 'Parkplatz', color: '#b48cff' } }
  },
  build: {
    projects: {
      schareck: { label: 'Gondel Schareck', price: 300000, life: 20, lifts: ['schareck'], info: 'Rossbach → Schareck (2.556 m). Erschließt den Gipfelbereich – oben braucht es noch Pisten.' },
      p4: { label: 'Piste 4 Schareckabfahrt', price: 35000, life: 25, needs: ['schareck'], pistes: ['4'], info: 'rot · 2,3 km · Schareck → Rossbach' },
      p5: { label: 'Piste 5 Kärntnerabfahrt', price: 40000, life: 25, needs: ['schareck'], pistes: ['5'], info: 'blau · 2,9 km · Schareck → Rossbach, ideal für Familien' },
      p5a: { label: 'Piste 5a Kärntnerabfahrt Variante', price: 45000, life: 25, needs: ['schareck'], pistes: ['5a'], info: 'rot · 3,1 km · Schareck → Rossbach' },
      p2: { label: 'Piste 2 Seppenalmabfahrt', price: 42000, life: 25, needs: ['schareck'], pistes: ['2'], info: 'rot · 3,0 km · Schareck → Rossbach über die Seppenalm' },
      p2b: { label: 'Piste 2b Tauernabfahrt', price: 48000, life: 25, needs: ['schareck'], pistes: ['2b'], info: 'blau · 3,7 km · Schareck → Rossbach, weiter Bogen über das Tauerntal' },
      tauernberg: { label: 'Schlepplift Tauernberg', price: 80000, life: 20, needs: ['schareck'], lifts: ['tauernberg'], info: 'Schlepplift an der Talabfahrt (1.700 m) hinauf zur Seppenalm (2.070 m). Braucht Piste 2c.' },
      p2c: { label: 'Piste 2c Seppenbaur', price: 25000, life: 25, needs: ['tauernberg'], pistes: ['2c'], info: 'rot · 1,2 km · Seppenalm → Tauernberg Tal, von dort Talabfahrt 10 ins Dorf' },
      panorama: { label: 'Panoramabahn', price: 220000, life: 20, needs: ['schareck'], lifts: ['panorama'], info: 'Fallbichl → Schareck. Sinnvoll erst mit Piste 1 Fallbichlabfahrt.' },
      p1: { label: 'Piste 1 Fallbichlabfahrt', price: 25000, life: 25, needs: ['panorama'], pistes: ['1'], info: 'schwarz · 1,4 km · Schareck → Fallbichl, für Sportliche' },
      p1a: { label: 'Piste 1a Fallbichlabfahrt Variante', price: 30000, life: 25, needs: ['panorama'], pistes: ['1a'], info: 'rot · 2,0 km · Schareck → Fallbichl, Bogen über den Osthang' },
      viehbuehel: { label: 'Schlepplift Viehbühel', price: 60000, life: 20, needs: ['panorama'], lifts: ['viehbuehel'], info: 'Fallbichl → Viehbühel (2.420 m). Windanfällig. Braucht Piste 8.' },
      p8: { label: 'Piste 8 Viehbühel', price: 20000, life: 25, needs: ['viehbuehel'], pistes: ['8'], info: 'blau · 1,3 km · Viehbühel → Fallbichl' },
      schulwiese: { label: 'Tellerlift Schulwiese', price: 22000, life: 20, lifts: ['schulwiese'], pistes: ['S'], info: 'Übungslift im Ort mit Piste (250 m). Für Anfänger und Skischule.' },
      kidsworld: { label: 'Kidsworld (Seillift)', price: 14000, life: 20, lifts: ['kidsworld'], pistes: ['K'], info: 'Kinderland im Ort mit Seillift und Übungshang (130 m).' },
      'new:schareck': { label: 'Panoramarestaurant Schareck', price: 100000, life: 25, needs: ['schareck'], hut: 'schareck', info: 'Restaurant an der Bergstation, 240 Plätze' },
      'new:spatzl': { label: 'Spatzl Alm', price: 55000, life: 25, needs: ['schareck'], hut: 'spatzl', info: 'Hütte im Schareck-Gebiet, 100 Plätze' },
      tunnelbahn: { label: 'Tunnelbahn Fleißalm', price: 170000, life: 20, needs: ['schareck'], lifts: ['tunnelbahn'], info: 'Pendelbahn im Berg Rossbach ↔ Fleißalm, beide Richtungen. Erschließt das Fleißtal.' },
      'new:fleiss': { label: 'Skihütte Fleißalm', price: 35000, life: 25, needs: ['tunnelbahn'], hut: 'fleiss', info: 'Hütte an der Fleißalm, 80 Plätze' },
      fleissbahn: { label: 'Fleißbahn (Gondel)', price: 250000, life: 20, needs: ['tunnelbahn'], lifts: ['fleissbahn'], info: 'Fleißalm → Fleißbahn Berg (2.470 m). Braucht Piste 11 oder 12.' },
      p11: { label: 'Piste 11 Wiesenabfahrt', price: 35000, life: 25, needs: ['fleissbahn'], pistes: ['11'], info: 'blau · 2,4 km · Fleißbahn Berg → Fleißalm' },
      p12: { label: 'Piste 12 Muldenabfahrt', price: 35000, life: 25, needs: ['fleissbahn'], pistes: ['12'], info: 'rot · 2,2 km · Fleißbahn Berg → Fleißalm' },
      ederfeld: { label: 'Tellerlift Ederfeld', price: 40000, life: 20, needs: ['fleissbahn', 'p11'], lifts: ['ederfeld'], info: 'Fleißalm → Ederfeld (1.920 m), Übungsgelände am unteren Teil der Wiesenabfahrt 11.' },
      hochfleiss: { label: 'Schlepplift Hochfleiß', price: 170000, life: 20, needs: ['fleissbahn'], lifts: ['hochfleiss'], info: 'Bis 2.920 m. Windanfällig. Braucht Piste 11a.' },
      p11a: { label: 'Piste 11a Gratabfahrt', price: 55000, life: 25, needs: ['hochfleiss'], pistes: ['11a'], info: 'rot · 3,6 km · Hochfleiß → Fleißalm' },
    },
    pipe: 20000, pipeLife: 20, sell: 0.8, pisteKm: 15000
  },
  fin: {
    days: 20, life: { groomer: 8, cannon: 10 }, step: [20000, 200000], autoDraw: 10000, insolvDays: 3,
    score: { start: 100, min: 0, max: 200, alpha: 0.06, margin: 100, marginMax: 0.8, noLoan: 20, lev: 0.4, levK: 80, minus: 60, rateBase: 2, rateSpan: 50, depRate: 0.05, depMin: 0.2, depMax: 2, creditBook: 0.5, creditMin: 0.5, creditMaxK: 4, creditMax: 10000000, creditStep: 50000, tiers: [[160, 'Money Maker', 'good'], [120, 'sehr gut', 'good'], [90, 'normal', ''], [60, 'schwach', 'warn'], [0, 'Loser', 'bad']] },
    start: [
      { id: 'rossbach', label: 'Gondel Rossbach', cost: 500000, val: 233000, life: 20 },
      { id: 'p10', label: 'Piste 10 Talabfahrt', cost: 55000, val: 33000, life: 25 },
      { id: 'groomer', label: 'Pistengeräte', cost: 32000, val: 16000, life: 8, n: 1 },
      { id: 'cannon', label: 'Schneekanonen', cost: 90000, val: 43000, life: 10, n: 10 },
      { id: 'pipe', label: 'Beschneiungsleitungen', cost: 37000, val: 20000, life: 20 },
      { id: 'huts', label: 'Rossbach Alm', cost: 75000, val: 42000, life: 25 }
    ]
  },
  balance: { skierDays: [90000, 130000], revenue: [5e6, 7e6], profit: [4e5, 1.2e6], badRep: 35, sat: [60, 80] },
  sat: {
    w: { wait: 0.25, offer: 0.2, quality: 0.2, price: 0.15, crowd: 0.1, service: 0.1 },
    labels: { wait: 'Wartezeit', offer: 'Pistenangebot', quality: 'Pistenqualität', price: 'Preis-Leistung', crowd: 'Gedränge', service: 'Service' },
    wait: [3, 30],
    crowd: [60, 160],
    price: { ref: 62, base: 0.75, offer: 0.25, atFair: 85, perEur: 3, floor: -50 },
    offerExp: 0.45,
    worst: 0.3,
    worstLo: -40,
    lostW: 0.6,
    ded: { rescue: 8, fault: 3, pisteClose: 2, accident: 5 },
    dedLabels: { rescue: 'Bergung', fault: 'Liftausfall im Betrieb', pisteClose: 'Pistensperre im Betrieb', accident: 'Unfall' },
    dedMax: 30,
    rep: 0.1,
    repClosed: 0.03,
    liveTau: 20,
    word: { ref: 65, k: 0.6, clamp: [0.8, 1.1] },
    season: { ref: 50, k: 0.003, clamp: [0.03, 0.15] },
    quotes: { n: [3, 5], good: 65, chart: 14 },
    who: ['Familie aus Wien', 'Carverin aus München', 'Stammgast aus Lienz', 'Skischulkind', 'Pärchen aus Utrecht', 'Snowboarder aus Graz', 'Tourengeher aus Salzburg', 'Oma Hilde, 71', 'Gruppe aus Prag', 'Rennläufer aus Kärnten', 'Familie aus Hamburg', 'Einheimischer'],
    voices: {
      wait: {
        bad: ['{min} Minuten Anstehen am {lift} – nie wieder!', 'Mehr in der Schlange gestanden als gefahren.', 'Am {lift} braucht man Geduld wie ein Mönch.'],
        good: ['Kaum gewartet, eine Abfahrt nach der anderen!', 'Am {lift} direkt in die Gondel – herrlich.', 'Null Anstehen, so muss das sein.']
      },
      offer: {
        bad: ['Die Hälfte der Pisten zu – wofür zahle ich eigentlich?', 'Kaum etwas offen, nach zwei Stunden war alles gefahren.', 'Gesperrt, gesperrt, gesperrt …'],
        good: ['Alles offen, von der {piste} bis ins Tal!', 'Riesige Auswahl, jede Abfahrt anders.', 'Das ganze Gebiet offen – Traumtag.']
      },
      quality: {
        bad: ['Buckelpiste und Eisplatten auf der {piste}.', 'Die Pisten waren schon um zehn zerfahren.', 'Steinkontakt auf der {piste} – meine Kanten!'],
        good: ['Traumhaft präpariert!', 'Die {piste} wie Samt, perfekter Cord.', 'Griffiger Schnee bis zum Nachmittag.']
      },
      price: {
        bad: ['{price} € für die Tageskarte? Frechheit.', 'Viel zu teuer für das, was geboten wird.', 'Nächstes Jahr fahren wir woanders hin – günstiger.'],
        good: ['Faire Preise, da kommen wir gern wieder.', 'Für {price} € so ein Gebiet – top!', 'Preis-Leistung stimmt hier.']
      },
      crowd: {
        bad: ['Auf der {piste} wie auf der Autobahn.', 'Viel zu voll, ständig Beinahe-Zusammenstöße.', 'Überall Gedränge, kein entspanntes Fahren.'],
        good: ['Die Pisten fast für uns allein!', 'Herrlich leer, freie Fahrt.', 'Viel Platz zum Carven.']
      },
      service: {
        bad: ['Ewig auf einen Platz in der Hütte gewartet.', 'Leihski in schlechtem Zustand.', 'Service ausbaufähig.'],
        good: ['Super freundliches Personal!', 'Liftler mit Schmäh – sympathisch.', 'Alles bestens organisiert.']
      },
      lost: { bad: ['Ticket gekauft, kein Lift fährt – Geld zurück!', 'Zwei Stunden an der Talstation, dann heimgefahren.', 'Lift zu, keine Info, Tag verloren.'] },
      rescue: { bad: ['Eine Ewigkeit in der stehenden Gondel – Bergung!', 'Aus der Kabine abgeseilt worden. Erlebnis, aber nicht schön.'] }
    }
  },
  costLabels: { admin: 'Verwaltung', maint: 'Wartung Lifte', power: 'Strom Lifte', repair: 'Reparaturen', inspect: 'Lift-Revision', interest: 'Kreditzinsen', groom: 'Präparierung', snowmaking: 'Beschneiung', staff: 'Personal', severance: 'Abfindungen', bonus: 'Prämien', marketing: 'Marketing', goods: 'Wareneinsatz Gastro', side: 'Betrieb Hütten/Verleih/Parkplatz', rentalBuy: 'Verleih Service/Neukauf', guest: 'Gästebetrieb (Tickets, Versicherung, Reinigung)', shuttle: 'Shuttlebus zwischen Talstationen' },
  liftStatus: { run: 'in Betrieb', closed: 'geschlossen', fault: 'Störung', repair: 'Reparatur', insp: 'Inspektion', wind: 'Sturm', staff: 'kein Personal', build: 'Umbau' },
  phaseLabels: { prep: 'Vorbereitung', open: 'Betrieb', closed: 'Feierabend' },
  nodeAt: {
    tal: [[-158, -109], [-74, 251], [-457, 56]], rossbach: [[617, -921], [635, -923], [690, -979]], schareck: [[1110, -2861], [1099, -2892]], fallbichl: [[40, -3263], [-4, -3341]],
    fleissalm: [[2150, -1274], [2103, -1297], [2140, -1212]], fleisstop: [[3990, -2003], [3996, -2031]], hochfleiss: [[5031, -2540]], tauern: [[723, -549]], seppen: [[1235, -1543]],
    vieh: [[-51, -3970]], eder: [[2451, -1514]], schule: [[-10, 119]], kids: [[-423, -16]]
  },
  areas: {
    hb: { label: 'Heiligenblut', nodes: ['tal', 'rossbach', 'schareck', 'fallbichl', 'tauern', 'seppen', 'vieh', 'schule', 'kids'] },
    fleiss: { label: 'Fleißtal', nodes: ['fleissalm', 'fleisstop', 'hochfleiss', 'eder'] }
  },
  custom: {
    types: {
      gondola: { label: 'Gondelbahn', short: 'Gondel', places: 8, gap: 14, speed: 6, staff: 3, base: 90000, perM: 70, perHm: 60, maint: [800, 0.6], len: [300, 4500], slope: 1.2, mid: true, drag: false, color: 0x2f6fd0 },
      chair: { label: 'Sessellift', short: 'Sessel', places: 4, gap: 8, speed: 5, staff: 2, base: 60000, perM: 45, perHm: 40, maint: [500, 0.45], len: [200, 2800], slope: 0.85, mid: true, drag: false, chair: true, color: 0x2a2f36 },
      drag: { label: 'Schlepplift', short: 'Schlepp', places: 2, gap: 5, speed: 3, staff: 2, base: 20000, perM: 35, perHm: 30, maint: [250, 0.3], len: [150, 1500], slope: 0.6, drag: true, h: 7 },
      plate: { label: 'Tellerlift', short: 'Teller', places: 1, gap: 5, speed: 2.5, staff: 1, base: 10000, perM: 25, perHm: 20, maint: [120, 0.3], len: [80, 700], slope: 0.45, drag: true, h: 6 },
      rope: { label: 'Seillift', short: 'Seillift', places: 1, gap: 3, speed: 1.5, staff: 1, base: 6000, perM: 40, perHm: 0, maint: [80, 0.3], len: [40, 250], slope: 0.35, drag: true, h: 1.6 }
    },
    snap: 120, near: 30, minRise: 10, mid: 40000, clear: 8, exposed: 2200, kwK: 0.000409, kwBase: 20,
    base: { price: 60000, perSpot: 250, spots: [50, 600], step: 50, def: 150, road: 120, maxRoad: 2500 },
    refund: 0.2, life: 20, max: 30, linkColor: '#ff8a1e',
    hut: { sizes: { S: { label: 'klein', seats: 60, price: 40000, draw: 0.7, fix: 450, w: 8, l: 10, h: 3, color: 0x77502f }, M: { label: 'mittel', seats: 120, price: 70000, draw: 0.9, fix: 650, w: 10, l: 14, h: 3.4, color: 0x6e4a2e }, L: { label: 'groß', seats: 220, price: 115000, draw: 1.1, fix: 900, w: 13, l: 20, h: 4.2, color: 0x5d3f28 } }, def: 'M', snap: 150, min: 25, max: 12, life: 25 },
    svc: { price: 45000, life: 20, k: 0.35 },
    dim: 0.6, creditK: 0.5, creditStep: 50000,
    areaColors: ['#5aa2ff', '#7be07b', '#ffb14a', '#ff6b5a', '#b48cff', '#4ad6d6', '#f07ad8', '#d6d64a'],
    piste: { base: 4000, perM: 12, wRef: 40, width: [20, 60], def: 40, clearM2: 0.5, len: [150, 6000], drop: 30, max: 40, win: 50, steep: [0.25, 0.4], maxSlope: 1, rise: 4, snap: 120, join: 40, step: 10, life: 25 }
  }
};

for (const l of D.lifts) l.cap = Math.round(3600 / l.gap * l.places);
D.cabGrow = 1.35;
export const cabId = (lid, n) => lid === 'rossbach' && n === 6 ? 'rossbach10' : 'cab:' + lid + ':' + n;
const CAB = {};
const sig = v => { const m = 10 ** Math.max(3, Math.floor(Math.log10(v)) - 1); return Math.round(v / m) * m; };
function cabMake(lid, k) {
  const { l, base, x } = CAB[lid], st = l.drag ? l.places : 2, n = l.places + st * k, was = n - st, id = cabId(lid, n);
  if (D.build.projects[id]) return;
  const need = k > 1 ? [cabId(lid, was)] : l.proj ? [l.proj] : undefined, kind = l.chair ? 'Sessel' : 'Kabine';
  D.build.projects[id] = { label: l.drag ? l.name + ' Ausbau Stufe ' + k : l.name + ' ' + n + 'er-' + (l.chair ? 'Sessel' : 'Kabinen') + ' (Stufe ' + k + ')', price: sig(base * D.cabGrow ** (k - 1)), life: 20, needs: need, places: { [lid]: n }, from: was, cab: lid, stage: k, info: (l.drag ? 'Dichtere Bügelfolge: ' + n + ' statt ' + was + ' Gäste je ' + l.gap + ' s' : n + ' statt ' + was + ' Plätze je ' + kind) + ', +' + Math.round(100 * st / was) + ' % Kapazität. Jede Stufe kostet ' + Math.round((D.cabGrow - 1) * 100) + ' % mehr als die vorige.', ...x };
}
function parkMake(k) {
  const id = k > 1 ? 'garage:' + k : 'garage', P = D.build.projects;
  if (P[id]) return;
  P[id] = { label: k > 1 ? 'Parkhaus Ausbau Stufe ' + (k - 1) : 'Parkhaus', price: sig(150000 * D.cabGrow ** (k - 1)), life: 25, park: 500, needs: k > 1 ? [k > 2 ? 'garage:' + (k - 1) : 'garage'] : undefined, chain: true, stage: k, info: '+500 Stellplätze. Jede Stufe kostet ' + Math.round((D.cabGrow - 1) * 100) + ' % mehr als die vorige.' };
}
const HUP = {};
export const hutUpId = (hid, k) => k > 1 ? 'hut:' + hid + ':' + k : 'hut:' + hid;
function hutMake(hid, k) {
  const { name, step, base, need, x } = HUP[hid], id = hutUpId(hid, k);
  if (D.build.projects[id]) return;
  D.build.projects[id] = { label: 'Ausbau ' + name + (k > 1 ? ' (Stufe ' + k + ')' : ''), price: sig(base * D.cabGrow ** (k - 1)), life: 25, needs: k > 1 ? [hutUpId(hid, k - 1)] : need, seats: { [hid]: step }, chain: true, stage: k, hutUp: hid, info: '+' + step + ' Sitzplätze. Jede Stufe kostet ' + Math.round((D.cabGrow - 1) * 100) + ' % mehr als die vorige.', ...x };
}
export function addHutUp(h, step, base, need, x = {}) { HUP[h.id] = { name: h.name, step, base, need, x }; hutMake(h.id, 1); }
export function hutNext(G, hid) {
  if (!HUP[hid]) return null;
  const ok = id => (G.build?.done || []).includes(id) || (G.build?.jobs || []).some(j => j.id === id);
  for (let k = 1; k < 999; k++) { hutMake(hid, k); const id = hutUpId(hid, k); if (!ok(id)) return id; }
  return null;
}
export function addCabs(l, base, x = {}) { CAB[l.id] = { l, base, x }; cabMake(l.id, 1); }
export function growCabs(G) {
  const ids = [...(G.build?.done || []), ...(G.build?.jobs || []).map(j => j.id)];
  parkMake(1);
  for (const id of ids) {
    const g = id === 'garage' ? 1 : +(/^garage:(\d+)$/.exec(id)?.[1] || 0);
    if (g) { for (let i = 1; i <= g + 1; i++) parkMake(i); continue; }
    const hm = /^hut:([^:]+)(?::(\d+))?$/.exec(id);
    if (hm) { if (HUP[hm[1]]) for (let i = 1; i <= (+hm[2] || 1) + 1; i++) hutMake(hm[1], i); continue; }
    const m = id === 'rossbach10' ? ['', 'rossbach', '6'] : /^cab:(.+):(\d+)$/.exec(id), c = m && CAB[m[1]];
    if (!c) continue;
    const k = Math.round((+m[2] - c.l.places) / (c.l.drag ? c.l.places : 2));
    for (let i = 1; i <= k + 1; i++) cabMake(m[1], i);
  }
}
for (const l of D.lifts) addCabs(l, l.proj ? D.build.projects[l.proj].price : 300000);
for (const h of D.side.huts) addHutUp(h, D.side.hutStep, D.side.hutUp, Object.keys(D.build.projects).filter(k => D.build.projects[k].hut === h.id));
parkMake(1);
