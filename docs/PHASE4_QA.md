# Informe de control de calidad — Fase 4

## Resultado

**Fase 4 implementada y verificada en la copia de trabajo.** La producción de Vercel no se ha modificado ni se ha creado un deployment nuevo.

## Entrega funcional

- Dos personajes decorativos independientes en los márgenes, posicionados con `position: fixed` durante el scroll.
- Dos ciclos de baile distintos en WebP animado, 9 fotogramas, 280 ms por fotograma y 2.520 ms por vuelta.
- GIF de fallback para cada personaje.
- Póster WebP estático para pausa, preferencia de movimiento reducido, pestañas ocultas y carga sin JavaScript.
- Controlador `performer-motion.js` con estados `dancing`, `paused` y `hidden`, y restauración mediante `visible`.
- API pública lista para la interfaz de ajustes de Fase 5.
- Originales PNG y WebP de Fase 1–3 conservados sin sobrescritura.

## Pruebas ejecutadas

| Comprobación | Resultado |
|---|---|
| `node --check performer-motion.js` | PASS |
| `node --check app.js` | PASS |
| `node tests/smoke-test.mjs` | PASS |
| `bash scripts/build-static.sh` | PASS |
| `python tests/browser-check.py` | PASS |
| Chromium responsive: 1440, 1024, 768, 390 y 320 px | PASS |
| Scroll timelines + fallback | PASS |
| Bailar / pausar / ocultar / restaurar | PASS |
| `prefers-reduced-motion` usa póster | PASS |
| Menú móvil y formulario | PASS |
| Posición fija de los personajes durante el scroll | PASS |

El proceso Python de pruebas imprime un aviso de warmup del runtime de hojas de cálculo del entorno, pero termina con código 0 y la suite Chromium pasa. El aviso no procede del proyecto.

## Limitaciones declaradas

1. La animación de esta fase es rasterizada por fotogramas (WebP/GIF), no un rig de huesos/mesh Rive.
2. Los PNG originales son imágenes aplanadas. Un rig Rive real requiere preparar capas articulables y reconstruir áreas ocultas.
3. Las dos figuras animadas son nuevas variantes visuales del concepto aprobado: túnica blanca, máscara LED, cruz, cinturón de cuerda y botas. No son calcos píxel a píxel de los PNG maestros originales, que permanecen intactos.
4. No se ha creado ni se afirma que exista un archivo `.riv`. El motivo técnico y el handoff están documentados en `docs/PHASE4_DANCE_SYSTEM.md`.

## Producción

- Sitio de producción intacto.
- Ningún deployment Preview o Production creado en esta fase.
- Build estático local regenerado en `public/`, listo para la fase final de despliegue controlado.
