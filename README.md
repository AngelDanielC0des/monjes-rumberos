# Monjes Rumberos — landing page

Landing editorial nocturna para Monjes Rumberos. Sitio estático, sin framework ni backend: HTML semántico, CSS y JavaScript nativo. Preparado para Vercel, con secciones full-bleed y contenido fluido por viewport.

## Fase 2 — integración visual

- Ocho escenas con identidad propia: Hero, Manifiesto, Ritual, Clubs, Privados, Festivales, Pulso electrónico y Booking.
- Cada escena dispone de WebP desktop 16:9 y móvil 9:16, con nombres versionados por hash de contenido.
- Las imágenes son elementos decorativos semánticamente ocultos (`alt=""`, `aria-hidden="true"`); el texto sigue siendo HTML real.
- Hero se carga con prioridad alta; los demás fondos usan lazy loading y decodificación asíncrona.
- Overlays CSS específicos por escena preservan el contraste y el tono cinematográfico.
- Los dos personajes maestros incorporan cruces bordadas; el marco fijo de los márgenes se ha reconstruido con los nuevos personajes.
- Los PNG maestros originales de trabajo no se incluyen en este snapshot de GitHub; sí se conservan los WebP transparentes optimizados utilizados por la web.


## Fase 3 — iluminación dinámica por scroll

- Seis perfiles cromáticos principales: Hero, Manifiesto, Ritual, Formatos, Sonido y Booking.
- Interpolación continua en luz sRGB entre los colores primario y secundario de cada perfil; el color de acento se deriva de ambos.
- La posición de lectura se calcula al 48 % del viewport para que la transición acompañe el avance real del usuario.
- `scroll-scenes.js` mantiene geometría cacheada, actualiza una vez por frame solicitado y recalcula con `ResizeObserver`, resize, orientación y carga de fuentes.
- CSS Scroll-Driven Animations utiliza una *named view timeline* definida en la sección, evitando que el `overflow: hidden` de los contenedores de imagen se convierta en el scroll container equivocado.
- Fallback con `IntersectionObserver` cuando `view-timeline` no está disponible.
- `prefers-reduced-motion` elimina la interpolación continua y aplica cambios cromáticos discretos; también desactiva el movimiento de fondos.
- No hay bucle permanente de `requestAnimationFrame`, timers ni dependencias externas nuevas.

## Dirección visual

Base negro tinta, tipografía editorial serif + sans, iluminación magenta/cian, perfiles cromáticos por sección y fondos de discoteca con tratamientos independientes. Las imágenes no contienen titulares ni UI.

## Contenido y alcance

Incluye manifiesto, ritual en tres momentos, formatos de aparición, universo musical y formulario local de solicitud. El formulario no envía ni almacena datos: valida y copia el texto al portapapeles para compartirlo por el canal habitual. No se ha inventado un correo, teléfono ni perfil social.

## Estructura

- `index.html` — contenido, metadatos SEO/OG y picture elements.
- `styles.css` — sistema visual base, overlays y composición responsive.
- `layout-fix.css` — layout full-bleed, gutters adaptativos, railes laterales para personajes y contraste translúcido por sección.
- `app.js` — menú móvil, revelado progresivo y copia de solicitud.
- `scroll-scenes.js` — interpolación de paleta, detección de sección activa, view timelines y fallback.
- `performer-motion.js` — controlador de estado de los dos personajes animados; API `window.MonjesPerformers` para la Fase 5.
- `assets/sections/` — ocho escenas con variantes desktop/móvil y manifiesto de hashes.
- `assets/monks/` — personajes WebP transparentes y marco original conservado.
- `assets/monks/dance/` — dos ciclos de baile en WebP animado, pósteres estáticos, fallback GIF y manifiesto.
- `assets/source/` — los PNG maestros originales no están incluidos en este snapshot; los WebP transparentes optimizados están en `assets/monks/`.
- `assets/images/monjes-frame.webp` — preview social Open Graph.
- `tests/` — smoke test y comprobación Chromium responsive.
- `scripts/build-static.sh` — build estático reproducible desde los archivos fuente; no depende de un tarball obsoleto.

## Desarrollo local

```bash
python -m http.server 4173
# http://localhost:4173
```

## Verificación

```bash
node --check app.js
node tests/smoke-test.mjs
python tests/browser-check.py
bash scripts/build-static.sh
```

La prueba de navegador requiere Playwright para Python y Chromium.

## Despliegue

Proyecto Vercel: `monjes-rumberos`; dominio público: https://monjes-rumberos.vercel.app. La última corrección de layout se valida en Preview y se publica después de superar Chromium en seis anchos.

## Limitaciones conocidas

- El formulario sigue siendo local; falta un canal real de booking facilitado por el colectivo.
- Los formatos, estilos musicales y descripciones deben contrastarse con la oferta real.
- La Fase 4 incorpora ciclos de baile rasterizados (animated WebP) y una máquina de estados ligera en JavaScript. No son esqueletos ni meshes Rive.
- Para un rig Rive real se necesita separar cada personaje en capas articulables y compilar/exportar el `.riv` con Rive CLI/Editor; se documenta en `docs/PHASE4_DANCE_SYSTEM.md`.

## Fase 4 — personajes en movimiento

- Dos ciclos independientes de 9 fotogramas, 280 ms por fotograma (2,52 s por vuelta), exportados como WebP animado con alpha.
- Póster estático para pausa, pestaña oculta, `prefers-reduced-motion` y fallback sin JavaScript.
- API pública `window.MonjesPerformers`: `getState`, `getEffectiveState`, `setState`, `setAll`, `playAll`, `pauseAll`, `hideAll`, `showAll`, `getSnapshot` y `subscribe`.
- Sin `setInterval`, `requestAnimationFrame` permanente ni dependencias nuevas.


## Fase 5 — Panel de control de los monjes

- Cada monje es un botón semántico, accesible por teclado y con nombre accesible; al activarlo abre el mismo panel de ajustes.
- Un botón fijo de ajustes mantiene el acceso al panel aunque ambos personajes estén ocultos.
- El panel permite pausar/reanudar el baile y ocultar/mostrar los dos personajes.
- `Escape` cierra el panel; el foco vuelve al control que lo abrió; clic fuera lo cierra sin robar el foco.
- Las acciones de pausa/reproducción no hacen reaparecer personajes ocultos.
- El estado del panel se sincroniza con el controlador `window.MonjesPerformers`.
- `prefers-reduced-motion` conserva el póster estático; el visitante puede optar explícitamente por reanudar el baile.

## Entrega final

- `performer-settings.js` — interacción accesible del panel.
- `vercel.json` — cabeceras de seguridad, URLs limpias y caché diferenciada para assets versionados y no versionados.
- `docs/FINAL_QA.md` — pruebas, limitaciones y estado de publicación.
- `docs/phase5-settings-panel.jpg` — captura del panel interactivo.


## Producción

La landing está publicada en [monjes-rumberos.vercel.app](https://monjes-rumberos.vercel.app/). El deployment y sus comprobaciones HTTP están documentados en `DEPLOYMENT.md`.


## Fase 6 — secciones full-bleed y contenido fluido

- `main.page-shell` ocupa el 100 % del ancho disponible; deja de imponer un ancho máximo a todas las secciones.
- Los fondos de Hero, Manifiesto, Ritual, Sonido y Booking se extienden de borde a borde.
- `section-inner` y `sound-panel__inner` mantienen una medida de lectura fluida, con un máximo de 1760 px y gutters que reservan espacio para los monjes en pantallas grandes.
- Entre 1181 y 1600 px se ajusta el tamaño de los personajes y los márgenes; por debajo de 1180 px se reduce la opacidad de los personajes para priorizar la legibilidad.
- `sound-panel` también es full-bleed; el contenido permanece dentro de su contenedor fluido.
- Se incorpora un velo cromático semitransparente por sección para que las fotografías y la iluminación magenta/cian se perciban sin perder contraste.
- La capa de personajes se mantiene por encima de las imágenes de fondo, pero dentro de los railes laterales en escritorio.
- El HTML conserva landmarks semánticos y wrappers de contenido explícitos; no se usan anchos fijos por sección.

## Validación responsive de layout

Chromium comprueba 2048×1134, 1440×900, 1024×768, 768×900, 390×844 y 320×740. Se valida que main y cada sección midan exactamente el ancho del viewport, que las capas de fondo llenen la sección, que los contenedores internos no desborden y que los railes de personajes no invadan el contenido en escritorio.


## Desarrollo local

```bash
npm ci
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
npm run check
npm test
npm run build
```

El build estático se genera en `public/` (carpeta ignorada por Git). Vercel utiliza `npm run build` y `public` como directorio de salida.

La corrección de ancho completo y el sistema de carriles responsive están documentados en [`docs/LAYOUT_FIX.md`](docs/LAYOUT_FIX.md).
