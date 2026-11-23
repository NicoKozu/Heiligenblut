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
    '<div id="hud-msg"></div>' +
    '<div id="hud-hint"></div>' +
    '<div id="hud-map"><img src="public/pistenplan.jpg" alt=""><i></i></div>';
  document.body.appendChild(root);
  const el = k => root.querySelector('[data-k="' + k + '"]');
  const speedEl = root.querySelector('#hud-speed b');
  const msg = root.querySelector('#hud-msg');
  const f = { piste: el('piste'), alt: el('alt'), time: el('time'), max: el('max'), mode: el('mode'), speed: speedEl, msg, hint: root.querySelector('#hud-hint') };
  const dot = root.querySelector('#hud-map i');
  const TC = [[-0.158,-0.109],[0.617,-0.921],[1.11,-2.861],[0.04,-3.263],[-0.051,-3.97],[0.723,-0.549],[1.235,-1.543],[2.15,-1.274]], TW = [[0.688,-1.863],[-48.015,-2.436],[0.773,-9.638],[11.555,13.038],[-8.629,-5.214],[31.844,0.178],[22.28,1.934],[-10.495,4.001],[135.985,294.633],[80.636,-20.089],[14.092,43.807]];
  const mapAt = (x, z) => {
    x /= 1000; z /= 1000;
    const n = TC.length, o = [0, 0];
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(x - TC[i][0], z - TC[i][1]), u = r > 0 ? r * r * Math.log(r) : 0;
      o[0] += u * TW[i][0]; o[1] += u * TW[i][1];
    }
    for (let k = 0; k < 2; k++) o[k] = (o[k] + TW[n][k] + x * TW[n + 1][k] + z * TW[n + 2][k]) / 3.2;
    return o;
  };
  let time = 0, max = 0, running = false, acc = 0;
  const last = {};
  const set = (k, v) => { if (last[k] !== v) { last[k] = v; f[k].textContent = v; } };

  function update(state, dt) {
    if (state.reset) { time = 0; max = 0; running = false; }
    const kmh = state.speed * 3.6;
    if (!running && kmh > 2) running = true;
    if (running && !state.lift) time += dt;
    if (!state.lift && kmh > max) max = kmh;
    acc += dt;
    set('speed', String(Math.round(kmh)));
    set('time', fmtTime(time));
    set('max', Math.round(max) + ' km/h');
    set('msg', state.crashed > 0 ? 'Sturz!' : state.noteT > 0 ? state.note : '');
    set('mode', state.modeName);
    set('hint', state.hint || '');
    if (acc > 0.2 || state.reset) {
      acc = 0;
      set('alt', Math.round(state.pos.y).toLocaleString('de-DE') + ' m');
      const p = state.lift ? null : pistes.at(state.pos);
      set('piste', state.lift || (p ? p.id + ' ' + p.name + (p.closed ? ' (gesperrt)' : '') : 'abseits'));
      f.piste.style.color = p ? p.lv.css : '';
      const [mx, my] = mapAt(state.pos.x, state.pos.z);
      dot.style.left = Math.min(98, Math.max(2, mx)) + '%';
      dot.style.top = Math.min(98, Math.max(2, my)) + '%';
    }
  }

  let svg = null;
  function lines(L) {
    if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; root.querySelector('#hud-map').insertBefore(svg, dot); }
    svg.innerHTML = (L || []).map(l => { const [ax, ay] = mapAt(...l.a), [bx, by] = mapAt(...l.b); return '<line x1="' + ax.toFixed(1) + '" y1="' + ay.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + by.toFixed(1) + '" stroke="' + l.color + '" stroke-width="1.6" stroke-dasharray="' + (l.dash ? '3 2' : 'none') + '"/><circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="1.3" fill="' + l.color + '"/>'; }).join('');
  }

  return { update, lines };
}
