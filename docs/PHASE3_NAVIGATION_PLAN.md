# Fase 3 — Navegación guiada y accesibilidad

## Estado

**FASE 3 COMPLETADA Y VERIFICADA.** Implementación en la rama de trabajo, con CI verde en el commit `b5ed215b12259a82a2a71de78adaf6932f1620e8` (run [43554933589](https://github.com/AngelDanielC0des/monjes-rumberos/actions/runs/43554933589)). No se modifica producción.

## Objetivo

Permitir recorrer la landing por secciones con ratón, trackpad, teclado, enlaces y controles táctiles sin convertir el sitio en un scroll secuestrado. La navegación debe seguir funcionando cuando una sección adaptativa crezca más que el viewport.

## Principios de implementación

1. **Scroll nativo primero.** No interceptar globalmente la rueda ni implementar un motor de desplazamiento con `requestAnimationFrame` propio.
2. **Anclas reales.** Cada sección de primer nivel debe tener un ID estable y cada navegación debe ser un enlace HTML `href="#id"`.
3. **Snap no obligatorio.** Evaluar `scroll-snap-type: y proximity` como ayuda opcional, solo si Chromium/Playwright demuestra que no recorta ni dificulta secciones altas. No usar `mandatory`.
4. **Teclado contextual.** PageUp/PageDown y flechas solo podrán avanzar por secciones cuando el foco esté en el documento o en un contenedor de sección no interactivo, y la sección actual quepa en el viewport. En formularios, inputs, selects, textareas, enlaces, botones, reproductores, paneles y elementos editables se conserva el comportamiento nativo.
5. **Contenido alto.** Si la sección activa desborda el viewport, las teclas y la rueda desplazan su contenido de forma nativa antes de cambiar de sección.
6. **Foco no intrusivo.** El scroll con rueda/touch no mueve el foco. La navegación explícita por teclado o por un enlace puede enfocar la sección destino con `tabindex="-1"`, sin desplazar de nuevo la página.
7. **Estado anunciado.** El enlace de navegación de la sección actual usa `aria-current="location"`. No crear regiones live que anuncien cada píxel de scroll.
8. **Movimiento reducido.** `prefers-reduced-motion: reduce` desactiva el desplazamiento suave y cualquier transición ornamental de navegación.
9. **Sin duplicar navegación.** Desktop y móvil comparten los mismos destinos; al activar un enlace móvil, el menú se cierra y el foco vuelve a un punto lógico.
10. **Fallback.** Sin JavaScript todos los enlaces, IDs y controles de navegación siguen siendo útiles.

## Correcciones estructurales detectadas

- La sección de sonido tiene `data-scene="sound"` pero carece de ID propio. Añadir `id="sonido"`.
- El menú principal y el menú móvil omiten el destino de sonido. Añadir enlace «Pulso electrónico» a ambos.
- Mantener los identificadores existentes: `inicio`, `manifiesto`, `ritual`, `formatos`, `booking`.

## Diseño de interacción

- Navegación por enlaces: desplazamiento suave nativo a la sección destino, salvo movimiento reducido.
- Indicador de sección: usar los enlaces ya existentes como estado activo; no añadir una segunda barra flotante que compita con el header.
- Teclado: PageDown/ArrowDown y PageUp/ArrowUp podrán ir a la sección siguiente/anterior cuando no exista contenido interno pendiente y el foco sea seguro. Home/End se reservan para su comportamiento nativo salvo que se active una navegación explícita.
- Touch/trackpad: mantener scroll nativo; snap proximity se acepta solo si no degrada la navegación libre.
- Historial: actualizar el fragmento solo en navegación explícita, no en cada pequeño movimiento de scroll; Back/Forward deben seguir siendo funcionales.

## Pruebas de aceptación

- Cada sección de primer nivel tiene ID único y un enlace visible desde desktop y móvil.
- El destino «sonido» es navegable con URL `#sonido`.
- Enlace activo coherente al recorrer las seis secciones, sin parpadeo entre límites.
- PageUp/PageDown y flechas funcionan desde el contexto seguro definido.
- Flechas dentro de formulario, select, textarea, reproductor, menú, panel de ajustes y otros controles no son interceptadas.
- En secciones que superan el viewport, se permite recorrer el contenido antes de saltar a otra sección.
- El foco no se roba durante scroll táctil o de rueda.
- Escape cierra el menú móvil y el panel de ajustes con foco restaurado.
- Back/Forward, enlaces directos y carga con hash posicionan la sección correcta.
- No hay scroll horizontal ni contenido tapado por header/menú en la matriz de viewports de Fase 2.
- `prefers-reduced-motion` elimina smooth scroll.
- Sin JavaScript, los enlaces ancla mantienen navegación funcional.
- Ejecutar smoke tests, regresión Chromium y build estático.

## Exclusiones

- No implementar el buscador/reproductor de YouTube (Fase 4).
- No cambiar los assets ni el controlador de baile (Fase 1).
- No alterar la geometría adaptativa ya validada (Fase 2), salvo correcciones justificadas por regresión.
- No crear ni promover deployments de producción.

## Implementación y validación

- Se añadió `id="sonido"` y se incorporó «Pulso electrónico» a los menús desktop y móvil.
- `section-navigation.js` mide la sección activa y aplica `aria-current="location"` a su enlace.
- Los enlaces del menú mantienen destinos HTML reales; la navegación explícita actualiza el fragmento, enfoca la sección y respeta `prefers-reduced-motion`.
- PageUp/PageDown y ArrowUp/ArrowDown navegan entre secciones cuando corresponde. En secciones largas, primero desplazan la página (64 px para flechas; casi una pantalla para PageUp/PageDown) y solo avanzan al alcanzar el borde.
- Los controles interactivos no se interceptan; el scroll con rueda/touch no roba el foco.
- Se conserva el scroll nativo libre: no se activa scroll-snap obligatorio ni proximity, porque la expansión adaptativa y las secciones largas requieren navegación sin saltos forzados.
- Se validaron enlaces de sonido, foco, historial Back/Forward, hash directo, formularios, menú móvil, secciones largas y movimiento reducido.
- Chromium, pruebas de humo, regresión de WebP y build estático: PASS.

## Protección Git

Todo el trabajo continúa en `codex/monjes-rumberos-phase-0`. El PR #1 permanece draft y no se fusiona. `main` y producción deben conservarse intactos.
