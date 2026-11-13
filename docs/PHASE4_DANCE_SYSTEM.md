# Monjes Rumberos — Fase 4: sistema de baile de personajes

## Estado

**Implementado en la copia de trabajo y pendiente de revisión visual del usuario.** No se ha desplegado ni modificado producción.

## Resultado

Los dos personajes de los márgenes se han convertido en elementos independientes y animados. Cada uno dispone de:

- Ciclo de 9 fotogramas con transparencia.
- WebP animado como formato principal.
- GIF animado como fallback para navegadores sin soporte WebP animado.
- WebP estático de póster para pausa, pestañas ocultas, movimiento reducido y carga sin JavaScript.
- Manifiesto con dimensiones, duración, tamaño y SHA-256.

Duración: 280 ms por fotograma, 2,52 segundos por vuelta, bucle infinito. Los dos ciclos son distintos y no están sincronizados entre sí, para evitar el efecto de dos figuras mecánicamente idénticas.

## Integración

`index.html` contiene dos elementos decorativos semánticamente neutros dentro de `.performers`. Los personajes se posicionan con CSS `fixed` en escritorio, tablet y móvil. Se mantienen detrás del contenido principal y no capturan eventos de puntero.

`styles.css` controla tamaño, posición, mezcla de luz, halo ambiental y reducción de opacidad en pantallas estrechas. Las imágenes conservan alpha.

`performer-motion.js` controla el estado de cada personaje sin bucles de JavaScript:

- `dancing`: muestra el WebP/GIF animado.
- `paused`: muestra el póster estático.
- `hidden`: oculta el personaje y detiene el recurso animado.

También cambia al póster si la pestaña no está visible. Cuando vuelve a primer plano, restaura el estado solicitado. Respeta `prefers-reduced-motion` por defecto; una llamada explícita a `playAll()` o `setState(id, 'dancing')` representa una elección deliberada del visitante.

## API para Fase 5

La API pública queda expuesta en `window.MonjesPerformers`:

```js
MonjesPerformers.getState('left');
MonjesPerformers.getEffectiveState('left');
MonjesPerformers.getSnapshot();
MonjesPerformers.setState('left', 'paused');
MonjesPerformers.setState('right', 'hidden');
MonjesPerformers.setState('right', 'visible');
MonjesPerformers.setAll('paused');
MonjesPerformers.playAll();
MonjesPerformers.pauseAll();
MonjesPerformers.hideAll();
MonjesPerformers.showAll();

const unsubscribe = MonjesPerformers.subscribe((snapshot) => {
  // Sincronizar el panel de ajustes de Fase 5.
});
```

Estados válidos: `dancing`, `paused`, `hidden`. `visible` restaura el último estado visible guardado.

Eventos:

- `monjes:performers-ready`
- `monjes:performers-change`

Ambos eventos llevan un snapshot de los estados solicitados y efectivos.

## Accesibilidad y rendimiento

- Las figuras son decorativas: `aria-hidden="true"`, `alt=""` y `pointer-events: none`.
- El HTML arranca con el póster estático. Sin JavaScript no hay autoplay, pero la composición permanece visible.
- Con `prefers-reduced-motion`, no se activa el recurso animado hasta que el visitante lo solicita expresamente.
- Al cambiar de pestaña, se sustituye el WebP animado por el póster para evitar decodificación innecesaria en segundo plano.
- No se usan timers, polling ni `requestAnimationFrame` permanente.
- Los ciclos pesan aproximadamente 128 KB y 154 KB en WebP animado; los pósteres pesan menos de 20 KB cada uno.

## Nota importante sobre Rive

Esta fase entrega **animación rasterizada por fotogramas (animated WebP/GIF) y un controlador de estados JavaScript**. No se debe describir como un rig Rive, un esqueleto de huesos ni un mesh deformable.

Los personajes originales disponibles son PNG aplanados. Para un rig de personaje real hacen falta capas articulables con zonas ocultas reconstruidas (capucha/cabeza, máscara, torso, brazos, mangas, cintura, faldón, piernas y botas), después huesos, pesos de malla, constraints/IK, timelines y una State Machine. El runtime Rive reproduce archivos `.riv`; el formato binario se exporta desde el Editor o la CLI de Rive. La CLI oficial construye `.riv` desde RML, pero no está instalada en este entorno y el entorno de ejecución no tiene acceso de red para instalarla.

La decisión de esta entrega es no inventar ni empaquetar un `.riv` falso. La animación funcional de los monjes se entrega ahora, y el rigging Rive auténtico queda como una mejora independiente si se dispone del editor/CLI y de los recortes por capas necesarios.

## Dirección visual de las animaciones

Los dos ciclos son variantes animadas de la dirección aprobada: túnica blanca, capucha, máscara LED, cruz frontal, cinturón de cuerda y botas negras. No son una reproducción píxel a píxel de los PNG maestros originales; los PNG originales y los masters con cruces se conservan sin cambios en `assets/source/`.

## Verificación

Se ejecutan:

```bash
node --check performer-motion.js
node --check app.js
node tests/smoke-test.mjs
python tests/browser-check.py
bash scripts/build-static.sh
```

La prueba de navegador cubre 1440, 1024, 768, 390 y 320 px, carga de animaciones, estados bailar/pausar/ocultar/restaurar, preferencia de movimiento reducido, menú móvil, scroll timelines y formulario.
