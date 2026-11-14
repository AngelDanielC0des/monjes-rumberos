# Fase 5 — Auditoría final y activación de YouTube

## Objetivo

Auditar las fases 0–4, registrar la publicación del commit integrado en producción y completar la validación real del reproductor una vez configurada la clave de YouTube. PR #1 está fusionado; PR #2 sigue en borrador documental.

## Estado de partida

- Fase 0: línea base y rama de trabajo derivada de `main`.
- Fase 1: baile interpolado RIFE, CI y assets fuente originales preservados.
- Fase 2: secciones adaptativas, Chromium en nueve viewports y build.
- Fase 3: navegación por secciones, teclado contextual, foco, historial y movimiento reducido.
- Fase 4: búsqueda YouTube server-side y reproductor oficial integrados; CI verde y versión publicada. La búsqueda real sigue pendiente de credenciales.

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

- Proyecto: `monjes-rumberos`; dominio: `https://monjes-rumberos.vercel.app/`.
- Deployment Preview de validación: `dpl_Ft18Xuxe5v3UYRX19wiwRVjj9HeF`, estado `READY`, commit `3b6ec81`.
- Deployment Production: `dpl_9togGRra2CEfUmgBBBK6YyLGpLgP`, estado `READY`, commit exacto `3b6ec81a353d2dfd477895066257075ac7bfc7e8`.
- El alias `monjes-rumberos.vercel.app` apunta confirmado al deployment `dpl_9togGRra2CEfUmgBBBK6YyLGpLgP`; la portada pública devuelve HTTP 200.
- La portada sirve `youtube-player.js` y `section-navigation.js`. Los assets de baile y escenas comprobados responden HTTP 200.
- `GET /api/youtube-search?q=daft%20punk` devuelve HTTP 503 `youtube_not_configured`, respuesta esperada mientras falte `YOUTUBE_API_KEY`. La función está desplegada, pero todavía no puede buscar en Google.
- La lista de variables de entorno del proyecto devuelve `envs: []`; no existe `YOUTUBE_API_KEY` configurada.
- El proyecto no figura vinculado mediante integración Git persistente. El despliegue se realizó con Git source y SHA explícito; futuros pushes a `main` no se auto-publicarán hasta conectar el repositorio desde Vercel.
- La publicación de producción fue solicitada explícitamente por el propietario y se completó sin cambiar el dominio.

## Bloqueos para cerrar la validación real

1. **Google Cloud:** habilitar YouTube Data API v3 y crear una API key estándar restringida a esa API.
2. **Vercel Preview:** añadir `YOUTUBE_API_KEY` al entorno Preview y crear un nuevo Preview para probar una búsqueda real, la elegibilidad de vídeos y la reproducción oficial.
3. **Vercel Production:** después de validar Preview, añadir `YOUTUBE_API_KEY` al entorno Production y volver a desplegar el mismo commit.
4. **Automatización futura:** conectar GitHub con el proyecto Vercel existente si se desea que los futuros pushes a `main` desplieguen automáticamente. La publicación actual fue manual y fijada a SHA.
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

El CI del commit integrado en `main` está en verde. El Preview sin clave y la publicación en Production están completados y verificados por HTTP. La búsqueda y reproducción reales siguen pendientes de la clave de Google; la revisión visual/manual de accesibilidad sigue pendiente.

## Protección de producción

`main` contiene el merge de PR #1 y está publicado en `monjes-rumberos.vercel.app`. No realizar commits directos a `main`; toda corrección posterior debe ir en una rama nueva y PR. No cambiar el alias productivo ni desplegar código nuevo sin validación y autorización explícita.
