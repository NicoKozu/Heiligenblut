const KEYS = [
  ['W', 'Hocke'], ['S', 'Bremsen / Seitrutschen'], ['A / D', 'Kurven / Carven'], ['Leertaste', 'Sprung'],
  ['Q', 'Ski ↔ Snowboard'], ['R', 'Neustart'], ['1–9 / 0', 'Pistenstart / Talstation'], ['E', 'Gondel einsteigen'],
  ['+ / −', 'Zeitfaktor (Manager)'], ['Tab', 'Manager-Panel'], ['B', 'Büro (Manager)'], ['V', 'Manager-Kamera (Vogelperspektive)'], ['Klick / Alt + Klick', 'Objektkarte (Manager)'], ['O · H', 'Pisten-Overlay · Symbole (Manager)'],
  ['C', 'Ego-/Verfolgerkamera'], ['Linksklick + Maus', 'Kamera drehen'], ['Mausrad', 'Kamera-Abstand'], ['M', 'Ton an/aus'], ['P', 'Gipfelnamen'], ['F', 'Flugmodus an / landen'], ['Flug: WASD · Leertaste/Shift · Strg · Mausrad', 'bewegen · hoch/runter · schnell · Tempo'], ['I', 'FPS-Anzeige'], ['Esc', 'Menü']
];

const SAVE = 'hb-biz-v1';

function saved() {
  try { const g = JSON.parse(localStorage.getItem(SAVE)); return g && g.date ? g : null; } catch (e) { return null; }
}

function load() {
  try { return JSON.parse(localStorage.getItem('hb-menu')) || {}; } catch (e) { return {}; }
}

export function createMenu() {
  const prefs = load();
  const choice = { game: prefs.game === 'free' ? 'free' : 'manager', mode: prefs.mode === 'board' ? 'board' : 'ski', start: Number.isInteger(prefs.start) ? prefs.start : 0 };
  const root = document.createElement('div');
  root.id = 'menu';
  const mobile = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  root.innerHTML =
    '<div class="card">' +
    '<h1>Heiligenblut Ski</h1><p class="sub">am Großglockner · 1.301 – 2.902 m</p>' +
    (mobile ? '<p class="warn">Hinweis: Gesteuert wird per Tastatur. Auf Smartphone oder Tablet ist das Spiel nur ansehbar – am besten am Rechner spielen.</p>' : '') +
    '<p class="status"></p>' +
    '<div class="sec"><h2>Spielmodus</h2><div class="row modes">' +
    '<button data-game="manager">📈 Manager</button><button data-game="free">⛷ Freies Fahren</button></div></div>' +
    '<div class="sec"><h2>Sportgerät</h2><div class="row modes">' +
    '<button data-mode="ski">⛷ Ski</button><button data-mode="board">🏂 Snowboard</button></div></div>' +
    '<div class="sec free"><h2>Start</h2><div class="starts"></div></div>' +
    '<div class="row go free"><button class="primary" data-act="start" disabled>Losfahren ⏎</button></div>' +
    '<div class="row go mgr"><button class="primary" data-act="cont" disabled>Weiterspielen ⏎</button><button data-act="new" disabled>Neues Spiel</button></div>' +
    '<div class="row go"><button data-act="resume" hidden>Weiter (Esc)</button></div>' +
    '<div style="font-size:11px;opacity:.55;margin-top:10px">Gelände: Mapzen/EU-DEM · Pisten/Lifte: © OpenStreetMap-Mitwirkende · Bilder: Contains modified Copernicus Sentinel data 2021 · Bäume: Quaternius (CC0) · Figur: three.js-Beispielmodell (Mixamo)</div>' +
    '<details><summary>Steuerung</summary><dl>' + KEYS.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl></details>' +
    '<p class="foot">Gelände: echte Höhendaten (EU-DEM/SRTM) · Pistenverläufe nachgebaut</p>' +
    '</div>';
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const status = $('.status'), starts = $('.starts'), startBtn = $('[data-act=start]'), resumeBtn = $('[data-act=resume]'), contBtn = $('[data-act=cont]'), newBtn = $('[data-act=new]');
  let items = [], open = true, running = false, onStart = () => {}, onResume = () => {};

  function persist() {
    try { localStorage.setItem('hb-menu', JSON.stringify(choice)); } catch (e) {}
  }

  function render() {
    root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === choice.mode));
    root.querySelectorAll('[data-game]').forEach(b => b.classList.toggle('on', b.dataset.game === choice.game));
    const mgr = choice.game === 'manager', g = saved();
    root.querySelectorAll('.free').forEach(e => { e.hidden = mgr; });
    root.querySelector('.mgr').hidden = !mgr;
    contBtn.hidden = !g;
    contBtn.textContent = g ? 'Weiterspielen · ' + g.date.split('-').reverse().join('.') + ' ⏎' : '';
    newBtn.classList.toggle('primary', !g);
    starts.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === choice.start));
  }

  function setPistes(list) {
    items = list.map((p, i) => ({ k: i, label: p.id + ' ' + p.name, info: p.level + ' · ' + (p.len / 1000).toFixed(1).replace('.', ',') + ' km', css: p.lv.css }));
    items.push({ k: -1, label: 'Talstation', info: 'Gondel Rossbach', css: '#ffd84a' });
    if (choice.start >= items.length) choice.start = 0;
    starts.innerHTML = items.map(it => '<button><i style="background:' + it.css + '"></i><b>' + it.label + '</b><span>' + it.info + '</span></button>').join('');
    starts.querySelectorAll('button').forEach((b, i) => b.addEventListener('click', () => { choice.start = i; render(); }));
    render();
  }

  function go(game) {
    if (startBtn.disabled) return;
    if (game === 'new' && saved() && !confirm('Neues Spiel starten? Der bisherige Spielstand wird überschrieben.')) return;
    persist();
    hide();
    onStart({ game, mode: choice.mode, start: game === 'free' ? items[choice.start].k : -1 });
  }

  const enter = () => go(choice.game === 'free' ? 'free' : saved() ? 'continue' : 'new');

  function resume() {
    if (!running) return;
    hide();
    onResume();
  }

  function show() {
    open = true;
    root.classList.remove('off');
    document.body.classList.add('menu');
    resumeBtn.hidden = !running;
    render();
  }

  function hide() {
    open = false;
    running = true;
    root.classList.add('off');
    document.body.classList.remove('menu');
    document.activeElement?.blur?.();
  }

  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { choice.mode = b.dataset.mode; render(); }));
  root.querySelectorAll('[data-game]').forEach(b => b.addEventListener('click', () => { choice.game = b.dataset.game; persist(); render(); }));
  startBtn.addEventListener('click', () => go('free'));
  contBtn.addEventListener('click', () => go('continue'));
  newBtn.addEventListener('click', () => go('new'));
  resumeBtn.addEventListener('click', resume);

  addEventListener('keydown', e => {
    if (!open) return;
    e.stopPropagation();
    const n = items.length;
    if (['Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') enter();
    else if (e.code === 'Escape') resume();
    else if (choice.game !== 'free' && ['ArrowDown', 'ArrowUp', 'KeyS', 'KeyW'].includes(e.code)) return;
    else if (n && (e.code === 'ArrowDown' || e.code === 'KeyS')) { choice.start = (choice.start + 1) % n; render(); }
    else if (n && (e.code === 'ArrowUp' || e.code === 'KeyW')) { choice.start = (choice.start + n - 1) % n; render(); }
    else if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyQ'].includes(e.code)) { choice.mode = choice.mode === 'ski' ? 'board' : 'ski'; render(); }
  }, true);

  document.body.classList.add('menu');
  render();
  return {
    show, hide, setPistes,
    setStatus(t) { status.textContent = t; },
    ready() { startBtn.disabled = contBtn.disabled = newBtn.disabled = false; status.textContent = ''; render(); },
    onStart(f) { onStart = f; },
    onResume(f) { onResume = f; },
    get open() { return open; }
  };
}
