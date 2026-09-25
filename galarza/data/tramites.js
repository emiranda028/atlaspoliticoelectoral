/* ==========================================================================
   Guía de trámites — Municipalidad de General Galarza
   --------------------------------------------------------------------------
   Para agregar o editar un trámite, copiá un bloque { ... } y cambiá los
   textos. Campos:
     id          identificador corto, sin espacios (se usa en el enlace)
     titulo      nombre del trámite tal como lo buscaría un vecino
     categoria   una de las categorías de CATEGORIAS
     resumen     una línea: para qué sirve
     requisitos  lista de lo que hay que llevar
     pasos       lista de pasos en orden
     donde       oficina, dirección y horario
     costo       texto libre ("Sin costo", "Según Ordenanza Tributaria", ...)
     online      true si se puede iniciar por internet
     enlace      URL del sistema online, o "" si no hay
     palabras    sinónimos para que el buscador lo encuentre
   IMPORTANTE: los requisitos y costos cargados son orientativos y deben ser
   validados por cada área antes de publicar.
   ========================================================================== */

window.GALARZA_CATEGORIAS = [
  { id: "tasas",      nombre: "Tasas y pagos" },
  { id: "transito",   nombre: "Tránsito y licencias" },
  { id: "comercio",   nombre: "Comercio y producción" },
  { id: "obras",      nombre: "Obras y catastro" },
  { id: "social",     nombre: "Desarrollo social y salud" },
  { id: "ambiente",   nombre: "Ambiente y servicios" },
  { id: "registro",   nombre: "Certificados y registros" },
  { id: "cultura",    nombre: "Cultura, deporte y turismo" }
];

window.GALARZA_TRAMITES = [
  {
    id: "tasa-inmobiliaria",
    titulo: "Pagar la Tasa General Inmobiliaria",
    categoria: "tasas",
    resumen: "Consultá tu deuda, imprimí la boleta o pagá en línea la tasa de tu propiedad.",
    requisitos: ["Número de partida o padrón del inmueble", "DNI del titular (para pago presencial)"],
    pasos: ["Buscá tu partida en la boleta anterior o pedila en Rentas", "Elegí pagar en caja municipal, banco o medio electrónico", "Guardá el comprobante"],
    donde: "Oficina de Rentas — 25 de Mayo y Juan Carlos Burone. Lunes a viernes de 7 a 13 h.",
    costo: "Según Ordenanza Tributaria vigente. Descuento por pago anual anticipado.",
    online: true, enlace: "",
    palabras: "impuesto municipal boleta deuda casa terreno propiedad inmueble abl"
  },
  {
    id: "plan-pagos",
    titulo: "Adherir a un plan de pagos",
    categoria: "tasas",
    resumen: "Regularizá deudas de tasas municipales en cuotas.",
    requisitos: ["DNI del titular", "Número de partida o padrón", "Constancia de domicilio"],
    pasos: ["Pedí el detalle de deuda en Rentas", "Elegí la cantidad de cuotas", "Firmá el convenio y retirá las boletas"],
    donde: "Oficina de Rentas. Lunes a viernes de 7 a 13 h.",
    costo: "Sin costo de adhesión.",
    online: false, enlace: "",
    palabras: "moratoria cuotas deuda regularizar convenio"
  },
  {
    id: "tasa-comercio",
    titulo: "Pagar la Tasa de Inspección Sanitaria, Higiene y Seguridad (comercios)",
    categoria: "tasas",
    resumen: "Declaración y pago mensual de la tasa que abonan los comercios e industrias.",
    requisitos: ["Número de inscripción municipal", "Declaración jurada de ingresos del período"],
    pasos: ["Presentá la declaración jurada", "Generá la boleta", "Pagá antes del vencimiento"],
    donde: "Oficina de Rentas.",
    costo: "Según Ordenanza Tributaria (alícuota sobre ingresos, con mínimos por actividad).",
    online: true, enlace: "",
    palabras: "comercio higiene tish ddjj declaración jurada negocio"
  },
  {
    id: "licencia-conducir",
    titulo: "Sacar o renovar la licencia de conducir",
    categoria: "transito",
    resumen: "Licencia Nacional de Conducir: original, renovación, ampliación o duplicado.",
    requisitos: ["DNI con domicilio en General Galarza", "Certificado de antecedentes (CENAT) pagado", "Licencia anterior (si renovás)", "Grupo y factor sanguíneo"],
    pasos: ["Pedí turno en Tránsito", "Pagá el CENAT y la tasa municipal", "Hacé el examen psicofísico", "Rendí el examen teórico y práctico (licencia original)", "Retirá tu licencia"],
    donde: "Área de Tránsito municipal. Atención con turno.",
    costo: "Tasa municipal según Ordenanza + CENAT nacional.",
    online: false, enlace: "",
    palabras: "carnet registro manejar auto moto licencia cenat renovar"
  },
  {
    id: "libre-deuda-automotor",
    titulo: "Libre deuda de infracciones de tránsito",
    categoria: "transito",
    resumen: "Constancia de que no registrás multas en el Juzgado de Faltas municipal.",
    requisitos: ["DNI", "Dominio del vehículo"],
    pasos: ["Solicitalo en el Juzgado de Faltas", "Retirá la constancia"],
    donde: "Juzgado de Faltas municipal.",
    costo: "Según Ordenanza Tributaria.",
    online: false, enlace: "",
    palabras: "multas infracción vehículo transferencia auto"
  },
  {
    id: "habilitacion-comercial",
    titulo: "Habilitar un comercio",
    categoria: "comercio",
    resumen: "Permiso para abrir un local comercial, de servicios o industrial.",
    requisitos: ["DNI y constancia de CUIT", "Título de propiedad o contrato de alquiler del local", "Croquis del local", "Libre deuda de tasas del inmueble", "Carnet de manipulador de alimentos (si corresponde)"],
    pasos: ["Consultá si la actividad está permitida en esa zona", "Presentá la solicitud con la documentación", "Inspección del local (bromatología / seguridad)", "Retirá el certificado de habilitación"],
    donde: "Área de Comercio y Bromatología.",
    costo: "Derecho de habilitación según Ordenanza Tributaria.",
    online: false, enlace: "",
    palabras: "negocio local abrir emprendimiento permiso habilitación kiosco almacén"
  },
  {
    id: "carnet-manipulador",
    titulo: "Carnet de manipulador de alimentos",
    categoria: "comercio",
    resumen: "Curso y carnet obligatorio para quienes elaboran o venden alimentos.",
    requisitos: ["DNI", "Foto carnet"],
    pasos: ["Inscribite al próximo curso", "Asistí y aprobá la evaluación", "Retirá el carnet"],
    donde: "Bromatología municipal.",
    costo: "Consultar.",
    online: false, enlace: "",
    palabras: "bromatología comida curso alimentos gastronomía"
  },
  {
    id: "feria-emprendedores",
    titulo: "Inscribirme en la feria de emprendedores",
    categoria: "comercio",
    resumen: "Registro para participar de ferias en el Parque Paseo del Ferrocarril.",
    requisitos: ["DNI", "Descripción y fotos de los productos"],
    pasos: ["Completá la ficha de inscripción", "Esperá la confirmación de lugar"],
    donde: "Área de Producción / Cultura.",
    costo: "Sin costo.",
    online: true, enlace: "",
    palabras: "feria artesanos emprendedor stand vender productos"
  },
  {
    id: "permiso-edificacion",
    titulo: "Permiso de edificación (planos de obra)",
    categoria: "obras",
    resumen: "Aprobación de planos para construir, ampliar o regularizar una vivienda.",
    requisitos: ["Planos firmados por profesional matriculado", "Título de propiedad", "Libre deuda de tasas", "Pago de derechos de construcción"],
    pasos: ["Presentá los planos en Obras Públicas", "Revisión técnica", "Pagá los derechos", "Retirá los planos aprobados"],
    donde: "Secretaría de Obras y Servicios Públicos.",
    costo: "Derechos de construcción según metros cuadrados (Ordenanza Tributaria).",
    online: false, enlace: "",
    palabras: "construir casa planos ampliación obra ampliar arquitecto relevamiento"
  },
  {
    id: "certificado-catastral",
    titulo: "Certificado de libre deuda para escrituras",
    categoria: "obras",
    resumen: "Informe que piden las escribanías para vender o comprar un inmueble.",
    requisitos: ["Solicitud del escribano o del titular", "Datos catastrales del inmueble"],
    pasos: ["Presentá la solicitud", "Retirá el certificado en el plazo indicado"],
    donde: "Oficina de Rentas / Catastro.",
    costo: "Según Ordenanza Tributaria.",
    online: false, enlace: "",
    palabras: "escritura venta compra escribano catastro libre deuda"
  },
  {
    id: "conexion-agua",
    titulo: "Conexión de agua potable o cloacas",
    categoria: "obras",
    resumen: "Solicitud de nueva conexión domiciliaria a la red.",
    requisitos: ["DNI del titular", "Libre deuda de tasas", "Número de partida"],
    pasos: ["Solicitá la conexión", "Pagá el derecho de conexión", "Coordiná la fecha de obra"],
    donde: "Obras y Servicios Públicos.",
    costo: "Derecho de conexión según Ordenanza Tributaria.",
    online: false, enlace: "",
    palabras: "agua cloaca conexión red servicio"
  },
  {
    id: "asistencia-social",
    titulo: "Pedir asistencia social",
    categoria: "social",
    resumen: "Orientación y ayuda para familias en situación de vulnerabilidad.",
    requisitos: ["DNI de todo el grupo familiar", "Constancia de ingresos (si tenés)"],
    pasos: ["Acercate a Desarrollo Social", "Entrevista con trabajador/a social", "Seguimiento del caso"],
    donde: "Área de Desarrollo Social.",
    costo: "Sin costo.",
    online: false, enlace: "",
    palabras: "ayuda social módulo alimentario subsidio garrafa asistencia"
  },
  {
    id: "turno-caps",
    titulo: "Turno en el centro de salud",
    categoria: "social",
    resumen: "Turnos para medicina general, pediatría, vacunación y controles.",
    requisitos: ["DNI", "Carnet de vacunas (si corresponde)"],
    pasos: ["Pedí turno por teléfono o de forma presencial", "Asistí con 10 minutos de anticipación"],
    donde: "Centro de salud municipal.",
    costo: "Sin costo.",
    online: false, enlace: "",
    palabras: "médico salud turno vacuna pediatra hospital caps enfermería"
  },
  {
    id: "reclamo",
    titulo: "Hacer un reclamo (luminarias, calles, residuos)",
    categoria: "ambiente",
    resumen: "Avisá sobre un problema en la vía pública y seguí su estado.",
    requisitos: ["Dirección o referencia del lugar", "Foto (opcional)"],
    pasos: ["Completá el formulario de reclamos", "Anotá el número de reclamo", "Te avisamos cuando se resuelva"],
    donde: "En línea o en Mesa de Entradas.",
    costo: "Sin costo.",
    online: true, enlace: "contacto.html#reclamos",
    palabras: "luz poste lampara bache calle basura reclamo queja arreglo zanja cuneta perro"
  },
  {
    id: "retiro-ramas",
    titulo: "Retiro de ramas y residuos voluminosos",
    categoria: "ambiente",
    resumen: "Pedí que pasen a buscar ramas, escombros o muebles viejos.",
    requisitos: ["Dirección"],
    pasos: ["Solicitalo por formulario o teléfono", "Dejá los residuos en la vereda el día indicado"],
    donde: "Servicios Públicos.",
    costo: "Sin costo para volúmenes domiciliarios.",
    online: true, enlace: "contacto.html#reclamos",
    palabras: "ramas poda escombro muebles chatarra residuos voluminosos"
  },
  {
    id: "castracion",
    titulo: "Turno para castración de mascotas",
    categoria: "ambiente",
    resumen: "Castración gratuita de perros y gatos en jornadas programadas.",
    requisitos: ["DNI del responsable", "Mascota en ayuno de 12 horas"],
    pasos: ["Anotate para la próxima jornada", "Llevá a tu mascota el día asignado"],
    donde: "Área de Ambiente / Zoonosis.",
    costo: "Sin costo.",
    online: true, enlace: "",
    palabras: "perro gato mascota castrar veterinaria zoonosis"
  },
  {
    id: "certificado-residencia",
    titulo: "Certificado de residencia",
    categoria: "registro",
    resumen: "Constancia de domicilio en la localidad.",
    requisitos: ["DNI con domicilio en General Galarza", "Boleta de algún servicio a tu nombre"],
    pasos: ["Solicitalo en Mesa de Entradas", "Retiralo firmado"],
    donde: "Mesa de Entradas municipal.",
    costo: "Según Ordenanza Tributaria.",
    online: false, enlace: "",
    palabras: "domicilio constancia vivo residencia"
  },
  {
    id: "mesa-entradas",
    titulo: "Presentar una nota o expediente",
    categoria: "registro",
    resumen: "Cualquier pedido formal al Departamento Ejecutivo o al Concejo Deliberante.",
    requisitos: ["Nota firmada con tus datos de contacto", "DNI"],
    pasos: ["Presentá la nota en Mesa de Entradas", "Recibí el número de expediente", "Consultá el estado con ese número"],
    donde: "Mesa de Entradas. Lunes a viernes de 7 a 13 h.",
    costo: "Sin costo.",
    online: false, enlace: "",
    palabras: "nota pedido expediente solicitud carta intendente concejo"
  },
  {
    id: "acceso-informacion",
    titulo: "Solicitar información pública",
    categoria: "registro",
    resumen: "Pedí cualquier dato o documento en poder del municipio.",
    requisitos: ["Nombre y forma de contacto", "Descripción de la información que buscás"],
    pasos: ["Completá la solicitud", "Recibí respuesta en el plazo previsto por la normativa"],
    donde: "En línea o en Mesa de Entradas.",
    costo: "Sin costo.",
    online: true, enlace: "transparencia.html#acceso",
    palabras: "transparencia información pública pedido acceso datos"
  },
  {
    id: "complejo-piletas",
    titulo: "Entradas y carnet para el complejo de piletas",
    categoria: "cultura",
    resumen: "Temporada de verano: pileta, juegos acuáticos, camping y parrillas.",
    requisitos: ["DNI", "Apto físico (para carnet de temporada)"],
    pasos: ["Consultá tarifas de temporada", "Tramitá el carnet o aboná la entrada diaria"],
    donde: "Complejo municipal de piletas.",
    costo: "Tarifas diferenciadas para residentes.",
    online: false, enlace: "",
    palabras: "pileta natatorio verano camping balneario carnet"
  },
  {
    id: "talleres",
    titulo: "Inscribirme en talleres culturales y deportivos",
    categoria: "cultura",
    resumen: "Escuelas deportivas, danzas, música, artes y oficios.",
    requisitos: ["DNI", "Autorización de madre/padre/tutor para menores"],
    pasos: ["Elegí el taller", "Completá la inscripción", "Asistí a la primera clase"],
    donde: "Centro Cultural Estación / Polideportivo.",
    costo: "Mayoría sin costo.",
    online: true, enlace: "",
    palabras: "taller curso deporte fútbol danza música arte escuela"
  },
  {
    id: "uso-espacios",
    titulo: "Pedir un espacio público para un evento",
    categoria: "cultura",
    resumen: "Uso del Parque Paseo del Ferrocarril, salón o playón para actividades.",
    requisitos: ["Nota con fecha, horario y tipo de evento", "DNI del responsable"],
    pasos: ["Presentá la nota con 15 días de anticipación", "Esperá la autorización"],
    donde: "Mesa de Entradas / Área de Cultura.",
    costo: "Según tipo de evento.",
    online: false, enlace: "",
    palabras: "evento salón espacio fiesta parque estación reserva"
  }
];
