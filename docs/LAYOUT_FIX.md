# Corrección de layout full-bleed

## Causa raíz

El `main.page-shell` estaba limitado por `--page-width: 790px`; además, media queries reducían el ancho a 760px y 700px. Como todas las secciones vivían dentro de ese contenedor, las fotografías de fondo y el contenido quedaban confinados a una columna central.

## Solución

- `main.page-shell`: `width: 100%`, `max-width: none`, sin márgenes laterales.
- Cada sección y sus capas de escena ocupan el ancho completo del viewport.
- `.section-inner` y `.sound-panel__inner` gestionan la legibilidad mediante `width: min(calc(100% - 2 * var(--section-gutter)), var(--content-max))`, `max-width` y márgenes automáticos.
- En escritorio se reserva una banda lateral para los personajes fijos; en tablet y móvil se reduce el gutter y se adapta el grid a una columna.
- Los velos de contraste de las imágenes se han aclarado para que las fotografías y los halos cromáticos sigan visibles sin sacrificar la legibilidad.
- Los personajes permanecen por encima de los fondos, pero no bloquean los controles del contenido.

## Validación

`tests/browser-check.py` comprueba el ancho real de `main`, `hero`, `manifesto`, `ritual`, `formats`, `sound` y `booking`, y valida que el contenido use carriles fluidos. Viewports probados: 2048×1134, 1440×900, 1024×768, 768×900, 390×844 y 320×740. También comprueba `scrollWidth` para evitar overflow horizontal.

Resultado: PASS en las seis resoluciones.
