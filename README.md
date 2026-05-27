# 🌎 Atlas Político Mundial · 2026

Cartografía interactiva del poder mundial en 2026: **197 países**, sistemas electorales,
ideologías de gobiernos, calendario electoral 2026-2027, indicadores socioeconómicos
comparados (PBI, Gini, salario, presión tributaria, pobreza, IDH, deuda pública,
libertad de prensa) y análisis de cambios ideológicos en las elecciones recientes.

**Por [Lic. Emmanuel Miranda](https://www.linkedin.com/in/emiranda028/)** · Edición Beta · Mayo 2026

---

## 🚀 Demo

Abrí `index.html` en cualquier navegador moderno. No requiere build, ni servidor, ni instalación.

Una vez publicado:
- **GitHub Pages**: `https://<tu-usuario>.github.io/atlas-politico-mundial/`
- **Netlify**: la URL que te asigne tras conectar el repo

---

## 📋 Qué incluye

### Visualizaciones principales

- **Mapa mundial interactivo** (Leaflet) coloreado por ideología del ejecutivo, con sectores antárticos según el Tratado Antártico y reasignación territorial (Malvinas y Georgias del Sur como territorio argentino)
- **Calendario electoral** 2026-2027 con día específico cuando está confirmado, ordenado cronológicamente y clickeable
- **Filtros duales**: por ideología (10 categorías) y por continente (5 continentes), funcionando en simultáneo
- **Búsqueda de país** con autocompletado
- **Ficha detallada de cada país** con 8 indicadores socioeconómicos, foto del líder (vía Wikipedia API), datos electorales y composición legislativa

### Charts analíticos

1. **Distribución por signo político** — barras horizontales con conteo absoluto y porcentual
2. **Distribución por sistema de gobierno** — presidencialismo, parlamentarismo, monarquías, etc.
3. **El mundo por continente** — barras apiladas mostrando composición ideológica de cada región (clickeables)
4. **Género del jefe de gobierno** — donut + galería visual de las mujeres líderes con foto
5. **Ocho miradas, no una sola** — tabla comparativa multi-métrica por bloque ideológico
6. **Cruce entre dos variables** — scatter plot con cualquier par de dimensiones, hover-tooltip y click-to-detail
7. **Ranking por variable** — top 10 + bottom 5 ordenable
8. **Perfil comparativo de un país** — para cada país, ranking en cada variable + vecinos clickeables + sparkline de PBI 2020-2025
9. **¿Cambio o continuidad?** — análisis de las elecciones desde 2023: cuántos giros a la derecha, izquierda, off-axis y continuidades

### Decisiones editoriales explícitas

- **Malvinas / Georgias del Sur**: territorio argentino (Resolución 2065 ONU)
- **Antártida**: cartografía según Tratado Antártico 1959, con priorización del reclamo argentino sobre los superpuestos
- **Reino Unido sin sector antártico propio** (su reclamo está totalmente cubierto por Argentina + Chile)
- **Verbos descriptivos honestos**: para variables como pobreza o desigualdad, se usa "más pobreza que" en lugar de "mejor que" para evitar valoraciones engañosas
- **Símbolo monetario USD** explícito (no `$`) para evitar confusión con pesos en Latinoamérica

---

## 🗂️ Datos

### Fuentes principales

| Tipo | Fuente |
|------|--------|
| Resultados electorales | Organismos electorales nacionales (INE, ONPE, Servel, TSE, CNE), IDEA International, IPU Parline, Wikipedia |
| Crecimiento PBI | FMI World Economic Outlook 2025, Banco Mundial |
| Coeficiente de Gini | World Bank Poverty & Inequality Platform |
| Salario promedio mensual USD | OCDE, UNECE, ILO |
| Presión tributaria | OCDE Revenue Statistics 2025, CEPAL/CIAT/BID |
| Tasa de pobreza | Banco Mundial (línea nacional de pobreza) |
| Índice de Desarrollo Humano | PNUD HDR 2024 |
| Deuda pública / PBI | FMI 2024 |
| Libertad de prensa | RSF Press Freedom Index 2024 |
| Cartografía base | [datasets/geo-countries](https://github.com/datasets/geo-countries) (GeoJSON), tiles CARTO + OpenStreetMap |
| Fotos de líderes | Wikipedia / Wikimedia Commons (MediaWiki API) |

### Cobertura

- **197 países** (de los ~195 reconocidos por la ONU + Vaticano + países de reconocimiento parcial como Taiwán, Kosovo, Palestina)
- **~99% de la población mundial** representada
- **19 mujeres líderes** (9.7% del total)

### Limitaciones conocidas

- **Desfasaje temporal**: las series como Gini, salarios y pobreza tienen distinto año de medición según el país (algunas datan de 2010-2015 para Estados con datos escasos)
- **Solo PBI tiene serie temporal completa** (2020-2025); el resto son snapshots puntuales
- **Las clasificaciones ideológicas** son simplificaciones de un espectro multidimensional. Para análisis riguroso, consultar V-Dem, Manifesto Project o Chapel Hill Expert Survey
- **Correlación ≠ causalidad**: las asociaciones entre ideología y desempeño que muestran los charts pueden deberse a condiciones iniciales, recursos naturales o historia institucional

---

## 🛠️ Stack técnico

- **HTML / CSS / JavaScript estático** (sin frameworks, sin proceso de build)
- **[Leaflet](https://leafletjs.com)** 1.9 para el mapa interactivo
- **Tipografías**: Fraunces (serif italic editorial) e IBM Plex Sans/Mono (Google Fonts)
- **Datos en línea**: GeoJSON desde CDN (jsdelivr / GitHub), fotos de líderes vía MediaWiki API con CORS
- **Sin dependencias de runtime**: el archivo `index.html` es autocontenido y puede ejecutarse offline una vez cargados los recursos externos en caché

### Por qué un solo archivo HTML

Decisión deliberada por simplicidad de despliegue. El proyecto es estático, no requiere bundler, ni transpilación, ni gestor de paquetes. Esto facilita:
- Hostear gratis en GitHub Pages, Netlify, Vercel o cualquier servidor estático
- Auditar el código sin saltar entre módulos
- Modificar y previsualizar localmente abriendo el archivo en el navegador
- Garantizar que funcione por años sin mantenimiento de dependencias

---

## 📦 Despliegue

### Opción A: GitHub Pages (más simple)

1. Subí los archivos a un repo de GitHub
2. Andá a `Settings` → `Pages`
3. En "Source" elegí `Deploy from a branch` → rama `main` → carpeta `/ (root)`
4. Esperá ~1 minuto y vas a tener tu URL en `https://<usuario>.github.io/<repo>/`

### Opción B: Netlify (más profesional, custom domain)

1. Creá cuenta en [netlify.com](https://www.netlify.com)
2. `Add new site` → `Import from GitHub` → autorizá Netlify a leer tus repos
3. Seleccioná el repo. Como no hay build process, dejá los campos vacíos:
   - Build command: *(vacío)*
   - Publish directory: `/` o `.`
4. Click `Deploy site`. Vas a tener una URL `<random>.netlify.app` que podés cambiar a algo como `atlas-politico-mundial.netlify.app`
5. Si tenés un dominio propio, en `Domain settings` lo conectás

### Opción C: Local

```bash
# Cualquier servidor estático sirve
python3 -m http.server 8000
# o
npx serve .
```

Después abrís `http://localhost:8000`

---

## 📜 Licencia

Código fuente bajo [licencia MIT](LICENSE) — usalo, modificá, redistribuí libremente.

Los datos provienen de fuentes públicas con sus propias licencias (la mayoría CC-BY o equivalentes). La curaduría editorial y las clasificaciones ideológicas son responsabilidad del autor.

---

## 🙋 Autoría y contacto

**Lic. Emmanuel Miranda**
[LinkedIn — emiranda028](https://www.linkedin.com/in/emiranda028/)

Atlas elaborado en 2026.

Sugerencias, correcciones de datos o nuevas ideas: bienvenidas vía Issues en este repo.

---

## 📚 Cómo citar este atlas

Si usás este atlas en un artículo, presentación, trabajo académico o publicación,
agradezco el reconocimiento. Estos son los formatos sugeridos:

### Formato APA (7ma edición)

```
Miranda, E. (2026). Atlas Político Mundial 2026 [Visualización interactiva de datos].
   Recuperado de https://[tu-url-aquí]
```

### Formato breve (notas al pie, redes sociales)

```
Miranda, E. (2026). Atlas Político Mundial 2026. emiranda028 / GitHub.
```

### BibTeX (LaTeX)

```bibtex
@misc{miranda2026atlas,
  author = {Miranda, Emmanuel},
  title  = {Atlas Pol{\'i}tico Mundial 2026},
  year   = {2026},
  note   = {Visualizaci{\'o}n interactiva de datos},
  url    = {https://[tu-url-aquí]}
}
```

Para colaboraciones académicas o periodísticas que excedan la simple cita, contactame
por [LinkedIn](https://www.linkedin.com/in/emiranda028/).

---

## 🔮 Roadmap

Mejoras planeadas para próximas iteraciones:

- [ ] Pulido responsive para mobile
- [ ] Slider temporal de evolución 2020-2026 (versión snapshot inicial)
- [ ] Versión multilingüe (EN, PT)
- [ ] Embeds para incrustar charts específicos en otros sitios
- [ ] API/JSON exports para que la base sea reusable
- [ ] Comparación bilateral entre dos países lado a lado
- [ ] Más fechas específicas confirmadas en el calendario electoral
- [ ] Vista alternativa con proyección polar para Antártida sin distorsión Mercator

Si tenés feedback o querés contribuir con datos verificados, abrí un Issue.
