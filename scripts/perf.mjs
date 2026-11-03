// Rendering-load benchmark: phone-sized viewport, CPU throttled 4x.
// Measures frame rate while idle and while scrolling, plus main-thread and
// raster/paint work from a Chrome trace.  Usage: node scripts/perf.mjs [dir] [label]
import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';

const require = createRequire('/opt/npm-tools/node_modules/');
const { chromium } = require('playwright');
const dir = process.argv[2] ?? 'dist';
const label = process.argv[3] ?? dir;
const NOON = '2026-11-03T09:00:00Z';
const SECS = Number(process.env.PERF_SECS ?? 6);

const srv = await startServer(dir);
const browser = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });

async function run(viewport, mode) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: viewport.width < 600 ? 3 : 1, hasTouch: viewport.width < 600 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (process.env.PERF_CSS) await page.addInitScript((css) => { addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.append(st); }); }, process.env.PERF_CSS);
  if (process.env.PERF_NO_SCROLL_LISTENERS) await page.addInitScript(() => { const orig = EventTarget.prototype.addEventListener; EventTarget.prototype.addEventListener = function (t, ...a) { if (t === 'scroll') return; return orig.call(this, t, ...a); }; });
  if (process.env.PERF_NO_CANVAS) await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = function () { return null; }; });
  await page.goto(`${srv.url}/index.html?demo=1&now=${NOON}`);
  await page.locator('[data-app-ready]').waitFor();
  await page.waitForTimeout(2500); // intro animations done
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Performance.enable');
  const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'cc', 'gpu', ...(process.env.PERF_STYLE_DEBUG ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : [])] });
  const t0 = await page.evaluate(() => performance.now());
  if (mode === 'scroll') {
    // real gesture (handled by the compositor like a finger/wheel), down then back up
    const { width, height } = viewport;
    for (const y of [-2400, 2400]) {
      await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(width / 2), y: Math.round(height / 2), yDistance: y, speed: 1200, gestureSourceType: 'mouse' });
    }
  } else {
    await page.waitForTimeout(SECS * 1000);
  }
  const frames = [t0, await page.evaluate(() => performance.now())];
  const trace = JSON.parse((await browser.stopTracing()).toString());
  const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await ctx.close();

  const secs = (frames.at(-1) - frames[0]) / 1000;
  // frames actually presented by the compositor (no rAF probe: it would wake the main thread itself)
  const counts = {};
  for (const e of trace.traceEvents) counts[e.name] = (counts[e.name] ?? 0) + 1;
  if (process.env.PERF_DEBUG) console.log(Object.entries(counts).filter(([k]) => /frame|draw|swap/i.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 15));
  if (process.env.PERF_STYLE_DEBUG) {
    const ul = trace.traceEvents.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X');
    const counts = ul.map((e) => e.args?.elementCount ?? e.args?.data?.elementCount ?? 0);
    console.log('UpdateLayoutTree', ul.length, 'elements total', counts.reduce((a, b) => a + b, 0), 'max', Math.max(0, ...counts), 'ms', (ul.reduce((a, e) => a + e.dur, 0) / 1000).toFixed(0));
    const inv = {};
    for (const e of trace.traceEvents) if (e.name === 'StyleRecalcInvalidationTracking' || e.name === 'ScheduleStyleInvalidationTracking' || e.name === 'StyleInvalidatorInvalidationTracking') { const k = (e.args?.data?.reason || e.args?.data?.invalidatedSelectorId || e.name) + ' ' + (e.args?.data?.nodeName || ''); inv[k] = (inv[k] || 0) + 1; }
    console.log(Object.entries(inv).sort((a, b) => b[1] - a[1]).slice(0, 12));
  }
  const drawn = trace.traceEvents.filter((e) => e.name === 'DrawFrame').length;
  const mainFrames = trace.traceEvents.filter((e) => e.name === 'BeginMainThreadFrame' || e.name === 'ThreadProxy::BeginMainFrame' || e.name === 'ProxyMain::BeginMainFrame').length;
  const fps = drawn / secs;
  const long = mainFrames;
  const sum = (names) => trace.traceEvents.filter((e) => names.includes(e.name) && e.ph === 'X').reduce((a, e) => a + (e.dur ?? 0), 0) / 1000 / secs;
  return {
    fps: +fps.toFixed(1),
    mainFramesPerSec: +(long / secs).toFixed(1),
    mainMsPerSec: +(((after.TaskDuration - before.TaskDuration) * 1000) / secs).toFixed(0),
    styleLayoutMsPerSec: +((((after.RecalcStyleDuration - before.RecalcStyleDuration) + (after.LayoutDuration - before.LayoutDuration)) * 1000) / secs).toFixed(0),
    paintMsPerSec: +sum(['Paint', 'PaintImage']).toFixed(0),
    rasterMsPerSec: +sum(['RasterTask', 'TileManager::RunRasterTask']).toFixed(0),
    compositeMsPerSec: +sum(['UpdateLayerTree', 'Layerize', 'Commit', 'PrePaint']).toFixed(0),
  };
}

const out = {};
const only = process.env.PERF_ONLY;
for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
  for (const mode of ['idle', 'scroll']) if (!only || only.split(',').includes(`${name}-${mode}`)) out[`${name}-${mode}`] = await run(vp, mode);
}
console.log(label);
console.table(out);
await browser.close();
await srv.close();
