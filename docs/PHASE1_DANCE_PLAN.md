# Fase 1 — Baile interpolado

## Objetivo

Mejorar la fluidez perceptible de los dos monjes sin rediseñar sus identidades, alterar sus cruces/máscaras/túnicas ni perder transparencia.

## Línea base verificada

- Los dos WebP animados contienen 9 fotogramas de 280 ms.
- Cada ciclo dura 2.520 ms (~3,57 FPS).
- Los GIF fallback y pósteres estáticos se mantienen como línea de base.
- El controlador `performer-motion.js` ya gestiona pausa, ocultación, visibilidad de pestaña y movimiento reducido.

## Evaluación de interpolación clásica

Se extrajeron los 9 fotogramas y se comprobó el canal alpha de ambos ciclos. Se hicieron prototipos con interpolación óptica clásica (Farneback, DIS y FFmpeg minterpolate). En los cambios amplios de brazos y mangas generaban imágenes dobles, sombras residuales o deformaciones de silueta. **Esos prototipos se descartan; no se integrarán en la web.**

## Método seleccionado

Se utiliza RIFE v4.9 (Real-Time Intermediate Flow Estimation), ejecutado localmente en CPU mediante ONNX Runtime:

- Modelo ONNX fijado a la revisión `18dcfbe2c349d5922e353708153581d2039c576c`.
- SHA-256 esperado: `76e4cef9ab42fa7dd4e8f6e4aba47462051e3faa969e4bca6479784fbab0ac6f`.
- Pesos declarados MIT en el repositorio de distribución, con atribución a hzwer / Practical-RIFE.
- Modelo: https://huggingface.co/edgetools/rife
- El modelo de 21,5 MB no se incorpora al bundle web ni al repositorio de assets de runtime.

RGB premultiplicado y canal alpha se interpolan por separado para conservar transparencia y minimizar halos. Los fotogramas fuente se conservan intactos como referencias de pose.

## Cadencia objetivo

- 25 FPS.
- 40 ms por fotograma.
- 63 fotogramas por ciclo de 2.520 ms.
- Siete muestras temporales por intervalo de origen (fotograma original + seis intermedios).
- Loop infinito, manteniendo la duración total del movimiento.

## Resultado de la revisión visual

Se generaron candidatos con el modelo RIFE v4.9 fijado y se revisaron hojas de contacto completas y fotogramas individuales.

| Métrica | Monje izquierdo | Monje derecho |
|---|---:|---:|
| Fotogramas de salida | 63 | 63 |
| Cadencia | 25 FPS | 25 FPS |
| Duración del ciclo | 2.520 ms | 2.520 ms |
| WebP candidato | 1.002.118 bytes | 1.225.764 bytes |
| SHA-256 | `0b2aeb2c4b83135858092795367a50217683db7601e4bea3f785873d7b1e6a01` | `2d3e5ad650c93aae685c5fe4314bdc874e674c413e2a4137d772cbfc7e5201b8` |

Comprobaciones sobre los candidatos:

- Los nueve fotogramas originales se conservan como poses de referencia en cada séptimo fotograma de salida.
- El error medio RGB de esas poses, medido sobre la silueta visible y tras recomposición alfa, es inferior a 1,5 niveles por canal.
- Todos los fotogramas conservan transparencia y opacidad completas en el canal alpha.
- El salto del último fotograma al primero no supera la variación media de los pasos normales del ciclo.
- No se observan duplicaciones evidentes de manos, arrastres de brazos ni deformaciones de la cruz/máscara en las hojas de contacto revisadas.
- Los prototipos ópticos clásicos se descartan y no se incorporan.

## Integración y control de regresión

Antes de sustituir los WebP de runtime, se preservará una copia exacta de cada fuente en `assets/monks/dance/source/`. Ese directorio no se copia al build público.

La publicación de candidatos ejecutará:

1. Actualización del manifiesto con número de fotogramas, duración, dimensiones, bytes y SHA-256.
2. Prueba Python del payload WebP real: 63 frames, 40 ms, 2.520 ms, alpha, loop y poses fuente.
3. Smoke tests y comprobación de integridad de assets.
4. Regresión responsive Chromium.
5. Build estático y comprobación de que los originales no se despliegan.

El GIF fallback y los pósteres estáticos se conservan sin cambios. El fallback GIF queda como compatibilidad heredada; los navegadores modernos utilizan el WebP interpolado.

## Estado

## Entrega verificada

- Commit de integración: `407148ac2c0facb609c72d12bfc833ec8998cd08`.
- PR: [#1 — Auditoría de línea base y rama limpia](https://github.com/AngelDanielC0des/monjes-rumberos/pull/1), sigue en borrador.
- CI de publicación: [run 43481860477](https://github.com/AngelDanielC0des/monjes-rumberos/actions/runs/43481860477) — **success**.
- JavaScript y smoke tests: PASS.
- Prueba de payload WebP: PASS en ambos monjes.
- Regresión responsive Chromium: PASS.
- Build estático: PASS.
- Se preservaron los WebP originales en `assets/monks/dance/source/`; el build confirma que no se publican.
- GIF fallback y pósteres permanecen sin cambios.
- `main` conserva el SHA base `2448be30dc88d4b58606f2f3cfd1d975d6dfecb6`; no se ha realizado despliegue ni promoción a producción.

La prueba de Chromium también se hizo más determinista: ahora espera a que se complete el scroll y compara el transform renderizado de la escena, en lugar de leer una instantánea potencialmente obsoleta de `animation.currentTime`.

## Estado

**FASE 1 COMPLETADA Y VERIFICADA.** Los dos monjes usan ciclos WebP interpolados de 63 fotogramas a 25 FPS, con la duración original de 2.520 ms. La rama de trabajo y el PR draft permanecen separados de producción.

**Siguiente:** Fase 2 — secciones adaptativas a la altura del viewport, con CSS Grid/Flexbox y expansión accesible cuando el contenido no cabe.
