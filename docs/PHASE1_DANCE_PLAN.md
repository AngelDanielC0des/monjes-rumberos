# Fase 1 — Baile interpolado

## Objetivo

Mejorar la fluidez perceptible de los dos monjes sin rediseñar sus identidades, alterar sus cruces/máscaras/túnicas ni perder transparencia.

## Línea base verificada

- Los dos WebP animados contienen 9 fotogramas declarados.
- La duración declarada es 280 ms por fotograma (2.520 ms por ciclo), equivalente a ~3,57 FPS.
- Se conservan los GIF fallback y los pósteres estáticos.
- El controlador `performer-motion.js` ya gestiona pausa, ocultación, visibilidad de pestaña y movimiento reducido.

## Secuencia de trabajo

1. **Inspección sin modificación:** extraer los fotogramas originales, comprobar duración real, dimensiones, alpha, límites de silueta y continuidad entre el último y el primer fotograma.
2. **Selección del método:** probar interpolación temporal con compensación de movimiento sobre las imágenes RGBA. La máscara alpha se tratará por separado para reducir halos y bordes contaminados.
3. **Generación candidata:** objetivo inicial 25 FPS (63 fotogramas por ciclo de 2,52 s), sin cambiar la duración total del baile.
4. **Control visual:** comparar original e interpolado mediante hojas de contacto sobre fondo oscuro y revisar especialmente manos, máscara LED, cruz, mangas, cintura, faldón y botas.
5. **Optimización:** medir peso, dimensiones, duración, decodificación y compatibilidad de WebP animado; conservar GIF fallback si sigue siendo necesario.
6. **Integración:** actualizar manifiestos, SHA-256, pruebas de humo, prueba Chromium y build estático.
7. **Entrega:** dejar cambios en esta rama y PR draft. No promover a producción ni fusionar automáticamente.

## Criterios de aceptación

- 25 FPS nominales, ciclo de 2.520 ms conservado y bucle sin pausa visible.
- Alpha conservado; sin rectángulos de fondo ni halos cian/magenta.
- Sin deformaciones evidentes, extremidades dobles, manos fantasma, máscara/cruz que cambien de forma o vibración de contorno.
- Ambos monjes conservan movimientos distintos y su apariencia reconocible.
- Los estados `paused`, `hidden`, pestaña oculta y `prefers-reduced-motion` continúan usando el póster estático.
- Sin nuevos timers ni bucles JS permanentes.
- Smoke tests, Chromium y build en verde.

## Estado

**En curso.** Primer paso: inspección automatizada de fotogramas y canal alpha. No se modifican todavía los assets de runtime.
