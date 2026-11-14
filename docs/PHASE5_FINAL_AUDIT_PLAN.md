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

## Bloqueos externos para la validación completa

1. **Google Cloud:** falta crear y restringir una API key para YouTube Data API v3.
2. **Vercel:** el repositorio no aparece vinculado a un proyecto en el contexto de Vercel conectado. Hay que vincularlo o seleccionar/crear el proyecto correcto.
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
