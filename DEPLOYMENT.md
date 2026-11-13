# Despliegue — Monjes Rumberos

- **Proyecto Vercel:** `monjes-rumberos`
- **URL pública:** https://monjes-rumberos.vercel.app
- **Deployment de producción previo a la corrección full-bleed:** `dpl_6pxNuj4PKgeG7roGDCV4DMQsN1kg`
- **Framework informado por la API:** `null` (sitio estático / configuración Other).
- **Salida local de Fase 2:** `public/`, generada por `bash scripts/build-static.sh`.
- **Integración Git:** el proyecto no muestra un repositorio Git conectado en los datos recuperados de Vercel.

## Fase 2

El build copia `index.html`, `styles.css`, `layout-fix.css`, `scroll-scenes.js`, `app.js`, metadatos y recursos de `assets/` directamente a `public/`. El tarball anterior se conserva en `docs/archive/` únicamente como referencia histórica y no se utiliza en el build.

Los assets de escena llevan hash de contenido en el nombre de archivo. Esto permite servirlos con caché de larga duración e inmutabilidad, siempre que se configure esa política en Vercel.

## Configuración del proyecto (nota histórica)

La consulta inicial no expuso `buildCommand` ni `outputDirectory`. Para las publicaciones de archivos estáticos se reutiliza la configuración del deployment existente; no se ejecuta un build remoto.

- El contenido se entrega como archivos estáticos de `public/`.
- No hay framework ni dependencias de instalación.
- El proyecto no muestra un repositorio Git conectado; la publicación usa la API de archivos de Vercel.

## Fase 3

`scroll-scenes.js` forma parte del build estático. La iluminación dinámica y las animaciones de vista están verificadas localmente; el fallback se prueba de forma forzada en Chromium. No se han modificado las cabeceras ni la configuración remota de Vercel.

## Estado de publicación

Nota histórica: al cerrar la Fase 2, la producción se dejó intacta. La integración final de color, animación rasterizada y panel se completó después; el despliegue de producción se documenta en el apartado «Publicación final».


## Fase 4 — personajes animados

- `performer-motion.js` se incluye en el build estático y expone `window.MonjesPerformers` para el panel de ajustes de la Fase 5.
- `public/assets/monks/dance/` contiene WebP animado, pósteres WebP, GIF fallback y manifiesto.
- Los WebP animados son los recursos principales; los GIF se cargan únicamente si falla el WebP.
- El HTML comienza con el póster estático para garantizar una carga sin JavaScript y no forzar movimiento antes de evaluar `prefers-reduced-motion`.
- Producción sigue sin modificarse; no se ha creado deployment en esta fase.


## Fase 5 — controles interactivos

El build copia `performer-settings.js` y `vercel.json` junto con el contenido estático. El panel no requiere backend ni variables de entorno. El estado vive en memoria durante la sesión del navegador.

## Fase 6 — publicación

- El proyecto usa el mismo proyecto Vercel `monjes-rumberos` y el dominio `monjes-rumberos.vercel.app`.
- La carpeta `public/` es el artefacto estático autocontenido.
- `vercel.json` aplica cabeceras de seguridad, caché inmutable solo a escenas con nombre hash y caché revalidable al resto de assets.
- Primero debe generarse un deployment Preview y comprobarse en navegador real; solo después se debe asignar el alias de producción.
- No se debe promover un Preview distinto del artefacto probado.


## Publicación final — 13 de noviembre de 2026

**Producción desplegada y verificada.**

- Proyecto Vercel: `monjes-rumberos`.
- Dominio de producción: https://monjes-rumberos.vercel.app/
- Deployment de producción: `dpl_6pxNuj4PKgeG7roGDCV4DMQsN1kg`.
- URL inmutable del deployment: https://monjes-rumberos-4q4aaseot-angels-projects-42933b02.vercel.app/
- Estado Vercel: `READY`; target `production`.
- Alias asignado: `monjes-rumberos.vercel.app`.
- Preview verificado: https://monjes-rumberos-geozhggtf-angels-projects-42933b02.vercel.app/
- Deployment Preview: `dpl_8u25qUu59hvEhCHGjNvvvtQX8QD6`.
- Archivos estáticos publicados: 38.
- Peso estático total: 4,74 MB.

La primera Preview de ensayo falló porque el proyecto conservaba un Build Command anterior (`bash scripts/build-static.sh`) que no estaba incluido en el paquete de archivos estáticos. Se corrigió el ajuste del proyecto para publicación estática (`buildCommand` e `installCommand` vacíos, `outputDirectory` en la raíz) y se generó una Preview nueva. No se promovió la Preview fallida.

Antes de publicar se comprobaron por HTTP 200 el HTML, CSS, JavaScript, ocho fondos desktop, ocho fondos móviles, los WebP animados, los pósteres, los GIF fallback, los personajes y los metadatos. Después de publicar se volvió a comprobar el dominio de producción y los recursos críticos; todos devolvieron HTTP 200.


## Fase 6 — corrección full-bleed

- `main.page-shell` se amplía a `width: 100%` y deja de limitar el ancho de sus secciones.
- Los wrappers `.section-inner` y `.sound-panel__inner` aplican el ancho de lectura fluido, con railes laterales para los personajes en pantallas de escritorio.
- Se añade `layout-fix.css` después de `styles.css`, separado para mantener el sistema visual base sin duplicar reglas.
- El build copia `layout-fix.css`; el artefacto de producción contiene 39 archivos.
- QA Chromium: 2048, 1440, 1024, 768, 390 y 320 px. Cada sección y el panel de sonido se verifican a 100 % del viewport.
- La nueva capa cromática usa transparencias moderadas; no sustituye los fondos ni el contenido HTML.



## Corrección full-bleed — 13 de noviembre de 2026

- Preview verificado: `dpl_HoFU2oxLDKhB9jLELxufq1ygbm6D` — READY.
- Producción: `dpl_EWuWm71yCMmz97UA7uGMJv3U5RUK` — READY.
- Dominio: https://monjes-rumberos.vercel.app/
- HTML y CSS de layout publicados en el deployment nuevo.
- Para evitar duplicar 4,7 MB de imágenes, `vercel.json` del deployment de hotfix reescribe `/assets/*` al deployment inmutable `monjes-rumberos-4q4aaseot-angels-projects-42933b02.vercel.app`. El repositorio de código conserva la configuración normal, sin ese proxy temporal; una futura publicación Git con `npm run build` volverá a incluir los assets en `public/`.
