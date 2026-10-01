// Collects every Spanish string the site shows, as dictionary keys.
// Usage (from the repo root, with the site served on :8765):
//   npx http-server -p 8765 -s .   &   node i18n/harvest.js
// Writes i18n/keys.json and lists the keys missing from en.json / pt.json
// in i18n/missing-<lang>.json, ready to be translated and merged.
const fs = require('fs'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright')); }
const BASE = process.env.ATLAS_URL || 'http://127.0.0.1:8765/';
const ASSETS = process.env.ASSETS_DIR; // optional local copies of leaflet + countries.geojson (offline runs)
const ROOT = path.join(__dirname, '..');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  if (ASSETS) {
    await p.route('**/leaflet.min.js', r => r.fulfill({ path: path.join(ASSETS, 'node_modules/leaflet/dist/leaflet.js'), contentType: 'application/javascript' }));
    await p.route('**/leaflet.min.css', r => r.fulfill({ path: path.join(ASSETS, 'node_modules/leaflet/dist/leaflet.css'), contentType: 'text/css' }));
    await p.route('**/countries.geojson', r => r.fulfill({ path: path.join(ASSETS, 'countries.geojson'), contentType: 'application/json' }));
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => /leaflet|countries\.geojson/.test(r.request().url()) ? r.fallback() : r.abort());
  }
  const keys = new Set();
  const grab = async (sel) => (await p.evaluate(s => window.__i18nCollect(s ? document.querySelector(s) : document.body), sel || null)).forEach(k => keys.add(k));
  const scrollAll = async () => {
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 700) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(60); }
    await p.waitForTimeout(400);
  };
  await p.goto(BASE + '?lang=es&nointro'); await p.waitForTimeout(3500);
  // the intro (normally hidden after the first visit)
  await p.evaluate(() => { const i = document.getElementById('intro'); if (i) i.hidden = false; });
  await grab('#intro');
  for (const v of ['inicio', 'elecciones', 'analisis', 'cambio', 'metodologia', 'brasil', 'eeuu', 'israel']) {
    await p.evaluate(v => window.__atlasGoTo(v), v); await p.waitForTimeout(1500);
    await scrollAll();
    if (v === 'elecciones') { await p.evaluate(() => { window.__calShowAll = true; renderElectionsTimeline(); }); await p.waitForTimeout(300); }
    // flip every toggle button inside the view (poll rounds, map metrics, chart modes…)
    const n = await p.evaluate(() => document.querySelectorAll('.atlas-view.is-active button[data-round], .atlas-view.is-active button[data-metric], .atlas-view.is-active button[data-mode]').length);
    await grab();
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => { const bs = document.querySelectorAll('.atlas-view.is-active button[data-round], .atlas-view.is-active button[data-metric], .atlas-view.is-active button[data-mode]'); if (bs[i]) bs[i].click(); }, i);
      await p.waitForTimeout(250); await grab();
    }
    // every option of every select (analysis charts)
    const sels = await p.evaluate(() => [...document.querySelectorAll('.atlas-view.is-active select')].map(s => ({ id: s.id, n: s.options.length })));
    for (const s of sels) for (let i = 0; i < Math.min(s.n, 12); i++) {
      await p.evaluate(({ id, i }) => { const el = document.getElementById(id); el.selectedIndex = i; el.dispatchEvent(new Event('change', { bubbles: true })); }, { id: s.id, i });
      await p.waitForTimeout(120); await grab();
    }
  }
  // every country: side panel, full profile and map summary
  const isos = await p.evaluate(() => Object.keys(state.countryByISO));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'i18n-scratch'; d.style.display = 'none'; document.body.appendChild(d); });
  for (const iso of isos) {
    await p.evaluate(iso => {
      const c = state.countryByISO[iso];
      renderDetail(c);
      document.getElementById('i18n-scratch').innerHTML = countryFichaHTML(c) + mapCountrySummaryHTML(c, 'Click para ver ficha completa →');
    }, iso);
    await grab('#panel-detail'); await grab('#i18n-scratch');
  }
  await p.evaluate(() => { showMapQuick(null, 'x'); }); await grab('#map-quick');
  await p.evaluate(() => { openFicha(state.countryByISO.BRA); }); await grab('#ficha-modal'); await p.evaluate(() => closeFicha());
  await p.evaluate(() => { renderEmptyDetail(); }); await grab('#panel-detail');
  await p.evaluate(() => { document.getElementById('nav-sheet').hidden = false; }); await grab('#nav-sheet');
  keys.add(await p.evaluate(() => window.__i18nKey(document.title)));
  // data files: strings that only appear in states we did not click through
  const dataStrings = await p.evaluate(async () => {
    const out = [];
    const walk = v => { if (typeof v === 'string') { if (/[A-Za-zÀ-ÿ]/.test(v) && !/^https?:/.test(v) && v.length < 2000) out.push(window.__i18nKey(v)); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    for (const f of ['data/especiales/brasil-2026.json', 'data/especiales/eeuu-2026.json', 'data/especiales/israel-2026.json', 'data/calendario.json', 'data/live.json']) {
      try { walk(await (await fetch(f)).json()); } catch (e) {}
    }
    return out;
  });
  dataStrings.forEach(k => keys.add(k));
  await b.close();

  const clean = [...keys].filter(k => /[A-Za-zÀ-ÿ]/.test(k)).sort();
  fs.writeFileSync(path.join(__dirname, 'keys.json'), JSON.stringify(clean, null, 0).replace(/","/g, '",\n"'));
  for (const lang of ['en', 'pt']) {
    let dict = {};
    try { dict = JSON.parse(fs.readFileSync(path.join(__dirname, lang + '.json'), 'utf8')); } catch (e) {}
    const missing = clean.filter(k => !(k in dict));
    fs.writeFileSync(path.join(__dirname, 'missing-' + lang + '.json'), JSON.stringify(missing, null, 1));
    console.log(lang + ': ' + missing.length + ' missing of ' + clean.length);
  }
})();
