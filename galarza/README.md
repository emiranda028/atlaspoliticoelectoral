# Rediseño web · Municipalidad de General Galarza

Propuesta de rediseño de [galarza.gov.ar](https://www.galarza.gov.ar) enfocada en el vecino,
con un **Portal de Transparencia** basado en la información que el municipio rinde ante el
**Tribunal de Cuentas de Entre Ríos (TCER)**.

Sitio 100 % estático (HTML + CSS + JS, sin build ni dependencias). Se abre directo con
`galarza/index.html` o se publica en cualquier hosting.

## Nueva organización

La web actual se organiza por oficinas. La propuesta se organiza por **lo que el vecino necesita hacer**:

| Sección | Archivo | Qué resuelve |
|---|---|---|
| Inicio | `index.html` | Buscador “¿Qué necesitás hacer hoy?”, 8 accesos rápidos, avisos, novedades, agenda, teléfonos útiles y resumen de transparencia |
| Trámites | `tramites.html` | Guía única con requisitos, pasos, dónde, costo y si es online. Filtro por tema y buscador con sinónimos |
| Vivir en Galarza | `vivir.html` | Servicios por tema: salud, residuos (cronograma por zona), social, educación, deporte, cultura, ambiente, producción, seguridad |
| Turismo | `turismo.html` | Complejo de piletas, Parque Paseo del Ferrocarril, Fiesta de la Ornamentación Navideña, historia y cómo llegar |
| Municipio | `municipio.html` | Intendencia, gabinete, Concejo Deliberante, normativa (enlace al Digesto) y Juzgado de Faltas |
| Transparencia | `transparencia.html` | Portal de transparencia (ver abajo) |
| Contacto / Reclamos | `contacto.html` | Formulario de reclamos por categoría con número de seguimiento, datos de contacto y emergencias |

## Portal de Transparencia

Pestañas con enlace directo (`transparencia.html#presupuesto`, `#tcer`, etc.):

- **Resumen** — indicadores clave, de dónde viene la plata y en qué se gasta, glosario en lenguaje claro.
- **Presupuesto y ejecución** — recursos (presupuestado vs. percibido) y gastos por objeto
  (presupuestado / comprometido / pagado), situación del Tesoro y deuda flotante y consolidada.
  Es la misma estructura de las planillas de ejecución presupuestaria que se presentan al TCER.
- **Rendiciones al TCER** — historial de presentaciones, vencimientos y estado (presentado, aprobado, pendiente, observado).
- **Compras** — licitaciones, concursos de precios y contrataciones directas, filtrables por estado.
- **Obras** — monto, financiamiento y avance físico.
- **Personal** — dotación por tipo de planta.
- **Documentos** — biblioteca de PDF (presupuesto, Ordenanza Tributaria, Cuenta General, resoluciones del TCER, escalas, DDJJ).
- **Pedir información** — solicitud de acceso a la información pública.

Todas las tablas se descargan en **CSV** (separador `;`, abre directo en Excel) y hay selector de ejercicio.

## ⚠️ Antes de publicar

1. **Datos de ejemplo.** Todas las cifras de `data/transparencia.js` son ilustrativas. Mientras
   `ejemplo: true`, el portal muestra una franja de aviso. Cargar las cifras oficiales y pasar a `false`.
2. **PDFs.** Subirlos a `galarza/docs/` y completar `archivo` en cada documento.
3. **Trámites.** Validar requisitos, costos y oficinas de `data/tramites.js` con cada área.
4. **Textos marcados “a completar”**: gabinete, concejales, dirección del centro de salud, turismo.
5. **Novedades y agenda** de la portada son de muestra: reemplazarlas por las publicaciones de Prensa.
6. **Formularios.** Sin servidor, los reclamos y pedidos de información generan un correo
   (si se configura `email` en `assets/js/layout.js`) o una nota imprimible. Para recibirlos en línea,
   conectar Netlify Forms, Formspree o el sistema de expedientes del municipio en `GG.enviarNota`.
7. Confirmar los plazos de presentación con el cronograma vigente del TCER.

## Cómo se actualiza

| Qué | Dónde |
|---|---|
| Cifras, compras, obras, rendiciones, documentos | `data/transparencia.js` |
| Trámites | `data/tramites.js` |
| Menú, pie, teléfono, horario, correo | `assets/js/layout.js` (objetos `MUNI` y `NAV`) |
| Colores y tipografía | `assets/css/styles.css` (variables en `:root`) |

Los datos están en archivos `.js` (no `.json`) para que el sitio funcione también abierto
directamente desde el disco, sin servidor.

## Accesibilidad

Botón de tamaño de letra y modo oscuro, enlace “saltar al contenido”, navegación por teclado
(pestañas con flechas, buscador con ↑/↓), contraste AA, diseño para celular desde 360 px y
versión imprimible del portal.
