# Fase 2 — Secciones adaptativas al viewport

## Auditoría de partida

El ancho de las seis secciones ya es full-bleed, pero no existe un contrato común de altura:

- Hero: `min-height: max(690px, min(980px, calc(100svh - 92px))`, con overrides en tablet y móvil.
- Secciones de contenido: padding vertical fijo o fluido, sin `min-height` general de viewport.
- Sonido: la altura depende del contenido del panel interior; el fondo no garantiza un panel de pantalla completa.
- Formatos: las tarjetas tienen alturas mínimas propias (incluida una tarjeta de 520–780 px), por lo que la sección puede necesitar más de una pantalla.
- Booking: el formulario pasa a una columna en móvil y puede superar la altura disponible.

El problema no se resuelve aplicando `height: 100vh`: eso recortaría manifiesto, tarjetas o formulario en pantallas bajas.

## Contrato adaptativo aprobado

1. Todas las secciones principales tienen una altura mínima igual al viewport dinámico: fallback `100vh`, después `100svh` y finalmente `100dvh`.
2. No se fija `height`: si el contenido requiere más espacio, la sección crece de forma natural y el usuario puede recorrerla con scroll.
3. Cuando el contenido cabe, la sección mide exactamente una pantalla y su contenido se centra verticalmente.
4. Se utiliza CSS Grid para la composición vertical y se conserva Flexbox/Grid interno para filas, tarjetas y formularios.
5. Hero y panel de sonido tienen tratamiento específico por sus elementos de fondo absolutos y sus indicadores decorativos.
6. Los paddings verticales son fluidos y no se suman a una altura fija; se calculan dentro del modelo de caja.
7. Las fotografías, overlays y personajes decorativos siguen sin capturar eventos ni tapar contenido.

## Viewports de regresión

La matriz cubre escritorio, tablet, móvil, orientación horizontal y poca altura:

- 2048 × 1134
- 1440 × 900
- 1024 × 768
- 823 × 523
- 768 × 900
- 568 × 320
- 390 × 844
- 320 × 740
- 844 × 390

## Criterios de aceptación

- Ancho de cada sección igual al viewport, sin overflow horizontal.
- Altura calculada como `max(viewportHeight, contenido + padding + bordes)`, con tolerancia de 2,5 px.
- Sin desbordamiento vertical interno ni contenido recortado.
- Secciones cortas centradas verticalmente cuando hay espacio disponible.
- Secciones largas expandibles, sin ocultar contenido, controles o focos.
- Fondos de escena cubren la altura completa de su sección.
- Se mantienen las reglas `prefers-reduced-motion`, el orden semántico y el foco visible.
- Smoke tests, Chromium y build estático en verde.

## Fuera de alcance

- No se implementa todavía la navegación de flechas arriba/abajo ni el controlador de scroll (Fase 3).
- No se añade todavía el reproductor/búsqueda de YouTube (Fase 4).
- No se modifica la coreografía ni los assets de los monjes (Fase 1 completada).

## Estado

**En curso.** Implementación del sistema de altura mínima adaptativa y regresión geométrica por viewport.
