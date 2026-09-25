/* ==========================================================================
   Estructura común (barra superior, encabezado, pie) y utilidades.
   Cada página tiene <div id="site-top"></div> y <div id="site-foot"></div>;
   este script los completa, así el menú se edita en un solo lugar.
   ========================================================================== */
(function () {
  "use strict";

  var MUNI = {
    nombre: "General Galarza",
    direccion: "25 de Mayo y Juan Carlos Burone · CP 2843 · General Galarza, Entre Ríos",
    telefono: "(03444) 481565",
    telHref: "tel:+543444481565",
    horario: "Lunes a viernes de 7 a 13 h",
    email: "" // completar con la casilla oficial
  };
  window.GALARZA_MUNI = MUNI;

  var NAV = [
    { href: "index.html",         label: "Inicio" },
    { href: "tramites.html",      label: "Trámites" },
    { href: "vivir.html",         label: "Vivir en Galarza" },
    { href: "turismo.html",       label: "Turismo" },
    { href: "municipio.html",     label: "Municipio" },
    { href: "transparencia.html", label: "Transparencia" },
    { href: "contacto.html#reclamos", label: "Reclamos", cta: true }
  ];

  /* Íconos (trazo, 24x24) reutilizables por las páginas */
  var I = {
    search: '<path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35"/>',
    receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    car: '<path d="M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4v-4Z"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
    store: '<path d="M4 10v10h16V10M3 6l2-3h14l2 3v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V6Z"/><path d="M10 20v-5h4v5"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2Z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z"/>',
    home: '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    doc: '<path d="M14 2H6v20h12V6l-4-4Z"/><path d="M14 2v4h4M9 13h6M9 17h6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M9 21l-2-4M15 21l2-4M9 14h.01M15 14h.01"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    map: '<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3ZM9 3v15M15 6v15"/>',
    news: '<path d="M4 22h16a2 2 0 0 0 2-2V4H8v16a2 2 0 0 1-4 0V9h4"/><path d="M12 8h6M12 12h6M12 16h4"/>',
    school: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    ball: '<circle cx="12" cy="12" r="10"/><path d="m12 7 4 3-1.5 5h-5L8 10l4-3ZM12 2v5M22 10l-6 0M2 10h6M9.5 15 7 20M14.5 15l2.5 5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    gavel: '<path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10M16 16l6-6M8 8l6-6M9 7l8 8M21 11l-8-8"/>'
  };
  window.GALARZA_ICON = function (name, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 24) + '" height="' + (size || 24) +
      '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (I[name] || I.info) + "</svg>";
  };

  function current() {
    var p = location.pathname.split("/").pop() || "index.html";
    return p === "" ? "index.html" : p;
  }

  function renderTop() {
    var here = current();
    var links = NAV.map(function (n) {
      var active = n.href.split("#")[0] === here && !n.cta;
      return '<li><a href="' + n.href + '"' + (active ? ' aria-current="page"' : "") +
        (n.cta ? ' class="nav-cta"' : "") + ">" + n.label + "</a></li>";
    }).join("");

    return '' +
      '<a class="skip" href="#main">Saltar al contenido</a>' +
      '<div class="topbar"><div class="wrap">' +
        '<div class="tb-left">' +
          '<span class="tb-hide-sm">Sitio oficial · Provincia de Entre Ríos</span>' +
          '<a href="' + MUNI.telHref + '">☎ ' + MUNI.telefono + "</a>" +
          '<span class="tb-hide-sm">' + MUNI.horario + "</span>" +
        "</div>" +
        '<div class="tb-right" role="group" aria-label="Accesibilidad">' +
          '<button type="button" data-fs-toggle aria-label="Cambiar tamaño de letra">A<span aria-hidden="true">±</span></button>' +
          '<button type="button" data-theme-toggle aria-label="Cambiar modo claro u oscuro">◐</button>' +
        "</div>" +
      "</div></div>" +
      '<header class="site-header"><div class="wrap">' +
        '<a class="brand" href="index.html" aria-label="Municipalidad de General Galarza — inicio">' +
          '<span class="brand-mark" aria-hidden="true">GG</span>' +
          '<span class="brand-text"><small>Municipalidad de</small><strong>General Galarza</strong></span>' +
        "</a>" +
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>Menú' +
        "</button>" +
        '<nav class="main-nav" id="main-nav" aria-label="Principal"><ul>' + links + "</ul></nav>" +
      "</div></header>";
  }

  function renderFoot() {
    var y = new Date().getFullYear();
    return '' +
      '<footer class="site-footer"><div class="wrap">' +
        '<div class="foot-grid">' +
          "<div>" +
            '<a class="brand" href="index.html" style="color:#fff;margin-bottom:14px">' +
              '<span class="brand-mark" aria-hidden="true">GG</span>' +
              '<span class="brand-text"><small style="color:#9FBDB0">Municipalidad de</small><strong>General Galarza</strong></span></a>' +
            "<p>" + MUNI.direccion + "</p>" +
            '<p><a href="' + MUNI.telHref + '">' + MUNI.telefono + "</a><br>" + MUNI.horario + "</p>" +
          "</div>" +
          "<div><h4>Para vecinos</h4><ul>" +
            '<li><a href="tramites.html">Guía de trámites</a></li>' +
            '<li><a href="tramites.html?cat=tasas">Pagar tasas</a></li>' +
            '<li><a href="contacto.html#reclamos">Reclamos</a></li>' +
            '<li><a href="vivir.html#salud">Salud</a></li>' +
            '<li><a href="vivir.html#residuos">Recolección de residuos</a></li>' +
          "</ul></div>" +
          "<div><h4>Gobierno</h4><ul>" +
            '<li><a href="municipio.html#intendencia">Intendencia</a></li>' +
            '<li><a href="municipio.html#gabinete">Gabinete</a></li>' +
            '<li><a href="municipio.html#concejo">Concejo Deliberante</a></li>' +
            '<li><a href="https://www.galarza.gov.ar/digesto/" rel="noopener">Digesto (ordenanzas)</a></li>' +
          "</ul></div>" +
          "<div><h4>Transparencia</h4><ul>" +
            '<li><a href="transparencia.html#presupuesto">Presupuesto y ejecución</a></li>' +
            '<li><a href="transparencia.html#tcer">Rendiciones al Tribunal de Cuentas</a></li>' +
            '<li><a href="transparencia.html#compras">Compras y licitaciones</a></li>' +
            '<li><a href="transparencia.html#acceso">Acceso a la información</a></li>' +
          "</ul></div>" +
        "</div>" +
        '<div class="foot-bottom">' +
          "<span>© " + y + " Municipalidad de General Galarza · Departamento Gualeguay · Entre Ríos</span>" +
          '<span><a href="turismo.html">Conocé Galarza</a> · <a href="contacto.html">Contacto</a></span>' +
        "</div>" +
      "</div></footer>";
  }

  /* ---- preferencias (tamaño de letra, tema) ---- */
  function pref(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; }
  }
  var root = document.documentElement;
  var fs = pref("gg-fs"); if (fs) root.setAttribute("data-fs", fs);
  var th = pref("gg-theme"); if (th) root.setAttribute("data-theme", th);

  function mount() {
    var top = document.getElementById("site-top");
    var foot = document.getElementById("site-foot");
    if (top) top.outerHTML = renderTop();
    if (foot) foot.outerHTML = renderFoot();

    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("main-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    var fsBtn = document.querySelector("[data-fs-toggle]");
    if (fsBtn) fsBtn.addEventListener("click", function () {
      var order = ["", "lg", "xl"];
      var cur = root.getAttribute("data-fs") || "";
      var next = order[(order.indexOf(cur) + 1) % order.length];
      if (next) root.setAttribute("data-fs", next); else root.removeAttribute("data-fs");
      pref("gg-fs", next);
    });

    var thBtn = document.querySelector("[data-theme-toggle]");
    if (thBtn) thBtn.addEventListener("click", function () {
      var dark = root.getAttribute("data-theme") === "dark" ||
        (!root.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
      var next = dark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      pref("gg-theme", next);
    });

    // Íconos declarativos: <span data-icon="receipt"></span>
    document.querySelectorAll("[data-icon]").forEach(function (el) {
      el.innerHTML = window.GALARZA_ICON(el.getAttribute("data-icon"), el.getAttribute("data-size"));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  /* ---- utilidades compartidas ---- */
  window.GG = {
    esc: function (s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },
    norm: function (s) {
      return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    },
    fecha: function (iso) {
      if (!iso) return "—";
      var d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
    },
    /* Envío de formularios. El sitio es estático: si MUNI.email está
       configurado abre el correo; si no, genera una nota imprimible para
       presentar en Mesa de Entradas. Reemplazar por el backend que se use
       (Netlify Forms, Formspree o el sistema de expedientes municipal). */
    enviarNota: function (nota, msgEl) {
      var lineas = nota.campos.filter(function (c) { return c[1]; })
        .map(function (c) { return c[0] + ": " + c[1]; }).join("\n");
      var texto = lineas + "\n\n" + nota.cuerpo;
      if (MUNI.email) {
        location.href = "mailto:" + MUNI.email + "?subject=" + encodeURIComponent(nota.asunto) +
          "&body=" + encodeURIComponent(texto);
        if (msgEl) msgEl.innerHTML = '<span class="pill ok">Se abrió tu correo con la solicitud lista para enviar.</span>';
        return;
      }
      var w = window.open("", "_blank");
      if (!w) { if (msgEl) msgEl.textContent = "Habilitá las ventanas emergentes para generar la nota."; return; }
      var hoy = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
      w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + GG.esc(nota.asunto) +
        '</title><style>body{font:16px/1.6 Georgia,serif;max-width:680px;margin:40px auto;padding:0 20px;color:#111}h1{font-size:1.2rem}pre{white-space:pre-wrap;font:inherit}</style></head><body>' +
        "<p style=\"text-align:right\">General Galarza, " + hoy + "</p><p>Sr. Presidente Municipal<br>Municipalidad de General Galarza<br>S/D</p>" +
        "<h1>Ref.: " + GG.esc(nota.asunto) + "</h1><pre>" + GG.esc(texto) + "</pre><p style=\"margin-top:60px\">Firma: ____________________</p>" +
        "<script>print()<\/script></body></html>");
      w.document.close();
      if (msgEl) msgEl.innerHTML = '<span class="pill ok">Generamos la nota: imprimila y presentala en Mesa de Entradas.</span>';
    },
    /* Buscador de trámites (inicio y guía) */
    searchTramites: function (q) {
      var nq = GG.norm(q).trim();
      if (!nq) return [];
      var terms = nq.split(/\s+/);
      var cats = {};
      (window.GALARZA_CATEGORIAS || []).forEach(function (c) { cats[c.id] = c.nombre; });
      return (window.GALARZA_TRAMITES || []).map(function (t) {
        var hay = GG.norm(t.titulo + " " + t.resumen + " " + t.palabras + " " + (cats[t.categoria] || ""));
        var title = GG.norm(t.titulo);
        var score = 0;
        terms.forEach(function (w) {
          if (title.indexOf(w) >= 0) score += 3;
          else if (hay.indexOf(w) >= 0) score += 1;
          else score -= 5;
        });
        return { t: t, score: score, cat: cats[t.categoria] || "" };
      }).filter(function (r) { return r.score > 0; })
        .sort(function (a, b) { return b.score - a.score; });
    }
  };
})();
