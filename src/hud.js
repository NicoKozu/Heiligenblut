function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t % 1) * 10);
  return m + ':' + String(s).padStart(2, '0') + '.' + c;
}

export function createHud(pistes) {
  const root = document.createElement('div');
  root.id = 'hud';
  root.innerHTML =
    '<div id="hud-speed"><b>0</b><span>km/h</span></div>' +
    '<div id="hud-panel">' +
    '<div><span>Modus</span><b data-k="mode">Ski</b></div>' +
    '<div><span>Piste</span><b data-k="piste">–</b></div>' +
    '<div><span>Höhe</span><b data-k="alt">–</b></div>' +
    '<div><span>Zeit</span><b data-k="time">0:00.0</b></div>' +
    '<div><span>Max</span><b data-k="max">0 km/h</b></div>' +
    '</div>' +
    '<div id="hud-msg"></div>';
  document.body.appendChild(root);
  const el = k => root.querySelector('[data-k="' + k + '"]');
  const speedEl = root.querySelector('#hud-speed b');
  const msg = root.querySelector('#hud-msg');
  const f = { piste: el('piste'), alt: el('alt'), time: el('time'), max: el('max'), mode: el('mode') };
  let time = 0, max = 0, running = false, acc = 0;
  const last = {};
  const set = (k, v) => { if (last[k] !== v) { last[k] = v; (k === 'speed' ? speedEl : k === 'msg' ? msg : f[k]).textContent = v; } };

  function update(state, dt) {
    if (state.reset) { time = 0; max = 0; running = false; }
    const kmh = state.speed * 3.6;
    if (!running && kmh > 2) running = true;
    if (running) time += dt;
    if (kmh > max) max = kmh;
    acc += dt;
    set('speed', String(Math.round(kmh)));
    set('time', fmtTime(time));
    set('max', Math.round(max) + ' km/h');
    set('msg', state.crashed > 0 ? 'Sturz!' : state.noteT > 0 ? state.note : '');
    set('mode', state.modeName);
    if (acc > 0.2 || state.reset) {
      acc = 0;
      set('alt', Math.round(state.pos.y).toLocaleString('de-DE') + ' m');
      const p = pistes.at(state.pos);
      set('piste', p ? p.id + ' ' + p.name : 'abseits');
      f.piste.style.color = p ? p.lv.css : '';
    }
  }

  return { update };
}
