export function createAudio() {
  let ctx = null, wind, windF, scrape, scrapeF, hum, master, muted = false;

  function noise(c) {
    const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = b.getChannelData(0);
    let p = 0;
    for (let i = 0; i < d.length; i++) { p = p * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = (Math.random() * 2 - 1) * 0.5 + p * 4; }
    const s = c.createBufferSource();
    s.buffer = b;
    s.loop = true;
    s.start();
    return s;
  }

  function chain(c, src, type, f, q) {
    const flt = c.createBiquadFilter();
    flt.type = type; flt.frequency.value = f; flt.Q.value = q;
    const g = c.createGain();
    g.gain.value = 0;
    src.connect(flt).connect(g).connect(master);
    return [g, flt];
  }

  function init() {
    if (ctx) return ctx.state === 'suspended' && ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ctx.destination);
      const n = noise(ctx);
      [wind, windF] = chain(ctx, n, 'bandpass', 500, 0.7);
      [scrape, scrapeF] = chain(ctx, n, 'bandpass', 2400, 1.2);
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = 52; o.start();
      [hum] = chain(ctx, o, 'lowpass', 180, 0.5);
    } catch (e) { ctx = null; }
  }

  function set(p, v) { p.setTargetAtTime(v, ctx.currentTime, 0.08); }

  function update(state, ctrl, paused) {
    if (!ctx || ctx.state !== 'running') return;
    const sp = paused ? 0 : state.speed;
    const lift = !paused && !!state.lift;
    set(wind.gain, lift ? 0.02 : Math.min(0.5, sp * sp * 0.00045));
    set(windF.frequency, 300 + sp * 22);
    const carve = !paused && !lift && state.grounded && state.crashed <= 0 ? Math.min(1, sp / 15) * (0.15 + Math.abs(ctrl.steer) * 0.5 + (ctrl.brake ? 0.6 : 0)) : 0;
    set(scrape.gain, carve * 0.18);
    set(scrapeF.frequency, 1600 + sp * 40 + (ctrl.brake ? 800 : 0));
    set(hum.gain, lift ? 0.05 : 0);
  }

  function toggle() {
    muted = !muted;
    if (master) set(master.gain, muted ? 0 : 0.8);
    return !muted;
  }

  function pause(on) {
    if (ctx) on ? ctx.suspend() : ctx.resume();
  }

  return { init, update, toggle, pause, get muted() { return muted; } };
}
