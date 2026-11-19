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
  const backBtn = () => `<button type="button" class="jg-back" data-back>← Todos los juegos</button>`;
  const wireBack = el => el.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => go('hub')));

  /* ---------------------------------------------------------- 1. ¿QUÉ PAÍS GOBERNARÍAS? */
  const Pais = (() => {
    let D = null, st = null;
    async function start() {
      root.innerHTML = '<div class="jg-loading">Cargando…</div>';
      try { D = D || await getJSON('data/juegos/pais.json'); } catch (e) { root.innerHTML = '<div class="jg-loading">No se pudo cargar el juego.</div>'; return; }
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
        <div class="jg-opts">${Q.options.map((o, k) => `<button type="button" class="jg-opt" data-k="${k}">${esc(o.t)}</button>`).join('')}</div>
        ${st.i ? '<button type="button" class="jg-link" data-prev>← Volver a la anterior</button>' : ''}</section>`;
      wireBack(root);
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
        <div class="jgx-flag">${flag(top.iso)}</div>
        <div class="jgx-title${C.name.length > 16 ? ' is-long' : ''}">${esc(C.name)}</div>
        <div class="jgx-big"><b>${top.sim}%</b> de coincidencia</div>
        ${C.leader && C.leader.name ? `<div class="jgx-sub">${esc(C.leader.title || 'Gobierno')}: <b>${esc(C.leader.name)}</b></div>` : ''}
        <div class="jgx-axes">${me.map((v, i) => { const ax = D.axes[axes[i]]; return `<div class="jgx-ax"><div class="jgx-ax-h">${esc(ax.label)}</div><div class="jgx-ax-row"><span>${esc(ax.neg)}</span><div class="jgx-ax-t"><i style="left:${(4 + (v + 2) / 4 * 92).toFixed(1)}%"></i></div><span>${esc(ax.pos)}</span></div></div>`; }).join('')}</div>
        <div class="jgx-also"><span>También me parezco a</span>${ranked.slice(1, 4).map(r => { const c = byIso(r.iso) || { name: r.iso }; return `<b>${flag(r.iso)} ${esc(c.name)}</b>`; }).join('')}</div>`);
      root.innerHTML = `<section class="jg-game is-pais">${backBtn()}
        <div class="jg-result">
          <span class="jg-kicker">Tu resultado</span>
          <h2>Gobernarías como <em>${esc(C.name)}</em></h2>
          <div class="jg-match">
            <div class="jg-match-flag">${flag(top.iso, 'fi-lg')}</div>
            <div><div class="jg-match-sim"><b>${top.sim}%</b> de coincidencia</div>
              <div class="jg-match-who">${esc((C.leader && C.leader.title) || 'Gobierno')}: <b>${esc((C.leader && C.leader.name) || '')}</b>${C.leader && C.leader.party ? ` (${esc(C.leader.party)})` : ''}</div>
              <div class="jg-match-ideo">${esc(ideoLabel(C.ideology))}${C.system ? ' · ' + esc(C.system) : ''}</div>
              ${byIso(top.iso) ? `<button type="button" class="jg-link" data-ficha="${top.iso}">Ver la ficha de ${esc(C.name)} en el Atlas →</button>` : ''}</div>
          </div>
          <div class="jg-also"><b>También te parecés a:</b> ${ranked.slice(1, 4).map(r => { const c = byIso(r.iso) || { name: r.iso }; return `<span>${flag(r.iso)} ${esc(c.name)} <small>${r.sim}%</small></span>`; }).join('')}</div>
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
          <button type="button" class="jg-btn" data-again>Jugar de nuevo</button>
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
      root.querySelector('[data-again]').addEventListener('click', start);
      const f = root.querySelector('[data-ficha]'); if (f) f.addEventListener('click', () => window.__fichaFull && window.__fichaFull(f.getAttribute('data-ficha')));
    }
    return { start };
  })();

  /* ---------------------------------------------------------- 2. LA ROSCA */
  const Rosca = (() => {
    let D = null, S = null;
    const STATS = ['capital', 'imagen', 'caja', 'interna'];
    async function start() {
      root.innerHTML = '<div class="jg-loading">Cargando…</div>';
      try { D = D || await getJSON('data/juegos/rosca.json'); } catch (e) { root.innerHTML = '<div class="jg-loading">No se pudo cargar el juego.</div>'; return; }
      const blocs = {};
      ['dip', 'sen'].forEach(ch => D.chambers[ch].blocs.forEach(b => { blocs[ch + ':' + b.id] = Object.assign({ ch }, b); }));
      S = { turn: 0, maxTurns: D.turns, stats: Object.fromEntries(STATS.map(k => [k, D.stats[k].start])), blocs, flags: {}, seen: {}, queue: [], log: [], dipPassed: false, dipVotes: null, govUsed: {}, actionDone: false, over: null, lastVote: null };
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
      Object.values(S.blocs).filter(b => b.ch === ch).forEach(b => { const s = share(b); if (s >= 1) sure += b.seats; else if (s > 0) maybe += b.seats * s; });
      return { sure, maybe: Math.round(maybe), exp: Math.round(sure + maybe) };
    }
    function vote(ch) {
      const rows = Object.values(S.blocs).filter(b => b.ch === ch).map(b => {
        const s = clamp(share(b) + (share(b) > 0 && share(b) < 1 ? rnd(-0.25, 0.25) : 0), 0, 1);
        let yes = Math.round(b.seats * s); if (b.seats > 3 && s > 0 && s < 1) yes = clamp(yes + Math.round(rnd(-1, 1)), 0, b.seats);
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
          <ul class="jg-rules">
            <li>Para la media sanción necesitás <b>129 votos en Diputados</b> (el quórum) y después <b>37 en el Senado</b>.</li>
            <li>Cada semana llega una situación y podés hacer <b>una jugada</b>: negociar con un gobernador, ir a los medios o llamar a sesión.</li>
            <li>Si llamás a sesión sin los votos, la sesión se cae y perdés capital político.</li>
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
        return `<div class="rs-meter${done ? ' is-done' : ''}"><div class="rs-meter-h"><b>${esc(D.chambers[ch].label)}</b><span>${done ? `Media sanción ✓ (${S.dipVotes})` : `${c.sure} seguros · ~${c.exp} probables · necesitás ${need}`}</span></div>
          <div class="rs-meter-bar"><span class="is-sure" style="width:${c.sure / tot * 100}%"></span><span class="is-maybe" style="width:${(c.exp - c.sure) / tot * 100}%"></span><i style="left:${need / tot * 100}%"></i></div></div>`; };
      return `<section class="jg-game is-rosca">${backBtn()}
        <div class="rs-top">
          <div class="rs-week"><span>Semana ${Math.min(S.turn + 1, S.maxTurns)} de ${S.maxTurns}</span><b>${esc(wk)}</b><small>${left > 1 ? `quedan ${left} semanas` : 'última semana'}</small></div>
          <div class="rs-stats">${STATS.map(k => `<div class="rs-stat${stat(k) <= 15 ? ' is-low' : ''}" title="${esc(D.stats[k].help)}"><span>${esc(D.stats[k].label)}</span><div class="rs-stat-bar"><i style="width:${stat(k)}%"></i></div><b>${stat(k)}</b></div>`).join('')}</div>
        </div>
        <div class="rs-meters">${meter('dip')}${meter('sen')}</div>
        ${inner}
        <details class="rs-blocs"><summary>Ver los bloques uno por uno</summary>${['dip', 'sen'].map(ch => `<h5>${esc(D.chambers[ch].label)} <small>${esc(D.chambers[ch].who)}</small></h5><div class="rs-bloc-list">${Object.values(S.blocs).filter(b => b.ch === ch && b.seats > 0).sort((a, b) => b.aff - a.aff).map(b => { const s = share(b); return `<div class="rs-bloc"><i style="background:${b.color || '#888'}"></i><span>${esc(b.name)}${b.leader ? ` <small>${esc(b.leader)}</small>` : ''}</span><b>${b.seats}</b><em class="${s >= 1 ? 'is-yes' : s > 0 ? 'is-maybe' : 'is-no'}">${s >= 1 ? 'A favor' : s > 0 ? `Duda (${Math.round(s * 100)}%)` : 'En contra'}</em></div>`; }).join('')}</div>`).join('')}</details>
      </section>`;
    }
    function design() {
      const d = D.design;
      root.innerHTML = frame(`<div class="rs-card is-design"><span class="rs-who">Javier Milei · Presidente</span><h3>El proyecto</h3><p>${esc(d.q)}</p>
        <div class="jg-opts">${d.options.map((o, k) => `<button type="button" class="jg-opt" data-k="${k}">${esc(o.label)}</button>`).join('')}</div></div>`);
      wireBack(root);
      root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        const o = d.options[+b.getAttribute('data-k')]; apply(o.e); S.log.push({ t: 'Proyecto', r: o.label });
        outcome('El proyecto entra al Congreso', o.result, () => nextTurn(true), { who: 'Javier Milei · Presidente', title: 'Cómo eliminar las PASO', choice: o.label, result: o.result });
      }));
    }
    // Every move can be shared as its own card: the situation, what you chose and what happened
    function moveCard(m) {
      return cardShell('La rosca: PASO o no PASO', m.flash ? '#D62839' : '#6C3FB8', `
        <div class="jgx-kicker">Semana ${Math.min(S.turn + 1, S.maxTurns)} · ${m.flash ? '⚡ Último momento' : esc(m.who || 'Jefatura de Gabinete')}</div>
        <div class="jgx-title is-md${m.title.length > 48 ? ' is-sm' : ''}">${esc(m.title)}</div>
        ${m.text ? `<div class="jgx-text is-sm">${esc(m.text)}</div>` : ''}
        <div class="jgx-choice"><span>La decisión</span><b>${esc(m.choice)}</b></div>
        ${m.result ? `<div class="jgx-text is-sm"><i>${esc(m.result)}</i></div>` : ''}
        <div class="jgx-stats is-sm">${STATS.map(k => `<div class="jgx-stat"><span>${esc(D.stats[k].label)}</span><div class="jgx-stat-t"><i style="width:${stat(k)}%"></i></div><b>${stat(k)}</b></div>`).join('')}</div>`);
    }
    function outcome(title, text, then, move) {
      const over = checkOver();
      root.innerHTML = frame(`<div class="rs-card is-outcome"><h3>${esc(title)}</h3><p>${esc(text)}</p>${move ? shareMini() : ''}<button type="button" class="jg-btn is-main" data-next>${over ? 'Ver el final' : 'Seguir'}</button></div>`);
      wireBack(root);
      if (move) wireShare(root, `En "La rosca" del Atlas: ${move.title} → ${move.choice}. ¿Vos qué hacías?`, moveCard(move), 'rosca-jugada');
      root.querySelector('[data-next]').addEventListener('click', () => over ? ending(over) : then());
    }
    function checkOver() {
      if (S.over) return S.over;
      if (stat('capital') <= 0) return (S.over = 'fired');
      if (stat('interna') <= 0) return (S.over = 'sidelined');
      return null;
    }
    function eligible(ev) {
      if (S.seen[ev.id]) return false;
      if (ev.requires && !S.flags[ev.requires]) return false;
      return ev.turn <= S.turn + 1;
    }
    function nextTurn(first) {
      if (!first) S.turn++;
      if (S.turn >= S.maxTurns) return ending('time');
      S.actionDone = false;
      const due = D.events.filter(ev => eligible(ev) && !ev.random && ev.turn <= S.turn + 1);
      const rand = D.events.filter(ev => eligible(ev) && ev.random && Math.random() < 0.45);
      S.queue = due.slice(0, 2).concat(due.length < 2 ? rand.slice(0, 1) : []);
      // "Último momento": something unexpected, in the middle of the week's events
      const fl = (D.flashes || []).filter(f => !S.seen['f:' + f.id]);
      if (!first && fl.length && Math.random() < 0.6) S.queue.splice(Math.min(1, S.queue.length), 0, Object.assign({ flash: true }, fl[Math.floor(Math.random() * fl.length)]));
      showEvent();
    }
    const FLASH = { capital: -5, imagen: -2, gain: 0.6 };
    function flashCost(e) {
      const out = { stats: Object.assign({}, e.stats || {}), blocs: {} };
      Object.entries(out.stats).forEach(([k, v]) => { if (v > 0) out.stats[k] = Math.round(v * FLASH.gain); });
      out.stats.capital = (out.stats.capital || 0) + FLASH.capital;
      out.stats.imagen = (out.stats.imagen || 0) + FLASH.imagen;
      Object.entries(e.blocs || {}).forEach(([k, v]) => { out.blocs[k] = v > 0 ? Math.round(v * FLASH.gain) : v; });
      return Object.assign({}, e, out);
    }
    function showEvent() {
      const ev = S.queue.shift();
      if (!ev) return actions();
      S.seen[ev.flash ? 'f:' + ev.id : ev.id] = true;
      root.innerHTML = frame(`<div class="rs-card${ev.flash ? ' is-flash' : ''}">${ev.flash ? '<span class="jg-flash-tag">Último momento</span>' : ''}<span class="rs-who">${esc(ev.who)}${ev.role ? ' · ' + esc(ev.role) : ''}</span><h3>${esc(ev.title)}</h3><p>${esc(ev.text)}</p>
        <div class="jg-opts">${ev.options.map((o, k) => `<button type="button" class="jg-opt" data-k="${k}">${esc(o.label)}</button>`).join('')}</div></div>`);
      wireBack(root);
      root.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        const o = ev.options[+b.getAttribute('data-k')];
        // Unexpected events are real problems: whatever you choose, they cost
        // political capital, and the goodwill they buy is worth less
        apply(ev.flash ? flashCost(o.e) : o.e); S.log.push({ t: ev.title, r: o.label, flash: !!ev.flash });
        const res = (o.result || '') + (ev.flash ? ' Igual, apagar el incendio te costó capital político.' : '');
        outcome(o.label, res, showEvent, { flash: ev.flash, who: ev.who + (ev.role ? ' · ' + ev.role : ''), title: ev.title, text: ev.text, choice: o.label, result: res });
      }));
    }
    function actions() {
      const ch = S.dipPassed ? 'sen' : 'dip', c = count(ch), need = D.chambers[ch].need;
      const govs = D.governors.map(g => {
        const used = S.govUsed[g.id] || 0, cost = 10 + used * 5;
        const ok = used < 2 && stat('caja') >= cost && stat('capital') >= 5 && !S.actionDone;
        return `<button type="button" class="rs-gov" data-gov="${g.id}"${ok ? '' : ' disabled'}><b>${esc(g.name)}</b><span>${esc(g.prov)} · ${esc(g.pitch)}</span><small>${used >= 2 ? 'Ya negociaste dos veces' : `Cuesta ${cost} de caja`}</small></button>`;
      }).join('');
      root.innerHTML = frame(`<div class="rs-card is-actions"><h3>Tu jugada de la semana</h3>
        <p>${ch === 'dip' ? `En Diputados contás con ${c.sure} votos seguros y unos ${c.exp} probables. Necesitás ${need}.` : `Tenés la media sanción. En el Senado contás con ${c.sure} seguros y unos ${c.exp} probables. Necesitás ${need}.`}</p>
        <div class="rs-acts">
          ${ch === 'sen' && S.turn < (S.senOpen || 0) ? `<button type="button" class="jg-btn is-main" disabled>El Senado sesiona cuando haya dictamen (la semana que viene)</button>` : `<button type="button" class="jg-btn is-main" data-act="vote">Llamar a sesión en ${ch === 'dip' ? 'Diputados' : 'el Senado'}</button>`}
          <button type="button" class="jg-btn" data-act="media"${stat('capital') >= 4 ? '' : ' disabled'}>Ir a los medios (+imagen, −capital)</button>
          <button type="button" class="jg-btn" data-act="cede"${stat('interna') >= 6 ? '' : ' disabled'}>Ceder en el texto (+radicales y PU, −interna)</button>
          <button type="button" class="jg-btn is-ghost" data-act="pass">Esperar a la semana que viene</button>
        </div>
        <h4 class="rs-sub">O negociá con un gobernador</h4><div class="rs-govs">${govs}</div></div>`);
      wireBack(root);
      root.querySelectorAll('[data-gov]').forEach(b => b.addEventListener('click', () => {
        const g = D.governors.find(x => x.id === b.getAttribute('data-gov')), used = S.govUsed[g.id] || 0, cost = 10 + used * 5;
        const gain = Math.round(rnd(11, 19) - used * 4);
        const e = { stats: { caja: -cost, capital: -3 }, blocs: {} };
        g.blocs.forEach(k => { e.blocs[k] = gain; });
        apply(e); S.govUsed[g.id] = used + 1; S.log.push({ t: 'Negociación', r: g.name });
        const res = `${g.name} se lleva lo suyo para ${g.prov}. Sus legisladores se acercan al proyecto (+${gain}).`;
        outcome(`Reunión con ${g.name}`, res, () => nextTurn(), { who: g.name + ' · ' + g.prov, title: `Rosca con ${g.name}`, text: g.pitch, choice: `Negociar (${cost} de caja)`, result: res });
      }));
      root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        const a = b.getAttribute('data-act');
        if (a === 'pass') return nextTurn();
        if (a === 'media') { apply({ stats: { imagen: 7, capital: -4 } }); const res = 'Pasaste por cuatro canales y dos streams. Instalaste que las PASO son "una encuesta carísima".'; return outcome('Gira de medios', res, () => nextTurn(), { title: 'Gira de medios', choice: 'Ir a los medios', result: res }); }
        if (a === 'cede') { apply({ stats: { interna: -6 }, blocs: { 'dip:ucr': 12, 'sen:ucr': 12, 'dip:pu': 10, 'sen:pu': 10, 'dip:cc': 8 } }); const res = 'Aceptaste plazos más largos y una cláusula de revisión. Los dialoguistas lo valoran; en la Casa Rosada, no tanto.'; return outcome('Cambios en el texto', res, () => nextTurn(), { title: 'Cambios en el texto', choice: 'Ceder en el texto', result: res }); }
        if (a === 'vote') return session(ch);
      }));
    }
    function session(ch) {
      const r = vote(ch); S.lastVote = r;
      const rows = r.rows.filter(x => x.b.seats > 0).map(x => `<div class="rs-vrow"><i style="background:${x.b.color || '#888'}"></i><span>${esc(x.b.name)}</span><b class="is-yes">${x.yes}</b><b class="is-no">${x.no}</b></div>`).join('');
      let title, text;
      if (r.pass && ch === 'dip') { S.dipPassed = true; S.dipVotes = r.yes; S.senOpen = S.turn + 2; apply({ stats: { capital: 8, imagen: 3 } }); title = '¡Media sanción!'; text = `Diputados aprobó el proyecto con ${r.yes} votos. Ahora va al Senado, donde necesitás 37: primero tiene que pasar por la comisión de Asuntos Constitucionales, así que la sesión recién puede ser la semana que viene.`; }
      else if (r.pass) { S.over = S.flags.lemas ? 'winLemas' : 'win'; title = '¡Es ley!'; text = `El Senado aprobó el proyecto con ${r.yes} votos.`; }
      else { apply({ stats: { capital: -15, imagen: -5 } }); Object.values(S.blocs).forEach(b => { if (b.ch === ch && b.aff < 50 && b.aff > -50) b.aff -= 3; }); title = 'Se cayó la sesión'; text = `Solo ${r.yes} se sentaron a favor: no hubo quórum (hacían falta ${r.need}). La oposición festeja y tus aliados toman distancia.`; }
      root.innerHTML = frame(`<div class="rs-card is-vote"><span class="rs-who">${ch === 'dip' ? 'Sesión especial en Diputados' : 'Sesión en el Senado'}</span><h3>${esc(title)}</h3><p>${esc(text)}</p>
        <div class="rs-tally"><div class="rs-tally-big"><b class="is-yes">${r.yes}</b><span>a favor</span><b>/ ${r.need}</b><span>necesarios</span></div>
          <div class="rs-vrows"><div class="rs-vrow is-head"><i></i><span>Bloque</span><b>Sí</b><b>No / ausentes</b></div>${rows}</div></div>
        ${shareMini()}<button type="button" class="jg-btn is-main" data-next>${S.over ? 'Ver el final' : 'Seguir'}</button></div>`);
      wireBack(root);
      const vcard = cardShell('La rosca: PASO o no PASO', r.pass ? '#1F7A5A' : '#D62839', `
        <div class="jgx-kicker">Semana ${Math.min(S.turn + 1, S.maxTurns)} · ${ch === 'dip' ? 'Sesión especial en Diputados' : 'Sesión en el Senado'}</div>
        <div class="jgx-title is-md">${esc(title)}</div>
        <div class="jgx-huge is-md"><b>${r.yes}</b><span>/ ${r.need} votos</span></div>
        <div class="jgx-vrows">${r.rows.filter(x => x.b.seats > 0).slice(0, 9).map(x => `<div><i style="background:${x.b.color || '#888'}"></i><span>${esc(x.b.name)}</span><b>${x.yes} de ${x.b.seats}</b></div>`).join('')}</div>`);
      wireShare(root, `En "La rosca" del Atlas: ${title} (${r.yes} votos de ${r.need} necesarios). ¿Te animás?`, vcard, 'rosca-sesion');
      root.querySelector('[data-next]').addEventListener('click', () => S.over ? ending(S.over) : (checkOver() ? ending(S.over) : nextTurn()));
    }
    function ending(kind) {
      const E = D.endings[kind] || D.endings.time, win = kind === 'win' || kind === 'winLemas';
      const score = win ? Math.round(stat('imagen') * 0.4 + stat('capital') * 0.3 + stat('caja') * 0.2 + (S.maxTurns - S.turn) * 4 + (S.flags.lemas ? -15 : 0)) : 0;
      const text = win ? `Saqué la ley sin PASO en "La rosca" del Atlas Político Mundial: ${score} puntos. ¿Te animás?` : `Jugué "La rosca: PASO o no PASO" en el Atlas Político Mundial y… ${E.title.toLowerCase()}. ¿Te animás?`;
      const flashes = S.log.filter(l => l.flash).slice(-3);
      const card = cardShell('La rosca: PASO o no PASO', '#6C3FB8', `
        <div class="jgx-kicker">${win ? 'Lo logré' : 'Fin del juego'} · Jefatura de Gabinete</div>
        <div class="jgx-title is-md">${esc(E.title)}</div>
        ${win ? `<div class="jgx-score"><b>${score}</b><span>puntos</span></div>` : ''}
        <div class="jgx-text">${esc(E.text)}</div>
        <div class="jgx-stats">${STATS.map(k => `<div class="jgx-stat"><span>${esc(D.stats[k].label)}</span><div class="jgx-stat-t"><i style="width:${stat(k)}%"></i></div><b>${stat(k)}</b></div>`).join('')}</div>
        <div class="jgx-facts"><span>Diputados: <b>${S.dipPassed ? `media sanción (${S.dipVotes} votos)` : 'sin media sanción'}</b></span><span>Semanas: <b>${Math.min(S.turn + 1, S.maxTurns)} de ${S.maxTurns}</b></span></div>
        ${flashes.length ? `<div class="jgx-flashes"><span>Lo que tuve que aguantar</span>${flashes.map(l => `<b>⚡ ${esc(l.t)}</b>`).join('')}</div>` : ''}`);
      root.innerHTML = `<section class="jg-game is-rosca">${backBtn()}
        <div class="jg-result rs-end ${win ? 'is-win' : 'is-lose'}">
          <span class="jg-kicker">${win ? 'Ganaste' : 'Fin del juego'}</span><h2>${esc(E.title)}</h2><p>${esc(E.text)}</p>
          ${win ? `<div class="rs-score"><b>${score}</b><span>puntos</span></div>` : ''}
          <div class="rs-final">${STATS.map(k => `<div><span>${esc(D.stats[k].label)}</span><b>${stat(k)}</b></div>`).join('')}<div><span>Semanas usadas</span><b>${Math.min(S.turn + 1, S.maxTurns)} de ${S.maxTurns}</b></div></div>
          <h4>Tus decisiones</h4><ol class="rs-log">${S.log.map(l => `<li${l.flash ? ' class="is-flash"' : ''}><b>${l.flash ? '⚡ ' : ''}${esc(l.t)}:</b> ${esc(l.r)}</li>`).join('')}</ol>
          ${shareBox(text)}
          <button type="button" class="jg-btn is-main" data-again>Volver a jugar</button>
          <p class="jg-note">${esc(D.disclaimer)}</p>
        </div></section>`;
      wireBack(root); wireCopy(root); wireShare(root.querySelector('.jg-sharebox'), text, card, 'rosca', { eager: true });
      root.querySelector('[data-again]').addEventListener('click', start);
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
      wireBack(root);
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
          ${shareBox(text)}<button type="button" class="jg-btn is-main" data-again>Otra ronda</button></div></section>`;
      wireBack(root); wireCopy(root); wireShare(root.querySelector('.jg-sharebox'), text, card, 'trivia', { eager: true });
      root.querySelector('[data-again]').addEventListener('click', start);
    }
    return { start };
  })();

  window.AtlasJuegos = {
    render(el, game) { root = el; game ? go(game) : (root.querySelector('.jg-game, .jg-hub') ? null : hub()); }
  };
})();
