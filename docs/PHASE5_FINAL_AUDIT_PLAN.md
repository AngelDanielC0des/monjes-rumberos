# Fase 5 — Auditoría final y preparación de Preview

## Objetivo

Auditar el resultado integrado de las fases 0–4 y preparar la validación real del reproductor. PR #1 ya está fusionado en `main`; esta fase no autoriza modificar directamente `main`, crear una nueva publicación de producción ni promover un Preview.

## Estado de partida

- Fase 0: línea base y rama de trabajo derivada de `main`.
- Fase 1: baile interpolado RIFE, CI y assets fuente originales preservados.
- Fase 2: secciones adaptativas, Chromium en nueve viewports y build.
- Fase 3: navegación por secciones, teclado contextual, foco, historial y movimiento reducido.
- Fase 4: búsqueda YouTube server-side y reproductor oficial integrados; CI verde. La integración real está pendiente de credenciales y Preview.

## Resultados de auditoría — 2026-11-14

### A. Integridad Git

- PR #1: fusionado el 14 de noviembre de 2026 a las 04:37:48 UTC.
- Commit de integración en `main`: `3b6ec81a353d2dfd477895066257075ac7bfc7e8`.
- HEAD de la rama del PR: `13c1e567e80df3b5db5f5f61d9c2a77ea239bcb3`.
- Base original del PR: `2448be30dc88d4b58606f2f3cfd1d975d6dfecb6`.
- PR #1 integró 87 commits y 32 archivos. La lista de cambios se limita a la landing, sus assets de baile, scripts, pruebas, CI y documentación de las fases 0–5.
- No se ha realizado ningún commit directo adicional en `main`. Esta auditoría documental continúa en una rama nueva basada en el commit de integración. PR #2 está abierto en borrador y contiene únicamente las dos actualizaciones documentales de Fases 4 y 5.

### B. CI, pruebas y build

**PASS — GitHub Actions**

La ejecución sobre el commit de integración es [43557606754](https://github.com/AngelDanielC0des/monjes-rumberos/actions/runs/43557606754), con resultado `success`. Pasaron todos estos pasos:

- Instalación de Node.js y Python y dependencias.
- Comprobaciones JavaScript y pruebas de humo.
- Tests unitarios de la función YouTube.
- Regresión de animaciones WebP.
- Regresión Chromium responsive.
- Build de despliegue estático.

El build estático genera 41 archivos. `api/youtube-search.js` permanece fuera de `public/`; el bundle incluye los controladores de navegación y reproductor.

### C. Integridad de assets de baile

- `assets/monks/dance/manifest.json` registra hashes SHA-256, tamaños, dimensiones, número de frames, duración y fuentes originales de ambos monjes.
- `tests/dance-webp-test.py` verifica los hashes reales de animaciones, posters, GIF fallback y WebP fuente.
- La prueba comprueba 63 frames a 25 FPS, duración de 2.520 ms, loop infinito, transparencia, conservación de las nueve poses fuente y continuidad del cierre del loop.
- La regresión de ambos monjes pasó en la última CI. Las fuentes originales siguen separadas en `assets/monks/dance/source/`.

### D. Seguridad

- `api/youtube-search.js` lee la clave exclusivamente desde `process.env.YOUTUBE_API_KEY` y la envía mediante `x-goog-api-key`; no la devuelve al cliente.
- La búsqueda de código de GitHub no devolvió coincidencias para patrones `AIza` ni `YOUTUBE_API_KEY` literal; el índice indicó resultados incompletos, por lo que esto no se presenta como una auditoría exhaustiva de todos los bytes.
- La prueba de humo comprueba que la función no contiene una clave API literal con formato Google.
- Los tests API cubren clave ausente, consulta inválida, origen externo, filtros oficiales, elegibilidad de vídeos, cuota agotada, errores de clave y fallos de red.
- `vercel.json` conserva `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y `Permissions-Policy` restrictiva.
- No se ha añadido ningún secreto al repositorio.

### E. Accesibilidad y responsive

- Chromium cubre nueve viewports para la landing y pruebas específicas del reproductor en orientación horizontal.
- La CI comprueba navegación de secciones por teclado, contenido largo, formularios, menú móvil, historial/hash, foco, Escape y coordinación entre paneles.
- El reproductor se dimensiona para no bajar de 200 × 200 px en los tamaños probados; YouTube recomienda 480 × 270 px para 16:9 con controles.
- La automatización no sustituye una auditoría manual con lector de pantalla ni una comprobación visual humana en dispositivos físicos.

### F. SEO

Se conservan title, description, canonical, Open Graph, Twitter metadata, sitemap y robots. No se ha eliminado el marcado SEO existente.

### G. Producción y Vercel

- Proyecto Vercel consultado: `monjes-rumberos`; dominio: `monjes-rumberos.vercel.app`.
- Último deployment de producción observado: `dpl_EWuWm71yCMmz97UA7uGMJv3U5RUK`, `READY`, creado el 13 de noviembre de 2026 a las 06:45:06 UTC, antes de la fusión de PR #1.
- Ese deployment conserva el árbol anterior de 11 archivos bajo `src/`; no contiene `youtube-player.js`, `section-navigation.js` ni `api/youtube-search.js`.
- No se ha observado un deployment posterior a la fusión. El alias productivo sigue asociado al deployment anterior; **la versión integrada en GitHub no está publicada en producción**.
- La ficha del proyecto no expone un vínculo Git con este repositorio. La consulta de variables de entorno devuelve `envs: []`; no existe `YOUTUBE_API_KEY` configurada.
- No se ha creado un nuevo deployment ni se ha cambiado ningún alias durante esta auditoría.

## Bloqueos para cerrar la validación real

1. **Google Cloud:** el propietario debe habilitar YouTube Data API v3 y crear una API key restringida a esa API.
2. **Vercel:** confirmar/vincular el proyecto correcto con este repositorio, sin cambiar el dominio productivo ni la rama de producción.
3. **Variable Preview:** configurar `YOUTUBE_API_KEY` en Preview, nunca en código, HTML ni variable pública.
4. **Preview Deployment:** crear un Preview de la versión integrada y probar búsqueda real, elegibilidad, reproducción, errores, cuota y dimensiones del iframe.
5. **Revisión manual:** comprobar visualmente la web y usar teclado/lector de pantalla antes de considerar cerrada la entrega.

La documentación oficial consultada confirma que `search.list` dispone de un bucket predeterminado de 100 llamadas diarias (una unidad por llamada), que `videos.list` devuelve `status.embeddable` y `status.madeForKids`, y que el reproductor exige un viewport mínimo de 200 × 200 px. Referencias:

- https://developers.google.com/youtube/data/reference/rest/v3/search/list
- https://developers.google.com/youtube/data/reference/rest/v3/videos
- https://developers.google.com/youtube/iframe_api_reference

## Criterios de cierre de la Fase 5

- CI verde sobre el último commit de la rama de auditoría.
- Informe y estado de Git/Vercel actualizados.
- Preview validado con una búsqueda real y reproducción real.
- Revisión manual visual y de accesibilidad completada.
- Limitaciones y SHA exacto documentados.

El CI del commit integrado en `main` está en verde y el informe Git/Vercel está actualizado. La CI de este PR documental se comprobará sobre su último commit antes de solicitar su integración. La validación Preview y la revisión manual siguen bloqueadas por la configuración de Google Cloud/Vercel.

## Protección de producción

`main` contiene ya el merge de PR #1. No realizar commits directos a `main`. Toda corrección posterior debe ir en una rama nueva y PR. No promover Preview a Production ni modificar el alias `monjes-rumberos.vercel.app` hasta disponer de validación real y autorización explícita.
