// Charge les scripts de l'appli dans un contexte isolé, sans navigateur, dans l'ordre d'index.html
// (même code que l'appli). Utilisé par les tests (outils/tests/run.js) et par le dossier des calculs
// (outils/doc-calculs/generer.js).

const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(__dirname, '..');

function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i], get length() { return m.size; } };
}

function loadApp() {
  const alerts = [];
  const el = () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, removeAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => null, getContext: () => null });
  const ctx = {
    console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, setInterval() {}, clearInterval() {},
    Uint8Array, Uint16Array, Uint32Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, Promise, Buffer,
    alert: msg => alerts.push(String(msg)), confirm: () => true,
    localStorage: makeStorage(), navigator: { userAgent: 'node' }, location: { reload() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }), addEventListener() {}, history: { pushState() {} },
    fetch: () => Promise.reject(new Error('pas de réseau dans les tests'))
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.document = Object.assign(el(), { documentElement: el(), body: el(), createElement: el, getElementById: () => null, querySelectorAll: () => [] });
  vm.createContext(ctx);
  const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  // Bibliothèques chargées à la demande dans l'appli (js/lazy-libs.js) : chargées d'emblée ici
  const lazy = ['js/pdfmake.min.js', 'js/vfs_fonts.js', 'js/fonts-arial.js', 'js/xlsx.full.min.js'];
  const scripts = lazy.concat([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => s !== 'js/app.js'));
  for (const s of scripts) vm.runInContext(fs.readFileSync(path.join(APP, s), 'utf8'), ctx, { filename: s });
  ctx.render = () => {};
  ctx.__alerts = alerts;
  return ctx;
}

function dataUrl(p) {
  const b = fs.readFileSync(path.join(APP, p));
  return 'data:image/' + (p.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + b.toString('base64');
}

function initPdfAssets(ctx) {
  ctx.PDF_ASSETS.logo = dataUrl(ctx.LOGO_PATH);
  ctx.PDF_ASSETS.banner = dataUrl(ctx.BANNER_PATH);
  ctx.PDF_ASSETS.ctaSchema = dataUrl(ctx.CTA_SCHEMA_PATH);
  ctx.PDF_ASSETS.sorbonneSchema = dataUrl(ctx.SORBONNE_SCHEMA_PATH);
  ctx.PDF_ASSETS.dividers = {};
  ctx.SECTION_GROUPS.forEach(g => { ctx.PDF_ASSETS.dividers[g.key] = g.images.map(dataUrl); });
  ctx.PDF_ASSETS.methodo = {};
  Object.keys(ctx.METHODO_IMAGES).forEach(k => { ctx.PDF_ASSETS.methodo[k] = dataUrl(ctx.METHODO_IMAGES[k]); });
}

// Résultat PDF en Buffer
const pdfBuffer = dd => new Promise(res => dd.getBuffer(b => res(Buffer.from(b))));

module.exports = { APP, loadApp, makeStorage, pdfBuffer, dataUrl, initPdfAssets };
