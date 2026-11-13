# Informe de integración — Fase 2

## Estado
**Implementación integrada en la copia de trabajo y verificada.** La producción Vercel permanece intacta; todavía no se ha publicado un deployment de esta fase.

## Escenas integradas
1. `01-hero` — club panorámico con escenario, público, láseres y cruz luminosa.
2. `02-manifiesto` — corredor monumental de inspiración gótica con cruces y suelo reflectante.
3. `03-ritual` — los dos monjes con máscaras LED aparecen entre el público.
4. `04a-formatos-clubs` — club/warehouse con bola de espejos y performer.
5. `04b-formatos-privados` — nuevo salón de eventos de alta resolución, con lámparas de cristal, arcos, cortinajes y ambos monjes.
6. `04c-formatos-festivales` — escenario de festival, multitud y performers.
7. `05-pulso-electronico` — dos monjes en cabina DJ.
8. `06-booking` — cabina y escenario oscuro con cruz luminosa.

Cada escena tiene WebP desktop panorámico y WebP móvil vertical 1080 × 1920. Los nombres de archivo llevan un hash SHA-256 truncado para cache busting.

## Decisiones técnicas
- `picture` + `source media` para seleccionar imagen vertical en móvil y panorámica en escritorio.
- `alt=""` y contenedor `aria-hidden="true"` porque los fondos son decorativos; todo el contenido legible sigue siendo HTML.
- Hero: `loading="eager"`, `fetchpriority="high"` y preload condicionado por media query.
- Fondos secundarios: `loading="lazy"` y `decoding="async"`.
- Overlays CSS por escena y tarjeta para mantener contraste y jerarquía tipográfica.
- `data-scene` y custom properties cromáticas preparan la Fase 3 sin introducir aún el cambio de tono por scroll.
- Marco fijo de los márgenes reconstruido con personajes que llevan cruces bordadas. Se conservan los maestros transparentes para rigging.
- El build copia directamente los archivos fuente a `public/`; se elimina la dependencia del tarball anterior. El tarball original se conserva en `docs/archive/` como referencia.
- Se ha sustituido el fondo privado de baja resolución por una nueva escena generada individualmente en alta resolución.

## QA ejecutado
- `node --check app.js`: PASS.
- `node tests/smoke-test.mjs`: PASS.
- `bash scripts/build-static.sh`: PASS; salida `public/` con 16 variantes WebP de escenas.
- `python tests/browser-check.py`: PASS en 1440, 1024, 768, 390 y 320 px.
- Las ocho imágenes de sección se cargan y usan la variante correspondiente al viewport.
- Sin overflow horizontal en los cinco anchos probados.
- Revelados por scroll, menú móvil, respeto de `prefers-reduced-motion` y formulario local: PASS.
- Auditoría HTML con parser: 6 secciones principales, 8 imágenes decorativas, 1 H1, sin IDs duplicados ni imágenes sin atributo `alt`.
- Auditoría CSS con `tinycss2`: 0 errores de parseo.
- Todas las referencias locales de imagen de HTML existen en el build `public/`.

## Capturas
`docs/phase2-preview-1440.jpg`, `1024`, `768`, `390` y `320` documentan la revisión responsive. `docs/phase2-backgrounds-contact-sheet.webp` reúne los ocho fondos finales.

## Fuera de alcance
- Animación cromática sincronizada con scroll (Fase 3).
- Rigging y baile Rive (Fase 4).
- Panel de ajustes para detener/ocultar personajes (Fase 5).
- QA de producción y despliegue (Fase 6).
