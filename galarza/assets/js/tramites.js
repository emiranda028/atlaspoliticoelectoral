/* Guía de trámites: filtros por categoría, búsqueda y enlace directo (#id) */
(function () {
  "use strict";

  function start() {
    var T = window.GALARZA_TRAMITES || [], C = window.GALARZA_CATEGORIAS || [];
    var params = new URLSearchParams(location.search);
    var state = { cat: params.get("cat") || "", q: params.get("q") || "", online: false };
    var catName = {}; C.forEach(function (c) { catName[c.id] = c.nombre; });

    var $q = document.getElementById("tq"), $cats = document.getElementById("cats"),
        $list = document.getElementById("list"), $count = document.getElementById("count"),
        $online = document.getElementById("only-online");
    $q.value = state.q;

    // Si llegan con #id, abrir ese trámite sin filtros
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash) { state.cat = ""; state.q = ""; $q.value = ""; }

    function chips() {
      var all = [{ id: "", nombre: "Todos" }].concat(C);
      $cats.innerHTML = all.map(function (c) {
        return '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + GG.esc(c.nombre) + "</button>";
      }).join("");
    }
    $cats.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]"); if (!b) return;
      state.cat = b.getAttribute("data-cat"); chips(); render(); sync();
    });
    $q.addEventListener("input", function () { state.q = $q.value; render(); sync(); });
    $online.addEventListener("change", function () { state.online = $online.checked; render(); });

    function sync() {
      var p = new URLSearchParams();
      if (state.cat) p.set("cat", state.cat);
      if (state.q) p.set("q", state.q);
      history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
    }

    function li(arr) { return "<ul>" + arr.map(function (x) { return "<li>" + GG.esc(x) + "</li>"; }).join("") + "</ul>"; }
    function ol(arr) { return '<ol style="margin:0;padding-left:1.2em">' + arr.map(function (x) { return "<li>" + GG.esc(x) + "</li>"; }).join("") + "</ol>"; }

    function item(t) {
      var action = t.enlace
        ? '<a class="btn" href="' + GG.esc(t.enlace) + '">Iniciar trámite</a>'
        : (t.online ? '<span class="pill info">Próximamente online</span>' : "");
      return '<details class="tramite" id="' + t.id + '">' +
        "<summary><span class=\"t-title\"><span class=\"t-cat\">" + GG.esc(catName[t.categoria] || "") + "</span>" + GG.esc(t.titulo) + "</span>" +
          (t.online ? '<span class="pill ok">Online</span>' : '<span class="pill">Presencial</span>') + "</summary>" +
        '<div class="t-body">' +
          '<div style="grid-column:1/-1"><p style="margin:0;font-size:1.05rem">' + GG.esc(t.resumen) + "</p></div>" +
          "<div><h4>Qué necesitás</h4>" + li(t.requisitos) + "</div>" +
          "<div><h4>Paso a paso</h4>" + ol(t.pasos) + "</div>" +
          "<div><h4>Dónde</h4><p>" + GG.esc(t.donde) + "</p><h4>Costo</h4><p style=\"margin:0\">" + GG.esc(t.costo) + "</p></div>" +
          '<div class="t-actions">' + action +
            '<a class="btn secondary small" href="#' + t.id + '" data-copy>Copiar enlace</a></div>' +
        "</div></details>";
    }

    function render() {
      var rows;
      if (state.q.trim()) rows = GG.searchTramites(state.q).map(function (r) { return r.t; });
      else rows = T.slice();
      rows = rows.filter(function (t) {
        return (!state.cat || t.categoria === state.cat) && (!state.online || t.online);
      });
      $count.textContent = rows.length === 1 ? "1 trámite" : rows.length + " trámites";
      $list.innerHTML = rows.length ? rows.map(item).join("")
        : '<div class="card center"><p><strong>No hay resultados.</strong></p><p class="muted">Probá con otra palabra o quitá los filtros.</p></div>';
    }

    $list.addEventListener("click", function (e) {
      var a = e.target.closest("[data-copy]"); if (!a) return;
      e.preventDefault();
      var url = location.origin + location.pathname + a.getAttribute("href");
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { a.textContent = "¡Copiado!"; });
    });

    chips(); render();
    if (hash) {
      var el = document.getElementById(hash);
      if (el) { el.open = true; setTimeout(function () { el.scrollIntoView({ block: "start" }); }, 50); }
    }
    window.addEventListener("hashchange", function () {
      var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el && el.tagName === "DETAILS") el.open = true;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
