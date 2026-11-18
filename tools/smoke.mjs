import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const arg = n => process.argv.includes('--' + n);
const val = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const root = resolve(new URL('..', import.meta.url).pathname);
const modes = val('modes', 'frei,mgr').split(',');
const shotDir = arg('shot') ? val('shot-dir', join(tmpdir(), 'hb-shots')) : null;
const t0 = Date.now();
const log = m => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's ' + m);

const cache = join(tmpdir(), 'hb-three');
if (!existsSync(join(cache, 'node_modules/three/build/three.module.js'))) execSync(`npm i --silent --prefix ${cache} three@0.170.0`, { stdio: 'ignore' });
const three = join(cache, 'node_modules/three/');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.bin': 'application/octet-stream', '.css': 'text/css' };
const server = createServer(async (q, r) => {
  const p = join(root, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
  try { const b = await readFile(p); r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end(); }
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errs = [];
let fail = false;

async function page() {
  const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await p.route('https://cdn.jsdelivr.net/npm/three@0.170.0/**', r => r.fulfill({ path: three + r.request().url().split('three@0.170.0/')[1], contentType: 'text/javascript' }));
  p.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && !/GL Driver|GPU stall/.test(m.text()))) errs.push(m.type() + ': ' + m.text()); });
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('requestfailed', r => errs.push('reqfail: ' + r.url()));
  await p.goto(url);
  await btn(p, 'Freies Fahren', 60000);
  log('Menü geladen');
  return p;
}
const btn = (p, t, timeout = 15000) => p.waitForFunction(t => [...document.querySelectorAll('button')].some(b => b.textContent.includes(t) && b.offsetParent && !b.disabled), t, { timeout });
const click = async (p, t) => { await btn(p, t); await p.evaluate(t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t) && b.offsetParent && !b.disabled).click(), t); };
const shot = async (p, n) => { if (shotDir) { await p.screenshot({ path: join(shotDir, n + '.png') }); log('Bild ' + join(shotDir, n + '.png')); } };
const step = async (n, f) => { try { await f(); } catch (e) { fail = true; log('FEHLER ' + n + ': ' + e.message.split('\n')[0]); } };

if (shotDir) execSync(`mkdir -p ${shotDir}`);
const p = await page();
await shot(p, 'menu');
if (modes.includes('frei')) await step('Freies Fahren', async () => {
  await click(p, 'Freies Fahren'); await click(p, 'Losfahren');
  await p.waitForTimeout(3000);
  await p.keyboard.down('KeyW'); await p.waitForTimeout(3000); await p.keyboard.up('KeyW');
  log('Freies Fahren läuft');
  await shot(p, 'frei');
});
if (modes.includes('mgr')) await step('Manager', async () => {
  if (modes.includes('frei')) { await p.goto(url); await btn(p, 'Manager', 60000); }
  await click(p, 'Manager'); await click(p, 'Neues Spiel');
  await p.waitForFunction(() => document.body.innerText.includes('Kasse'), null, { timeout: 30000 });
  log('Manager läuft');
  await shot(p, 'mgr');
  await p.keyboard.press('KeyV'); await p.waitForTimeout(2000);
  await shot(p, 'mgr3d');
});

await browser.close(); server.close();
const uniq = [...new Set(errs)];
console.log(uniq.length ? uniq.slice(0, 20).join('\n') : 'Konsole sauber');
log(fail || uniq.length ? 'NICHT OK' : 'OK');
process.exit(fail || uniq.length ? 1 : 0);
