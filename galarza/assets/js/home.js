/* Portada: buscador con sugerencias y resumen de transparencia */
(function () {
  "use strict";

  function initSearch() {
    var input = document.getElementById("q");
    var box = document.getElementById("q-results");
    if (!input || !box) return;
    var active = -1;

    function render() {
      var q = input.value;
      if (!q.trim()) { box.classList.remove("show"); input.setAttribute("aria-expanded", "false"); return; }
      var res = GG.searchTramites(q).slice(0, 7);
      active = -1;
      if (!res.length) {
        box.innerHTML = '<div class="sr-empty">No encontramos “' + GG.esc(q) +
          '”. Probá con otras palabras o <a href="contacto.html">escribinos</a>.</div>';
      } else {
        box.innerHTML = res.map(function (r, i) {
          return '<a role="option" id="opt-' + i + '" href="tramites.html#' + r.t.id + '">' +
            "<div><div class=\"sr-cat\">" + GG.esc(r.cat) + "</div><strong>" + GG.esc(r.t.titulo) +
            "</strong><div class=\"muted\" style=\"font-size:.88rem\">" + GG.esc(r.t.resumen) + "</div></div></a>";
        }).join("");
      }
      box.classList.add("show");
      input.setAttribute("aria-expanded", "true");
    }

    input.addEventListener("input", render);
    input.addEventListener("focus", render);
    input.addEventListener("keydown", function (e) {
      var opts = box.querySelectorAll("a[role=option]");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!opts.length) return;
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length;
        opts.forEach(function (o, i) { o.classList.toggle("active", i === active); });
        input.setAttribute("aria-activedescendant", opts[active].id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (active >= 0 && opts[active]) location.href = opts[active].href;
        else location.href = "tramites.html?q=" + encodeURIComponent(input.value);
      } else if (e.key === "Escape") {
        box.classList.remove("show");
      }
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target) && e.target !== input) box.classList.remove("show");
    });
  }

  function money(n) {
    if (n >= 1e9) return "$" + (n / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + " mil M";
    return "$" + (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 0 }) + " M";
  }

  function initKpis() {
    var D = window.GALARZA_TRANSPARENCIA, el = document.getElementById("home-kpis");
    if (!D || !el) return;
    var year = Object.keys(D.ejercicios).sort().pop();
    var E = D.ejercicios[year];
    var sum = function (a, k) { return a.reduce(function (s, x) { return s + (x[k] || 0); }, 0); };
    var pres = sum(E.gastos, "presupuestado"), comp = sum(E.gastos, "comprometido");
    var top = E.areas.slice().sort(function (a, b) { return b.comprometido - a.comprometido; })[0];
    var ultima = D.presentaciones.filter(function (p) { return p.presentado; })
      .sort(function (a, b) { return a.presentado < b.presentado ? 1 : -1; })[0];

    el.innerHTML =
      kpi("Presupuesto " + year, money(pres), E.ordenanza) +
      kpi("Ejecutado al " + GG.fecha(E.corte), Math.round(comp / pres * 100) + "%", money(comp) + " comprometidos") +
      kpi("Mayor destino del gasto", top.area, Math.round(top.comprometido / comp * 100) + "% de lo ejecutado") +
      (ultima ? kpi("Última rendición al TCER", ultima.periodo, "Presentada el " + GG.fecha(ultima.presentado)) : "");

    var note = document.getElementById("home-kpis-note");
    if (note) note.textContent = (D.ejemplo ? "Cifras de ejemplo, a reemplazar por las oficiales. " : "") +
      "Actualizado al " + GG.fecha(D.actualizado) + ".";
  }
  function kpi(l, v, s) {
    return '<div class="kpi"><div class="k-l">' + GG.esc(l) + '</div><div class="k-v" style="font-size:' +
      (String(v).length > 14 ? "1.15rem" : "1.7rem") + '">' + GG.esc(v) + '</div><div class="k-s">' + GG.esc(s) + "</div></div>";
  }

  function start() { initSearch(); initKpis(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
