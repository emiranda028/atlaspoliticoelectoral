/* ==========================================================================
   Portal de Transparencia — datos
   --------------------------------------------------------------------------
   Esta es la ÚNICA fuente de datos del portal. Todo lo que se muestra en
   transparencia.html (gráficos, tablas, descargas CSV) sale de acá.

   ⚠️  LOS VALORES CARGADOS SON DE EJEMPLO. Mientras "ejemplo" sea true, el
   portal muestra un aviso visible. Para publicar:
     1. Reemplazá cada cifra por la de las planillas presentadas al
        Tribunal de Cuentas de Entre Ríos (TCER).
     2. Subí los PDF a /galarza/docs/ y completá "archivo" en cada documento.
     3. Cambiá  ejemplo: true  →  ejemplo: false.

   Montos en pesos argentinos, sin separadores (ej.: 1250000.50).
   Fechas en formato AAAA-MM-DD.
   ========================================================================== */

window.GALARZA_TRANSPARENCIA = {
  ejemplo: true,
  actualizado: "2026-09-15",
  responsable: "Secretaría de Hacienda — Contaduría Municipal",

  /* ---------------------------------------------------------------------
     Ejercicios presupuestarios. "corte" es la fecha hasta la que se
     informa la ejecución (cierre trimestral o anual).
     --------------------------------------------------------------------- */
  ejercicios: {
    "2026": {
      corte: "2026-06-30",
      estado: "En ejecución — 2º trimestre",
      ordenanza: "Ordenanza de Presupuesto N° XX/2025",
      recursos: [
        { rubro: "Coparticipación provincial y nacional",  tipo: "Transferencias corrientes", presupuestado: 3480000000, percibido: 1742000000 },
        { rubro: "Tasa General Inmobiliaria",              tipo: "De jurisdicción municipal", presupuestado:  520000000, percibido:  268500000 },
        { rubro: "Tasa de Inspección Sanitaria, Higiene y Seguridad", tipo: "De jurisdicción municipal", presupuestado: 410000000, percibido: 197300000 },
        { rubro: "Derechos, patentes y otras tasas",       tipo: "De jurisdicción municipal", presupuestado:  265000000, percibido:  121400000 },
        { rubro: "Servicios (agua, cloacas, cementerio)",  tipo: "De jurisdicción municipal", presupuestado:  180000000, percibido:   86200000 },
        { rubro: "Fondos afectados provinciales/nacionales", tipo: "Transferencias de capital", presupuestado: 640000000, percibido: 214000000 },
        { rubro: "Otros recursos (multas, rentas, venta de bienes)", tipo: "Otros", presupuestado: 105000000, percibido: 58900000 }
      ],
      /* Gasto por objeto (clasificación que usan las planillas del TCER) */
      gastos: [
        { partida: "Personal",                         presupuestado: 2890000000, comprometido: 1452000000, pagado: 1438000000 },
        { partida: "Bienes de consumo",                presupuestado:  520000000, comprometido:  248700000, pagado:  221300000 },
        { partida: "Servicios no personales",          presupuestado:  610000000, comprometido:  301200000, pagado:  276400000 },
        { partida: "Bienes de uso y trabajos públicos", presupuestado: 910000000, comprometido:  338500000, pagado:  290100000 },
        { partida: "Transferencias (ayudas sociales, becas, instituciones)", presupuestado: 480000000, comprometido: 229800000, pagado: 224600000 },
        { partida: "Servicio de la deuda",             presupuestado:   70000000, comprometido:   33400000, pagado:   33400000 },
        { partida: "Honorable Concejo Deliberante",    presupuestado:  120000000, comprometido:   58600000, pagado:   58600000 }
      ],
      /* Gasto por área / finalidad */
      areas: [
        { area: "Administración general y Hacienda", comprometido: 486000000 },
        { area: "Obras y servicios públicos",        comprometido: 1182000000 },
        { area: "Desarrollo social y salud",         comprometido: 512000000 },
        { area: "Cultura, deporte y turismo",        comprometido: 214000000 },
        { area: "Producción y ambiente",             comprometido:  96000000 },
        { area: "Seguridad y tránsito",              comprometido: 113600000 },
        { area: "Concejo Deliberante",               comprometido:  58600000 }
      ],
      tesoro: { saldo_inicial: 312000000, ingresos: 2688300000, egresos: 2542400000, saldo_final: 457900000 },
      deuda:  { flotante: 184000000, consolidada: 96000000, detalle_consolidada: "Préstamo provincial para maquinaria vial (ejemplo)" }
    },
    "2025": {
      corte: "2025-12-31",
      estado: "Ejercicio cerrado — rendición anual presentada",
      ordenanza: "Ordenanza de Presupuesto N° XX/2024",
      recursos: [
        { rubro: "Coparticipación provincial y nacional",  tipo: "Transferencias corrientes", presupuestado: 2310000000, percibido: 2398000000 },
        { rubro: "Tasa General Inmobiliaria",              tipo: "De jurisdicción municipal", presupuestado:  340000000, percibido:  322600000 },
        { rubro: "Tasa de Inspección Sanitaria, Higiene y Seguridad", tipo: "De jurisdicción municipal", presupuestado: 270000000, percibido: 281400000 },
        { rubro: "Derechos, patentes y otras tasas",       tipo: "De jurisdicción municipal", presupuestado:  172000000, percibido:  166900000 },
        { rubro: "Servicios (agua, cloacas, cementerio)",  tipo: "De jurisdicción municipal", presupuestado:  118000000, percibido:  109700000 },
        { rubro: "Fondos afectados provinciales/nacionales", tipo: "Transferencias de capital", presupuestado: 420000000, percibido: 301000000 },
        { rubro: "Otros recursos (multas, rentas, venta de bienes)", tipo: "Otros", presupuestado: 70000000, percibido: 77200000 }
      ],
      gastos: [
        { partida: "Personal",                         presupuestado: 1900000000, comprometido: 1952000000, pagado: 1952000000 },
        { partida: "Bienes de consumo",                presupuestado:  345000000, comprometido:  331800000, pagado:  318200000 },
        { partida: "Servicios no personales",          presupuestado:  400000000, comprometido:  392500000, pagado:  371000000 },
        { partida: "Bienes de uso y trabajos públicos", presupuestado: 600000000, comprometido:  488300000, pagado:  441600000 },
        { partida: "Transferencias (ayudas sociales, becas, instituciones)", presupuestado: 316000000, comprometido: 309400000, pagado: 309400000 },
        { partida: "Servicio de la deuda",             presupuestado:   48000000, comprometido:   47900000, pagado:   47900000 },
        { partida: "Honorable Concejo Deliberante",    presupuestado:   81000000, comprometido:   80100000, pagado:   80100000 }
      ],
      areas: [
        { area: "Administración general y Hacienda", comprometido: 671000000 },
        { area: "Obras y servicios públicos",        comprometido: 1624000000 },
        { area: "Desarrollo social y salud",         comprometido: 708000000 },
        { area: "Cultura, deporte y turismo",        comprometido: 287000000 },
        { area: "Producción y ambiente",             comprometido: 121000000 },
        { area: "Seguridad y tránsito",              comprometido: 130800000 },
        { area: "Concejo Deliberante",               comprometido:  80100000 }
      ],
      tesoro: { saldo_inicial: 198000000, ingresos: 3656800000, egresos: 3542800000, saldo_final: 312000000 },
      deuda:  { flotante: 139000000, consolidada: 118000000, detalle_consolidada: "Préstamo provincial para maquinaria vial (ejemplo)" }
    }
  },

  /* ---------------------------------------------------------------------
     Estado de presentaciones ante el Tribunal de Cuentas de Entre Ríos.
     estado: "presentado" | "pendiente" | "observado" | "aprobado"
     Ajustar los períodos al cronograma vigente del TCER.
     --------------------------------------------------------------------- */
  presentaciones: [
    { periodo: "2º trimestre 2026", documento: "Planillas de ejecución presupuestaria (recursos y gastos)", vencimiento: "2026-08-31", presentado: "2026-08-22", estado: "presentado" },
    { periodo: "1º trimestre 2026", documento: "Planillas de ejecución presupuestaria (recursos y gastos)", vencimiento: "2026-05-31", presentado: "2026-05-20", estado: "presentado" },
    { periodo: "Ejercicio 2025",    documento: "Rendición anual de cuentas (Cuenta General del Ejercicio)", vencimiento: "2026-04-30", presentado: "2026-04-28", estado: "presentado" },
    { periodo: "4º trimestre 2025", documento: "Planillas de ejecución presupuestaria (recursos y gastos)", vencimiento: "2026-02-28", presentado: "2026-02-19", estado: "presentado" },
    { periodo: "Ejercicio 2024",    documento: "Rendición anual de cuentas (Cuenta General del Ejercicio)", vencimiento: "2025-04-30", presentado: "2025-04-29", estado: "aprobado" },
    { periodo: "3º trimestre 2026", documento: "Planillas de ejecución presupuestaria (recursos y gastos)", vencimiento: "2026-11-30", presentado: "",           estado: "pendiente" }
  ],

  /* ---------------------------------------------------------------------
     Biblioteca de documentos. archivo: ruta al PDF (vacío = a publicar).
     --------------------------------------------------------------------- */
  documentos: [
    { categoria: "Presupuesto",       titulo: "Ordenanza de Presupuesto General y Cálculo de Recursos 2026", fecha: "2025-12-18", archivo: "" },
    { categoria: "Presupuesto",       titulo: "Ordenanza Tributaria e Impositiva Anual 2026",               fecha: "2025-12-18", archivo: "" },
    { categoria: "Ejecución",         titulo: "Ejecución presupuestaria — 2º trimestre 2026",               fecha: "2026-08-22", archivo: "" },
    { categoria: "Ejecución",         titulo: "Ejecución presupuestaria — 1º trimestre 2026",               fecha: "2026-05-20", archivo: "" },
    { categoria: "Rendición anual",   titulo: "Cuenta General del Ejercicio 2025 (rendición al TCER)",      fecha: "2026-04-28", archivo: "" },
    { categoria: "Rendición anual",   titulo: "Estado de situación del Tesoro al 31/12/2025",               fecha: "2026-04-28", archivo: "" },
    { categoria: "Rendición anual",   titulo: "Estado de la deuda flotante y consolidada al 31/12/2025",    fecha: "2026-04-28", archivo: "" },
    { categoria: "Control externo",   titulo: "Resolución del TCER sobre la Cuenta General 2024",           fecha: "2025-11-10", archivo: "" },
    { categoria: "Personal",          titulo: "Escala salarial vigente — personal municipal",               fecha: "2026-07-01", archivo: "" },
    { categoria: "Personal",          titulo: "Declaraciones juradas patrimoniales de funcionarios",        fecha: "2026-03-31", archivo: "" }
  ],

  /* ---------------------------------------------------------------------
     Compras y contrataciones.
     tipo: Licitación pública | Licitación privada | Concurso de precios |
           Contratación directa
     --------------------------------------------------------------------- */
  compras: [
    { numero: "LP 03/2026", tipo: "Licitación pública",  objeto: "Adquisición de luminarias LED para alumbrado público", monto: 148500000, apertura: "2026-09-30", estado: "Abierta",     adjudicatario: "" },
    { numero: "CP 11/2026", tipo: "Concurso de precios", objeto: "Provisión de combustible para flota municipal (3 meses)", monto: 36400000, apertura: "2026-09-12", estado: "En evaluación", adjudicatario: "" },
    { numero: "LP 02/2026", tipo: "Licitación pública",  objeto: "Enripiado de calles rurales — tramo norte",           monto: 212000000, apertura: "2026-07-08", estado: "Adjudicada",  adjudicatario: "Proveedor A (ejemplo)" },
    { numero: "CP 09/2026", tipo: "Concurso de precios", objeto: "Materiales para cordón cuneta barrio Estación",       monto: 41800000,  apertura: "2026-06-19", estado: "Adjudicada",  adjudicatario: "Proveedor B (ejemplo)" },
    { numero: "LPr 04/2026", tipo: "Licitación privada", objeto: "Juegos y equipamiento para el complejo de piletas",   monto: 27600000,  apertura: "2026-05-27", estado: "Adjudicada",  adjudicatario: "Proveedor C (ejemplo)" },
    { numero: "CD 21/2026", tipo: "Contratación directa", objeto: "Reparación de motoniveladora",                       monto: 8900000,   apertura: "2026-05-02", estado: "Finalizada",  adjudicatario: "Proveedor D (ejemplo)" }
  ],

  /* ---------------------------------------------------------------------
     Obras públicas en curso y finalizadas.
     --------------------------------------------------------------------- */
  obras: [
    { nombre: "Cordón cuneta y enripiado — barrio Estación", monto: 96000000,  financiamiento: "Fondos propios",           avance: 70,  estado: "En ejecución", inicio: "2026-06-01" },
    { nombre: "Recambio de luminarias LED — avenida de acceso", monto: 148500000, financiamiento: "Fondo provincial afectado", avance: 0,   estado: "En licitación", inicio: "" },
    { nombre: "Ampliación del Centro Cultural Estación",       monto: 118000000, financiamiento: "Programa nacional",        avance: 35,  estado: "En ejecución", inicio: "2026-03-15" },
    { nombre: "Enripiado de calles rurales — tramo norte",     monto: 212000000, financiamiento: "Fondos propios + provincia", avance: 15, estado: "En ejecución", inicio: "2026-08-10" },
    { nombre: "Nueva sala de bombas — red de agua potable",    monto: 64000000,  financiamiento: "Fondos propios",           avance: 100, estado: "Finalizada",   inicio: "2025-10-01" }
  ],

  /* ---------------------------------------------------------------------
     Personal municipal (dotación al cierre del período informado).
     --------------------------------------------------------------------- */
  personal: {
    corte: "2026-06-30",
    dotacion: [
      { tipo: "Planta permanente",           cantidad: 118 },
      { tipo: "Planta temporaria / contratados", cantidad: 46 },
      { tipo: "Funcionarios políticos",      cantidad: 9 },
      { tipo: "Concejo Deliberante",         cantidad: 11 }
    ]
  }
};
