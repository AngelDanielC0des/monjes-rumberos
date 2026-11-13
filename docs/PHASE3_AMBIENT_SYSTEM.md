# Monjes Rumberos — Informe de Fase 3

## Estado

**Implementada y verificada en la copia de trabajo.** No se ha publicado ni modificado el deployment de producción de Vercel.

## Resultado funcional

La iluminación global cambia de forma continua según la sección que ocupa la zona central de lectura del viewport. La página utiliza seis perfiles cromáticos:

| Sección | Primario | Secundario |
|---|---:|---:|
| Hero | `#6e42d8` | `#27c9e8` |
| Manifiesto | `#633b83` | `#c34b98` |
| Ritual | `#3858c7` | `#8a45d2` |
| Formatos | `#c74397` | `#4658c7` |
| Sonido | `#13bfd8` | `#8a42e0` |
| Booking | `#70427d` | `#328fa9` |

La interpolación se realiza en luz sRGB para evitar mezclas excesivamente oscuras. De los dos tonos interpolados se deriva un tercer token de acento para titulares y detalles de interfaz. Los fondos y los ocho escenarios de la Fase 2 se conservan sin recomprimir ni renombrar.

## Arquitectura

- `scroll-scenes.js`: módulo aislado de la lógica de navegación y booking.
- Anclas: hijos directos de `#contenido` que declaran `data-scene` y corresponden a los seis perfiles.
- Foco visual: `scrollY + 48 % de innerHeight`.
- Geometría: medida inicial y cacheada; recalculada con `ResizeObserver`, `resize`, `orientationchange`, carga de fuentes y retorno a una pestaña visible.
- Scheduling: listener `scroll` pasivo y un único `requestAnimationFrame` pendiente. No existe un bucle de animación permanente.
- CSS nativo: `view-timeline-name: --scene-view` se declara en cada sección; las imágenes descendientes consumen esa timeline nombrada. Esto evita enlazar accidentalmente `view()` al contenedor `.scene-media`, cuyo `overflow: hidden` lo convierte en un scroll container local.
- Fallback: `IntersectionObserver` activa una transformación ambiental sutil cuando no hay soporte de named view timelines.
- Movimiento reducido: no interpola tonos; cambia entre perfiles discretos y desactiva el desplazamiento de imágenes.

## Pruebas ejecutadas

- `node --check scroll-scenes.js`: PASS.
- `node --check app.js`: PASS.
- `node tests/smoke-test.mjs`: PASS.
- `bash scripts/build-static.sh`: PASS; `public/` contiene `scroll-scenes.js` y los 16 WebP de escenas.
- `python tests/browser-check.py`: PASS en 1440, 1024, 768, 390 y 320 px.
- Los seis perfiles se activan en su punto central y se verifica un color intermedio entre Hero y Manifiesto.
- La timeline nativa del Hero avanza en Chromium en los cinco viewports probados: aproximadamente del 50–54 % al 85–95 % según la altura disponible.
- Fallback forzado: `IntersectionObserver` añade `scene-in-view` y aplica la escala esperada.
- `prefers-reduced-motion`: paleta discreta, animación ambiental desactivada.
- Sin overflow horizontal, errores JavaScript ni fallos de carga de imágenes.
- Formulario de booking y menú móvil: regresión PASS.

Los resultados detallados están en `phase3-browser-results.json`.

## Capturas

- `phase3-preview-1440.jpg`
- `phase3-preview-1024.jpg`
- `phase3-preview-768.jpg`
- `phase3-preview-390.jpg`
- `phase3-preview-320.jpg`
- `phase3-lighting-contact-sheet.webp`
- `phase3-ambient-hero.jpg`, `phase3-ambient-manifesto.jpg`, `phase3-ambient-ritual.jpg`, `phase3-ambient-formats.jpg`, `phase3-ambient-sound.jpg`, `phase3-ambient-booking.jpg`

## Límites y siguiente fase

- La Fase 3 no implementa todavía rigging, máquinas de estado ni reproducción Rive.
- Los personajes siguen siendo assets WebP/PNG estáticos.
- No se ha realizado despliegue Preview ni Production; corresponde a la Fase 6.
- Siguiente: **Fase 4 — rigging Rive, coreografía en bucle y estados bailar / pausa / reposo**, conservando fallback estático y controles posteriores de la Fase 5.
