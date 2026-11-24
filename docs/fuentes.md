# Manual de fuentes y criterios — Atlas Político Electoral

> Borrador v0.1 (24/11/2026). Es la regla que siguen los agentes del equipo de datos (Vigía, Editor,
> Verificador y Jefe de redacción) y cualquier persona que actualice el Atlas.
> **Lo que está marcado con ☐ lo decide Emmanuel.** Hasta que lo decida, los agentes frenan y preguntan.

---

## 1. Principio

El Atlas publica **datos con fuente oficial**. Si un dato no tiene fuente oficial, no entra o
entra marcado como provisorio. La prensa y los agregadores (Wikipedia, ElectionGuide) sirven para
**enterarse** de que algo cambió, nunca para **confirmarlo**.

Cada dato que se carga deja rastro en la hoja "Registro de fuentes": qué cambió, valor anterior,
valor nuevo, URL de la fuente, fecha de consulta y quién lo verificó.

## 2. Niveles de confianza

| Nivel | Qué es | Se publica |
|---|---|---|
| **Alta** | Fuente oficial primaria: organismo electoral, boletín oficial, organismo estadístico, parlamento, gobierno | Sí |
| **Media** | Fuente oficial secundaria (organismo internacional que cita a la oficial) o dos medios de referencia independientes que coinciden, mientras no hay publicación oficial | ☐ Solo marcado "provisorio" |
| **Baja** | Un solo medio, redes sociales, Wikipedia, comunicados de partidos | No. Queda en "pendiente" |

Si dos fuentes oficiales se contradicen, **no se elige**: se reporta a Emmanuel.

## 3. Qué cuenta como "confirmado"

| Hecho | Se confirma con | Mientras tanto |
|---|---|---|
| Resultado de una elección | Escrutinio provisorio del organismo electoral (al 95% o más de mesas) | ☐ ¿Se publica el provisorio o se espera el definitivo? Propuesta: publicar el provisorio con la etiqueta "provisorio" y actualizar con el definitivo |
| Ganador en EE.UU. | Certificación de cada estado | ☐ ¿Se acepta el "llamado" de Associated Press como provisorio? Es el estándar de los medios, pero no es oficial |
| Cambio de jefe de gobierno o de Estado | Asunción efectiva (jura o decreto publicado), no el anuncio | Se anota como "asume el día X" en la ficha |
| Fecha de una elección | Decreto o resolución de convocatoria del organismo competente | Se carga como "tentativa" con la fuente del anuncio |
| Dato económico o social | Publicación del organismo (informe, base de datos o API) | No se estima ni se interpola |
| Encuesta | Ficha técnica (encuestadora, fecha de campo, casos, método, margen de error) publicada por la consultora o el medio que la encargó | Sin ficha técnica no entra al promedio |

## 4. Fuentes oficiales por tema

### Argentina — elecciones y gobierno
- Cámara Nacional Electoral (escrutinios definitivos, padrón, cronogramas): electoral.gob.ar
- Dirección Nacional Electoral (resultados provisorios, calendario): argentina.gob.ar/dine
- Boletín Oficial de la República Argentina (decretos de convocatoria, designaciones): boletinoficial.gob.ar
- Cámara de Diputados y Senado (composición de bloques, bancas): hcdn.gob.ar y senado.gob.ar
- **Provincias:** el tribunal o junta electoral de cada provincia y su boletín oficial (convocatorias, desdoblamientos, resultados). ☐ Completar la lista de las 24 en la hoja de fuentes.

### Argentina — economía y sociedad
- INDEC (pobreza, indigencia, desocupación, inflación, Censo): indec.gob.ar
- Calendario de publicaciones del INDEC: se usa para saber qué semana hay dato nuevo.

### Elecciones de otros países (las de los especiales y las más consultadas)
- Brasil: Tribunal Superior Electoral, tse.jus.br
- Chile: Servel, servel.cl
- Uruguay: Corte Electoral, corteelectoral.gub.uy
- Paraguay: Tribunal Superior de Justicia Electoral, tsje.gov.py
- Bolivia: Órgano Electoral Plurinacional, oep.org.bo
- Perú: ONPE (resultados) y JNE (proclamación), onpe.gob.pe y jne.gob.pe
- Ecuador: Consejo Nacional Electoral, cne.gob.ec
- Colombia: Registraduría Nacional, registraduria.gov.co
- México: Instituto Nacional Electoral, ine.mx
- España: Ministerio del Interior (resultados), infoelectoral.interior.gob.es; Junta Electoral Central; Boletín Oficial del Estado, boe.es
- EE.UU.: los organismos electorales de cada estado (secretarías de Estado) para la certificación
- Israel: Comité Central de Elecciones, bechirot.gov.il
- **Resto del mundo:** el organismo electoral del país. Para encontrarlo y para la composición de los parlamentos, Unión Interparlamentaria (Parline), data.ipu.org

### Indicadores internacionales (fichas y análisis)
- Crecimiento y deuda pública: FMI, World Economic Outlook (DataMapper)
- Gini, pobreza y población: Banco Mundial (World Development Indicators)
- Índice de Desarrollo Humano: PNUD, Informe sobre Desarrollo Humano
- Libertad de prensa: Reporteros sin Fronteras, clasificación anual

Regla: se usa **la última edición publicada** y se anota el año del dato. No se mezclan años distintos en un mismo gráfico sin decirlo.

### Encuestas
- Se cargan desde la consultora o el medio que la publicó, con ficha técnica.
- Agregadores (Wikipedia, Electomanía y similares) solo para encontrar encuestas, nunca como fuente final, salvo que la fuente original no se pueda abrir. En ese caso se anota "tomada del agregador, sin verificar en la fuente".
- No entran: sondeos internos de partidos, "voto seguro" o "techo" (no son intención de voto) ni encuestas sin fecha de campo.
- ☐ ¿Se marcan las consultoras con cercanía política conocida? Propuesta: sí, en la nota metodológica, sin excluirlas.

## 5. Criterios editoriales

- **Malvinas, Georgias y Sandwich del Sur:** territorio argentino (Resolución 2065 de la ONU). Así en mapas, fichas y textos.
- **Clasificación ideológica de cada gobierno:** la decide Emmanuel. Los agentes **nunca** cambian una clasificación por su cuenta. Si cambia el gobierno, proponen una clasificación con su justificación y esperan el OK.
- **Territorios dependientes:** se pintan con el país del que dependen. Las zonas en disputa quedan sin color. ☐ Confirmar el criterio para Gibraltar y Chipre del Norte (hoy sin color).
- **Lenguaje:** neutral y descriptivo. Se dice "ganó con el 51%", no "arrasó". Sin adjetivos que valoren a candidatos o partidos.
- **Cifras:** coma decimal y punto de miles (32,3%; 1.329). Siempre con unidad y año.
- **Fechas:** día de mes de año ("29 de noviembre de 2026").

## 6. Qué se revisa cada vez que cambia algo (lista para el Editor)

Si **cambia un líder**:
- [ ] Ficha del país: nombre, cargo, partido, fecha de asunción, género, foto (wikiName)
- [ ] Gobierno anterior (`PREVIOUS_IDEOLOGY`) y comentario del cambio
- [ ] Calendario y especiales donde aparezca
- [ ] Juegos (trivia, La rosca) si lo nombran

Si **hay una elección**:
- [ ] Resultados (que sumen como máximo 100%), participación, tipo de elección
- [ ] Próxima elección y fecha conocida
- [ ] Ficha del calendario: pasar a "ya votó" con el resultado
- [ ] Especial, si existe

Si **sale un dato del INDEC**:
- [ ] Ficha de Argentina, especial Argentina 2027 (nacional y por región o aglomerado)
- [ ] Test de percepción y prode, si usan ese dato

## 7. Qué no hacen nunca los agentes

- Publicar o mergear sin el OK de Emmanuel.
- Cargar un dato que no encontraron ("completar" con una estimación).
- Cambiar una clasificación ideológica o un criterio editorial.
- Publicar en redes, mandar mails o pagar algo.
- Pedir o guardar contraseñas.
