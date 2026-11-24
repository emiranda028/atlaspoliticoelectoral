# Registro de fuentes

Las tres planillas que usa el equipo de datos del Atlas. Viven en el repositorio (y no en
Google Sheets) para que los agentes las lean y actualicen en cada ronda sin depender de otra
conexión. Se abren con Excel, Google Sheets o directamente en GitHub.

| Archivo | Para qué sirve | Quién lo actualiza |
|---|---|---|
| `vigilancia.csv` | Qué vigilar: elecciones de los próximos meses, convocatorias pendientes, leyes en trámite, datos del INDEC e indicadores internacionales, con su fuente oficial y frecuencia | Vigía (propone) y Jefe de redacción (agrega y cierra filas) |
| `fuentes-provincias.csv` | El organismo electoral y el boletín oficial de cada una de las 24 provincias | Vigía (completa y marca `verificado = sí` solo con la URL oficial) |
| `cambios.csv` | Registro de cada dato cambiado: valor anterior, valor nuevo, fuente, confianza y PR | Editor (agrega una fila por cambio) y Verificador (confirma) |

Reglas: ver `docs/fuentes.md`. Las filas de `cambios.csv` con confianza "media" quedan como
tarea pendiente hasta conseguir la fuente oficial primaria.
