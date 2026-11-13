# Informe final de QA — Monjes Rumberos

## Estado de la entrega
**Código, assets, build estático y producción completados.** El deployment previo está documentado en `DEPLOYMENT.md`; la corrección full-bleed se ha añadido como una nueva versión y debe verificarse en Vercel antes de asignar el alias de producción.

## Funcionalidad verificada
- Ocho escenas con variantes desktop y móvil.
- Secciones full-bleed: cada sección, `main` y `sound-panel` ocupa el 100 % del viewport.
- Contenido con gutters fluidos y medida máxima de 1760 px; railes laterales reservados para los personajes en escritorio.
- Velo cromático semitransparente que deja ver las luces y los fondos sin perder legibilidad.
- Dos personajes laterales fijos, interactivos y con ciclos de baile animados.
- Panel de control accesible desde cualquiera de los dos personajes o desde el botón fijo de ajustes.
- Pausar/reanudar baile, ocultar/mostrar personajes y persistencia del estado mientras la página permanece abierta.
- El comando de reproducir/pausar no desoculta a personajes ocultos.
- Escape cierra el panel; clic fuera también; foco gestionado y etiquetas accesibles.
- Paleta ambiental continua por scroll con fallback y `prefers-reduced-motion`.
- Menú móvil y formulario local de booking conservados.

## Arquitectura de animación
- Formato principal: animated WebP con transparencia alfa.
- Nueve fotogramas por personaje, 280 ms por fotograma (ciclo de 2,52 s), bucle infinito.
- Póster WebP estático al pausar, con movimiento reducido o cuando la pestaña queda oculta.
- GIF animado como fallback de compatibilidad si el navegador no puede decodificar WebP animado.
- No se ha generado un rig esquelético Rive: no existen archivos `.riv`, huesos editables ni state machine Rive. La solución publicada debe describirse como animación rasterizada optimizada, no como Rive.

## Pruebas ejecutadas
- `node --check performer-motion.js` — PASS.
- `node --check performer-settings.js` — PASS.
- `node --check app.js` — PASS.
- `node tests/smoke-test.mjs` — PASS.
- `bash scripts/build-static.sh` — PASS.
- `python tests/browser-check.py` — PASS.
- Los archivos estáticos se verifican por SHA-1 y tamaño; el build ahora incluye `layout-fix.css`.
- Chromium: 2048, 1440, 1024, 768, 390 y 320 px.
- Geometría: ancho de `main`, Hero, Manifiesto, Ritual, Formatos, Sound Panel y Booking = ancho exacto del viewport; contenidos internos entre 65 % y 100 % en desktop; railes de personajes no solapan el contenido a partir de 1181 px.
- Comprobaciones: carga de ocho escenas, timelines de scroll, paletas y puntos intermedios, fallback IntersectionObserver, estados de animación, panel, pausa, reanudación, ocultación, restauración, reduced motion, menú móvil, formulario y ausencia de overflow horizontal / errores JS.

La ejecución de Python puede imprimir un aviso de warm-up del runtime de hojas de cálculo del entorno; el test Playwright final terminó con código de salida 0 y el mensaje PASS.

## Limitaciones conocidas
1. El formulario no envía solicitudes: valida y copia el contenido al portapapeles. Falta un endpoint y un canal real de contacto facilitado por el colectivo.
2. La coreografía está renderizada como WebP/GIF; no es un personaje 2D riggeado ni un archivo Rive editable.
3. Los datos de oferta, disponibilidad y formatos son texto de presentación y deben confirmarse con el colectivo.
4. La versión full-bleed supera QA local. La promoción a producción queda pendiente de validar la Preview de esta corrección.

## Seguridad y rendimiento
- Sin dependencias JavaScript nuevas.
- No se añaden cookies, analítica ni llamadas de seguimiento.
- Cabeceras de seguridad configuradas en `vercel.json`.
- Las escenas con hash reciben caché inmutable; los assets de nombre estable reciben caché revalidable.
- Animación detenida en pestañas no visibles y estática con `prefers-reduced-motion`.


## Verificación remota
La versión anterior de producción y sus recursos se verificaron por HTTP 200. La nueva corrección debe pasar la misma comprobación en Preview antes de actualizar el dominio principal.


## Corrección full-bleed publicada
- Deployment Preview: `dpl_HoFU2oxLDKhB9jLELxufq1ygbm6D` (READY).
- Deployment Production: `dpl_EWuWm71yCMmz97UA7uGMJv3U5RUK` (READY).
- Dominio: `https://monjes-rumberos.vercel.app/`.
- Se añadió `/layout-fix.css`; el HTML de producción ya lo enlaza.
- Las rutas `/assets/*` se reescriben al deployment inmutable anterior para conservar los assets existentes sin volver a subir las imágenes.
