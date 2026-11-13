/*
 * Monjes Rumberos — Fase 7
 * Navegación guiada entre secciones a pantalla completa.
 *
 * Evaluación previa de alternativas (requisito del sistema):
 * - `scroll-snap` obligatorio: alinea solo, pero atrapa las secciones más
 *   altas que el viewport, no distingue formularios de gestos y no permite
 *   "un gesto = un cambio" con bloqueo controlado.
 * - `IntersectionObserver` para detectar la sección activa: con rootMargin
 *   del 50 % el resultado es ambiguo justo en el límite entre dos secciones
 *   y obliga a recalcular umbrales en cada viewport.
 * - Controlador JavaScript específico: control total del gesto, duración,
 *   bloqueo y medición determinista de la sección activa.
 *
 * Se elige un enfoque híbrido, el más simple de razonar y el más robusto:
 *   · CSS `scroll-snap` en modo `proximity` sólo para punteros táctiles
 *     (`pointer: coarse`) como ayuda de alineación nativa, sin secuestrar
 *     el scroll del dedo; se desactiva mientras la sección activa desborde.
 *   · Un controlador JS para rueda/trackpad, teclado y enlaces: un gesto
 *     claro avanza o retrocede una sección, con detección de hueco entre
 *     eventos para que la inercia de un mismo gesto no encadene saltos.
 *
 * Accesibilidad y respeto al usuario:
 *   · Los campos de formulario, el panel de ajustes y el menú móvil conservan
 *     su comportamiento nativo (no se secuestra la rueda ni las flechas).
 *   · Las secciones más altas que el viewport liberan el scroll nativo en la
 *     dirección pendiente en lugar de bloquearlo.
 *   · `prefers-reduced-motion`: saltos instantáneos y sin animación de entrada.
 *   · Sin estados ocultos persistentes: las secciones son visibles por
 *     defecto; la transición es una animación de entrada (opacidad + giro de
 *     28 px según dirección) que no puede dejar contenido invisible.
 *   · La tecla/rueda no roba el foco salvo en navegación por teclado, donde el
 *     foco se mueve a la sección destino para lectores de pantalla.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const main = document.querySelector('main#contenido');
  if (!root || !main) return;

  const sections = Array.from(main.children).filter(
    (node) => node instanceof HTMLElement && node.tagName === 'SECTION'
  );
  if (sections.length < 2) return;

  const settingsPanel = document.querySelector('.performer-settings');
  const menuButton = document.querySelector('.menu-toggle');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Parámetros del gesto: valores moderados, breves y reversibles.
  const WHEEL_THRESHOLD = 24;      // px normalizados: gesto "suficientemente claro"
  const GESTURE_GAP = 180;         // ms: hueco que separa dos gestos distintos
  const CHAIN_COOLDOWN = 140;      // ms de calma tras completar una navegación
  const BASE_DURATION = 560;       // ms base del desplazamiento programático
  const MAX_EXTRA_DURATION = 280;  // ms extra según distancia (nunca lento)
  const OVERFLOW_TOLERANCE = 8;    // px antes de considerar que una sección desborda
  const ENTER_ANIMATION_MS = 760;  // limpieza de la clase de entrada (.64s + margen)

  let offsets = [];
  let heights = [];
  let activeIndex = 0;
  let animating = false;
  let animationFrame = 0;
  let cooldownUntil = 0;
  let lastWheelAt = 0;
  let scrollFrame = 0;
  let reduceMotion = motionQuery.matches;
  // Sólo se sincroniza el hash si la URL ya lo trae o tras una navegación
  // explícita: no se "ensucia" una URL limpia durante el scroll táctil.
  let allowHashSync = window.location.hash.length > 1;

  const enterTimers = new Map();

  const dots = Array.from(document.querySelectorAll('.section-dots a'));
  const dotByIndex = new Map();
  dots.forEach((dot) => {
    const hash = dot.getAttribute('href') || '';
    const index = sections.findIndex((section) => section.id === decodeHash(hash));
    if (index >= 0) dotByIndex.set(index, dot);
  });

  function decodeHash(hash) {
    try {
      return decodeURIComponent(hash.replace(/^#/, ''));
    } catch (_error) {
      return hash.replace(/^#/, '');
    }
  }

  // ---------------------------------------------------------------- medición

  function measure() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    offsets = [];
    heights = [];
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      offsets.push(rect.top + scrollY);
      heights.push(rect.height);
    });
  }

  function maxScrollY() {
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }

  // La sección activa es la que contiene la línea central del viewport:
  // determinista en los límites, sin la ambigüedad de un observer al 50 %.
  function computeActiveIndex() {
    const focusY = (window.scrollY || window.pageYOffset || 0) + window.innerHeight * 0.5;
    let index = 0;
    for (let i = 0; i < offsets.length; i += 1) {
      if (focusY >= offsets[i] - 1) index = i;
      else break;
    }
    return Math.min(index, sections.length - 1);
  }

  // ¿La sección activa necesita scroll nativo en esta dirección? Ocurre sólo
  // cuando la sección es más alta que el viewport y queda contenido pendiente.
  function sectionNeedsNativeScroll(direction) {
    const viewport = window.innerHeight;
    const top = offsets[activeIndex] || 0;
    const height = heights[activeIndex] || viewport;
    if (height <= viewport + OVERFLOW_TOLERANCE) return false;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    if (direction >= 0) return scrollY + viewport < top + height - 4;
    return scrollY > top + 4;
  }

  function updateSnap() {
    const viewport = window.innerHeight;
    const height = heights[activeIndex] || 0;
    if (height > viewport + OVERFLOW_TOLERANCE) root.setAttribute('data-snap-off', '');
    else root.removeAttribute('data-snap-off');
  }

  // ------------------------------------------------------------------ estado

  function setActive(index, direction, options) {
    const settings = options || {};
    const changed = index !== activeIndex;
    activeIndex = index;
    const section = sections[index];
    const id = section ? section.id || '' : '';
    if (id && root.dataset.activeSection !== id) root.dataset.activeSection = id;
    dotByIndex.forEach((dot, dotIndex) => {
      if (dotIndex === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (settings.animate !== false && (changed || settings.forceEnter)) {
      playEnter(index, direction);
    }
    updateSnap();
  }

  // Transición de entrada: opacidad + ligero desplazamiento vertical según la
  // dirección. Es una animación con clase temporal, nunca un estado oculto.
  function playEnter(index, direction) {
    if (reduceMotion) return;
    const section = sections[index];
    if (!section) return;
    const pending = enterTimers.get(section);
    if (pending) window.clearTimeout(pending);
    section.classList.remove('is-entering-down', 'is-entering-up');
    void section.offsetWidth; // reinicia la animación si la clase se repite
    section.classList.add(direction >= 0 ? 'is-entering-down' : 'is-entering-up');
    enterTimers.set(section, window.setTimeout(() => {
      section.classList.remove('is-entering-down', 'is-entering-up');
      enterTimers.delete(section);
    }, ENTER_ANIMATION_MS));
  }

  function syncUrl(id, explicit) {
    if (explicit) allowHashSync = true;
    if (!allowHashSync || !id) return;
    try {
      if (window.location.hash !== `#${id}`) {
        window.history.replaceState(null, '', `#${id}`);
      }
    } catch (_error) {
      /* Entornos sin historial disponible: la navegación no depende de esto. */
    }
  }

  function focusSection(index) {
    const section = sections[index];
    if (!section) return;
    if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
    try {
      section.focus({ preventScroll: true });
    } catch (_error) {
      section.focus();
    }
  }

  // ------------------------------------------------------- scroll animado

  function finishAnimation() {
    animating = false;
    root.classList.remove('is-section-animating');
  }

  function cancelAnimation() {
    if (!animating) return;
    animating = false;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    root.classList.remove('is-section-animating');
  }

  function animateWindowTo(targetY, duration, onDone) {
    if (duration <= 0) {
      window.scrollTo(0, targetY);
      if (typeof onDone === 'function') onDone();
      return;
    }
    const startY = window.scrollY || window.pageYOffset || 0;
    const delta = targetY - startY;
    const startTime = performance.now();
    animating = true;
    root.classList.add('is-section-animating');
    const step = (now) => {
      if (!animating) return;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startY + delta * eased);
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
        return;
      }
      finishAnimation();
      if (typeof onDone === 'function') onDone();
    };
    animationFrame = window.requestAnimationFrame(step);
  }

  function navigateTo(index, direction, options) {
    const settings = options || {};
    const bounded = Math.max(0, Math.min(sections.length - 1, index));
    cancelAnimation();
    measure();
    const targetY = Math.min(offsets[bounded] || 0, maxScrollY());
    setActive(bounded, direction, { animate: settings.animate !== false });
    syncUrl(sections[bounded].id, true);
    const currentY = window.scrollY || window.pageYOffset || 0;
    const distance = Math.abs(targetY - currentY);
    if (distance < 2) {
      cooldownUntil = performance.now() + CHAIN_COOLDOWN;
      if (settings.focus) focusSection(bounded);
      return;
    }
    const duration = reduceMotion
      ? 0
      : Math.round(BASE_DURATION + Math.min(MAX_EXTRA_DURATION, distance * 0.11));
    animateWindowTo(targetY, duration, () => {
      cooldownUntil = performance.now() + CHAIN_COOLDOWN;
      if (settings.focus) focusSection(bounded);
    });
  }

  // ---------------------------------------------------------------- guardas

  function interactionGuard() {
    const active = document.activeElement;
    if (
      active &&
      active !== document.body &&
      active instanceof Element &&
      active.closest('input, select, textarea, [contenteditable=""], [contenteditable="true"]')
    ) return true;
    if (settingsPanel && !settingsPanel.hidden) return true;
    if (menuButton && menuButton.getAttribute('aria-expanded') === 'true') return true;
    return false;
  }

  function normalizeDelta(event) {
    if (event.deltaMode === 1) return event.deltaY * 16;   // líneas
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight; // páginas
    return event.deltaY;
  }

  // ------------------------------------------------------------------ rueda

  function onWheel(event) {
    if (event.ctrlKey) return;                                    // zoom nativo
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;  // gesto horizontal
    if (interactionGuard()) return;                               // formularios y paneles

    const now = performance.now();
    const isNewGesture = now - lastWheelAt >= GESTURE_GAP;
    lastWheelAt = now;

    // Durante la navegación programática la inercia del gesto se absorbe; un
    // gesto nuevo y claro puede encadenar el siguiente salto sin esperar.
    if (animating) {
      const delta = normalizeDelta(event);
      const direction = delta > 0 ? 1 : -1;
      const chained = activeIndex + direction;
      if (
        isNewGesture &&
        Math.abs(delta) >= WHEEL_THRESHOLD &&
        chained >= 0 &&
        chained < sections.length
      ) {
        event.preventDefault();
        navigateTo(chained, direction);
      } else {
        event.preventDefault();
      }
      return;
    }

    if (now < cooldownUntil) {
      event.preventDefault();
      return;
    }

    const delta = normalizeDelta(event);
    const direction = delta > 0 ? 1 : -1;

    // Secciones más altas que el viewport: scroll nativo, sin secuestro.
    if (sectionNeedsNativeScroll(direction)) return;

    // Continuación (inercia) del gesto anterior: se absorbe para que un mismo
    // movimiento no active varios cambios de sección.
    if (!isNewGesture) {
      event.preventDefault();
      return;
    }

    if (Math.abs(delta) < WHEEL_THRESHOLD) return; // gesto demasiado sutil

    const target = activeIndex + direction;
    if (target < 0) {
      event.preventDefault();
      return;
    }
    // Última sección hacia abajo: se libera el scroll nativo para que el pie
    // de página quede siempre al alcance.
    if (target >= sections.length) return;

    event.preventDefault();
    navigateTo(target, direction);
  }

  // ---------------------------------------------------------------- teclado

  function onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    let index = null;
    let direction = 0;
    const key = event.key;
    if (key === 'PageDown' || key === 'ArrowDown') {
      index = activeIndex + 1;
      direction = 1;
    } else if (key === 'PageUp' || key === 'ArrowUp') {
      index = activeIndex - 1;
      direction = -1;
    } else if (key === 'Home') {
      index = 0;
      direction = -1;
    } else if (key === 'End') {
      index = sections.length - 1;
      direction = 1;
    } else {
      return;
    }

    if (interactionGuard()) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('input, select, textarea, [contenteditable=""], [contenteditable="true"]')
    ) return;

    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      navigateTo(index, direction, { focus: true });
      return;
    }
    if (index < 0 || index >= sections.length) return; // borde: scroll nativo
    if (!animating && sectionNeedsNativeScroll(direction)) return;
    event.preventDefault();
    navigateTo(index, direction, { focus: true });
  }

  // ----------------------------------------------------------------- enlaces

  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!link) return;
    const hash = link.getAttribute('href') || '';
    if (hash.length < 2) return;
    const id = decodeHash(hash);
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0) return;
    event.preventDefault();
    navigateTo(index, index >= activeIndex ? 1 : -1, { focus: true });
  }

  function onHashChange() {
    const id = decodeHash(window.location.hash);
    if (!id) return;
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0 || index === activeIndex) return;
    navigateTo(index, index > activeIndex ? 1 : -1, { focus: true, animate: !reduceMotion });
  }

  // ------------------------------------------------------- seguimiento nativo

  function refreshFromScroll() {
    if (!offsets.length) measure();
    const index = computeActiveIndex();
    if (index === activeIndex) return;
    setActive(index, index > activeIndex ? 1 : -1);
    syncUrl(sections[index].id, false);
  }

  function onScroll() {
    if (animating || scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      refreshFromScroll();
    });
  }

  function remeasure() {
    measure();
    updateSnap();
    if (!animating) refreshFromScroll();
  }

  function handleMotionChange(event) {
    reduceMotion = event.matches;
    if (reduceMotion) cancelAnimation();
  }

  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', handleMotionChange);
  } else if (typeof motionQuery.addListener === 'function') {
    motionQuery.addListener(handleMotionChange);
  }

  window.addEventListener('resize', remeasure, { passive: true });
  window.addEventListener('orientationchange', remeasure, { passive: true });
  window.addEventListener('load', remeasure, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) remeasure();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasure).catch(() => {});
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(remeasure).observe(main);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
  window.addEventListener('hashchange', onHashChange);

  // Arranque: el scroll-behavior del documento pasa a controlarse desde este
  // módulo (rAF propio); sin JS, el CSS mantiene el comportamiento suave.
  root.classList.add('has-section-nav');
  root.style.scrollBehavior = 'auto';
  measure();
  setActive(computeActiveIndex(), 1, { forceEnter: true });
  syncUrl(sections[activeIndex].id, false);

  window.MonjesSectionNav = Object.freeze({
    go(target) {
      const index = typeof target === 'number'
        ? target
        : sections.findIndex((section) => section.id === String(target));
      if (index >= 0 && index < sections.length) {
        navigateTo(index, index > activeIndex ? 1 : -1, { focus: true });
      }
    },
    active() {
      const section = sections[activeIndex];
      return section ? section.id || '' : '';
    },
  });
})();
