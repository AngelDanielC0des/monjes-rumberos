# Monjes Rumberos — entrega final

## Producción
- Web: https://monjes-rumberos.vercel.app/
- Deployment: `dpl_6pxNuj4PKgeG7roGDCV4DMQsN1kg`
- Estado Vercel: `READY` · `production`
- Corrección full-bleed: `dpl_EWuWm71yCMmz97UA7uGMJv3U5RUK`
- Preview validado: https://monjes-rumberos-geozhggtf-angels-projects-42933b02.vercel.app/

## Incluye
- Landing semántica y responsive, con secciones full-bleed al 100 % del viewport.
- Ocho fondos de sección con variantes desktop/móvil.
- Dos personajes laterales con cruces bordadas y transparencia.
- Ciclos de baile animated WebP, póster estático y GIF fallback.
- Iluminación cromática sincronizada con scroll.
- Panel accesible para pausar/reanudar y ocultar/mostrar los monjes.
- Configuración Vercel, pruebas, capturas, documentación y manifiestos SHA-256.

## Validación
- Geometría full-bleed y carriles fluidos: PASS en seis resoluciones (2048, 1440, 1024, 768, 390 y 320 px).
- JavaScript: `node --check` en los cuatro módulos.
- Smoke tests: PASS.
- Build estático: PASS.
- Chromium responsive: PASS en 1440, 1024, 768, 390 y 320 px.
- Recursos críticos de producción: HTTP 200.

## Límites conocidos
- La animación es rasterizada por fotogramas WebP/GIF, no un rig Rive editable.
- El formulario valida y copia la solicitud; todavía no la envía a un backend ni a un correo real.
- Los datos de oferta y formatos deben confirmarse con el colectivo.

Consulta `docs/FINAL_QA.md` y `DEPLOYMENT.md` para el detalle técnico.


## Corrección de layout — 13 de noviembre de 2026

La nueva iteración corrige el contenedor principal estrecho: todas las secciones pasan a full-bleed y el contenido se adapta al ancho del viewport mediante `.section-inner` y gutters fluidos. Los monjes conservan sus railes laterales y la iluminación de fondo se deja ver con un velo semitransparente. QA local superado en seis resoluciones, de 320 a 2048 px.
