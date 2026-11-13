/*
 * Monjes Rumberos — Fase 4
 * Small state controller for the two decorative dance loops.
 * States: dancing | paused | hidden. The animated image is replaced by a
 * static poster when paused, when the tab is hidden, or when reduced motion
 * is requested (unless the visitor explicitly opts into dancing).
 * No timers, polling, or permanent animation loops are created here.
 */
(() => {
  'use strict';

  const root = document.querySelector('.performers');
  if (!root) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map();
  let motionOptIn = false;
  let pageVisible = document.visibilityState === 'visible';

  function effectiveState(record) {
    if (record.state === 'hidden') return 'hidden';
    if (record.state === 'paused') return 'paused';
    if (!pageVisible || (motionQuery.matches && !motionOptIn)) return 'paused';
    return 'dancing';
  }

  function snapshot() {
    return Object.fromEntries(Array.from(records.entries(), ([id, record]) => [id, {
      state: record.state,
      effectiveState: effectiveState(record),
      visible: record.state !== 'hidden',
    }]));
  }

  function notify() {
    window.dispatchEvent(new CustomEvent('monjes:performers-change', { detail: snapshot() }));
  }

  function render(record) {
    const actual = effectiveState(record);
    const isHidden = actual === 'hidden';
    record.element.hidden = isHidden;
    record.element.dataset.state = record.state;
    record.element.dataset.effectiveState = actual;

    const nextSource = actual === 'dancing' ? record.animationSrc : record.posterSrc;
    if (record.image.getAttribute('src') !== nextSource) {
      record.image.setAttribute('src', nextSource);
    }
  }

  function renderAll() {
    records.forEach(render);
    notify();
  }

  function setState(id, nextState) {
    const record = records.get(id);
    if (!record) return false;

    if (nextState === 'visible') {
      if (record.state === 'hidden') record.state = record.restoreState || 'dancing';
    } else if (nextState === 'hidden') {
      if (record.state !== 'hidden') record.restoreState = record.state;
      record.state = 'hidden';
    } else if (nextState === 'dancing' || nextState === 'paused') {
      record.state = nextState;
      if (nextState === 'dancing') motionOptIn = true;
    } else {
      throw new TypeError(`Estado no válido para el monje ${id}: ${nextState}`);
    }

    render(record);
    notify();
    return true;
  }

  function setAll(nextState, { includeHidden = false } = {}) {
    records.forEach((record, id) => {
      if (!includeHidden && record.state === 'hidden' && (nextState === 'dancing' || nextState === 'paused')) return;
      setState(id, nextState);
    });
  }

  root.querySelectorAll('[data-performer]').forEach((element) => {
    const id = element.dataset.performer;
    const image = element.querySelector('img[data-animation-src][data-poster-src]');
    if (!id || !image) return;

    const record = {
      id,
      element,
      image,
      animationSrc: image.dataset.animationSrc,
      fallbackSrc: image.dataset.animationFallbackSrc || '',
      posterSrc: image.dataset.posterSrc,
      state: 'dancing',
      restoreState: 'dancing',
      fallbackUsed: false,
    };

    image.addEventListener('error', () => {
      if (record.state !== 'dancing' || record.fallbackUsed || !record.fallbackSrc) return;
      record.fallbackUsed = true;
      record.animationSrc = record.fallbackSrc;
      if (effectiveState(record) === 'dancing') image.src = record.animationSrc;
    });

    records.set(id, record);
    render(record);
  });

  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState === 'visible';
    renderAll();
  });

  const onMotionPreferenceChange = () => renderAll();
  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', onMotionPreferenceChange);
  } else if (typeof motionQuery.addListener === 'function') {
    motionQuery.addListener(onMotionPreferenceChange);
  }

  window.MonjesPerformers = Object.freeze({
    getState(id) {
      return records.get(id)?.state || null;
    },
    getEffectiveState(id) {
      const record = records.get(id);
      return record ? effectiveState(record) : null;
    },
    getSnapshot: snapshot,
    setState,
    setAll,
    playAll() {
      motionOptIn = true;
      setAll('dancing');
    },
    pauseAll() {
      setAll('paused');
    },
    hideAll() {
      setAll('hidden', { includeHidden: true });
    },
    showAll() {
      setAll('visible', { includeHidden: true });
    },
    subscribe(callback) {
      if (typeof callback !== 'function') throw new TypeError('subscribe necesita una función');
      const handler = (event) => callback(event.detail);
      window.addEventListener('monjes:performers-change', handler);
      return () => window.removeEventListener('monjes:performers-change', handler);
    },
  });

  window.dispatchEvent(new CustomEvent('monjes:performers-ready', { detail: snapshot() }));
})();
