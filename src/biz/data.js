export const D = {
  version: 1,
  saveKey: 'hb-biz-v1',
  startDate: '2026-12-01',
  dayStep: 6,
  start: { cash: 250000, loan: 0, credit: 1000000, rate: 0.055, rep: 55, cond: [70, 85] },
  time: { open: 510, close: 990, gameSecPerSec: 8, factors: [0.125, 1, 2, 5, 10, 20], maxSteps: 40, warn: 15 },
  lifts: [
    { id: 'rossbach', name: 'Gondel Rossbach', cap: 1400, kw: 260, staff: 4, maint: 1800, ride: 9, from: 'tal', to: 'rossbach' },
    { id: 'schareck', name: 'Gondel Schareck', cap: 1200, kw: 300, staff: 4, maint: 2400, ride: 8, from: 'rossbach', to: 'schareck', exposed: true, proj: 'schareck' },
    { id: 'panorama', name: 'Panoramabahn', cap: 1800, kw: 220, staff: 3, maint: 2000, ride: 6, from: 'fallbichl', to: 'schareck', exposed: true, proj: 'panorama' },
    { id: 'tunnelbahn', name: 'Tunnelbahn Fleißalm', cap: 1000, kw: 240, staff: 2, maint: 800, ride: 5, from: 'rossbach', to: 'fleissalm', both: true, proj: 'tunnelbahn' },
    { id: 'fleissbahn', name: 'Fleißbahn', cap: 2000, kw: 320, staff: 3, maint: 1500, ride: 8, from: 'fleissalm', to: 'fleisstop', proj: 'fleissbahn' },
    { id: 'hochfleiss', name: 'Hochfleiß', cap: 1400, kw: 160, staff: 2, maint: 1000, ride: 6, from: 'fleisstop', to: 'hochfleiss', exposed: true, proj: 'hochfleiss' }
  ],
  nodes: { tal: 'Talstation', rossbach: 'Rossbach', schareck: 'Schareck', fallbichl: 'Fallbichl', fleissalm: 'Fleißalm', fleisstop: 'Fleißbahn Berg', hochfleiss: 'Hochfleiß' },
  nodeH: { tal: 1309, rossbach: 1750, schareck: 2556, fallbichl: 2219, fleissalm: 1808, fleisstop: 2470, hochfleiss: 2920 },
  pistes: [
    { id: '4', name: 'Schareckabfahrt', level: 'mittel', km: 2.33, from: 'schareck', to: 'rossbach', proj: 'p4' },
    { id: '5', name: 'Kärntnerabfahrt', level: 'leicht', km: 2.86, from: 'schareck', to: 'rossbach', proj: 'p5' },
    { id: '5a', name: 'Kärntnerabfahrt Variante', level: 'mittel', km: 3.1, from: 'schareck', to: 'rossbach', proj: 'p5a' },
    { id: '1', name: 'Fallbichlabfahrt', level: 'schwer', km: 1.39, from: 'schareck', to: 'fallbichl', proj: 'p1' },
    { id: '2', name: 'Seppenalmabfahrt', level: 'mittel', km: 3.03, from: 'schareck', to: 'rossbach', proj: 'p2' },
    { id: '10', name: 'Talabfahrt', level: 'mittel', km: 1.83, from: 'rossbach', to: 'tal' },
    { id: '11', name: 'Wiesenabfahrt', level: 'leicht', km: 2.38, from: 'fleisstop', to: 'fleissalm', proj: 'p11', exp: true },
    { id: '12', name: 'Muldenabfahrt', level: 'mittel', km: 2.15, from: 'fleisstop', to: 'fleissalm', proj: 'p12', exp: true },
    { id: '11a', name: 'Gratabfahrt', level: 'mittel', km: 3.58, from: 'hochfleiss', to: 'fleissalm', proj: 'p11a', exp: true }
  ],
  demandModel: { priceExp: 1.4, priceClamp: [0.3, 1.6], rep: [0.6, 0.8], offer: [0.3, 0.7], expW: 1.7, eps: [0.9, 1.1] },
  flow: {
    arrive: { from: 495, peak: 570, to: 660 },
    half: { from: 690, peak: 720, to: 780 },
    leave: { from: 870, to: 990 },
    lunch: { from: 705, to: 810, share: 0.65, dur: 40 },
    holdGiveUp: 0.008,
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
    cardVisits: 14,
    densityRef: 2500,
    pulkWait: 5,
    wait: [5, 15]
  },
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
  inspect: { cost: 4000, gain: 8, min: 120 },
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
  demandRef: { rep: 50 },
  febHolidays: [8, 28],
  easterHolidays: [-8, 1],
  seasonEnd: { month: 4, day: 6 },
  staffCost: { lift: 210, tech: 270, groomer: 250, patrol: 240, cashier: 190, instructor: 220, gastro: 185 },
  groom: { price: 32000, perHour: 190, hoursPerKm: 1.3, start: 1 },
  snow: { perM3: 4.2, price: 3700, m3PerHour: 55, maxTemp: -3, baseCm: 40, start: 10, pistes: ['10'], water: 0.4, kwh: 3.5, width: 40, hours: [0, 12], hStep: 2, night: -4 },
  groomNight: { shift: 8 },
  staff: {
    groups: {
      lift: { label: 'Liftpersonal', start: 5, perm: 2, info: 'Mindestbesetzung je Lift (Rossbach 4, Schareck 4, Panorama 3, Tunnel 2, Fleißbahn 3, Hochfleiß 2), Bedarf inkl. Ablöse ×1,25' },
      tech: { label: 'Techniker', start: 2, perm: 1, info: 'Reparaturdauer × 4 / Techniker (min. ×0,5), weniger Störungen' },
      groomer: { label: 'Pistengerätefahrer', start: 1, perm: 1, info: 'max. 8 h Präparierung je Fahrer und Nacht' },
      patrol: { label: 'Pistenrettung', start: 1, perm: 1, info: 'mind. 1 je 3 offene Pisten, sonst Unfälle' },
      cashier: { label: 'Kassa', start: 2, perm: 1, info: 'zu wenige → Kassenschlange morgens' },
      instructor: { label: 'Skilehrer', start: 3, perm: 1, info: 'je Skilehrer 8 Schüler (Skischule)' },
      gastro: { label: 'Gastro', start: 5, perm: 2, info: 'je Kraft 36 Sitzplätze in offenen Hütten, sonst weniger Plätze und Wartezeit' }
    },
    delay: 2, fireDays: 5, max: 80,
    wage: [90, 120], wageStep: 5,
    morale: { start: 65, base: 70, wageK: 1.5, over: 60, rate: 0.2, cut: 1.5, fire: 0.5, sickBelow: 40, sick: [0.02, 0.12] },
    bonus: { perHead: 200, gain: 12 },
    relief: 1.25, techPerLift: 1, techBase: 1, techRef: 2, techMin: 0.5, techRisk: 0.3,
    patrolPer: 3, accident: 0.002, pupils: 8,
    cash: { rate: 4, online: 0.3, auto: 0.5, wait: [2, 20] },
    service: { cash: 0.35, morale: 0.3, gastro: 0.25, side: 0.1 },
    returnRate: [0.3, 0.9]
  },
  cover: {
    natural: [25, 0.04], cannonStart: 30, minOpen: 12, thin: 30, melt: 1.6, meltBy: { sun: 1.3, foehn: 1.6 }, rainAt: 1.5, rainMelt: 0.35,
    wear: 0.012, wearBy: { pulvrig: 1.6, sulzig: 1.4, eisig: 0.7 }, worn: 45,
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
  aval: { decay: 0.6, wind: 40, windAdd: 12, levels: [10, 25, 45, 70], close: ['1', '12'], risk: 0.0006 },
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
      family: { label: 'Kinder gratis am Samstag', kind: 'weekly', cost: 0, delay: 2, eff: 0.25, sat: true, noWear: true, target: { fam: 1, sport: 0, day: 0, week: 0 }, info: 'Familien +25 % am Samstag, Kinderkarten gratis' },
      early: { label: 'Frühbucher-Saisonkarte', kind: 'pre', disc: 0.15, cards: 220, share: 0.02, eff: 0.03, info: 'nur vor Saisonstart: −15 %, mehr Stammgäste' }
    },
    spill: 0.25,
    wear: { after: 4, f: 0.7, recover: 2 },
    comp: {
      list: [
        { id: 'sonnkar', name: 'Sonnkar-Gletscher', price: 66, snow: 1.05 },
        { id: 'iselberg', name: 'Skiwelt Iselberg', price: 57, snow: 0.95 },
        { id: 'tauern', name: 'Tauernblick Bergbahnen', price: 63, snow: 1 }
      ],
      chance: 0.06, step: [2, 4], drift: 0.15, rho: 0.85, noise: 0.1, snowRange: [0.3, 1.05], newSnow: 0.06, warm: 0.06,
      k: 0.5, snowK: 0.4, clamp: [0.85, 1.15]
    }
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
      { id: 'fleiss', name: 'Skihütte Fleißalm', node: 'rossbach', seats: 80, draw: 0.5 }
    ],
    levels: {
      cheap: { label: 'günstig', price: 0.8, goods: 1, draw: 1.15, sat: 8 },
      normal: { label: 'normal', price: 1, goods: 1, draw: 1, sat: 0 },
      upscale: { label: 'gehoben', price: 1.3, goods: 1.12, draw: 0.85, sat: -18 }
    },
    spendEl: 0.8, priceK: 0.6, seatsPerStaff: 36, hutFix: 700, maxWait: 25, giveUp: 0.08, wait: [5, 30], miss: 100,
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
      panorama: { label: 'Panoramabahn', price: 220000, life: 20, needs: ['schareck'], lifts: ['panorama'], info: 'Fallbichl → Schareck. Sinnvoll erst mit Piste 1 Fallbichlabfahrt.' },
      p1: { label: 'Piste 1 Fallbichlabfahrt', price: 25000, life: 25, needs: ['panorama'], pistes: ['1'], info: 'schwarz · 1,4 km · Schareck → Fallbichl, für Sportliche' },
      'new:schareck': { label: 'Panoramarestaurant Schareck', price: 100000, life: 25, needs: ['schareck'], hut: 'schareck', info: 'Restaurant an der Bergstation, 240 Plätze' },
      'new:spatzl': { label: 'Spatzl Alm', price: 55000, life: 25, needs: ['schareck'], hut: 'spatzl', info: 'Hütte im Schareck-Gebiet, 100 Plätze' },
      tunnelbahn: { label: 'Tunnelbahn Fleißalm', price: 170000, life: 20, needs: ['schareck'], lifts: ['tunnelbahn'], info: 'Pendelbahn im Berg Rossbach ↔ Fleißalm, beide Richtungen. Erschließt das Fleißtal.' },
      'new:fleiss': { label: 'Skihütte Fleißalm', price: 35000, life: 25, needs: ['tunnelbahn'], hut: 'fleiss', info: 'Hütte an der Fleißalm, 80 Plätze' },
      fleissbahn: { label: 'Fleißbahn (Gondel)', price: 250000, life: 20, needs: ['tunnelbahn'], lifts: ['fleissbahn'], info: 'Fleißalm → Fleißbahn Berg (2.470 m). Braucht Piste 11 oder 12.' },
      p11: { label: 'Piste 11 Wiesenabfahrt', price: 35000, life: 25, needs: ['fleissbahn'], pistes: ['11'], info: 'blau · 2,4 km · Fleißbahn Berg → Fleißalm' },
      p12: { label: 'Piste 12 Muldenabfahrt', price: 35000, life: 25, needs: ['fleissbahn'], pistes: ['12'], info: 'rot · 2,2 km · Fleißbahn Berg → Fleißalm' },
      hochfleiss: { label: 'Sessellift Hochfleiß', price: 170000, life: 20, needs: ['fleissbahn'], lifts: ['hochfleiss'], info: 'Bis 2.920 m. Windanfällig. Braucht Piste 11a.' },
      p11a: { label: 'Piste 11a Gratabfahrt', price: 55000, life: 25, needs: ['hochfleiss'], pistes: ['11a'], info: 'rot · 3,6 km · Hochfleiß → Fleißalm' },
      rossbach10: { label: 'Gondel Rossbach 10er', price: 300000, life: 20, boost: { rossbach: 0.6 }, info: '+60 % Kapazität am Zubringer.' },
      'hut:rossbach': { label: 'Ausbau Rossbach Alm', price: 60000, life: 25, seats: { rossbach: 120 }, info: '+120 Sitzplätze' },
      'hut:schareck': { label: 'Ausbau Panoramarestaurant', price: 60000, life: 25, needs: ['new:schareck'], seats: { schareck: 120 }, info: '+120 Sitzplätze' },
      'hut:spatzl': { label: 'Ausbau Spatzl Alm', price: 60000, life: 25, needs: ['new:spatzl'], seats: { spatzl: 120 }, info: '+120 Sitzplätze' },
      'hut:fleiss': { label: 'Ausbau Skihütte Fleißalm', price: 60000, life: 25, needs: ['new:fleiss'], seats: { fleiss: 120 }, info: '+120 Sitzplätze' },
      garage: { label: 'Parkhaus', price: 150000, life: 25, park: 500, info: '+500 Stellplätze' }
    },
    pipe: 20000, pipeLife: 20, sell: 0.8, pisteKm: 15000
  },
  fin: {
    days: 20, life: { groomer: 8, cannon: 10 }, step: [20000, 200000], autoDraw: 10000, insolvDays: 3,
    start: [
      { id: 'rossbach', label: 'Gondel Rossbach', cost: 500000, val: 233000, life: 20 },
      { id: 'p10', label: 'Piste 10 Talabfahrt', cost: 55000, val: 33000, life: 25 },
      { id: 'groomer', label: 'Pistengeräte', cost: 32000, val: 16000, life: 8, n: 1 },
      { id: 'cannon', label: 'Schneekanonen', cost: 37000, val: 18000, life: 10, n: 10 },
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
        bad: ['Unfreundlich an der Kassa.', 'Niemand wusste Bescheid, keine Infos.', 'Service ausbaufähig.'],
        good: ['Super freundliches Personal!', 'Liftler mit Schmäh – sympathisch.', 'Alles bestens organisiert.']
      },
      lost: { bad: ['Ticket gekauft, kein Lift fährt – Geld zurück!', 'Zwei Stunden an der Talstation, dann heimgefahren.', 'Lift zu, keine Info, Tag verloren.'] },
      rescue: { bad: ['Eine Ewigkeit in der stehenden Gondel – Bergung!', 'Aus der Kabine abgeseilt worden. Erlebnis, aber nicht schön.'] }
    }
  },
  costLabels: { admin: 'Verwaltung', maint: 'Wartung Lifte', power: 'Strom Lifte', repair: 'Reparaturen', inspect: 'Inspektionen', interest: 'Kreditzinsen', groom: 'Präparierung', snowmaking: 'Beschneiung', staff: 'Personal', severance: 'Abfindungen', bonus: 'Prämien', marketing: 'Marketing', goods: 'Wareneinsatz Gastro', side: 'Betrieb Hütten/Verleih/Parkplatz', rentalBuy: 'Verleih Service/Neukauf', guest: 'Gästebetrieb (Tickets, Versicherung, Reinigung)' },
  liftStatus: { run: 'in Betrieb', closed: 'geschlossen', fault: 'Störung', repair: 'Reparatur', insp: 'Inspektion', wind: 'Sturm', staff: 'kein Personal', build: 'Umbau' },
  phaseLabels: { prep: 'Vorbereitung', open: 'Betrieb', closed: 'Feierabend' }
};
