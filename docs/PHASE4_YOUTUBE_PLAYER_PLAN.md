# Fase 4 — Búsqueda y reproductor oficial de YouTube

## Objetivo

Añadir un botón de música junto al botón flotante de ajustes de los monjes. El visitante podrá buscar vídeos musicales en YouTube, elegir uno y reproducirlo en un reproductor oficial incrustado, sin extraer audio ni simular un reproductor no autorizado.

## Decisión técnica

**YouTube Data API v3 para búsqueda + YouTube IFrame Player API para reproducción.**

Son dos APIs oficiales con responsabilidades distintas:

- `search.list`: encuentra vídeos y devuelve metadatos/miniaturas.
- `videos.list`: comprueba el estado actual de los vídeos seleccionados, incluida la posibilidad de incrustarlos y su clasificación Made for Kids.
- IFrame Player API: crea el reproductor oficial y permite cargar, reproducir, pausar y escuchar sus eventos.

No se utilizarán scraping de resultados de YouTube, endpoints privados, extracción de audio, descargas ni streams directos.

## Arquitectura

### 1. Backend de búsqueda

- Crear `api/youtube-search.js` como Vercel Function en la carpeta raíz `api/`. Vercel documenta la detección automática de funciones en esa ubicación sin configuración adicional de runtime.
- Exponer únicamente `GET /api/youtube-search?q=...`.
- Guardar la credencial en la variable de entorno de Vercel `YOUTUBE_API_KEY`; nunca en JavaScript público, HTML, commits ni logs.
- La función consulta Google desde el servidor y envía la clave mediante el encabezado `x-goog-api-key`, evitando ponerla en la URL.
- Validar método, longitud y contenido de la búsqueda; limitar a seis resultados; normalizar el texto; manejar cuota agotada, clave ausente, timeout, errores upstream y respuestas malformadas.
- Devolver un DTO pequeño y estable: ID, título, canal, miniatura y URL canónica de YouTube. No devolver la clave ni la respuesta completa de Google.
- Cachear las búsquedas durante 120 segundos en CDN. No guardar el historial de búsquedas en el navegador ni usar paginación en V1.
- La función no realiza búsquedas automáticas por cada pulsación: solo se consulta al enviar el formulario, con Enter o botón.

### 2. Consulta oficial y elegibilidad

La búsqueda se limitará con parámetros compatibles con el objetivo:

- `part=snippet`
- `type=video`
- `videoEmbeddable=true`
- `maxResults=6`
- `regionCode=ES`
- `relevanceLanguage=es`
- `safeSearch=moderate`

Después, una única llamada `videos.list` por búsqueda comprobará en lote los IDs devueltos, solicitando `part=id,status`. Se descartarán los vídeos no incrustables y los designados Made for Kids, evitando incorporar contenido infantil sin el tratamiento de privacidad que exige YouTube.

### 3. Reproductor

- Cargar `https://www.youtube.com/iframe_api` solo después de una búsqueda explícita que devuelva al menos un vídeo elegible.
- Crear un único `YT.Player` reutilizable con el primer resultado en pausa (`autoplay=0`). La acción del usuario sobre «Reproducir» llama a `loadVideoById` directamente; las búsquedas posteriores reutilizan el mismo reproductor.
- Parámetros iniciales: `controls=1`, `autoplay=0`, `playsinline=1` y `origin` con el origen exacto del sitio.
- La reproducción comienza únicamente tras una acción explícita del usuario. Gestionar `onReady`, `onStateChange`, `onError` y `onAutoplayBlocked`.
- Conservar los controles y la marca oficiales de YouTube. No colocar overlays sobre el reproductor ni ocultar sus controles.
- El producto es un vídeo incrustado visible, no un extractor de audio ni un reproductor de música en segundo plano.

### 4. Interfaz y ubicación

- Añadir el botón de música inmediatamente a la izquierda del botón flotante de ajustes, agrupando ambos controles sin alterar la posición visual actual del botón de ajustes.
- Botón con nombre accesible, `aria-expanded` y `aria-controls`.
- Panel de reproductor anclado al grupo flotante, con búsqueda, estado de carga, errores, resultados y reproductor.
- Un solo panel flotante abierto a la vez: abrir música cierra ajustes y abrir ajustes cierra música. Escape cierra el panel activo y devuelve el foco al botón que lo abrió; al cerrar por clic exterior, el foco no queda dentro del panel oculto.
- Resultados como lista semántica, título y canal visibles, miniatura con texto alternativo apropiado y botón «Reproducir».
- Mensajes de carga, ausencia de resultados, error de API, vídeo no disponible y cuota agotada mediante una región `aria-live="polite"`.
- En escritorio, reservar un reproductor de aproximadamente 480 × 270 px. En móvil, adaptar el ancho al viewport y permitir scroll interno del panel sin ocultar el reproductor ni sus controles.
- No convertir el panel en un modal bloqueante ni tapar los controles nativos de YouTube.

## Requisitos oficiales y límites

- YouTube exige un viewport mínimo de 200 × 200 px para el reproductor incrustado y recomienda 480 × 270 px para 16:9 con controles.
- No se activará autoplay. YouTube advierte que el autoplay puede iniciar recopilación/compartición de datos al cargar el reproductor.
- La API cliente debe comprobar el estado Made for Kids antes de incrustar cada vídeo.
- La búsqueda `search.list` tiene un límite predeterminado de 100 llamadas diarias en su propio bucket de cuota; cada llamada cuesta una unidad en ese bucket. `videos.list` cuesta una unidad por llamada y utiliza el bucket general.
- La clave debe restringirse a YouTube Data API v3 y mantenerse en el entorno del servidor. No se expondrá al navegador.

## Configuración que requerirá el propietario

1. Crear o seleccionar un proyecto en Google Cloud.
2. Habilitar YouTube Data API v3.
3. Crear una API key y restringirla a YouTube Data API v3.
4. Añadirla en Vercel como `YOUTUBE_API_KEY` para los entornos que se vayan a probar/desplegar.
5. Ejecutar un Preview Deployment y validar búsqueda y reproducción real. Sin esta variable, la interfaz debe mostrar un mensaje claro de configuración pendiente y no fallar.

No se inventará ni se escribirá ninguna clave en el repositorio.

## Pruebas de aceptación

- La clave no aparece en el bundle estático, respuesta pública, logs ni repositorio.
- `api/youtube-search.js` valida parámetros, limita resultados, maneja timeout/errores y no devuelve datos sensibles.
- La búsqueda devuelve solo vídeos elegibles y comprueba `status.embeddable` y `status.madeForKids`.
- La cuota no se consume al escribir; una búsqueda explícita produce como máximo una llamada `search.list` y una `videos.list`.
- El reproductor oficial se inicializa una sola vez, carga el ID seleccionado y conserva controles nativos.
- No se reproduce nada automáticamente.
- `onAutoplayBlocked`, vídeo eliminado, restricción de inserción y error de red se comunican de forma accesible.
- El botón y el panel son operables con teclado; Escape cierra y restaura el foco.
- No se solapan los paneles de música y ajustes.
- El reproductor nunca baja de 200 × 200 px; el panel se adapta a 568 × 320, 390 × 844, 320 × 740 y escritorio.
- Se mantiene `prefers-reduced-motion`, no hay overflow horizontal y no se tapa contenido esencial.
- Smoke tests, tests de la función, Chromium y build estático pasan.
- El Preview Deployment se valida antes de cualquier promoción a producción.

## Fuera de alcance

- Descarga de vídeos o audio, extracción de streams y reproducción sin el reproductor oficial.
- Autoplay, reproducción oculta o audio-only.
- OAuth, likes, suscripciones, acceso a playlists privadas o cuentas personales.
- Reproducción simultánea de varios vídeos.

## Secuencia de implementación

1. Añadir endpoint Vercel y pruebas unitarias con fetch simulado.
2. Implementar búsqueda oficial y verificación de elegibilidad Made for Kids/embeddable.
3. Añadir el botón y el panel accesible junto a ajustes.
4. Integrar IFrame Player API con inicialización diferida y controles oficiales.
5. Resolver la coordinación entre paneles y el diseño responsive.
6. Ejecutar pruebas de seguridad, cuota, accesibilidad, Chromium y build.
7. Documentar configuración de Google Cloud/Vercel y validar un Preview Deployment.

## Estado de implementación

**FASE 4 IMPLEMENTADA E INTEGRADA EN `main`.** Commit de integración: `3b6ec81a353d2dfd477895066257075ac7bfc7e8`. PR #1 se fusionó el 14 de noviembre de 2026 a las 04:37:48 UTC. La CI del commit de integración terminó correctamente: [run 43557606754 — success](https://github.com/AngelDanielC0des/monjes-rumberos/actions/runs/43557606754).

Entregables integrados:

- `api/youtube-search.js`: Vercel Function GET, clave solo en servidor, búsqueda oficial, filtro de vídeos incrustables, comprobación Made for Kids, validación de consulta, timeout, errores, caché CDN y rechazo de peticiones cross-origin.
- `youtube-player.js`: panel accesible, búsqueda explícita, inicialización diferida, un único reproductor, reproducción por acción del usuario, pausa al cerrar/ocultar la pestaña y coordinación con ajustes.
- `index.html` y `styles.css`: botón junto a ajustes, panel responsive y reproductor con viewport mínimo de 200 × 200 px también en orientación horizontal de poca altura.
- Tests API con `fetch` simulado y regresión Chromium con IFrame Player API simulada. CI no consume cuota real.
- El build estático contiene 41 archivos y excluye `api/youtube-search.js` del directorio público.

### Estado de Git y producción después de la integración

- PR #1 está fusionado. Su commit de integración es `3b6ec81a353d2dfd477895066257075ac7bfc7e8`; el HEAD de la rama de trabajo era `13c1e567e80df3b5db5f5f61d9c2a77ea239bcb3`.
- El último deployment de producción de Vercel consultado es `dpl_EWuWm71yCMmz97UA7uGMJv3U5RUK`, estado `READY`, con alias `monjes-rumberos.vercel.app`. Se creó el 13 de noviembre de 2026 a las 06:45:06 UTC, antes de la fusión del PR.
- El árbol de ese deployment contiene únicamente la versión anterior (11 archivos bajo `src/`); no contiene `youtube-player.js`, `section-navigation.js` ni `api/youtube-search.js`. No se ha observado un deployment posterior a la fusión. Por tanto, el código está en GitHub, pero la nueva versión no está publicada en producción.
- La ficha del proyecto Vercel no expone un vínculo Git a este repositorio y la consulta de variables de entorno devuelve una lista vacía.

### Pendiente para activación real

- No se ha proporcionado ni configurado `YOUTUBE_API_KEY`. La función responde deliberadamente con HTTP 503 y un mensaje claro mientras falte la variable. Las pruebas verifican el contrato con respuestas simuladas; **la búsqueda real y la reproducción real todavía no se han probado contra Google/YouTube**.
- Falta habilitar YouTube Data API v3 en Google Cloud, crear una clave restringida a esa API y añadirla en Vercel como `YOUTUBE_API_KEY` únicamente en el entorno Preview.
- Después habrá que vincular el repositorio al proyecto Vercel correcto o crear un Preview controlado, probar la función y el reproductor reales, y revisar cuota/errores antes de plantear cualquier promoción.

No se debe incluir la clave en el repositorio, en HTML ni en variables públicas. No se ha modificado el alias productivo ni se ha desplegado esta versión a producción.

## Protección Git

PR #1 ya está fusionado. Cualquier corrección posterior debe realizarse en una rama nueva basada en `main` y pasar por su propio PR. No modificar directamente `main`, no promover Preview a Production y no cambiar el dominio productivo sin autorización explícita. La clave `YOUTUBE_API_KEY` debe configurarse únicamente en Vercel, en Preview, cuando esté disponible.

