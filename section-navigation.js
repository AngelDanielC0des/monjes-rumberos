/* Monjes Rumberos — Fase 3: navegación accesible por secciones. */
(() => {
  'use strict';

  const main = document.querySelector('main#contenido');
  if (!main) return;

  const sections = Array.from(main.children).filter(
    (element) => element instanceof HTMLElement &&
      element.tagName === 'SECTION' && element.id
  );
  if (sections.length < 2) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const navigationLinks = Array.from(document.querySelectorAll(
    '.desktop-nav a[href^="#"], .mobile-menu a[href^="#"]'
  ));
  let activeIndex = 0;
  let scrollFrame = 0;

  const decodeHash = (value) => {
    try {
      return decodeURIComponent(value.replace(/^#/, ''));
    } catch (_error) {
      return value.replace(/^#/, '');
    }
  };

  function setActive(index) {
    activeIndex = Math.max(0, Math.min(sections.length - 1, index));
    const activeId = sections[activeIndex].id;

    navigationLinks.forEach((link) => {
      if (decodeHash(link.getAttribute('href') || '') === activeId) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function measureActiveSection() {
    const documentY = window.scrollY + window.innerHeight * 0.5;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + rect.height;
      if (documentY >= top && documentY <= bottom) {
        bestIndex = index;
        bestDistance = 0;
        return;
      }
      if (bestDistance !== 0) {
        const distance = Math.min(Math.abs(documentY - top), Math.abs(documentY - bottom));
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      }
    });

    setActive(bestIndex);
  }

  function scheduleMeasurement() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      measureActiveSection();
    });
  }

  function isInteractiveContext(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest(
      'a, button, input, select, textarea, summary, audio, video, iframe, ' +
      '[contenteditable=""], [contenteditable="true"], [role="dialog"], ' +
      '[role="menu"], [role="listbox"], .performer-settings, .mobile-menu'
    ));
  }

  function canAdvanceFromSection(section, direction) {
    const rect = section.getBoundingClientRect();
    if (rect.height <= window.innerHeight + 2) return true;

    // Long sections keep native scrolling until the relevant edge is reached.
    // A small tolerance avoids trapping the keyboard on fractional CSS pixels.
    const edgeTolerance = 10;
    return direction > 0
      ? rect.bottom <= window.innerHeight + edgeTolerance
      : rect.top >= -edgeTolerance;
  }

  function navigateTo(index, updateHistory) {
    const bounded = Math.max(0, Math.min(sections.length - 1, index));
    const section = sections[bounded];
    if (!section) return;

    if (!section.hasAttribute('tabindex')) section.setAttribute('tabindex', '-1');
    if (updateHistory && window.location.hash !== '#' + section.id) {
      window.history.pushState({ section: section.id }, '', '#' + section.id);
    }

    section.scrollIntoView({
      behavior: motionQuery.matches ? 'auto' : 'smooth',
      block: 'start',
    });
    setActive(bounded);
    try {
      section.focus({ preventScroll: true });
    } catch (_error) {
      section.focus();
    }
  }

  function onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (isInteractiveContext(event.target)) return;

    const activeElement = document.activeElement;
    const focusIsOnDocument = activeElement === document.body ||
      activeElement === document.documentElement ||
      activeElement === main ||
      sections.includes(activeElement);

    if (!focusIsOnDocument) return;

    let direction = 0;
    if (event.key === 'ArrowDown' || event.key === 'PageDown') direction = 1;
    else if (event.key === 'ArrowUp' || event.key === 'PageUp') direction = -1;
    else return;

    const current = sections[activeIndex];
    if (!current || !canAdvanceFromSection(current, direction)) return;

    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;

    event.preventDefault();
    navigateTo(nextIndex, true);
  }

  function restoreFromLocation() {
    const id = decodeHash(window.location.hash);
    if (!id) return;
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0) return;
    sections[index].scrollIntoView({
      behavior: motionQuery.matches ? 'auto' : 'smooth',
      block: 'start',
    });
    setActive(index);
  }

  function onNavigationClick(event) {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('.desktop-nav a[href^="#"], .mobile-menu a[href^="#"]');
    if (!link) return;

    const id = decodeHash(link.getAttribute('href') || '');
    const index = sections.findIndex((section) => section.id === id);
    if (index < 0) return;

    event.preventDefault();
    navigateTo(index, true);
  }

  document.addEventListener('click', onNavigationClick, true);
  window.addEventListener('scroll', scheduleMeasurement, { passive: true });
  window.addEventListener('resize', scheduleMeasurement, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('popstate', restoreFromLocation);
  window.addEventListener('hashchange', restoreFromLocation);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(scheduleMeasurement);
    sections.forEach((section) => observer.observe(section));
  }

  motionQuery.addEventListener?.('change', (event) => {
    if (event.matches) document.documentElement.style.scrollBehavior = 'auto';
  });

  measureActiveSection();
  window.MonjesSectionNavigation = Object.freeze({
    active: () => sections[activeIndex]?.id || '',
    go: (id) => {
      const index = sections.findIndex((section) => section.id === String(id));
      if (index >= 0) navigateTo(index, true);
    },
  });
})();
