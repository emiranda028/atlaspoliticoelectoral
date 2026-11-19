/* ===========================================================
   JUEGOS DEL ATLAS
   - "¿Qué país gobernarías?": decisiones de gobierno → país más parecido
     (data/juegos/pais.json; líderes e ideologías de COUNTRIES).
   - "La rosca: PASO o no PASO": simulación del Congreso con los bloques
     reales (data/juegos/rosca.json).
   - "¿Quién gobierna?": trivia con los líderes de la base del Atlas.
   Se carga solo al entrar a #juegos (window.AtlasJuegos.render).
   =========================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const getJSON = url => fetch(url + '?v=' + Date.now()).then(r => { if (!r.ok) throw new Error(url); return r.json(); });
  const countries = () => (typeof COUNTRIES !== 'undefined' ? COUNTRIES : []);
  const byIso = iso => countries().find(c => c.iso === iso);
  const flag = (iso, cls) => (typeof flagOf === 'function' ? flagOf(iso, cls || '') : '');
  const ideoLabel = id => (typeof IDEOLOGIES !== 'undefined' && IDEOLOGIES[id] ? IDEOLOGIES[id].label : '');
  const SITE = 'https://atlaspoliticoelectoral.com/#juegos';
  function wireCopy(el) {
    el.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.getAttribute('data-copy')); b.textContent = '¡Copiado!'; } catch (e) { prompt('Copiá el texto:', b.getAttribute('data-copy')); }
    }));
  }

  /* ---------------------------------------------------------- SHARE AS IMAGE / PDF */
  // Each result builds a 1080×1350 card (the vertical format WhatsApp,
  // Instagram and X show whole), rendered with html-to-image to a JPEG. The
  // PDF is that same JPEG wrapped in a one-page PDF, so no extra library.
  const CARD_W = 1080, CARD_H = 1350;
  const cardShell = (game, color, body) => `<div class="jgx" style="--jgx:${color}">
      <div class="jgx-top"><span class="jgx-brand">Atlas Político Mundial</span><span class="jgx-game">${esc(game)}</span></div>
      <div class="jgx-body">${body}</div>
      <div class="jgx-foot"><span>¿Y vos? Jugá en</span><b>atlaspoliticoelectoral.com/#juegos</b></div>
    </div>`;
  async function cardCanvas(html) {
    if (!window.htmlToImage) throw new Error('sin librería de imagen');
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-20000px;top:0;width:${CARD_W}px;height:${CARD_H}px;`;
    host.innerHTML = html; document.body.appendChild(host);
    const card = host.firstElementChild;
    try {
      try { await document.fonts.ready; } catch (e) {}
      // Flags come from a CDN: embed them first, or Safari leaves them out of the image
      await Promise.all([...card.querySelectorAll('img')].map(async img => {
        const src = img.getAttribute('src'); if (!src || src.startsWith('data:')) return;
        try { const b = await fetch(src, { mode: 'cors' }).then(r => r.blob()); img.src = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(b); }); } catch (e) {}
      }));
      await Promise.all([...card.querySelectorAll('img')].map(img => img.complete && img.naturalWidth ? null : new Promise(r => { img.onload = img.onerror = r; setTimeout(r, 4000); })));
      card.querySelectorAll('img').forEach(img => { if (!img.naturalWidth) img.remove(); });
      return await window.htmlToImage.toCanvas(card, { pixelRatio: 1, width: CARD_W, height: CARD_H, cacheBust: true, backgroundColor: '#FBF7F0' });
    } finally { host.remove(); }
  }
  const toBlob = (canvas, type) => new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob')), type, 0.92));
  async function jpegToPdf(jpeg, w, h) {
    const img = new Uint8Array(await jpeg.arrayBuffer());
    const W = Math.round(w * 0.5), H = Math.round(h * 0.5);  // points: about 19 × 24 cm
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const push = p => { const b = typeof p === 'string' ? enc.encode(p) : p; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
    push('%PDF-1.4\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
    obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
    obj(4, () => { push(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`); push(img); push('\nendstream'); });
    const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(5, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    const xref = len;
    push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map(n => String(offs[n]).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  const download = (blob, name) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  // WhatsApp and X links can't carry an image: on phones the buttons open the
  // share sheet with the image attached; on computers they download the image
  // and open WhatsApp Web / X with the text, so it only needs to be attached
  const shareBox = text => `<div class="jg-sharebox">
      <div class="jg-share-h">Compartí tu resultado como imagen</div>
      <div class="jg-share">
        <button type="button" class="jg-btn is-main is-wa" data-img="wa">WhatsApp</button>
        <button type="button" class="jg-btn is-main" data-img="x">X</button>
        <button type="button" class="jg-btn is-main" data-img="share">Instagram y otras apps</button>
      </div>
      <div class="jg-share">
        <button type="button" class="jg-btn" data-img="jpg">Descargar imagen</button>
        <button type="button" class="jg-btn" data-img="pdf">Descargar PDF</button>
        <button type="button" class="jg-btn is-ghost" data-copy="${esc(text + '\n' + SITE)}">Copiar texto</button>
      </div>
      <div class="jg-share-note" hidden></div>
      <div class="jg-share-prev" hidden></div>
    </div>`;
  const shareMini = () => `<div class="jg-share is-mini">
      <button type="button" class="jg-btn" data-img="share">📸 Compartir esta jugada</button>
      <button type="button" class="jg-btn is-ghost" data-img="jpg">Descargar imagen</button>
      <button type="button" class="jg-btn is-ghost" data-img="pdf">PDF</button>
    </div>`;
  // Wires the image/PDF buttons: the card is drawn once, on the first click
  const canShareFiles = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.jpg', { type: 'image/jpeg' })] })); } catch (e) { return false; } };
  function wireShare(el, text, cardHTML, slug, opts) {
    if (!el) return;
    let made = null;
    const make = () => made || (made = cardCanvas(cardHTML).then(async c => {
      const jpg = await toBlob(c, 'image/jpeg');
      const prev = el.querySelector('.jg-share-prev');
      if (prev) { prev.hidden = false; prev.innerHTML = `<img src="${URL.createObjectURL(jpg)}" alt="Tu resultado como imagen" width="216" height="270">`; }
      return { jpg, w: c.width, h: c.height };
    }).catch(e => { made = null; throw e; }));
    // Draw the card right away for result screens, so sharing is instant (and
    // the phone still counts the tap as the gesture that opens the share sheet)
    if (opts && opts.eager) setTimeout(() => make().catch(() => {}), 400);
    const name = ext => `atlas-juegos-${slug}.${ext}`;
    const note = t => { const n = el.querySelector('.jg-share-note'); if (n) { n.hidden = false; n.textContent = t; } };
    const full = text + '\n' + SITE;
    el.querySelectorAll('[data-img]').forEach(b => b.addEventListener('click', async () => {
      const kind = b.getAttribute('data-img'), label = b.textContent;
      const done = t => { b.textContent = t; setTimeout(() => { b.textContent = label; b.disabled = false; }, 1800); };
      const phone = canShareFiles();
      // On computers the WhatsApp/X tab must open inside the click, before the image is drawn
      const tab = !phone && (kind === 'wa' || kind === 'x') ? window.open('', '_blank') : null;
      b.textContent = 'Generando…'; b.disabled = true;
      try {
        const r = await make();
        if (kind === 'pdf') { download(await jpegToPdf(r.jpg, r.w, r.h), name('pdf')); return done('¡PDF listo!'); }
        const file = new File([r.jpg], name('jpg'), { type: 'image/jpeg' });
        if ((kind === 'share' || kind === 'wa' || kind === 'x') && phone) {
          // Many apps drop the text that travels with an image: copy it too
          try { await navigator.clipboard.writeText(full); } catch (e) {}
          try { await navigator.share({ files: [file], text: full }); return done('¡Listo!'); }
          catch (e) { if (e && e.name === 'AbortError') return done(label); }
        }
        download(r.jpg, name('jpg'));
        if (kind === 'wa' || kind === 'x') {
          try { await navigator.clipboard.writeText(full); } catch (e) {}
          const url = kind === 'wa' ? `https://web.whatsapp.com/send?text=${encodeURIComponent(full)}` : `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE)}`;
          if (tab) tab.location.href = url; else window.open(url, '_blank');
          note(`La imagen se descargó (${name('jpg')}): adjuntala en ${kind === 'wa' ? 'WhatsApp' : 'X'} con el clip 📎 o arrastrándola. El texto ya está escrito.`);
          return done('Imagen descargada');
        }
        if (kind === 'share') note('Tu navegador no permite compartir imágenes directo: la descargamos para que la subas donde quieras.');
        done(kind === 'share' ? 'Imagen descargada' : '¡Imagen lista!');
      } catch (e) { if (tab) tab.close(); done('No se pudo generar'); }
    }));
  }

  /* ---------------------------------------------------------- COUNTRY OUTLINE */
  let GEO = null, geoP = null;
  const loadGeo = () => geoP || (geoP = fetch('data/geo/world.json').then(r => r.json()).then(j => (GEO = j)).catch(() => null));
  function outlineSVG(iso, color, cls) {
    if (!GEO) return '';
    // France and Norway come without ISO code in Natural Earth; the Malvinas are Argentine (editorial line of the Atlas)
    const BY_NAME = { FRA: 'France', NOR: 'Norway', XKX: 'Kosovo' }, EXTRA = { ARG: ['FLK'] };
    const isos = [iso].concat(EXTRA[iso] || []);
    const feats = GEO.features.filter(x => x.properties && (isos.includes(x.properties['ISO3166-1-Alpha-3']) || x.properties.name === BY_NAME[iso]));
    if (!feats.length) return '';
    const polys = feats.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : []);
    if (!polys.length) return '';
    const bb = ring => ring.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [180, 90, -180, -90]);
    const boxes = polys.map(p => bb(p[0])), area = b => (b[2] - b[0]) * (b[3] - b[1]);
    const M = boxes[boxes.reduce((m, b, i) => area(b) > area(boxes[m]) ? i : m, 0)];
    const w = Math.max(M[2] - M[0], 3), h = Math.max(M[3] - M[1], 3);
    // The main landmass and what is near it (no far-away overseas territories)
    const far = { NOR: b => b[1] > 74 }[iso] || (() => false);   // Svalbard
    const keep = polys.filter((p, i) => { const b = boxes[i]; return !far(b) && b[0] > M[0] - w * 1.2 && b[2] < M[2] + w * 1.2 && b[1] > M[1] - h * 1.2 && b[3] < M[3] + h * 1.2; });
    const all = keep.map(p => bb(p[0])).reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
    const k = Math.cos((all[1] + all[3]) / 2 * Math.PI / 180);
    const W = (all[2] - all[0]) * k, H = all[3] - all[1], S = 280 / Math.max(W, H);
    const ox = (300 - W * S) / 2, oy = (300 - H * S) / 2;
    const d = keep.map(p => p.map(ring => 'M' + ring.map(([x, y]) => `${(ox + (x - all[0]) * k * S).toFixed(1)},${(oy + (all[3] - y) * S).toFixed(1)}`).join('L') + 'Z').join('')).join('');
    return `<svg viewBox="0 0 300 300" class="${cls || ''}" aria-hidden="true"><path d="${d}" fill="${color}" fill-rule="evenodd" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }

  /* ---------------------------------------------------------- HUB */
  let root = null;
  function hub() {
    root.innerHTML = `
      <section class="jg-hub">
        <div class="jg-hub-head">
          <span class="jg-kicker">Nuevo · Juegos del Atlas</span>
          <h2>Jugá a la <em>política</em></h2>
          <p>Gobernar, negociar, contar votos. Tres juegos hechos con los datos del Atlas y los actores reales de la política.</p>
        </div>
        <div class="jg-cards">
          <button type="button" class="jg-card is-pais" data-go="pais">
            <span class="jg-card-ico">🌎</span>
            <b>¿Qué país gobernarías?</b>
            <span>Tomá 14 decisiones de gobierno, sorteadas de un banco de más de 100, y descubrí a qué país del mundo se parece tu forma de gobernar.</span>
            <em>14 decisiones · 3 minutos</em>
          </button>
          <button type="button" class="jg-card is-rosca" data-go="rosca">
            <span class="jg-card-ico">🏛️</span>
            <b>La rosca: PASO o no PASO</b>
            <span>Llevás adelante la Jefatura de Gabinete y tenés que eliminar las PASO. Negociá con gobernadores, aguantá paros y escándalos, y contá los votos banca por banca.</span>
            <em>Estrategia · 8 semanas de rosca</em>
          </button>
          <button type="button" class="jg-card is-trivia" data-go="trivia">
            <span class="jg-card-ico">❓</span>
            <b>¿Quién gobierna?</b>
            <span>Diez preguntas sobre líderes, sistemas electorales, economía y elecciones de todo el mundo, con los datos del Atlas.</span>
            <em>Trivia · 10 preguntas</em>
          </button>
        </div>
      </section>`;
    root.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.getAttribute('data-go'))));
  }
  function go(game) {
    window.scrollTo({ top: (root.getBoundingClientRect().top + window.scrollY) - 80, behavior: 'smooth' });
    if (game === 'pais') return Pais.start();
    if (game === 'rosca') return Rosca.start();
    if (game === 'trivia') return Trivia.start();
    hub();
  }
  // On every step bring the game back under the sticky menu, so the question is in view
  function toTop() {
    // Nothing should look chosen on a new question (no leftover focus from the last tap)
    if (document.activeElement && document.activeElement !== document.body && root && root.contains(document.activeElement)) document.activeElement.blur();
    // ...nor highlighted because the mouse happens to rest where the last click was
    if (root) { root.classList.add('is-fresh'); root.addEventListener('mousemove', () => root.classList.remove('is-fresh'), { once: true }); }
    const g = root && root.querySelector('.jg-game'); if (!g) return;
    const nav = document.querySelector('.topic-nav');
    const off = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    const top = g.getBoundingClientRect().top;
    if (top < off || top > off + 60) window.scrollTo({ top: top + window.scrollY - off - 8, behavior: 'smooth' });
  }
  const GAMES = { rosca: ['🏛️', 'La rosca: PASO o no PASO', 'Eliminá las PASO negociando con gobernadores y bloques'], pais: ['🌎', '¿Qué país gobernarías?', 'Tomá 14 decisiones y descubrí a qué país te parecés'], trivia: ['❓', '¿Quién gobierna?', 'Líderes, sistemas, economía y elecciones del mundo'] };
  const moreGames = cur => `<div class="jg-more"><h4>Seguí jugando</h4><div class="jg-more-list">${Object.keys(GAMES).filter(k => k !== cur).map(k => `<button type="button" class="jg-more-card" data-play="${k}"><span class="jg-more-ico">${GAMES[k][0]}</span><span><b>${esc(GAMES[k][1])}</b><small>${esc(GAMES[k][2])}</small></span><em>Jugar →</em></button>`).join('')}</div></div>`;
  const wireMore = el => el.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => go(b.getAttribute('data-play'))));
  const backBtn = () => `<button type="button" class="jg-back" data-back>← Todos los juegos</button>`;
  const wireBack = el => el.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => go('hub')));

  /* ---------------------------------------------------------- 1. ¿QUÉ PAÍS GOBERNARÍAS? */
  const Pais = (() => {
    let D = null, st = null;
    async function start() {
      root.innerHTML = '<div class="jg-loading">Cargando…</div>';
      try { D = D || await getJSON('data/juegos/pais.json'); } catch (e) { root.innerHTML = '<div class="jg-loading">No se pudo cargar el juego.</div>'; return; }
      loadGeo();
      // 14 decisions drawn from the bank, balanced by axis (3 per axis, 2 on
      // environment), so every game is different but the profile is complete
      const main = Q => { const ax = {}; Q.options.forEach(o => Object.entries(o.e).forEach(([a, v]) => { ax[a] = Math.max(ax[a] || 0, Math.abs(v)); })); return Object.keys(ax).sort((x, y) => ax[y] - ax[x])[0]; };
      const QUOTA = { eco: 3, soc: 3, lib: 3, ext: 3, amb: 2 };
      const picked = [];
      Object.entries(QUOTA).forEach(([a, k]) => picked.push(...shuffle(D.questions.filter(Q => main(Q) === a)).slice(0, k)));
      // Two unexpected events, after decisions 5 and 10; they count like any other answer
      const seq = shuffle(picked).map(Q => ({ Q }));
      const fl = shuffle(D.flashes || []).slice(0, 2);
      if (fl[1]) seq.splice(10, 0, { Q: fl[1], flash: true });
      if (fl[0]) seq.splice(5, 0, { Q: fl[0], flash: true });
      st = { i: 0, ans: [], seq };
      intro();
    }
    function intro() {
      root.innerHTML = `<section class="jg-game is-pais">${backBtn()}
        <div class="jg-intro"><span class="jg-kicker">Juego</span><h2>${esc(D.title)}</h2><p>${esc(D.intro)}</p>
        <button type="button" class="jg-btn is-main" data-startq>Empezar</button><p class="jg-note">${esc(D.note)}</p></div></section>`;
      wireBack(root);
      root.querySelector('[data-startq]').addEventListener('click', q);
    }
    function q() {
      const it = st.seq[st.i], Q = it.Q, n = st.seq.length, nq = st.seq.filter(x => !x.flash).length;
      const num = st.seq.slice(0, st.i + 1).filter(x => !x.flash).length;
      root.innerHTML = `<section class="jg-game is-pais">${backBtn()}
        <div class="jg-progress"><span style="width:${st.i / n * 100}%"></span></div>
        ${it.flash ? `<div class="jg-flash"><span class="jg-flash-tag">Último momento</span>${Q.who ? `<span>${esc(Q.who)}</span>` : ''}</div>` : `<div class="jg-qnum">Decisión ${num} de ${nq}</div>`}
        <h3 class="jg-q${it.flash ? ' is-flash' : ''}">${esc(Q.q.replace(/^Último momento:\s*(.)/, (m, c) => c.toUpperCase()))}</h3>
        <div class="jg-opts">${(it.order || (it.order = shuffle(Q.options.map((o, k) => k)))).map(k => `<button type="button" class="jg-opt" data-k="${k}">${esc(Q.options[k].t)}</button>`).join('')}</div>
        ${st.i ? '<button type="button" class="jg-link" data-prev>← Volver a la anterior</button>' : ''}</section>`;
      wireBack(root); toTop();
      root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        st.ans[st.i] = +b.getAttribute('data-k'); st.i++;
        st.i >= n ? result() : q();
      }));
      const pv = root.querySelector('[data-prev]'); if (pv) pv.addEventListener('click', () => { st.i--; q(); });
    }
    function profile() {
      const axes = Object.keys(D.axes), sum = {}, cnt = {};
      axes.forEach(a => { sum[a] = 0; cnt[a] = 0; });
      st.seq.forEach(({ Q }, i) => {
        const touched = new Set(); Q.options.forEach(o => Object.keys(o.e).forEach(a => touched.add(a)));
        const e = Q.options[st.ans[i]].e;
        touched.forEach(a => { cnt[a]++; sum[a] += e[a] || 0; });
      });
      return axes.map(a => cnt[a] ? clamp(sum[a] / cnt[a] * 1.15, -2, 2) : 0);
    }
    function result() {
      const me = profile(), axes = Object.keys(D.axes);
      const W = [1.1, 1, 1.2, 0.9, 0.8];
      const ranked = D.countries.map(c => {
        const d = Math.sqrt(c.v.reduce((s, v, i) => s + W[i] * (v - me[i]) ** 2, 0));
        return Object.assign({}, c, { d, sim: Math.round(clamp(100 - d / Math.sqrt(16 * W.reduce((a, b) => a + b, 0)) * 140, 5, 99)) });
      }).sort((a, b) => a.d - b.d);
      const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + W[i] * (v - b[i]) ** 2, 0));
      const also = ranked.slice(1).map(c => Object.assign({}, c, { mix: c.d + 0.7 * dist(c.v, ranked[0].v) })).sort((a, b) => a.mix - b.mix).slice(0, 3);
      const top = ranked[0], C = byIso(top.iso) || { name: top.iso, leader: {} };
      const far = ranked[ranked.length - 1], F = byIso(far.iso) || { name: far.iso };
      const bar = (v, i) => { const ax = D.axes[axes[i]]; const pct = 4 + (v + 2) / 4 * 92; const tv = top.v[i], tp = 4 + (tv + 2) / 4 * 92;
        return `<div class="jg-axis"><div class="jg-axis-h"><b>${esc(ax.label)}</b></div>
          <div class="jg-axis-track"><span class="jg-axis-c" style="left:${tp}%" title="${esc(C.name)}">${flag(top.iso)}</span><span class="jg-axis-me" style="left:${pct}%">Vos</span></div>
          <div class="jg-axis-ends"><span>${esc(ax.neg)}</span><span>${esc(ax.pos)}</span></div></div>`; };
      // Map: economy (x) × society (y)
      const pt = (v0, v1) => [(6 + (v0 + 2) / 4 * 88).toFixed(1), (6 + (v1 + 2) / 4 * 88).toFixed(1)];
      const [mx, my] = pt(me[0], me[1]);
      const text = `Gobernaría como ${C.name} (${top.sim}% de coincidencia). ¿Y vos? Jugá en el Atlas Político Mundial:`;
      const card = cardShell('¿Qué país gobernarías?', '#1F7A5A', `
        <div class="jgx-kicker">Si gobernara, mi país se parecería a…</div>
        <div class="jgx-flag">${flag(top.iso)}${outlineSVG(top.iso, '#1F7A5A', 'jgx-outline')}</div>
        <div class="jgx-title${C.name.length > 16 ? ' is-long' : ''}">${esc(C.name)}</div>
        <div class="jgx-big"><b>${top.sim}%</b> de coincidencia</div>
        ${C.leader && C.leader.name ? `<div class="jgx-sub">${esc(C.leader.title || 'Gobierno')}: <b>${esc(C.leader.name)}</b></div>` : ''}
        <div class="jgx-axes">${me.map((v, i) => { const ax = D.axes[axes[i]]; return `<div class="jgx-ax"><div class="jgx-ax-h">${esc(ax.label)}</div><div class="jgx-ax-row"><span>${esc(ax.neg)}</span><div class="jgx-ax-t"><i style="left:${(4 + (v + 2) / 4 * 92).toFixed(1)}%"></i></div><span>${esc(ax.pos)}</span></div></div>`; }).join('')}</div>
        <div class="jgx-also"><span>También me parezco a</span>${also.map(r => { const c = byIso(r.iso) || { name: r.iso }; return `<b>${flag(r.iso)} ${esc(c.name)}</b>`; }).join('')}</div>`);
      root.innerHTML = `<section class="jg-game is-pais">${backBtn()}
        <div class="jg-result">
          <span class="jg-kicker">Tu resultado</span>
          <h2>Gobernarías como <em>${esc(C.name)}</em></h2>
          <div class="jg-match">
            <div class="jg-match-flag">${flag(top.iso, 'fi-lg')}${outlineSVG(top.iso, '#1F7A5A', 'jg-outline')}</div>
            <div><div class="jg-match-sim"><b>${top.sim}%</b> de coincidencia</div>
              <div class="jg-match-who">${esc((C.leader && C.leader.title) || 'Gobierno')}: <b>${esc((C.leader && C.leader.name) || '')}</b>${C.leader && C.leader.party ? ` (${esc(C.leader.party)})` : ''}</div>
              <div class="jg-match-ideo">${esc(ideoLabel(C.ideology))}${C.system ? ' · ' + esc(C.system) : ''}</div>
              ${byIso(top.iso) ? `<button type="button" class="jg-link" data-ficha="${top.iso}">Ver la ficha de ${esc(C.name)} en el Atlas →</button>` : ''}</div>
          </div>
          <div class="jg-also"><b>También te parecés a:</b> ${also.map(r => { const c = byIso(r.iso) || { name: r.iso }; return `<span>${flag(r.iso)} ${esc(c.name)} <small>${r.sim}%</small></span>`; }).join('')}</div>
          <div class="jg-also"><b>Tu opuesto:</b> <span>${flag(far.iso)} ${esc(F.name)} <small>${far.sim}%</small></span></div>
          <div class="jg-cols">
            <div><h4>Tu perfil, eje por eje</h4>${me.map(bar).join('')}</div>
            <div><h4>Dónde quedás en el mapa</h4>
              <div class="jg-plane">
                <span class="jg-plane-l is-x0">${esc(D.axes.eco.neg)}</span><span class="jg-plane-l is-x1">${esc(D.axes.eco.pos)}</span>
                <span class="jg-plane-l is-y0">${esc(D.axes.soc.neg)}</span><span class="jg-plane-l is-y1">${esc(D.axes.soc.pos)}</span>
                ${D.countries.map(c => { const [x, y] = pt(c.v[0], c.v[1]); const cc = byIso(c.iso); return `<span class="jg-dot" style="left:${x}%;top:${100 - y}%" title="${esc(cc ? cc.name : c.iso)}">${flag(c.iso)}</span>`; }).join('')}
                <span class="jg-dot is-me" style="left:${mx}%;top:${100 - my}%">Vos</span>
              </div></div>
          </div>
          ${shareBox(text)}
          <details class="jg-decs"><summary>Tus ${st.seq.length} decisiones: compartí la que quieras como imagen</summary><ol>
            ${st.seq.map((it, i) => `<li data-dec="${i}"${it.flash ? ' class="is-flash"' : ''}><div><span>${it.flash ? '⚡ ' : ''}${esc(it.Q.q.replace(/^Último momento:\s*/, ''))}</span><b>${esc(it.Q.options[st.ans[i]].t)}</b></div><button type="button" class="jg-btn" data-img="share">📸 Compartir</button></li>`).join('')}
          </ol></details>
          <button type="button" class="jg-btn is-main" data-again>Jugar de nuevo</button>
          ${moreGames('pais')}
          <p class="jg-note">${esc(D.note)}</p>
        </div></section>`;
      wireBack(root); wireCopy(root);
      root.querySelectorAll('[data-dec]').forEach(li => {
        const i = +li.getAttribute('data-dec'), it = st.seq[i], q = it.Q.q.replace(/^Último momento:\s*(.)/, (m, c) => c.toUpperCase()), ch = it.Q.options[st.ans[i]].t;
        const num = st.seq.slice(0, i + 1).filter(x => !x.flash).length;
        const dcard = cardShell('¿Qué país gobernarías?', it.flash ? '#D62839' : '#1F7A5A', `
          <div class="jgx-kicker">${it.flash ? '⚡ Último momento' : `Decisión ${num} de ${st.seq.filter(x => !x.flash).length}`}</div>
          <div class="jgx-title is-md${q.length > 70 ? ' is-sm' : ''}">${esc(q)}</div>
          <div class="jgx-choice"><span>Yo hice esto</span><b>${esc(ch)}</b></div>
          <div class="jgx-also"><span>Con todas mis decisiones gobernaría como</span><b>${flag(top.iso)} ${esc(C.name)} · ${top.sim}%</b></div>`);
        wireShare(li, `En "¿Qué país gobernarías?" del Atlas: ${q} → ${ch}. ¿Vos qué harías?`, dcard, 'pais-decision-' + (i + 1));
      });
      // the main share box is wired after the per-decision buttons, scoped to it
      wireShare(root.querySelector('.jg-sharebox'), text, card, 'pais', { eager: true });
      root.querySelector('[data-again]').addEventListener('click', start); wireMore(root); toTop();
      const f = root.querySelector('[data-ficha]'); if (f) f.addEventListener('click', () => window.__fichaFull && window.__fichaFull(f.getAttribute('data-ficha')));
    }
    return { start };
  })();

  /* ---------------------------------------------------------- 2. LA ROSCA */
  const Rosca = (() => {
    let D = null, S = null;
    const STATS = ['capital', 'imagen', 'caja', 'interna'];
    const STAT_SHORT = { capital: 'Capital', imagen: 'Imagen', caja: 'Caja', interna: 'Interna' };
    async function start() {
      root.innerHTML = '<div class="jg-loading">Cargando…</div>';
      try { D = D || await getJSON('data/juegos/rosca.json'); } catch (e) { root.innerHTML = '<div class="jg-loading">No se pudo cargar el juego.</div>'; return; }
      const blocs = {};
      ['dip', 'sen'].forEach(ch => D.chambers[ch].blocs.forEach(b => { blocs[ch + ':' + b.id] = Object.assign({ ch }, b); }));
      S = { turn: 0, maxTurns: D.turns, stats: Object.fromEntries(STATS.map(k => [k, D.stats[k].start])), blocs, flags: {}, seen: {}, queue: [], log: [], dipPassed: false, dipVotes: null, govUsed: {}, actionDone: false, over: null, lastVote: null };
      // Every game is a different negotiation: a starting scenario and a draw of
      // the main situations (the core story always happens, the rest may not, and
      // some move a week earlier or later)
      const sc = D.scenarios && D.scenarios.length ? D.scenarios[Math.floor(Math.random() * D.scenarios.length)] : null;
      S.scenario = sc;
      if (sc) apply({ stats: sc.stats, blocs: sc.blocs, flags: sc.flags, turns: sc.turns });
      S.events = D.events.filter(e => e.core || e.random || Math.random() < 0.85)
        .map(e => e.core || e.random || Math.random() > 0.3 ? e : Object.assign({}, e, { turn: clamp(e.turn + (Math.random() < 0.5 ? -1 : 1), 1, 7) }));
      intro();
    }
    const stat = k => S.stats[k];
    function apply(e) {
      if (!e) return;
      Object.entries(e.stats || {}).forEach(([k, v]) => { S.stats[k] = clamp(S.stats[k] + v, 0, 100); });
      Object.entries(e.blocs || {}).forEach(([k, v]) => { if (S.blocs[k]) S.blocs[k].aff = clamp(S.blocs[k].aff + v, -100, 100); });
      Object.assign(S.flags, e.flags || {});
      if (e.turns) S.maxTurns = clamp(S.maxTurns + e.turns, S.turn + 1, 12);
      if (e.split) {
        const sp = e.split, from = S.blocs[sp.chamber + ':' + sp.from];
        if (from && from.seats >= sp.seats && !S.blocs[sp.chamber + ':' + sp.id]) {
          from.seats -= sp.seats;
          S.blocs[sp.chamber + ':' + sp.id] = { ch: sp.chamber, id: sp.id, name: sp.name, seats: sp.seats, aff: sp.aff, color: sp.color, isNew: true };
        }
      }
      // A bloc pushed below -100 (e.g. the Formosa deal broken) goes back where it came from
      Object.entries(S.blocs).forEach(([k, b]) => { if (b.isNew && b.aff <= -100 && b.id === 'formosa') { S.blocs['sen:popular'].seats += b.seats; delete S.blocs[k]; } });
    }
    // Expected yes-votes of a bloc (deterministic, for the meters)
    const share = b => { const eff = b.aff + (stat('imagen') - 50) / 4; return eff >= 55 ? 1 : eff <= 0 ? 0 : Math.pow(eff / 55, 1.15); };
    function count(ch) {
      let sure = 0, maybe = 0;
      let away = 0;
      Object.values(S.blocs).filter(b => b.ch === ch).forEach(b => { const s = share(b); if (s >= 1) { sure += b.seats; if (b.id !== 'lla') away += b.seats * 0.04; else if (b.seats > 10) away += 0.5; } else if (s > 0) maybe += b.seats * s; });
      // The count already discounts the usual absences of allies, so it's an honest forecast
      return { sure, maybe: Math.round(maybe), exp: Math.round(sure + maybe - away) };
    }
    function vote(ch) {
      const rows = Object.values(S.blocs).filter(b => b.ch === ch).map(b => {
        // Undecided blocs vary a little around the count (about ±2 votes in total)
        const s = clamp(share(b) + (share(b) > 0 && share(b) < 1 ? rnd(-0.12, 0.12) : 0), 0, 1);
        let yes = Math.round(b.seats * s);
        // Even allies miss sessions: a few absences outside the ruling party's own bloc
        if (s >= 1 && b.id !== 'lla') for (let k = 0; k < b.seats; k++) if (Math.random() < 0.04) yes--;
        if (b.id === 'lla' && b.seats > 10 && Math.random() < 0.5) yes -= 1;
        yes = clamp(yes, 0, b.seats);
        return { b, yes, no: b.seats - yes };
      }).sort((a, b) => b.yes - a.yes || b.b.seats - a.b.seats);
      const yes = rows.reduce((a, r) => a + r.yes, 0);
      return { ch, rows, yes, need: D.chambers[ch].need, pass: yes >= D.chambers[ch].need };
    }

    function intro() {
      root.innerHTML = `<section class="jg-game is-rosca">${backBtn()}
        <div class="jg-intro"><span class="jg-kicker">Simulación</span><h2>${esc(D.title)}</h2>
          <p class="jg-role">Llevás adelante <b>${esc(D.role)}</b>.</p><p>${esc(D.intro)}</p>
          ${S.scenario ? `<div class="rs-scen"><span>Tu escenario en esta partida</span><b>${esc(S.scenario.title)}</b><p>${esc(S.scenario.text)}</p><small>Cada partida tiene un escenario y situaciones distintas.</small></div>` : ''}
          <ul class="jg-rules">
            <li>Para la media sanción necesitás <b>129 votos en Diputados</b> (el quórum) y después <b>37 en el Senado</b>.</li>
            <li>Cada semana llega una situación y podés hacer <b>una jugada</b>: negociar con un gobernador, ir a los medios o llamar a sesión.</li>
            <li>Si llamás a sesión y no hay quórum, la sesión se cae: el proyecto sigue vivo pero perdés capital político.</li>
            <li>Si hay quórum y perdés la votación, el proyecto queda rechazado y no puede volver a tratarse este año. Si no te dan los números, pedí la vuelta a comisión.</li>
            <li>Si tu capital político o tu interna con la Casa Rosada llegan a cero, perdés.</li>
            <li>Y como en la política real, en cualquier momento puede pasar algo: <b>paros, escándalos en el recinto, lágrimas en televisión</b>.</li>
          </ul>
          <button type="button" class="jg-btn is-main" data-go-design>Empezar la rosca</button>
          <p class="jg-note">${esc(D.disclaimer)}</p></div></section>`;
      wireBack(root);
      root.querySelector('[data-go-design]').addEventListener('click', design);
    }
    function frame(inner) {
      const wk = D.weeks[Math.min(S.turn, D.weeks.length - 1)] || '';
      const left = S.maxTurns - S.turn;
      const meter = ch => { const c = count(ch), need = D.chambers[ch].need, tot = D.chambers[ch].total; const done = ch === 'dip' && S.dipPassed;
        return `<div class="rs-meter${done ? ' is-done' : ''}"><div class="rs-meter-h"><b>${esc(D.chambers[ch].label)}</b><span class="rs-m-l">${done ? `Media sanción ✓ (${S.dipVotes})` : `${c.sure} seguros · ~${c.exp} probables · necesitás ${need}`}</span><span class="rs-m-s">${done ? '✓ aprobado' : `~${c.exp} de ${need}`}</span></div>
          <div class="rs-meter-bar"><span class="is-sure" style="width:${c.sure / tot * 100}%"></span><span class="is-maybe" style="width:${(c.exp - c.sure) / tot * 100}%"></span><i style="left:${need / tot * 100}%"></i></div></div>`; };
      return `<section class="jg-game is-rosca">${backBtn()}
        <div class="rs-top">
          <div class="rs-week"><span>Semana ${Math.min(S.turn + 1, S.maxTurns)} de ${S.maxTurns}</span><b>${esc(wk)}</b><small>${left > 1 ? `quedan ${left} semanas` : 'última semana'}</small></div>
          <div class="rs-stats">${STATS.map(k => `<div class="rs-stat${stat(k) <= 15 ? ' is-low' : ''}" title="${esc(D.stats[k].help)}"><span><em class="is-l">${esc(D.stats[k].label)}</em><em class="is-s">${esc(STAT_SHORT[k])}</em></span><div class="rs-stat-bar"><i style="width:${stat(k)}%"></i></div><b>${stat(k)}</b></div>`).join('')}</div>
        </div>
        <div class="rs-meters">${meter('dip')}${meter('sen')}</div>
        ${inner}
        <details class="rs-blocs"><summary>Ver los bloques uno por uno</summary>${['dip', 'sen'].map(ch => `<h5>${esc(D.chambers[ch].label)} <small>${esc(D.chambers[ch].who)}</small></h5><div class="rs-bloc-list">${Object.values(S.blocs).filter(b => b.ch === ch && b.seats > 0).sort((a, b) => b.aff - a.aff).map(b => { const s = share(b); return `<div class="rs-bloc"><i style="background:${b.color || '#888'}"></i><span>${esc(b.name)}${b.leader ? ` <small>${esc(b.leader)}</small>` : ''}</span><b>${b.seats}</b><em class="${s >= 1 ? 'is-yes' : s > 0 ? 'is-maybe' : 'is-no'}">${s >= 1 ? 'A favor' : s > 0 ? `Duda (${Math.round(s * 100)}%)` : 'En contra'}</em></div>`; }).join('')}</div>`).join('')}</details>
      </section>`;
    }
    function design() {
      const d = D.design;
      paint(`<div class="rs-card is-design"><span class="rs-who">Javier Milei · Presidente</span><h3>El proyecto</h3><p>${esc(d.q)}</p>
        <div class="jg-opts">${d.options.map((o, k) => `<button type="button" class="jg-opt" data-k="${k}">${esc(o.label)}</button>`).join('')}</div></div>`);
      wireBack(root);
      root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        const o = d.options[+b.getAttribute('data-k')]; apply(o.e); S.log.push({ t: 'Proyecto', r: o.label });
        outcome('El proyecto entra al Congreso', o.result, () => nextTurn(true), { who: 'Javier Milei · Presidente', title: 'Cómo eliminar las PASO', choice: o.label, decision: `Proyecto: ${o.label}`, result: o.result });
      }));
    }
    // Every move can be shared as its own card: the situation, what you chose and what happened
    function moveCard(m) {
      return cardShell('La rosca: PASO o no PASO', m.faran ? '#C2185B' : m.flash ? '#D62839' : '#6C3FB8', `
        <div class="jgx-kicker">Semana ${Math.min(S.turn + 1, S.maxTurns)} · ${m.flash ? (m.faran ? '✨ Mientras tanto, en la farándula' : '⚡ Último momento') : esc(m.who || 'Jefatura de Gabinete')}</div>
        <div class="jgx-title is-md${m.title.length > 48 ? ' is-sm' : ''}">${esc(m.title)}</div>
        ${m.text ? `<div class="jgx-text is-sm">${esc(m.text)}</div>` : ''}
        <div class="jgx-choice"><span>La decisión</span><b>${esc(m.choice)}</b></div>
        ${m.result ? `<div class="jgx-text is-sm"><i>${esc(m.result)}</i></div>` : ''}
        <div class="jgx-stats is-sm">${STATS.map(k => `<div class="jgx-stat"><span>${esc(D.stats[k].label)}</span><div class="jgx-stat-t"><i style="width:${stat(k)}%"></i></div><b>${stat(k)}</b></div>`).join('')}</div>`);
    }
    // No intermediate "Seguir" screen: what happened shows on top of the next step
    // What changed since the screen where the decision was taken
    function deltas() {
      const p = S.snap; if (!p) return [];
      const out = STATS.map(k => [STAT_SHORT[k], S.stats[k] - p.stats[k]]);
      return out.filter(([, v]) => v);
    }
    function outcome(title, text, then, move) {
      const decision = move ? (move.decision || move.choice) : title;
      S.last = { decision, context: move && !move.decision ? move.title : '', text, turn: S.turn, d: deltas(), card: move ? moveCard(move) : null, share: move ? `En "La rosca" del Atlas: ${move.title} → ${move.choice}. ¿Vos qué hacías?` : '' };
      const over = checkOver();
      return over ? ending(over) : then();
    }
    // No intermediate screen: the result of your last decision on top, clearly
    // separated from the new situation below it
    function paint(inner) {
      const last = S.last; S.last = null;
      let banner = '';
      if (last) {
        const chips = last.d.map(([k, v]) => `<span class="${v > 0 ? 'is-up' : 'is-down'}">${esc(k)} ${v > 0 ? '+' : '−'}${Math.abs(v)}</span>`).join('');
        banner = `<div class="rs-last" role="status">
            <div class="rs-last-body"><span class="rs-last-k">✓ Tu decisión</span>
              <b class="rs-last-dec">${esc(last.decision)}</b>${last.context ? `<small class="rs-last-ctx">ante «${esc(last.context)}»</small>` : ''}
              <p class="rs-last-res"><span>Resultado:</span> ${esc(last.text)}</p>
              ${chips ? `<div class="rs-last-chips">${chips}</div>` : ''}</div>
            ${last.card ? `<button type="button" class="rs-last-share" data-img="share" title="Compartir esta jugada como imagen">📸<span> Compartir</span></button>` : ''}
          </div>
          <div class="rs-next-k">${S.turn !== last.turn ? `Empieza la semana ${Math.min(S.turn + 1, S.maxTurns)} · nueva situación` : 'Siguiente situación'} <span aria-hidden="true">↓</span></div>`;
      }
      root.innerHTML = frame(banner + inner);
      wireBack(root);
      if (last && last.card) wireShare(root.querySelector('.rs-last'), last.share, last.card, 'rosca-jugada');
      S.snap = { stats: Object.assign({}, S.stats), dip: count('dip').exp, sen: count('sen').exp };
      toTop();
    }
    function checkOver() {
      if (S.over) return S.over;
      if (stat('capital') <= 0) return (S.over = 'fired');
      if (stat('interna') <= 0) return (S.over = 'sidelined');
      return null;
    }
    // Situations that only move deputies make no sense once Diputados already voted
    const onlyDip = ev => {
      const ks = ev.options.flatMap(o => Object.keys((o.e && o.e.blocs) || {}));
      if (ks.length > 0 && ks.every(k => k.startsWith('dip:'))) return true;
      // ...or that talk only about deputies (the PRO deputies, a deputy who switches blocs...)
      const t = `${ev.title} ${ev.text} ${ev.who || ''}`;
      return ev.phase === 'dip' || (/diputad/i.test(t) && !/senad/i.test(t));
    };
    function eligible(ev) {
      if (S.seen[ev.id]) return false;
      if (S.dipPassed && onlyDip(ev)) return false;
      if (ev.phase === 'sen' && !S.dipPassed) return false;
      if (ev.requires && !S.flags[ev.requires]) return false;
      return ev.turn <= S.turn + 1;
    }
    function nextTurn(first) {
      if (!first) S.turn++;
      if (S.turn >= S.maxTurns) return ending('time');
      S.actionDone = false;
      const due = S.events.filter(ev => eligible(ev) && !ev.random && ev.turn <= S.turn + 1);
      const rand = S.events.filter(ev => eligible(ev) && ev.random && Math.random() < 0.45);
      S.queue = due.slice(0, 2).concat(due.length < 2 ? rand.slice(0, 1) : []);
      // "Último momento": something unexpected, in the middle of the week's events
      // Events about "your" governor only show up once you've negotiated with one
      const fl = (D.flashes || []).filter(f => !S.seen['f:' + f.id] && (!f.needsGov || dealtGovs(f).length) && !(S.dipPassed && onlyDip(f)) && !(f.phase === 'sen' && !S.dipPassed));
      // Once you've made deals, half of the surprises are about those governors
      const pick = () => { const g = fl.filter(f => f.needsGov), sen = fl.filter(f => f.phase === 'sen'), r = Math.random(), pool = sen.length && r < 0.45 ? sen : g.length && r < 0.7 ? g : fl; const f = pool[Math.floor(Math.random() * pool.length)]; fl.splice(fl.indexOf(f), 1); return Object.assign({ flash: true }, f); };
      if (!first && fl.length && Math.random() < 0.7) S.queue.splice(Math.min(1, S.queue.length), 0, pick());
      if (!first && fl.length && Math.random() < 0.15) S.queue.push(pick());
      showEvent();
    }
    const FLASH = { capital: -3, imagen: -1, gain: 0.7 };
    function flashCost(e) {
      const out = { stats: Object.assign({}, e.stats || {}), blocs: {} };
      Object.entries(out.stats).forEach(([k, v]) => { if (v > 0) out.stats[k] = Math.round(v * FLASH.gain); });
      out.stats.capital = (out.stats.capital || 0) + FLASH.capital;
      out.stats.imagen = (out.stats.imagen || 0) + FLASH.imagen;
      Object.entries(e.blocs || {}).forEach(([k, v]) => { out.blocs[k] = v > 0 ? Math.round(v * FLASH.gain) : v; });
      return Object.assign({}, e, out);
    }
    // Fill {gov}/{prov} with a governor you already made a deal with
    // Governors you made a deal with (and, for each call, only those it makes sense for:
    // Cristina calls Peronists, Macri calls PRO and radicals...)
    const dealtGovs = ev => Object.keys(S.govUsed).filter(id => D.governors.some(g => g.id === id && liveBlocs(g.blocs).length && (!ev || !ev.govOrigins || ev.govOrigins.includes(g.origin))));
    function withGov(ev) {
      const ids = dealtGovs(ev); if (!ids.length) return null;
      const g = D.governors.find(x => x.id === ids[Math.floor(Math.random() * ids.length)]);
      if (!g) return null;
      const f = t => String(t || '').replace(/\{gov\}/g, g.name).replace(/\{prov\}/g, g.prov);
      return Object.assign({}, ev, { gov: g, who: f(ev.who), title: f(ev.title), text: f(ev.text),
        options: ev.options.map(o => Object.assign({}, o, { label: f(o.label), result: f(o.result) })) });
    }
    function showEvent() {
      let ev = S.queue.shift();
      if (!ev) return actions();
      if (ev.needsGov) { ev = withGov(ev); if (!ev) return showEvent(); }
      S.seen[ev.flash ? 'f:' + ev.id : ev.id] = true;
      paint(`<div class="rs-card${ev.flash ? ' is-flash' : ''}">${ev.flash ? (ev.tag === 'farandula' ? '<span class="jg-flash-tag is-faran">Mientras tanto, en la farándula</span>' : '<span class="jg-flash-tag">Último momento</span>') : ''}<span class="rs-who">${esc(ev.who)}${ev.role ? ' · ' + esc(ev.role) : ''}</span><h3>${esc(ev.title)}</h3><p>${esc(ev.text)}</p>
        <div class="jg-opts">${ev.options.map((o, k) => `<button type="button" class="jg-opt" data-k="${k}">${esc(o.label)}</button>`).join('')}</div></div>`);
      wireBack(root);
      root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        let o = ev.options[+b.getAttribute('data-k')];
        // Some answers are a gamble: half of the time they go the other way
        if (o.alt && Math.random() < 0.5) o = Object.assign({}, o, o.alt);
        // Unexpected events are real problems: whatever you choose, they cost
        // political capital, and the goodwill they buy is worth less
        const e = JSON.parse(JSON.stringify(o.e || {}));
        // "gov": how much the deal with that governor moves (his blocs)
        if (ev.gov && o.gov) { e.blocs = e.blocs || {}; liveBlocs(ev.gov.blocs).forEach(k => { e.blocs[k] = (e.blocs[k] || 0) + o.gov; }); }
        apply(ev.flash ? flashCost(e) : e); S.log.push({ t: ev.title, r: o.label, flash: !!ev.flash });
        const res = (o.result || '') + (ev.flash ? ' Igual, apagar el incendio te costó capital político.' : '');
        outcome(o.label, res, showEvent, { flash: ev.flash, faran: ev.tag === 'farandula', who: ev.who + (ev.role ? ' · ' + ev.role : ''), title: ev.title, text: ev.text, choice: o.label, result: res });
      }));
    }
    const liveBlocs = keys => keys.filter(k => !S.dipPassed || k.startsWith('sen:'));
    function actions() {
      const ch = S.dipPassed ? 'sen' : 'dip', c = count(ch), need = D.chambers[ch].need;
      // After the half-sanction only senators are still in play
      const govs = D.governors.map(g => {
        const used = S.govUsed[g.id] || 0, cost = 10 + used * 5, useful = liveBlocs(g.blocs).length > 0;
        const ok = useful && used < 2 && stat('caja') >= cost && stat('capital') >= 5 && !S.actionDone;
        const note = !useful ? 'Sus legisladores ya votaron en Diputados: no tiene senadores para ofrecer' : used >= 2 ? 'Ya negociaste dos veces' : `Cuesta ${cost} de caja${S.dipPassed ? ' · solo mueve senadores' : ''}`;
        return `<button type="button" class="rs-gov" data-gov="${g.id}"${ok ? '' : ' disabled'}><b>${esc(g.name)}</b><span>${esc(g.prov)} · ${esc(g.pitch)}</span><small>${note}</small></button>`;
      }).join('');
      paint(`<div class="rs-card is-actions"><h3>Tu jugada de la semana</h3>
        <p>${ch === 'dip' ? `En Diputados contás con ${c.sure} votos seguros y unos ${c.exp} probables. Necesitás ${need}.` : `Tenés la media sanción. En el Senado contás con ${c.sure} seguros y unos ${c.exp} probables. Necesitás ${need}.`}</p>
        <div class="rs-acts">
          ${ch === 'sen' && S.turn < (S.senOpen || 0) ? `<button type="button" class="jg-btn is-main" disabled>El Senado sesiona cuando haya dictamen (la semana que viene)</button>` : `<button type="button" class="jg-btn is-main" data-act="vote">Llamar a sesión en ${ch === 'dip' ? 'Diputados' : 'el Senado'}</button>`}
          <button type="button" class="jg-btn" data-act="media"${stat('capital') >= 4 ? '' : ' disabled'}>Ir a los medios (+imagen, −capital)</button>
          <button type="button" class="jg-btn" data-act="cede"${stat('interna') >= 6 ? '' : ' disabled'}>Ceder en el texto (+${S.dipPassed ? 'senadores radicales y de PU' : 'radicales y PU'}, −interna)</button>
          <button type="button" class="jg-btn is-ghost" data-act="pass">Esperar a la semana que viene</button>
        </div>
        <h4 class="rs-sub">O negociá con un gobernador</h4><div class="rs-govs">${govs}</div></div>`);
      wireBack(root);
      root.querySelectorAll('[data-gov]').forEach(b => b.addEventListener('click', () => {
        const g = D.governors.find(x => x.id === b.getAttribute('data-gov')), used = S.govUsed[g.id] || 0, cost = 10 + used * 5;
        const gain = Math.round(rnd(11, 19) - used * 4);
        const e = { stats: { caja: -cost, capital: -3 }, blocs: {} };
        // In the Senate each vote weighs more: the deal moves senators a bit more
        liveBlocs(g.blocs).forEach(k => { e.blocs[k] = S.dipPassed ? Math.round(gain * 1.3) : gain; });
        const before = { dip: count('dip').exp, sen: count('sen').exp };
        apply(e); S.govUsed[g.id] = used + 1; S.log.push({ t: 'Negociación', r: g.name });
        // Say exactly what was agreed and what it bought, in votes
        const blocNames = [...new Set(liveBlocs(g.blocs).map(k => S.blocs[k] && (S.dipPassed ? `${S.blocs[k].name} en el Senado` : S.blocs[k].name)).filter(Boolean))];
        const moved = ['dip', 'sen'].map(ch => { const now = count(ch).exp, was = before[ch]; return now !== was ? `${ch === 'dip' ? 'Diputados' : 'Senado'}: de ~${was} a ~${now} votos probables` : ''; }).filter(Boolean);
        const res = `Le prometiste ${g.deal || 'fondos para su provincia'} (te cuesta ${cost} de caja). ${blocNames.length ? `Se acercan al proyecto: ${blocNames.join(' y ')}.` : ''} ${moved.length ? moved.join(' · ') + '.' : 'Por ahora no se traduce en votos nuevos.'}`.replace(/\s+/g, ' ').trim();
        outcome(`Reunión con ${g.name}`, res, () => nextTurn(), { who: g.name + ' · ' + g.prov, title: `Rosca con ${g.name}`, text: g.pitch, choice: `Negociar (${cost} de caja)`, decision: `Negociar con ${g.name} (${g.prov})`, result: res });
      }));
      root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        const a = b.getAttribute('data-act');
        if (a === 'pass') return nextTurn();
        if (a === 'media') { apply({ stats: { imagen: 7, capital: -4 } }); const res = 'Pasaste por cuatro canales y dos streams. Instalaste que las PASO son "una encuesta carísima".'; return outcome('Gira de medios', res, () => nextTurn(), { title: 'Gira de medios', choice: 'Ir a los medios', decision: 'Ir a los medios', result: res }); }
        if (a === 'cede') { const cb = { 'dip:ucr': 12, 'sen:ucr': 12, 'dip:pu': 10, 'sen:pu': 10, 'dip:cc': 8 }; apply({ stats: { interna: -6 }, blocs: Object.fromEntries(liveBlocs(Object.keys(cb)).map(k => [k, cb[k]])) }); const res = 'Aceptaste plazos más largos y una cláusula de revisión. Los dialoguistas lo valoran; en la Casa Rosada, no tanto.'; return outcome('Cambios en el texto', res, () => nextTurn(), { title: 'Cambios en el texto', choice: 'Ceder en el texto', decision: 'Ceder en el texto', result: res }); }
        if (a === 'vote') return session(ch);
      }));
    }
    // A session in three steps, as in the real Congress:
    // 1) quorum: if not enough legislators sit, the session falls, there is no
    //    vote and the bill stays alive;
    // 2) with quorum you can still send the bill back to committee to save it;
    // 3) if it's voted and lost, the bill is rejected: by article 81 of the
    //    Constitution it can't be treated again this year (game over).
    function session(ch) {
      const r = vote(ch), need = D.chambers[ch].need, where = ch === 'dip' ? 'Sesión especial en Diputados' : 'Sesión en el Senado';
      // Who sits: your votes plus about half of the undecided; the opposition stays out
      const sit = r.rows.reduce((a, x) => { const sh = share(x.b); return a + x.yes + (sh > 0 && sh < 1 ? Math.round((x.b.seats - x.yes) * 0.5) : 0); }, 0);
      if (sit < need) {
        apply({ stats: { capital: -10, imagen: -4 } });
        Object.values(S.blocs).forEach(b => { if (b.ch === ch && b.aff < 50 && b.aff > -50) b.aff -= 3; });
        S.log.push({ t: where, r: `Sin quórum (${sit} de ${need})` });
        paint(`<div class="rs-card is-vote is-noq"><span class="rs-who">${where}</span><h3>Sin quórum: se cayó la sesión</h3>
          <p>Solo ${sit} legisladores se sentaron en sus bancas y hacían falta ${need} para abrir la sesión. No hubo votación: <b>el proyecto sigue vivo</b>, pero la oposición festeja y tus aliados toman distancia.</p>
          <div class="rs-tally"><div class="rs-tally-big"><b class="is-no">${sit}</b><span>sentados</span><b>/ ${need}</b><span>para el quórum</span></div></div>
          <button type="button" class="jg-btn is-main" data-next>Seguir</button></div>`);
        root.querySelector('[data-next]').addEventListener('click', () => checkOver() ? ending(S.over) : nextTurn());
        return;
      }
      const est = count(ch).exp;
      paint(`<div class="rs-card is-vote is-q"><span class="rs-who">${where}</span><h3>Hay quórum: ${sit} sentados</h3>
        <p>Se abre la sesión y la oposición entra al recinto para votar en contra. Según tu poroteo tenés <b>unos ${est} votos a favor</b> (±2) y necesitás <b>${need}</b>.</p>
        <p class="rs-warn">Ojo: el poroteo no ve los llamados de último minuto, de propios y ajenos. Si se vota y perdés, el proyecto queda rechazado y no puede volver a tratarse en las sesiones de este año (artículo 81 de la Constitución). Si no estás seguro, podés pedir que vuelva a comisión: conserva estado parlamentario y lo intentás más adelante.</p>
        <div class="rs-acts is-vote-acts">
          <button type="button" class="jg-btn is-main" data-vote="go">Votar ahora</button>
          <button type="button" class="jg-btn" data-vote="back">Pedir la vuelta a comisión</button>
        </div></div>`);
      root.querySelectorAll('[data-vote]').forEach(btn => btn.addEventListener('click', () => {
        if (btn.getAttribute('data-vote') === 'go') return result(ch, r);
        apply({ stats: { capital: -6, interna: -3 } });
        S.log.push({ t: where, r: 'Vuelta a comisión' });
        outcome('Vuelta a comisión', 'Con una moción de vuelta a comisión, el proyecto no se vota: conserva estado parlamentario y podés volver a llamar a sesión cuando tengas los votos. La oposición dice que "no te dan los números".', () => nextTurn(),
          { who: where, title: 'Hay quórum, pero no los votos', choice: 'Vuelta a comisión', decision: 'Pedir la vuelta a comisión', result: 'El proyecto conserva estado parlamentario.' });
      }));
    }
    // Last-minute calls nobody counted: a governor who asks "his" legislator to
    // leave, an ally who doesn't show up... and once in a while a surprise yes
    function lastMinute(ch, r) {
      const turned = [];
      if (Math.random() > 0.35) return turned;
      const pool = r.rows.filter(x => x.yes > 0 && x.b.id !== 'fit');
      const n = ch === 'dip' ? 1 + Math.floor(Math.random() * 2) : 1;
      const why = [
        b => `Un legislador de ${b.name} recibió un llamado de su gobernador y se levantó de la banca`,
        b => `Dos de ${b.name} se abstuvieron a último momento "por pedido de sus bases"`,
        b => `Uno de ${b.name} avisó que estaba "descompuesto" y no bajó al recinto`,
        b => `Un integrante de ${b.name} votó en contra tras una charla en un pasillo`,
        b => `Uno de ${b.name} se quedó afuera: llegó tarde por un vuelo demorado`
      ];
      for (let i = 0; i < n && pool.length; i++) {
        const x = pool[Math.floor(Math.random() * pool.length)], k = Math.floor(Math.random() * why.length);
        const lost = Math.min(x.yes, k === 1 ? 2 : 1); if (!lost) continue;
        x.yes -= lost; x.no += lost; r.yes -= lost;
        turned.push({ t: why[k](x.b), v: -lost });
      }
      // Sometimes the calls work for you: someone you didn't count votes yes
      if (Math.random() < 0.35) {
        const opp = r.rows.filter(x => x.no > 0 && x.b.id !== 'fit');
        if (opp.length) { const x = opp[Math.floor(Math.random() * opp.length)]; x.yes += 1; x.no -= 1; r.yes += 1; turned.push({ t: `Sorpresa: uno de ${x.b.name} votó a favor después de un llamado de último minuto`, v: 1 }); }
      }
      r.pass = r.yes >= r.need;
      return turned;
    }
    function result(ch, r) {
      const where = ch === 'dip' ? 'Sesión especial en Diputados' : 'Sesión en el Senado';
      const turned = lastMinute(ch, r);
      S.lastVote = r;
      const rows = r.rows.filter(x => x.b.seats > 0).map(x => `<div class="rs-vrow"><i style="background:${x.b.color || '#888'}"></i><span>${esc(x.b.name)}</span><b class="is-yes">${x.yes}</b><b class="is-no">${x.no}</b></div>`).join('');
      let title, text;
      if (r.pass && ch === 'dip') { S.dipPassed = true; S.dipVotes = r.yes; S.senOpen = S.turn + 2; apply({ stats: { capital: 8, imagen: 3 } }); title = '¡Media sanción!'; text = `Diputados aprobó el proyecto con ${r.yes} votos. Ahora va al Senado, donde necesitás 37: primero tiene que pasar por la comisión de Asuntos Constitucionales, así que la sesión recién puede ser la semana que viene.`; }
      else if (r.pass) { S.over = S.flags.lemas ? 'winLemas' : 'win'; title = '¡Es ley!'; text = `El Senado aprobó el proyecto con ${r.yes} votos.`; }
      else if (ch === 'dip') { S.over = 'rejected'; title = 'Rechazado en Diputados'; text = `Votaron ${r.yes} a favor y hacían falta ${r.need}. El proyecto quedó rechazado en la cámara de origen y no puede volver a tratarse este año.`; }
      else { S.over = 'rejectedSen'; title = 'Rechazado en el Senado'; text = `Votaron ${r.yes} a favor y hacían falta ${r.need}. El proyecto vuelve a Diputados, pero ya no hay tiempo para insistir antes de las PASO.`; }
      S.log.push({ t: where, r: `${title} (${r.yes} votos)` });
      const calls = turned.length ? `<div class="rs-calls"><b>📞 Llamados de último minuto</b><ul>${turned.map(x => `<li class="${x.v > 0 ? 'is-up' : 'is-down'}">${esc(x.t)} <em>${x.v > 0 ? '+' : '−'}${Math.abs(x.v)}</em></li>`).join('')}</ul></div>` : '';
      paint(`<div class="rs-card is-vote"><span class="rs-who">${where}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>${calls}
        <div class="rs-tally"><div class="rs-tally-big"><b class="${r.pass ? 'is-yes' : 'is-no'}">${r.yes}</b><span>a favor</span><b>/ ${r.need}</b><span>necesarios</span></div>
          <div class="rs-vrows"><div class="rs-vrow is-head"><i></i><span>Bloque</span><b>Sí</b><b>No / ausentes</b></div>${rows}</div></div>
        ${shareMini()}<button type="button" class="jg-btn is-main" data-next>${S.over ? 'Ver el final' : 'Seguir'}</button></div>`);
      const vcard = cardShell('La rosca: PASO o no PASO', r.pass ? '#1F7A5A' : '#D62839', `
        <div class="jgx-kicker">Semana ${Math.min(S.turn + 1, S.maxTurns)} · ${where}</div>
        <div class="jgx-title is-md">${esc(title)}</div>
        <div class="jgx-huge is-md"><b>${r.yes}</b><span>/ ${r.need} votos</span></div>
        <div class="jgx-vrows">${r.rows.filter(x => x.b.seats > 0).slice(0, 9).map(x => `<div><i style="background:${x.b.color || '#888'}"></i><span>${esc(x.b.name)}</span><b>${x.yes} de ${x.b.seats}</b></div>`).join('')}</div>`);
      wireShare(root.querySelector('.rs-card.is-vote'), `En "La rosca" del Atlas: ${title} (${r.yes} votos de ${r.need} necesarios). ¿Te animás?`, vcard, 'rosca-sesion');
      root.querySelector('[data-next]').addEventListener('click', () => S.over ? ending(S.over) : (checkOver() ? ending(S.over) : nextTurn()));
    }
    // The rosca: whole and crowned if you won, bitten if the rosca ate you
    const ROSCA_LINE = { win: '¡Ganaste la rosca!', winLemas: 'Ganaste la rosca… con lemas', time: 'Te comió la rosca', fired: 'La rosca te pasó por arriba', sidelined: 'Te sacaron de la rosca', rejected: 'Diputados se comió la rosca', rejectedSen: 'El Senado se comió la rosca' };
    function roscaSVG(kind, bg) {
      const win = kind === 'win' || kind === 'winLemas', id = 'r' + Math.random().toString(36).slice(2, 8);
      const fruit = [20, 75, 130, 185, 240, 295].map((a, i) => { const r = a * Math.PI / 180, x = 100 + 60 * Math.cos(r), y = 112 + 60 * Math.sin(r);
        return i % 2 ? `<rect x="${(x - 6).toFixed(1)}" y="${(y - 4).toFixed(1)}" width="12" height="8" rx="2" fill="#3E9B4F" transform="rotate(${a} ${x.toFixed(1)} ${y.toFixed(1)})"/>` : `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="#C8102E"/><circle cx="${(x - 2.5).toFixed(1)}" cy="${(y - 2.5).toFixed(1)}" r="2.2" fill="#fff" opacity=".6"/>`; }).join('');
      const bites = kind === 'fired' ? [[150, 52, 30], [176, 84, 26], [128, 38, 22], [182, 118, 20]] : [[152, 56, 24], [172, 84, 21], [132, 44, 18]];
      return `<svg viewBox="0 0 200 200" class="rs-art" role="img" aria-label="${esc(ROSCA_LINE[kind] || '')}">
        <defs><radialGradient id="g${id}" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#F2C37A"/><stop offset="1" stop-color="#C77D2E"/></radialGradient></defs>
        <ellipse cx="100" cy="182" rx="74" ry="9" fill="#000" opacity=".12"/>
        <g>
          <circle cx="100" cy="112" r="60" fill="none" stroke="url(#g${id})" stroke-width="50"/>
          <circle cx="100" cy="112" r="60" fill="none" stroke="#FFF6E2" stroke-width="16" stroke-dasharray="18 10" opacity=".85"/>
          <circle cx="100" cy="112" r="84" fill="none" stroke="#B06A22" stroke-width="2" opacity=".5"/>
          ${fruit}
        </g>
        ${win ? '' : bites.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${bg || '#fff'}"/>`).join('')}
        ${win ? `<g transform="translate(62 6)"><path d="M6 44 L0 10 L20 26 L38 0 L56 26 L76 10 L70 44 Z" fill="#F2B705" stroke="#B8860B" stroke-width="3" stroke-linejoin="round"/><circle cx="38" cy="30" r="5" fill="#C8102E"/><rect x="6" y="44" width="64" height="9" rx="3" fill="#E0A800"/></g>
          <g fill="#F2B705"><path d="M20 40 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path d="M178 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/></g>`
        : `<g fill="#C77D2E">${[[186, 50, 3], [192, 64, 2.2], [176, 30, 2.5], [196, 100, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`}
      </svg>`;
    }
    // The Congress eats the rosca (rejected in a chamber)
    function congressSVG(chamber, bg) {
      const cols = [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${42 + i * 16}" y="110" width="7" height="40" fill="#F6F1E7" stroke="#B7AD9A" stroke-width="1"/>`).join('');
      const ribs = [-24, -12, 0, 12, 24].map(dx => `<path d="M${100 + dx * 1.45} 60 Q${100 + dx * 0.6} 28 100 20" fill="none" stroke="#2F6B52" stroke-width="1.4"/>`).join('');
      return `<svg viewBox="0 0 200 200" class="rs-art" role="img" aria-label="El Congreso se comió la rosca">
        <ellipse cx="100" cy="186" rx="88" ry="8" fill="#000" opacity=".12"/>
        <rect x="18" y="150" width="164" height="32" rx="2" fill="#E6DDCB" stroke="#9E9482"/>
        <rect x="26" y="146" width="148" height="6" fill="#D8CDB6"/>
        ${cols}
        <rect x="34" y="100" width="132" height="11" fill="#EDE5D6" stroke="#9E9482"/>
        <polygon points="34,100 100,80 166,100" fill="#EDE5D6" stroke="#9E9482"/>
        <text x="100" y="96" text-anchor="middle" font-family="Georgia, serif" font-size="8.5" font-weight="700" fill="#5A5246" letter-spacing="1">${chamber === 'sen' ? 'SENADO' : 'DIPUTADOS'}</text>
        <rect x="68" y="58" width="64" height="24" fill="#E6DDCB" stroke="#9E9482"/>
        ${[0, 1, 2, 3, 4].map(i => `<rect x="${74 + i * 12}" y="63" width="5" height="14" rx="2" fill="#B7AD9A"/>`).join('')}
        <path d="M62 60 Q100 -4 138 60 Z" fill="#4E8F72" stroke="#2F6B52" stroke-width="2"/>${ribs}
        <rect x="95" y="10" width="10" height="14" fill="#4E8F72" stroke="#2F6B52"/><circle cx="100" cy="8" r="4" fill="#C9A227"/>
        <g>
          <circle cx="118" cy="168" r="15" fill="none" stroke="#D99442" stroke-width="10"/>
          <circle cx="118" cy="168" r="15" fill="none" stroke="#FFF6E2" stroke-width="3" stroke-dasharray="5 4"/>
          <circle cx="131" cy="160" r="3" fill="#C8102E"/><circle cx="127" cy="179" r="2.6" fill="#3E9B4F"/>
        </g>
        <path d="M84 184 L84 158 Q100 142 116 158 L116 184 Z" fill="#3B2F2F"/>
        <path d="M90 160 l4 6 4 -6 4 6 4 -6 4 6 4 -6" fill="none" stroke="#F6F1E7" stroke-width="2" stroke-linejoin="round"/>
        <g fill="#C77D2E"><circle cx="70" cy="178" r="2"/><circle cx="62" cy="172" r="1.6"/><circle cx="132" cy="178" r="1.8"/><circle cx="140" cy="171" r="1.4"/></g>
      </svg>`;
    }
    // The resignation, published in the Boletín Oficial and signed
    function boletinSVG() {
      const line = (y, w) => `<rect x="44" y="${y}" width="${w}" height="3" rx="1.5" fill="#C9C3B6"/>`;
      return `<svg viewBox="0 0 200 200" class="rs-art" role="img" aria-label="Boletín Oficial: decreto que acepta la renuncia">
        <g transform="rotate(-4 100 100)">
          <rect x="34" y="14" width="136" height="178" rx="2" fill="#000" opacity=".12" transform="translate(4 4)"/>
          <rect x="34" y="14" width="136" height="178" rx="2" fill="#fff" stroke="#CFC8BA"/>
          <rect x="34" y="14" width="136" height="24" fill="#1E3A5F"/>
          <text x="102" y="27" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-weight="700" fill="#fff">BOLETÍN OFICIAL</text>
          <text x="102" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.6" fill="#DCE6F2" letter-spacing=".6">DE LA REPÚBLICA ARGENTINA</text>
          <text x="44" y="52" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#1E3A5F">DECRETO 1312/2026</text>
          <text x="44" y="62" font-family="Arial, sans-serif" font-size="5" fill="#555">JEFATURA DE GABINETE DE MINISTROS</text>
          <text x="44" y="76" font-family="Georgia, serif" font-size="6.2" fill="#222">Artículo 1°.- Acéptase la renuncia</text>
          <text x="44" y="84" font-family="Georgia, serif" font-size="6.2" fill="#222">presentada a la Jefatura de</text>
          <text x="44" y="92" font-family="Georgia, serif" font-size="6.2" fill="#222">Gabinete de Ministros.</text>
          ${line(100, 112)}${line(107, 96)}${line(114, 104)}
          <text x="44" y="128" font-family="Georgia, serif" font-size="5.6" fill="#222">Art. 2°.- Comuníquese, publíquese,</text>
          <text x="44" y="135" font-family="Georgia, serif" font-size="5.6" fill="#222">dese a la Dirección Nacional del</text>
          <text x="44" y="142" font-family="Georgia, serif" font-size="5.6" fill="#222">Registro Oficial y archívese.</text>
          <path d="M96 166 C102 150 108 172 114 158 S124 150 128 164 S140 156 150 160" fill="none" stroke="#1F3A93" stroke-width="2" stroke-linecap="round"/>
          <rect x="92" y="170" width="64" height="1" fill="#555"/>
          <text x="124" y="179" text-anchor="middle" font-family="Arial, sans-serif" font-size="5.5" font-weight="700" fill="#222">MILEI</text>
          <circle cx="62" cy="168" r="13" fill="none" stroke="#B3261E" stroke-width="2" opacity=".7"/>
          <text x="62" y="170" text-anchor="middle" font-family="Arial, sans-serif" font-size="4.5" font-weight="700" fill="#B3261E" opacity=".8">ACEPTADA</text>
        </g>
      </svg>`;
    }
    const endingArt = (kind, bg) => kind === 'rejected' ? congressSVG('dip', bg) : kind === 'rejectedSen' ? congressSVG('sen', bg) : kind === 'fired' ? boletinSVG() : roscaSVG(kind, bg);
    function ending(kind) {
      const E = D.endings[kind] || D.endings.time, win = kind === 'win' || kind === 'winLemas';
      const score = win ? Math.round(stat('imagen') * 0.4 + stat('capital') * 0.3 + stat('caja') * 0.2 + (S.maxTurns - S.turn) * 4 + (S.flags.lemas ? -15 : 0)) : 0;
      const text = win ? `¡Gané la rosca! Saqué la ley sin PASO en el Atlas Político Mundial: ${score} puntos. ¿Te animás?` : `Jugué "La rosca: PASO o no PASO" en el Atlas Político Mundial y… ${(ROSCA_LINE[kind] || E.title).toLowerCase()}. ¿Te animás?`;
      const flashes = S.log.filter(l => l.flash).slice(-3);
      const card = cardShell('La rosca: PASO o no PASO', '#6C3FB8', `
        <div class="jgx-kicker">${win ? 'Lo logré' : 'Fin del juego'} · Jefatura de Gabinete${S.scenario ? ` · ${esc(S.scenario.title)}` : ''}</div>
        <div class="jgx-rosca">${endingArt(kind, '#FBF7F0')}<div><b>${esc(ROSCA_LINE[kind] || E.title)}</b><span>${esc(E.title)}</span>${win ? `<em>${score} puntos</em>` : ''}</div></div>
        <div class="jgx-text is-sm">${esc(E.text)}</div>
        <div class="jgx-stats">${STATS.map(k => `<div class="jgx-stat"><span>${esc(D.stats[k].label)}</span><div class="jgx-stat-t"><i style="width:${stat(k)}%"></i></div><b>${stat(k)}</b></div>`).join('')}</div>
        <div class="jgx-facts"><span>Diputados: <b>${S.dipPassed ? `media sanción (${S.dipVotes} votos)` : 'sin media sanción'}</b></span><span>Semanas: <b>${Math.min(S.turn + 1, S.maxTurns)} de ${S.maxTurns}</b></span></div>
        ${flashes.length ? `<div class="jgx-flashes"><span>Lo que tuve que aguantar</span>${flashes.map(l => `<b>⚡ ${esc(l.t)}</b>`).join('')}</div>` : ''}`);
      root.innerHTML = `<section class="jg-game is-rosca">${backBtn()}
        <div class="jg-result rs-end ${win ? 'is-win' : 'is-lose'}">
          <div class="rs-end-art">${endingArt(kind, getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff')}<div><span class="jg-kicker">${win ? 'Ganaste' : 'Fin del juego'}</span><h2>${esc(ROSCA_LINE[kind] || E.title)}</h2><p class="rs-end-sub">${esc(E.title)}</p></div></div><p>${esc(E.text)}</p>${S.scenario ? `<p class="rs-scen-end">Escenario: <b>${esc(S.scenario.title)}</b></p>` : ''}
          ${win ? `<div class="rs-score"><b>${score}</b><span>puntos</span></div>` : ''}
          <div class="rs-final">${STATS.map(k => `<div><span>${esc(D.stats[k].label)}</span><b>${stat(k)}</b></div>`).join('')}<div><span>Semanas usadas</span><b>${Math.min(S.turn + 1, S.maxTurns)} de ${S.maxTurns}</b></div></div>
          <h4>Tus decisiones</h4><ol class="rs-log">${S.log.map(l => `<li${l.flash ? ' class="is-flash"' : ''}><b>${l.flash ? '⚡ ' : ''}${esc(l.t)}:</b> ${esc(l.r)}</li>`).join('')}</ol>
          ${shareBox(text)}
          <button type="button" class="jg-btn is-main" data-again>Volver a jugar</button>
          ${moreGames('rosca')}
          <p class="jg-note">${esc(D.disclaimer)}</p>
        </div></section>`;
      wireBack(root); wireCopy(root); wireShare(root.querySelector('.jg-sharebox'), text, card, 'rosca', { eager: true });
      root.querySelector('[data-again]').addEventListener('click', start); wireMore(root); toTop();
    }
    return { start };
  })();

  /* ---------------------------------------------------------- 3. TRIVIA */
  const Trivia = (() => {
    let st = null;
    const pool = () => countries().filter(c => c.leader && c.leader.name && c.ideology && typeof ISO3_TO_ISO2 !== 'undefined' && ISO3_TO_ISO2[c.iso]);
    const BIG = ['ARG', 'BRA', 'CHL', 'URY', 'PRY', 'BOL', 'PER', 'COL', 'MEX', 'USA', 'CAN', 'ESP', 'FRA', 'DEU', 'ITA', 'GBR', 'PRT', 'JPN', 'CHN', 'IND', 'RUS', 'UKR', 'ISR', 'TUR', 'ZAF', 'AUS', 'KOR', 'SLV', 'ECU', 'VEN', 'CUB', 'POL', 'HUN', 'NLD', 'SWE', 'IRN', 'SAU', 'EGY', 'NGA', 'IDN'];
    const nf = (v, d = 1) => Number(v).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
    const pct = (v, d = 1) => nf(v, d) + '%';
    const signed = v => (v > 0 ? '+' : '') + pct(v);
    const lastGdp = c => { const g = c.economy && c.economy.gdpGrowth; return g && g.length ? g[g.length - 1] : null; };
    const num = v => typeof v === 'number' && isFinite(v);
    // The base writes systems and electoral methods in many ways: group them
    const sysCat = s => { s = String(s || '').toLowerCase();
      if (/junta|transici|consejo presidencial/.test(s)) return 'Gobierno militar o de transición';
      if (/partido único/.test(s)) return 'Estado de partido único';
      if (/monarqu/.test(s)) return /absoluta/.test(s) ? 'Monarquía absoluta' : 'Monarquía parlamentaria o constitucional';
      if (/autoritaria|teocr/.test(s)) return null;
      if (/semipresidencial/.test(s)) return 'República semipresidencial';
      if (/presidencial/.test(s)) return 'República presidencial';
      if (/parlamentaria/.test(s)) return 'República parlamentaria';
      return null; };
    const SYS = ['República presidencial', 'República parlamentaria', 'República semipresidencial', 'Monarquía parlamentaria o constitucional', 'Monarquía absoluta', 'Estado de partido único'];
    const methCat = s => { s = String(s || '').toLowerCase();
      if (/controlad|lista única|designad|suspendid|sin partidos/.test(s)) return null;
      if (/mixto/.test(s)) return 'Sistema mixto (distritos + listas proporcionales)';
      if (/2 vueltas|dos vueltas|doble vuelta/.test(s)) return 'Mayoría a dos vueltas en distritos uninominales';
      if (/proporcional|d'hondt|preferencial/.test(s)) return 'Representación proporcional por listas';
      if (/mayor|uninominal|fptp/.test(s)) return 'Mayoría simple en distritos uninominales';
      return null; };
    const METH = ['Representación proporcional por listas', 'Sistema mixto (distritos + listas proporcionales)', 'Mayoría simple en distritos uninominales', 'Mayoría a dos vueltas en distritos uninominales'];
    // Numeric answers: three distractors at least `gap` apart from each other and from the right one
    function numOpts(v, gap, fmt, lo = -Infinity, hi = Infinity) {
      const out = [v]; let tries = 0;
      while (out.length < 4 && tries++ < 200) {
        const cand = Math.round((v + (Math.random() < 0.5 ? -1 : 1) * gap * (1 + Math.random() * 3)) * 10) / 10;
        if (cand < lo || cand > hi) continue;
        if (out.every(x => Math.abs(x - cand) >= gap * 0.9)) out.push(cand);
      }
      if (out.length < 4) return null;
      return { opts: shuffle(out).map(fmt), ok: fmt(v) };
    }
    // Four countries of the same region (if possible) that all have the figure
    function group(c, all, has) {
      const same = shuffle(all.filter(x => x.iso !== c.iso && x.region === c.region && has(x)));
      const rest = shuffle(all.filter(x => x.iso !== c.iso && x.region !== c.region && has(x)));
      return has(c) ? [c, ...same.concat(rest).slice(0, 3)] : null;
    }
    const compare = (c, all, has, val, best, q, unit, why) => {
      const g = group(c, all, has); if (!g) return null;
      const vals = g.map(val); if (new Set(vals.map(v => v.toFixed(1))).size < 4) return null;
      const win = g[vals.indexOf(best === 'max' ? Math.max(...vals) : Math.min(...vals))];
      const opts = shuffle(g);
      return { q, opts: opts.map(o => o.name), optIso: opts.map(o => o.iso), ok: win.name,
        info: `${why}: ${g.slice().sort((a, b) => best === 'max' ? val(b) - val(a) : val(a) - val(b)).map(o => `${o.name} ${unit(val(o))}`).join(' · ')}.` };
    };
    const ideos = ['far-left', 'left', 'center-left', 'center', 'center-right', 'right', 'far-right', 'authoritarian', 'dictatorship'];
    const others = (c, all) => shuffle(all.filter(x => x.iso !== c.iso && x.region === c.region)).concat(shuffle(all.filter(x => x.iso !== c.iso && x.region !== c.region)));
    const KINDS = {
      lideres: [
        (c, all) => { const opts = shuffle([c, ...others(c, all).slice(0, 3)]); return { q: `¿Quién gobierna ${c.name}?`, flagIso: c.iso, opts: opts.map(o => o.leader.name), ok: c.leader.name, info: `${c.leader.title || 'Gobierno'}: ${c.leader.name}${c.leader.party ? ` (${c.leader.party})` : ''}.` }; },
        (c, all) => { const opts = shuffle([c, ...others(c, all).slice(0, 3)]); return { q: `${c.leader.name} gobierna…`, opts: opts.map(o => o.name), optIso: opts.map(o => o.iso), ok: c.name, info: `${c.leader.name} es ${String(c.leader.title || 'jefe de gobierno').toLowerCase()} de ${c.name}.` }; },
        (c) => { if (!c.ideology) return null; const wrong = shuffle(ideos.filter(i => i !== c.ideology)).slice(0, 3); return { q: `¿Cómo clasifica el Atlas al gobierno de ${c.leader.name} (${c.name})?`, flagIso: c.iso, opts: shuffle([c.ideology, ...wrong]).map(ideoLabel), ok: ideoLabel(c.ideology), info: `El Atlas lo ubica como ${ideoLabel(c.ideology).toLowerCase()}.` }; },
        (c) => { const y = +String(c.leader.since || '').slice(0, 4); if (!y || y < 1950) return null; const r = numOpts(y, 2, v => String(Math.round(v)), 1960, new Date().getFullYear()); if (!r) return null; return { q: `¿Desde qué año gobierna ${c.leader.name} en ${c.name}?`, flagIso: c.iso, ...r, info: `${c.leader.name} está en el cargo desde ${y}.` }; },
        (c, all) => { const women = all.filter(x => x.leader.gender === 'F'); if (!women.length) return null; const w = women[Math.floor(Math.random() * women.length)]; const men = shuffle(all.filter(x => x.leader.gender === 'M' && x.region === w.region)).concat(shuffle(all.filter(x => x.leader.gender === 'M'))).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3); const opts = shuffle([w, ...men]); return { q: '¿Cuál de estos países tiene a una mujer al frente del gobierno?', opts: opts.map(o => o.name), optIso: opts.map(o => o.iso), ok: w.name, info: `${w.leader.name} es ${String(w.leader.title || '').toLowerCase()} de ${w.name}.` }; }
      ],
      sistemas: [
        (c) => { const s = sysCat(c.system); if (!s) return null; const opts = shuffle([s, ...shuffle(SYS.filter(x => x !== s)).slice(0, 3)]); return { q: `¿Qué sistema de gobierno tiene ${c.name}?`, flagIso: c.iso, opts, ok: s, info: `${c.name}: ${c.system}.` }; },
        (c) => { const m = methCat(c.legislature && c.legislature.lower && c.legislature.lower.method); if (!m) return null; return { q: `¿Cómo se eligen los diputados (cámara baja) en ${c.name}?`, flagIso: c.iso, opts: shuffle(METH.slice()), ok: m, info: `${c.legislature.lower.name}: ${c.legislature.lower.method}, ${c.legislature.lower.seats} bancas.` }; },
        (c) => { const t = String(c.legislature && c.legislature.type || ''); const k = /^unicameral/i.test(t) ? 'Una sola cámara' : /^bicameral/i.test(t) ? 'Dos cámaras' : null; if (!k) return null; return { q: `¿El parlamento de ${c.name} tiene una o dos cámaras?`, flagIso: c.iso, opts: ['Una sola cámara', 'Dos cámaras'], ok: k, info: `${c.name}: ${t}.` }; },
        (c) => { const n = c.legislature && c.legislature.lower && c.legislature.lower.seats; if (!num(n) || n < 20) return null; const gap = Math.max(10, Math.round(n * 0.15)); const r = numOpts(n, gap, v => String(Math.round(v)), 10); if (!r) return null; return { q: `¿Cuántas bancas tiene la cámara baja de ${c.name} (${c.legislature.lower.name})?`, flagIso: c.iso, ...r, info: `${c.legislature.lower.name}: ${n} bancas, mandatos de ${c.legislature.lower.term || '—'}.` }; }
      ],
      economia: [
        (c) => { const g = lastGdp(c); if (!g || !num(g.pct)) return null; const r = numOpts(g.pct, 1.5, signed, -15, 20); if (!r) return null; return { q: `¿Cuánto creció (o cayó) la economía de ${c.name} en ${g.year}?`, flagIso: c.iso, ...r, info: `PBI de ${c.name} en ${g.year}: ${signed(g.pct)}.` }; },
        (c, all) => compare(c, all, x => lastGdp(x) && num(lastGdp(x).pct), x => lastGdp(x).pct, 'max', `¿Cuál de estos países creció más en ${(lastGdp(c) || {}).year || 'el último año'}?`, signed, 'Crecimiento del PBI'),
        (c) => { const p = c.economy && c.economy.povertyRate; if (!num(p)) return null; const r = numOpts(p, 6, v => pct(v, 0), 0, 95); if (!r) return null; return { q: `¿Qué porcentaje de la población de ${c.name} es pobre según la medición oficial más reciente?`, flagIso: c.iso, ...r, info: `Pobreza en ${c.name}: ${pct(p, 1)} (${c.economy.povertyYear}). Cada país la mide distinto.` }; },
        (c, all) => compare(c, all, x => num(x.economy && x.economy.hdi), x => x.economy.hdi, 'max', '¿Cuál de estos países tiene el Índice de Desarrollo Humano más alto?', v => nf(v, 3), 'IDH'),
        (c, all) => compare(c, all, x => num(x.economy && x.economy.gini), x => x.economy.gini, 'max', '¿Cuál de estos países es más desigual (índice de Gini más alto)?', v => nf(v, 1), 'Gini'),
        (c, all) => compare(c, all, x => num(x.economy && x.economy.publicDebt), x => x.economy.publicDebt, 'max', '¿Cuál de estos países tiene más deuda pública en relación con su PBI?', v => pct(v, 0), 'Deuda pública (% del PBI)'),
        (c, all) => compare(c, all, x => num(x.economy && x.economy.taxBurden), x => x.economy.taxBurden, 'max', '¿En cuál de estos países se pagan más impuestos (presión fiscal)?', v => pct(v, 0), 'Presión fiscal (% del PBI)'),
        (c, all) => compare(c, all, x => num(x.economy && x.economy.pressFreedom), x => x.economy.pressFreedom, 'max', '¿Cuál de estos países tiene más libertad de prensa?', v => nf(v, 1), 'Índice de RSF')
      ],
      elecciones: [
        (c) => { const t = c.lastElection && c.lastElection.turnout; if (!num(t) || t < 15) return null; const r = numOpts(t, 8, v => pct(v, 0), 10, 99); if (!r) return null; return { q: `¿Qué participación tuvo la última elección de ${c.name} (${c.lastElection.year})?`, flagIso: c.iso, ...r, info: `${c.lastElection.type} (${c.lastElection.year}): votó el ${pct(t)} del padrón.` }; },
        (c) => { const y = c.nextElection && +c.nextElection.year; const now = new Date().getFullYear(); if (!y || y < now) return null; const opts = shuffle([y, ...shuffle([y - 1, y + 1, y + 2, y + 3].filter(v => v >= now)).slice(0, 3)]); if (opts.length < 3) return null; return { q: `¿En qué año es la próxima elección nacional en ${c.name}?`, flagIso: c.iso, opts: opts.map(String), ok: String(y), info: `${c.nextElection.type}.` }; },
        (c) => { const r0 = c.lastElection && c.lastElection.results; if (!r0 || r0.length < 2) return null; const top = r0.slice().sort((a, b) => b.pct - a.pct); const opts = shuffle(top.slice(0, 4).map(x => x.party)); if (opts.length < 3) return null; return { q: `¿Quién ganó la última elección en ${c.name} (${c.lastElection.year})?`, flagIso: c.iso, opts, ok: top[0].party, info: `${top.slice(0, 3).map(x => `${x.party} ${pct(x.pct)}`).join(' · ')}.` }; }
      ]
    };
    const CAT_LABEL = { lideres: 'Líderes', sistemas: 'Sistemas políticos', economia: 'Economía', elecciones: 'Elecciones' };
    // 10 questions: 3 on leaders, 2 on systems, 3 on the economy, 2 on elections
    const PLAN = ['lideres', 'lideres', 'lideres', 'sistemas', 'sistemas', 'economia', 'economia', 'economia', 'elecciones', 'elecciones'];
    function makeQ(cat, all, used) {
      for (let t = 0; t < 40; t++) {
        const big = all.filter(c => BIG.includes(c.iso) && !used.has(c.iso));
        const src = Math.random() < 0.7 && big.length ? big : all.filter(c => !used.has(c.iso));
        const c = src[Math.floor(Math.random() * src.length)];
        const fns = KINDS[cat], fn = fns[Math.floor(Math.random() * fns.length)];
        let Q = null; try { Q = fn(c, all); } catch (e) { Q = null; }
        if (Q && Q.opts && Q.opts.includes(Q.ok) && new Set(Q.opts).size === Q.opts.length) { used.add(c.iso); Q.cat = CAT_LABEL[cat]; return Q; }
      }
      return null;
    }
    function start() {
      const all = pool();
      const used = new Set();
      st = { qs: shuffle(PLAN).map(cat => makeQ(cat, all, used)).filter(Boolean), i: 0, ok: 0, answered: false, res: [] };
      q();
    }
    function q() {
      const Q = st.qs[st.i], n = st.qs.length;
      root.innerHTML = `<section class="jg-game is-trivia">${backBtn()}
        <div class="jg-progress"><span style="width:${st.i / n * 100}%"></span></div>
        <div class="jg-qnum">Pregunta ${st.i + 1} de ${n} · ${st.ok} correctas${Q.cat ? ` · <span class="tv-cat">${esc(Q.cat)}</span>` : ''}</div>
        ${Q.flagIso ? `<div class="tv-flag">${flag(Q.flagIso, 'fi-lg')}</div>` : ''}
        <h3 class="jg-q">${esc(Q.q)}</h3>
        <div class="jg-opts is-grid">${Q.opts.map((o, k) => `<button type="button" class="jg-opt" data-k="${k}">${Q.optIso ? flag(Q.optIso[k]) + ' ' : ''}${esc(o)}</button>`).join('')}</div>
        <div class="tv-info" hidden></div></section>`;
      wireBack(root); toTop();
      root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        if (st.answered) return; st.answered = true;
        const pick = Q.opts[+b.getAttribute('data-k')], good = pick === Q.ok;
        if (good) st.ok++; st.res[st.i] = good;
        root.querySelectorAll('[data-k]').forEach(x => { const v = Q.opts[+x.getAttribute('data-k')]; x.classList.add(v === Q.ok ? 'is-ok' : x === b ? 'is-bad' : 'is-dim'); x.disabled = true; });
        const info = root.querySelector('.tv-info'); info.hidden = false;
        info.innerHTML = `<b>${good ? '¡Bien!' : 'No.'}</b> ${esc(Q.info)} <button type="button" class="jg-btn is-main" data-next>${st.i + 1 < st.qs.length ? 'Siguiente' : 'Ver resultado'}</button>`;
        info.querySelector('[data-next]').addEventListener('click', () => { st.i++; st.answered = false; st.i < st.qs.length ? q() : end(); });
      }));
    }
    function end() {
      const n = st.qs.length, ok = st.ok;
      const verdict = ok >= 9 ? 'Nivel canciller' : ok >= 7 ? 'Analista internacional' : ok >= 5 ? 'Lector de diarios' : ok >= 3 ? 'Turista político' : 'Recién llegado';
      const text = `Saqué ${ok} de ${n} en "¿Quién gobierna?" del Atlas Político Mundial: ${verdict}. ¿Cuántas sacás vos?`;
      const card = cardShell('¿Quién gobierna?', '#D9822B', `
        <div class="jgx-kicker">Trivia del Atlas · líderes, sistemas, economía y elecciones</div>
        <div class="jgx-huge"><b>${ok}</b><span>/ ${n}</span></div>
        <div class="jgx-title is-md">${esc(verdict)}</div>
        <div class="jgx-dots">${st.res.map(r => `<i class="${r ? 'is-ok' : 'is-bad'}">${r ? '✓' : '✗'}</i>`).join('')}</div>
        <div class="jgx-text">Líderes, sistemas electorales, economía y elecciones de 197 países, con los datos del Atlas.</div>`);
      root.innerHTML = `<section class="jg-game is-trivia">${backBtn()}
        <div class="jg-result"><span class="jg-kicker">Resultado</span><h2>${ok} de ${n}: <em>${esc(verdict)}</em></h2>
          <p>Las respuestas salen de la base del Atlas, que se actualiza con cada elección.</p>
          ${shareBox(text)}<button type="button" class="jg-btn is-main" data-again>Otra ronda</button>${moreGames('trivia')}</div></section>`;
      wireBack(root); wireCopy(root); wireShare(root.querySelector('.jg-sharebox'), text, card, 'trivia', { eager: true });
      root.querySelector('[data-again]').addEventListener('click', start); wireMore(root); toTop();
    }
    return { start };
  })();

  window.AtlasJuegos = {
    render(el, game) { root = el; game ? go(game) : (root.querySelector('.jg-game, .jg-hub') ? null : hub()); }
  };
})();
