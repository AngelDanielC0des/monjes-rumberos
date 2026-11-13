/*
 * Monjes Rumberos — Fase 3
 * Iluminación ambiental continua sincronizada con las seis secciones principales.
 * - Interpolación lineal en luz sRGB para evitar saltos perceptibles.
 * - requestAnimationFrame pasivo: una sola actualización por frame solicitado.
 * - CSS Scroll-Driven Animations para el desplazamiento decorativo de fondos.
 * - IntersectionObserver como fallback visual cuando view-timeline no está disponible.
 * - En prefers-reduced-motion, los perfiles cambian por tramos sin interpolación.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const main = document.querySelector('#contenido');
  const ambientLayer = document.querySelector('.ambient-lights');

  if (!root || !main || !ambientLayer) return;

  const profiles = Object.freeze({
    hero: Object.freeze({ primary: '#6e42d8', secondary: '#27c9e8' }),
    manifesto: Object.freeze({ primary: '#633b83', secondary: '#c34b98' }),
    ritual: Object.freeze({ primary: '#3858c7', secondary: '#8a45d2' }),
    formats: Object.freeze({ primary: '#c74397', secondary: '#4658c7' }),
    sound: Object.freeze({ primary: '#13bfd8', secondary: '#8a42e0' }),
    booking: Object.freeze({ primary: '#70427d', secondary: '#328fa9' }),
  });

  // Sólo las secciones principales controlan el ambiente global. Las tres tarjetas
  // de formatos mantienen sus acentos locales y no compiten entre sí por el foco.
  const sceneElements = Array.from(main.children).filter((element) => {
    const sceneName = element.dataset.scene;
    return sceneName && Object.prototype.hasOwnProperty.call(profiles, sceneName);
  });

  if (!sceneElements.length) return;

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionQuery.matches;
  let sceneStops = [];
  let frameRequest = 0;
  let resizeObserver = null;
  let lastValues = Object.create(null);

  const supportsViewTimeline = Boolean(
    window.CSS &&
    typeof window.CSS.supports === 'function' &&
    window.CSS.supports('view-timeline-name: --scene-view') &&
    window.CSS.supports('animation-timeline: --scene-view') &&
    window.CSS.supports('animation-range: entry 0% exit 100%')
  );

  root.classList.toggle('has-scroll-timeline', supportsViewTimeline);
  root.classList.toggle('no-scroll-timeline', !supportsViewTimeline);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function hexToLinearRgb(hex) {
    const value = hex.replace('#', '');
    const channels = value.length === 3
      ? value.split('').map((channel) => parseInt(channel + channel, 16))
      : [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));

    return channels.map((channel) => {
      const srgb = channel / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
  }

  function linearToSrgb(value) {
    const srgb = value <= 0.0031308
      ? value * 12.92
      : (1.055 * (value ** (1 / 2.4))) - 0.055;
    return Math.round(clamp(srgb, 0, 1) * 255);
  }

  function interpolateColor(from, to, amount) {
    const start = hexToLinearRgb(from);
    const end = hexToLinearRgb(to);
    const t = clamp(amount, 0, 1);
    const channels = start.map((channel, index) =>
      linearToSrgb(channel + ((end[index] - channel) * t))
    );

    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  function measureScenes() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    sceneStops = sceneElements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        name: element.dataset.scene,
        center: rect.top + scrollY + (rect.height / 2),
        profile: profiles[element.dataset.scene],
      };
    }).sort((a, b) => a.center - b.center);
  }

  function resolveProfile(focusY) {
    if (sceneStops.length === 1 || focusY <= sceneStops[0].center) {
      return {
        name: sceneStops[0].name,
        primary: sceneStops[0].profile.primary,
        secondary: sceneStops[0].profile.secondary,
        blend: 0,
      };
    }

    const lastStop = sceneStops[sceneStops.length - 1];
    if (focusY >= lastStop.center) {
      return {
        name: lastStop.name,
        primary: lastStop.profile.primary,
        secondary: lastStop.profile.secondary,
        blend: 0,
      };
    }

    for (let index = 0; index < sceneStops.length - 1; index += 1) {
      const current = sceneStops[index];
      const next = sceneStops[index + 1];
      if (focusY > next.center) continue;

      const distance = next.center - current.center;
      const rawProgress = distance > 0 ? clamp((focusY - current.center) / distance, 0, 1) : 0;
      const progress = reduceMotion
        ? (rawProgress < 0.5 ? 0 : 1)
        : rawProgress;
      const active = progress < 0.5 ? current : next;

      return {
        name: active.name,
        primary: interpolateColor(current.profile.primary, next.profile.primary, progress),
        secondary: interpolateColor(current.profile.secondary, next.profile.secondary, progress),
        blend: progress,
      };
    }

    return {
      name: lastStop.name,
      primary: lastStop.profile.primary,
      secondary: lastStop.profile.secondary,
      blend: 0,
    };
  }

  function setThemeValue(property, value) {
    if (lastValues[property] === value) return;
    root.style.setProperty(property, value);
    lastValues[property] = value;
  }

  function updateTheme() {
    frameRequest = 0;
    if (!sceneStops.length) measureScenes();

    const focusY = (window.scrollY || window.pageYOffset || 0) + (window.innerHeight * 0.48);
    const theme = resolveProfile(focusY);
    const accent = interpolateColor(theme.primary, theme.secondary, 0.52);

    setThemeValue('--ambient-primary', theme.primary);
    setThemeValue('--ambient-secondary', theme.secondary);
    setThemeValue('--ambient-accent', accent);

    if (root.dataset.activeScene !== theme.name) {
      root.dataset.activeScene = theme.name;
    }
  }

  function requestThemeUpdate() {
    if (frameRequest) return;
    frameRequest = window.requestAnimationFrame(updateTheme);
  }

  function handleMotionPreferenceChange(event) {
    reduceMotion = event.matches;
    requestThemeUpdate();
  }

  if (typeof motionQuery.addEventListener === 'function') {
    motionQuery.addEventListener('change', handleMotionPreferenceChange);
  } else if (typeof motionQuery.addListener === 'function') {
    motionQuery.addListener(handleMotionPreferenceChange);
  }

  // Fallback para navegadores sin Scroll-Driven Animations: las escenas reciben
  // una clase de presencia y el CSS aplica un desplazamiento sutil por transición.
  if (!supportsViewTimeline && 'IntersectionObserver' in window) {
    const sceneObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('scene-in-view', entry.isIntersecting);
      });
    }, {
      root: null,
      rootMargin: '-12% 0px -12% 0px',
      threshold: 0,
    });

    sceneElements.forEach((element) => sceneObserver.observe(element));
  }

  window.addEventListener('scroll', requestThemeUpdate, { passive: true });
  window.addEventListener('resize', () => {
    measureScenes();
    requestThemeUpdate();
  }, { passive: true });
  window.addEventListener('orientationchange', () => {
    measureScenes();
    requestThemeUpdate();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      measureScenes();
      requestThemeUpdate();
    }
  });

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      measureScenes();
      requestThemeUpdate();
    });
    resizeObserver.observe(main);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      measureScenes();
      requestThemeUpdate();
    }).catch(() => {});
  }

  window.addEventListener('load', () => {
    measureScenes();
    requestThemeUpdate();
  }, { once: true });

  measureScenes();
  updateTheme();
})();
