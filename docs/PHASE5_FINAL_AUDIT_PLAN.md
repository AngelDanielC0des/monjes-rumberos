# Fase 5 — Auditoría final y preparación de entrega

## Objetivo

Cerrar la auditoría de las fases 0–4 y dejar la rama lista para una validación de Preview Deployment. Esta fase no autoriza fusionar el PR ni promover cambios a producción.

## Estado de partida

- Fase 0: línea base y rama limpia derivada de `main`.
- Fase 1: baile interpolado RIFE, CI y assets originales preservados.
- Fase 2: secciones adaptativas, Chromium en nueve viewports y build.
- Fase 3: navegación por secciones, teclado contextual, foco, historial y movimiento reducido.
- Fase 4: búsqueda YouTube server-side y reproductor oficial implementados; CI verde. La integración real está pendiente de la clave Google y del vínculo con Vercel.

## Auditoría final

### A. Integridad Git y producción

- Confirmar que la base del PR sigue siendo el SHA original de `main`.
- Confirmar que el PR continúa en borrador y no fusionado.
- Confirmar que ningún deployment de producción se ha creado o promovido durante el trabajo.
- Revisar el diff completo para detectar cambios ajenos al alcance.
- Verificar que los assets fuente originales de los monjes permanecen intactos y fuera del bundle público.

### B. Seguridad

- Verificar que no existe ninguna API key en HTML, JS público, repositorio, logs ni artefactos estáticos.
- Verificar que `YOUTUBE_API_KEY` solo se lee en `api/youtube-search.js`.
- Verificar validación de entrada, límite de resultados, timeout, mapeo de cuota, rechazo cross-origin y ausencia de CORS permisivo.
- Verificar que la función server-side no se copia a `public/`.
- Revisar los headers de seguridad ya definidos en `vercel.json`.
- Revisar que el reproductor no utiliza extracción de audio, scraping, autoplay ni controles superpuestos.

### C. Accesibilidad

- Validar navegación por enlaces, teclado, PageUp/PageDown y flechas.
- Validar que los controles interactivos conservan su comportamiento de teclado.
- Validar foco visible, restauración de foco, Escape, estados ARIA y mensajes `aria-live`.
- Validar `prefers-reduced-motion` en navegación, escenas y reproductor.
- Revisar etiquetas, jerarquía semántica, nombres accesibles y alternativas de imágenes.

### D. Responsive y experiencia

- Ejecutar Chromium en la matriz existente de nueve viewports.
- Revisar menú móvil, panel de ajustes y panel de YouTube en 568 × 320, 390 × 844, 320 × 740 y escritorio.
- Verificar reproductor de mínimo 200 × 200 px y controles visibles.
- Verificar ausencia de overflow horizontal y contenido tapado.
- Revisar orientación horizontal y alturas reducidas.

### E. Rendimiento y SEO

- Comprobar carga prioritaria del hero y lazy loading de escenas secundarias.
- Revisar peso y formato de imágenes/animaciones, carga diferida del IFrame API y número de solicitudes de búsqueda.
- Verificar metadatos, canonical, Open Graph, sitemap y robots.
- Confirmar que no se carga YouTube hasta que el visitante abre el flujo de búsqueda y obtiene resultados elegibles.

### F. Pruebas y build

- `npm run check`
- `npm run test:smoke`
- `npm run test:youtube-api`
- `npm run test:browser`
- `python tests/dance-webp-test.py`
- `npm run build`
- Confirmar que el bundle estático incluye el controlador de navegación y el reproductor, pero no la función API ni secretos.

## Resultados de auditoría automatizada — 2026-11-14

- **Git:** `main` conserva el SHA base `2448be30dc88d4b58606f2f3cfd1d975d6dfecb6`. El PR #1 sigue abierto, en borrador y sin fusionar.
- **CI del código:** PASS en el commit de código `d5ff15a65e3cbe4f15994cd2b560d696c4abeea0`, run [43556935180](https://github.com/AngelDanielC0des/monjes-rumberos/actions/runs/43556935180). Los commits posteriores registrados hasta este informe solo actualizan documentación.
- **Responsive:** Chromium cubre nueve tamaños de pantalla para la landing, y pruebas adicionales del panel YouTube en orientación horizontal de poca altura.
- **Accesibilidad automatizada:** navegación por teclado, secciones altas, foco, Escape, menú móvil, historial/hash, formularios y movimiento reducido verificados. No sustituye una revisión manual con lector de pantalla.
- **Build:** 41 archivos estáticos. La función `api/youtube-search.js` no se copia a `public/`.
- **Seguridad YouTube:** clave leída solo desde `process.env.YOUTUBE_API_KEY`; tests cubren ausencia de clave, restricciones de origen, parámetros oficiales, elegibilidad embeddable/Made for Kids, cuota y fallos upstream. No se ha encontrado ni añadido una clave real.
- **SEO:** se conservan title, description, canonical, Open Graph, Twitter metadata, sitemap y robots.
- **Vercel:** existe el proyecto `monjes-rumberos` y el alias productivo `monjes-rumberos.vercel.app`. La ficha de proyecto no muestra enlace Git a este repositorio y la lista de variables de entorno está vacía. No se ha creado ningún deployment ni se ha cambiado un alias.
- **Pendiente:** búsqueda real de YouTube, reproducción real del iframe y Preview Deployment, bloqueados hasta configurar la API key y confirmar/vincular el proyecto Vercel correcto.

## Bloqueos externos para la validación completa

1. **Google Cloud:** falta crear y restringir una API key para YouTube Data API v3.
2. **Vercel:** existe el proyecto `monjes-rumberos` y el dominio productivo `monjes-rumberos.vercel.app`, pero la ficha no muestra un vínculo Git con este repositorio. La lista de variables de entorno está vacía. Hay que confirmar el proyecto correcto y vincular el repositorio sin cambiar la rama de producción.
3. **Preview:** una vez configurado lo anterior, desplegar solo un Preview de la rama de trabajo y probar búsqueda, elegibilidad, reproducción, errores, cuota y dimensiones reales del iframe.

No se debe configurar la clave en el código fuente ni en variables públicas. Para la primera validación, usar el entorno Preview de Vercel; no añadir la clave al entorno Production todavía.

## Criterios de cierre

- Todas las pruebas automatizadas en verde sobre el último commit.
- Auditoría de diff y secretos sin hallazgos críticos.
- Preview Deployment validado con una búsqueda real y reproducción real.
- Informe final con resultados, limitaciones y SHA exacto.
- PR preparado para revisión humana, todavía sin fusionar.

## Protección de producción

`main` permanece intacta. No fusionar, no promover Preview a Production y no modificar el dominio productivo sin una instrucción explícita posterior.
