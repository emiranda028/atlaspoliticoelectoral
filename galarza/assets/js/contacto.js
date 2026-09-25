/* Formulario de reclamos y seguimiento.
   Sin backend: el número se genera en el navegador y el reclamo sale por
   GG.enviarNota (correo o nota imprimible). Al conectar un sistema de
   reclamos, reemplazar ambos manejadores por llamadas a su API. */
(function () {
  "use strict";
  function start() {
    var f = document.getElementById("reclamo-form");
    var msg = document.getElementById("reclamo-msg");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var tipo = f.querySelector("input[name=tipo]:checked");
      if (!tipo || !f.checkValidity()) {
        msg.innerHTML = '<span class="pill bad">Elegí qué pasa y completá los campos.</span>';
        return;
      }
      var num = "GG-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
      GG.enviarNota({
        asunto: "Reclamo " + num + " — " + tipo.value,
        campos: [["Tipo", tipo.value], ["Lugar", f.querySelector("#r-dir").value],
                 ["Vecino/a", f.querySelector("#r-nombre").value], ["Contacto", f.querySelector("#r-tel").value]],
        cuerpo: f.querySelector("#r-desc").value
      }, null);
      msg.innerHTML = '<span class="pill ok">Reclamo registrado</span> Tu número es <strong class="num">' + num + "</strong>. Guardalo para hacer el seguimiento.";
    });

    var s = document.getElementById("seguir-form");
    s.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = document.getElementById("s-num").value.trim();
      document.getElementById("seguir-msg").innerHTML = v
        ? "El seguimiento en línea estará disponible cuando se conecte el sistema de reclamos. Mientras tanto, consultá el estado de <strong>" + GG.esc(v) + "</strong> al (03444) 481565."
        : "Ingresá tu número de reclamo.";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
