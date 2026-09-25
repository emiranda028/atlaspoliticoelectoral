/* ==========================================================================
   Portal de Transparencia — render a partir de data/transparencia.js
   ========================================================================== */
(function () {
  "use strict";

  var D, year, E;
  var $ = function (id) { return document.getElementById(id); };
  var sum = function (a, k) { return a.reduce(function (s, x) { return s + (+x[k] || 0); }, 0); };
  var pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; };

  function money(n) { return "$ " + Math.round(n).toLocaleString("es-AR"); }
  function short(n) {
    if (Math.abs(n) >= 1e9) return "$" + (n / 1e9).toLocaleString("es-AR", { maximumFractionDigits: 2 }) + " mil M";
    return "$" + (n / 1e6).toLocaleString("es-AR", { maximumFractionDigits: 1 }) + " M";
  }
  function fmtPct(p) { return p.toLocaleString("es-AR", { maximumFractionDigits: 1 }) + "%"; }

  /* ------------------------------------------------------------ tabs --- */
  var TABS = ["resumen", "presupuesto", "tcer", "compras", "obras", "personal", "documentos", "acceso"];
  function show(id, focus) {
    if (TABS.indexOf(id) < 0) id = "resumen";
    TABS.forEach(function (t) {
      $(t).hidden = t !== id;
      var b = $("tab-" + t);
      b.setAttribute("aria-selected", t === id ? "true" : "false");
      b.tabIndex = t === id ? 0 : -1;
    });
    if (focus) $("tab-" + id).focus();
  }
  function initTabs() {
    var list = document.querySelector("[role=tablist]");
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[role=tab]"); if (!b) return;
      var id = b.getAttribute("aria-controls");
      history.replaceState(null, "", "#" + id); show(id);
    });
    list.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      var cur = TABS.indexOf(document.activeElement.getAttribute("aria-controls"));
      var next = TABS[(cur + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length];
      history.replaceState(null, "", "#" + next); show(next, true);
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("[data-goto]"); if (!a) return;
      e.preventDefault(); var id = a.getAttribute("data-goto");
      history.replaceState(null, "", "#" + id); show(id);
      document.querySelector(".tabs").scrollIntoView({ block: "start" });
    });
    window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });
    show(location.hash.slice(1));
  }

  /* ------------------------------------------------------------ bars --- */
  // Barra de ejecución: pista = presupuesto (100%), relleno = ejecutado.
  function execBars(rows, labelKey, planKey, doneKey, doneLabel) {
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r[planKey], r[doneKey]); }));
    return rows.map(function (r) {
      var wPlan = r[planKey] / max * 100, wDone = r[doneKey] / max * 100;
      var tip = r[labelKey] + " — Presupuestado " + money(r[planKey]) + " · " + doneLabel + " " + money(r[doneKey]) +
        " (" + fmtPct(pct(r[doneKey], r[planKey])) + ")";
      return '<div class="bar-row" title="' + GG.esc(tip) + '">' +
        '<div class="br-top"><span>' + GG.esc(r[labelKey]) + '</span><b>' + short(r[doneKey]) +
        ' <span class="muted" style="font-weight:600">de ' + short(r[planKey]) + " · " + fmtPct(pct(r[doneKey], r[planKey])) + "</span></b></div>" +
        '<div class="bar-track" role="img" aria-label="' + GG.esc(tip) + '">' +
          '<div class="bar-fill ghost" style="width:' + wPlan + '%"></div>' +
          '<div class="bar-fill solid" style="width:' + wDone + '%"></div>' +
        "</div></div>";
    }).join("");
  }
  // Barra de participación: cada fila como % del total.
  function shareBars(rows, labelKey, valKey) {
    var total = sum(rows, valKey);
    var max = Math.max.apply(null, rows.map(function (r) { return r[valKey]; }));
    return rows.slice().sort(function (a, b) { return b[valKey] - a[valKey]; }).map(function (r) {
      var p = pct(r[valKey], total);
      var tip = r[labelKey] + ": " + money(r[valKey]) + " (" + fmtPct(p) + ")";
      return '<div class="bar-row" title="' + GG.esc(tip) + '">' +
        '<div class="br-top"><span>' + GG.esc(r[labelKey]) + "</span><b>" + fmtPct(p) + "</b></div>" +
        '<div class="bar-track" role="img" aria-label="' + GG.esc(tip) + '"><div class="bar-fill" style="width:' + (r[valKey] / max * 100) + '%"></div></div></div>';
    }).join("");
  }

  /* --------------------------------------------------------- render --- */
  function render() {
    E = D.ejercicios[year];
    var recP = sum(E.recursos, "presupuestado"), recC = sum(E.recursos, "percibido");
    var gasP = sum(E.gastos, "presupuestado"), gasC = sum(E.gastos, "comprometido"), gasPag = sum(E.gastos, "pagado");
    var propios = E.recursos.filter(function (r) { return r.tipo === "De jurisdicción municipal"; });
    var propiosC = sum(propios, "percibido");

    // KPIs
    $("kpis").innerHTML = [
      ["Presupuesto " + year, short(gasP), E.ordenanza],
      ["Recursos percibidos", short(recC), fmtPct(pct(recC, recP)) + " de lo previsto"],
      ["Gastos comprometidos", short(gasC), fmtPct(pct(gasC, gasP)) + " del presupuesto"],
      ["Resultado del período", short(recC - gasC), recC - gasC >= 0 ? "Superávit (recursos − gastos)" : "Déficit (recursos − gastos)"],
      ["Recursos propios", fmtPct(pct(propiosC, recC)), "del total percibido son tasas municipales"]
    ].map(function (k) {
      return '<div class="kpi"><div class="k-l">' + GG.esc(k[0]) + '</div><div class="k-v">' + GG.esc(k[1]) + '</div><div class="k-s">' + GG.esc(k[2]) + "</div></div>";
    }).join("");

    // Resumen: origen de recursos agrupado por tipo
    var byTipo = {};
    E.recursos.forEach(function (r) { byTipo[r.tipo] = (byTipo[r.tipo] || 0) + r.percibido; });
    $("origen").innerHTML = shareBars(Object.keys(byTipo).map(function (k) { return { l: k, v: byTipo[k] }; }), "l", "v");
    $("areas").innerHTML = shareBars(E.areas, "area", "comprometido");

    // Presupuesto
    $("pres-intro").innerHTML = "<strong>" + GG.esc(E.estado) + ".</strong> Datos al " + GG.fecha(E.corte) +
      ". Presupuesto aprobado por " + GG.esc(E.ordenanza) + ".";
    $("rec-bars").innerHTML = execBars(E.recursos, "rubro", "presupuestado", "percibido", "Percibido");
    $("gas-bars").innerHTML = execBars(E.gastos, "partida", "presupuestado", "comprometido", "Comprometido");

    $("rec-table").innerHTML = "<thead><tr><th>Rubro</th><th>Tipo</th><th class=r>Presupuestado</th><th class=r>Percibido</th><th class=r>% ejec.</th></tr></thead><tbody>" +
      E.recursos.map(function (r) {
        return "<tr><td>" + GG.esc(r.rubro) + "</td><td>" + GG.esc(r.tipo) + "</td><td class=r>" + money(r.presupuestado) + "</td><td class=r>" + money(r.percibido) + "</td><td class=r>" + fmtPct(pct(r.percibido, r.presupuestado)) + "</td></tr>";
      }).join("") + "</tbody><tfoot><tr><td colspan=2>Total</td><td class=r>" + money(recP) + "</td><td class=r>" + money(recC) + "</td><td class=r>" + fmtPct(pct(recC, recP)) + "</td></tr></tfoot>";

    $("gas-table").innerHTML = "<thead><tr><th>Partida</th><th class=r>Presupuestado</th><th class=r>Comprometido</th><th class=r>Pagado</th><th class=r>% ejec.</th></tr></thead><tbody>" +
      E.gastos.map(function (g) {
        return "<tr><td>" + GG.esc(g.partida) + "</td><td class=r>" + money(g.presupuestado) + "</td><td class=r>" + money(g.comprometido) + "</td><td class=r>" + money(g.pagado) + "</td><td class=r>" + fmtPct(pct(g.comprometido, g.presupuestado)) + "</td></tr>";
      }).join("") + "</tbody><tfoot><tr><td>Total</td><td class=r>" + money(gasP) + "</td><td class=r>" + money(gasC) + "</td><td class=r>" + money(gasPag) + "</td><td class=r>" + fmtPct(pct(gasC, gasP)) + "</td></tr></tfoot>";

    var t = E.tesoro;
    $("tesoro").innerHTML = "<tbody>" +
      "<tr><td>Saldo al inicio del ejercicio</td><td class=r>" + money(t.saldo_inicial) + "</td></tr>" +
      "<tr><td>(+) Ingresos del período</td><td class=r>" + money(t.ingresos) + "</td></tr>" +
      "<tr><td>(−) Egresos del período</td><td class=r>" + money(t.egresos) + "</td></tr>" +
      "</tbody><tfoot><tr><td>Saldo al " + GG.fecha(E.corte) + "</td><td class=r>" + money(t.saldo_final) + "</td></tr></tfoot>";
    var d = E.deuda;
    $("deuda").innerHTML = "<tbody>" +
      "<tr><td>Deuda flotante<br><small class=muted>compromisos impagos de corto plazo</small></td><td class=r>" + money(d.flotante) + "</td></tr>" +
      "<tr><td>Deuda consolidada<br><small class=muted>" + GG.esc(d.detalle_consolidada || "") + "</small></td><td class=r>" + money(d.consolidada) + "</td></tr>" +
      "</tbody><tfoot><tr><td>Total</td><td class=r>" + money(d.flotante + d.consolidada) + "</td></tr></tfoot>";
  }

  var ESTADOS = {
    presentado: ["ok", "Presentado"], aprobado: ["info", "Aprobado"],
    pendiente: ["warn", "Pendiente"], observado: ["bad", "Observado"]
  };

  function renderStatic() {
    // TCER
    var P = D.presentaciones.slice().sort(function (a, b) { return a.vencimiento < b.vencimiento ? 1 : -1; });
    var done = P.filter(function (p) { return p.presentado; });
    var enTermino = done.filter(function (p) { return p.presentado <= p.vencimiento; }).length;
    var next = P.filter(function (p) { return !p.presentado; }).sort(function (a, b) { return a.vencimiento > b.vencimiento ? 1 : -1; })[0];
    $("tcer-status").innerHTML =
      '<div class="person"><span class="avatar" style="background:var(--ok-soft);color:var(--ok)">' + GG_ICON("shield", 30) + "</span>" +
      "<div><div class=\"muted\" style=\"font-size:.85rem\">Presentaciones en término</div><div style=\"font-size:1.8rem;font-weight:800\">" + enTermino + " de " + done.length + "</div></div></div>" +
      (next ? '<hr class="soft" style="margin:16px 0"><div class="muted" style="font-size:.85rem">Próximo vencimiento</div><strong>' + GG.esc(next.documento) + "</strong><div>" + GG.esc(next.periodo) + " · vence el " + GG.fecha(next.vencimiento) + "</div>" : "");
    $("tcer-table").innerHTML = "<thead><tr><th>Período</th><th>Documentación</th><th>Vencimiento</th><th>Presentado</th><th>Estado</th></tr></thead><tbody>" +
      P.map(function (p) {
        var s = ESTADOS[p.estado] || ["", p.estado];
        return "<tr><td><strong>" + GG.esc(p.periodo) + "</strong></td><td>" + GG.esc(p.documento) + "</td><td class=num>" + GG.fecha(p.vencimiento) + "</td><td class=num>" + GG.fecha(p.presentado) + '</td><td><span class="pill ' + s[0] + '">' + s[1] + "</span></td></tr>";
      }).join("") + "</tbody>";

    // Compras
    var estados = ["Todos"].concat(D.compras.map(function (c) { return c.estado; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    $("compras-f").innerHTML = estados.map(function (e) { return "<option>" + GG.esc(e) + "</option>"; }).join("");
    function compras() {
      var f = $("compras-f").value;
      var rows = D.compras.filter(function (c) { return f === "Todos" || c.estado === f; });
      var cls = { "Abierta": "ok", "En evaluación": "warn", "Adjudicada": "info", "Finalizada": "" };
      $("compras-table").innerHTML = "<thead><tr><th>N°</th><th>Tipo</th><th>Objeto</th><th class=r>Monto estimado</th><th>Apertura</th><th>Estado</th><th>Adjudicatario</th></tr></thead><tbody>" +
        rows.map(function (c) {
          return "<tr><td class=num><strong>" + GG.esc(c.numero) + "</strong></td><td>" + GG.esc(c.tipo) + "</td><td>" + GG.esc(c.objeto) + "</td><td class=r>" + money(c.monto) + "</td><td class=num>" + GG.fecha(c.apertura) + '</td><td><span class="pill ' + (cls[c.estado] || "") + '">' + GG.esc(c.estado) + "</span></td><td>" + GG.esc(c.adjudicatario || "—") + "</td></tr>";
        }).join("") + "</tbody>";
    }
    $("compras-f").addEventListener("change", compras); compras();

    // Obras
    $("obras-list").innerHTML = D.obras.map(function (o) {
      var cls = o.estado === "Finalizada" ? "ok" : o.estado === "En ejecución" ? "info" : "warn";
      return '<article class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h3>' + GG.esc(o.nombre) + '</h3><span class="pill ' + cls + '">' + GG.esc(o.estado) + "</span></div>" +
        '<p class="meta">' + GG.esc(o.financiamiento) + (o.inicio ? " · inicio " + GG.fecha(o.inicio) : "") + "</p>" +
        '<div style="display:flex;justify-content:space-between;font-size:.9rem;margin:10px 0 6px"><span>Avance físico</span><b class="num">' + o.avance + "%</b></div>" +
        '<div class="progress" role="progressbar" aria-valuenow="' + o.avance + '" aria-valuemin="0" aria-valuemax="100" aria-label="Avance de ' + GG.esc(o.nombre) + '"><span style="width:' + o.avance + '%"></span></div>' +
        '<p class="mt-1" style="margin-bottom:0"><span class="muted">Monto:</span> <strong class="num">' + money(o.monto) + "</strong></p></article>";
    }).join("");

    // Personal
    var Pe = D.personal, tot = sum(Pe.dotacion, "cantidad");
    $("personal-intro").textContent = "Dotación al " + GG.fecha(Pe.corte) + ".";
    $("personal-kpis").innerHTML = '<div class="kpi"><div class="k-l">Total de agentes</div><div class="k-v">' + tot + '</div><div class="k-s">incluye Concejo Deliberante</div></div>';
    $("personal-bars").innerHTML = Pe.dotacion.map(function (p) {
      return '<div class="bar-row"><div class="br-top"><span>' + GG.esc(p.tipo) + "</span><b>" + p.cantidad + ' <span class="muted" style="font-weight:600">· ' + fmtPct(pct(p.cantidad, tot)) + '</span></b></div><div class="bar-track"><div class="bar-fill" style="width:' + (p.cantidad / tot * 100) + '%"></div></div></div>';
    }).join("");

    // Documentos
    var cats = ["Todas"].concat(D.documentos.map(function (d) { return d.categoria; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    $("docs-f").innerHTML = cats.map(function (c) { return "<option>" + GG.esc(c) + "</option>"; }).join("");
    function docs() {
      var f = $("docs-f").value;
      $("docs-list").innerHTML = D.documentos.filter(function (d) { return f === "Todas" || d.categoria === f; })
        .sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; })
        .map(function (d) {
          return '<li><span class="d-ic">PDF</span><span class="d-t"><b>' + GG.esc(d.titulo) + "</b><small>" + GG.esc(d.categoria) + " · " + GG.fecha(d.fecha) + "</small></span>" +
            (d.archivo ? '<a class="btn secondary small" href="' + GG.esc(d.archivo) + '" download>Descargar</a>' : '<span class="pill">A publicar</span>') + "</li>";
        }).join("");
    }
    $("docs-f").addEventListener("change", docs); docs();
  }
  function GG_ICON(n, s) { return window.GALARZA_ICON ? window.GALARZA_ICON(n, s) : ""; }

  /* ------------------------------------------------------------ CSV --- */
  function csv(kind) {
    var rows, head;
    if (kind === "recursos") { head = ["ejercicio", "rubro", "tipo", "presupuestado", "percibido"]; rows = E.recursos.map(function (r) { return [year, r.rubro, r.tipo, r.presupuestado, r.percibido]; }); }
    else if (kind === "gastos") { head = ["ejercicio", "partida", "presupuestado", "comprometido", "pagado"]; rows = E.gastos.map(function (g) { return [year, g.partida, g.presupuestado, g.comprometido, g.pagado]; }); }
    else if (kind === "areas") { head = ["ejercicio", "area", "comprometido"]; rows = E.areas.map(function (a) { return [year, a.area, a.comprometido]; }); }
    else if (kind === "presentaciones") { head = ["periodo", "documento", "vencimiento", "presentado", "estado"]; rows = D.presentaciones.map(function (p) { return [p.periodo, p.documento, p.vencimiento, p.presentado, p.estado]; }); }
    else if (kind === "compras") { head = ["numero", "tipo", "objeto", "monto", "apertura", "estado", "adjudicatario"]; rows = D.compras.map(function (c) { return [c.numero, c.tipo, c.objeto, c.monto, c.apertura, c.estado, c.adjudicatario]; }); }
    else if (kind === "obras") { head = ["obra", "monto", "financiamiento", "avance_pct", "estado", "inicio"]; rows = D.obras.map(function (o) { return [o.nombre, o.monto, o.financiamiento, o.avance, o.estado, o.inicio]; }); }
    else return;
    var q = function (v) { v = v == null ? "" : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    // Separador ";" para que Excel en español lo abra en columnas
    var text = "﻿" + [head].concat(rows).map(function (r) { return r.map(q).join(";"); }).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    a.download = "galarza-" + kind + (["recursos", "gastos", "areas"].indexOf(kind) >= 0 ? "-" + year : "") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ------------------------------------------------------ formulario --- */
  function initForm() {
    var f = $("acceso-form"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("acceso-msg");
      if (!f.checkValidity()) { msg.innerHTML = '<span class="pill bad">Completá nombre, correo y el pedido.</span>'; f.reportValidity(); return; }
      GG.enviarNota({
        asunto: "Solicitud de acceso a la información pública",
        campos: [["Nombre", $("a-nombre").value], ["DNI", $("a-dni").value], ["Correo", $("a-mail").value], ["Teléfono", $("a-tel").value]],
        cuerpo: $("a-pedido").value
      }, msg);
    });
  }

  function start() {
    D = window.GALARZA_TRANSPARENCIA; if (!D) return;
    if (D.ejemplo) $("demo-banner").classList.remove("hidden");
    $("updated").textContent = "Última actualización: " + GG.fecha(D.actualizado) + " · Responsable: " + D.responsable;
    var years = Object.keys(D.ejercicios).sort().reverse();
    year = years[0];
    $("year").innerHTML = years.map(function (y) { return "<option>" + y + "</option>"; }).join("");
    $("year").addEventListener("change", function () { year = this.value; render(); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-csv]"); if (b) csv(b.getAttribute("data-csv"));
    });
    initTabs(); render(); renderStatic(); initForm();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
