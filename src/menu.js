const KEYS = [
  ['W', 'Hocke'], ['S', 'Bremsen / Seitrutschen'], ['A / D', 'Kurven / Carven'], ['Leertaste', 'Sprung'],
  ['Q', 'Ski ↔ Snowboard'], ['R', 'Neustart'], ['1–9 / 0', 'Pistenstart / Talstation'], ['E', 'Gondel einsteigen'],
  ['C', 'Ego-/Verfolgerkamera'], ['M', 'Ton an/aus'], ['P', 'Gipfelnamen'], ['F', 'FPS-Anzeige'], ['Esc', 'Menü']
];

function load() {
  try { return JSON.parse(localStorage.getItem('hb-menu')) || {}; } catch (e) { return {}; }
}

export function createMenu() {
  const saved = load();
  const choice = { mode: saved.mode === 'board' ? 'board' : 'ski', start: Number.isInteger(saved.start) ? saved.start : 0 };
  const root = document.createElement('div');
  root.id = 'menu';
  const mobile = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  root.innerHTML =
    '<div class="card">' +
    '<h1>Heiligenblut Ski</h1><p class="sub">am Großglockner · 1.301 – 2.902 m</p>' +
    (mobile ? '<p class="warn">Hinweis: Gesteuert wird per Tastatur. Auf Smartphone oder Tablet ist das Spiel nur ansehbar – am besten am Rechner spielen.</p>' : '') +
    '<p class="status"></p>' +
    '<div class="sec"><h2>Sportgerät</h2><div class="row modes">' +
    '<button data-mode="ski">⛷ Ski</button><button data-mode="board">🏂 Snowboard</button></div></div>' +
    '<div class="sec"><h2>Start</h2><div class="starts"></div></div>' +
    '<div class="row go"><button class="primary" data-act="start" disabled>Losfahren ⏎</button><button data-act="resume" hidden>Weiter (Esc)</button></div>' +
    '<details><summary>Steuerung</summary><dl>' + KEYS.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl></details>' +
    '<p class="foot">Gelände: echte Höhendaten (EU-DEM/SRTM) · Pistenverläufe nachgebaut</p>' +
    '</div>';
  document.body.appendChild(root);
  const $ = s => root.querySelector(s);
  const status = $('.status'), starts = $('.starts'), startBtn = $('[data-act=start]'), resumeBtn = $('[data-act=resume]');
  let items = [], open = true, running = false, onStart = () => {}, onResume = () => {};

  function persist() {
    try { localStorage.setItem('hb-menu', JSON.stringify(choice)); } catch (e) {}
  }

  function render() {
    root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === choice.mode));
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

  function go() {
    if (startBtn.disabled) return;
    persist();
    hide();
    onStart({ mode: choice.mode, start: items[choice.start].k });
  }

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
  }

  function hide() {
    open = false;
    running = true;
    root.classList.add('off');
    document.body.classList.remove('menu');
    document.activeElement?.blur?.();
  }

  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { choice.mode = b.dataset.mode; render(); }));
  startBtn.addEventListener('click', go);
  resumeBtn.addEventListener('click', resume);

  addEventListener('keydown', e => {
    if (!open) return;
    e.stopPropagation();
    const n = items.length;
    if (['Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') go();
    else if (e.code === 'Escape') resume();
    else if (n && (e.code === 'ArrowDown' || e.code === 'KeyS')) { choice.start = (choice.start + 1) % n; render(); }
    else if (n && (e.code === 'ArrowUp' || e.code === 'KeyW')) { choice.start = (choice.start + n - 1) % n; render(); }
    else if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyQ'].includes(e.code)) { choice.mode = choice.mode === 'ski' ? 'board' : 'ski'; render(); }
  }, true);

  document.body.classList.add('menu');
  render();
  return {
    show, hide, setPistes,
    setStatus(t) { status.textContent = t; },
    ready() { startBtn.disabled = false; status.textContent = ''; startBtn.focus(); },
    onStart(f) { onStart = f; },
    onResume(f) { onResume = f; },
    get open() { return open; }
  };
}
