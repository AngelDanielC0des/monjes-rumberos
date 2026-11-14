/*
 * Monjes Rumberos — Fase 5
 * Accessible, non-modal control panel for the two decorative performers.
 * Character buttons and the persistent settings trigger open the same panel.
 */
(() => {
  'use strict';

  const api = window.MonjesPerformers;
  const panel = document.getElementById('performer-settings');
  const toggle = document.querySelector('.performer-settings-toggle');
  if (!api || !panel || !toggle) return;

  const closeButton = panel.querySelector('.performer-settings__close');
  const danceButton = panel.querySelector('[data-performer-action="dance"]');
  const visibilityButton = panel.querySelector('[data-performer-action="visibility"]');
  const danceLabel = panel.querySelector('[data-performer-action-label]');
  const visibilityLabel = panel.querySelector('[data-performer-visibility-label]');
  const statusText = panel.querySelector('#performer-settings-status span:last-child');
  const statusDot = panel.querySelector('.performer-settings__status-dot');
  const performers = [...document.querySelectorAll('[data-performer]')];
  let returnFocus = toggle;

  const getSnapshot = () => api.getSnapshot();
  const visibleStates = () => Object.values(getSnapshot()).filter((item) => item.state !== 'hidden');
  const allPaused = () => visibleStates().length > 0 && visibleStates().every((item) => item.state === 'paused');
  const anyVisible = () => visibleStates().length > 0;
  const allHidden = () => Object.values(getSnapshot()).every((item) => item.state === 'hidden');

  function updatePanel() {
    const visible = visibleStates();
    const paused = visible.length > 0 && visible.every((item) => item.effectiveState === 'paused');
    const explicitlyPaused = allPaused();
    const hidden = allHidden();

    danceLabel.textContent = explicitlyPaused ? 'Reanudar baile' : 'Pausar baile';
    danceButton.setAttribute('aria-pressed', String(!explicitlyPaused));
    danceButton.querySelector('.performer-settings__action-icon').textContent = explicitlyPaused ? '▶' : 'Ⅱ';

    visibilityLabel.textContent = hidden ? 'Mostrar monjes' : 'Ocultar monjes';
    visibilityButton.setAttribute('aria-pressed', String(!hidden));
    visibilityButton.querySelector('.performer-settings__action-icon').textContent = hidden ? '◎' : '◉';

    if (hidden) {
      statusText.textContent = 'Los monjes están fuera de pista';
    } else if (paused) {
      statusText.textContent = 'En pista · Baile en pausa';
    } else if (visible.length === 1) {
      statusText.textContent = 'Un monje en pista · Bailando';
    } else {
      statusText.textContent = 'Dos monjes en pista · Bailando';
    }
    statusDot.classList.toggle('is-paused', paused || hidden);
    performers.forEach((element) => {
      element.setAttribute('aria-expanded', String(!panel.hidden));
      element.setAttribute('aria-label', `Abrir ajustes de los monjes desde el personaje ${element.dataset.performer === 'left' ? 'izquierdo' : 'derecho'}`);
    });
    toggle.setAttribute('aria-expanded', String(!panel.hidden));
    toggle.setAttribute('aria-label', panel.hidden ? 'Abrir ajustes de los monjes' : 'Cerrar ajustes de los monjes');
  }

  function openPanel(source) {
    returnFocus = source instanceof HTMLElement ? source : toggle;
    document.dispatchEvent(new CustomEvent('monjes:panel-open', { detail: 'settings' }));
    panel.hidden = false;
    updatePanel();
    closeButton.focus();
  }

  function closePanel({ restoreFocus = true } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    updatePanel();
    if (restoreFocus && returnFocus && returnFocus.isConnected) returnFocus.focus();
  }

  performers.forEach((element) => {
    element.addEventListener('click', () => openPanel(element));
  });
  toggle.addEventListener('click', () => {
    if (panel.hidden) openPanel(toggle);
    else closePanel({ restoreFocus: true });
  });
  closeButton.addEventListener('click', () => closePanel());

  danceButton.addEventListener('click', () => {
    if (allPaused()) api.playAll();
    else api.pauseAll();
    updatePanel();
  });

  visibilityButton.addEventListener('click', () => {
    if (allHidden()) api.showAll();
    else api.hideAll();
    updatePanel();
  });

  document.addEventListener('monjes:panel-open', (event) => {
    if (event.detail !== 'settings') closePanel({ restoreFocus: false });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      closePanel();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (panel.hidden) return;
    if (panel.contains(event.target) || toggle.contains(event.target) || performers.some((item) => item.contains(event.target))) return;
    closePanel({ restoreFocus: false });
  });

  api.subscribe(updatePanel);
  window.addEventListener('monjes:performers-ready', updatePanel, { once: true });
  updatePanel();
})();
