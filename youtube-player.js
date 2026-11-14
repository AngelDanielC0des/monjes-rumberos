/* Monjes Rumberos — Fase 4: búsqueda oficial y reproducción YouTube. */
(() => {
  'use strict';

  const toggle = document.getElementById('youtube-player-toggle');
  const panel = document.getElementById('youtube-player-panel');
  if (!toggle || !panel) return;

  const closeButton = panel.querySelector('.youtube-player-panel__close');
  const searchForm = panel.querySelector('#youtube-search-form');
  const searchInput = panel.querySelector('#youtube-search-input');
  const searchButton = panel.querySelector('#youtube-search-submit');
  const searchStatus = panel.querySelector('#youtube-search-status');
  const resultsList = panel.querySelector('#youtube-search-results');
  const playerFrame = panel.querySelector('#youtube-player-frame');
  const currentTrack = panel.querySelector('#youtube-current-track');
  const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

  let player = null;
  let playerReady = false;
  let playerReadyPromise = null;
  let iframeApiPromise = null;
  let requestController = null;
  let returnFocus = toggle;
  let activeTrack = null;
  let results = [];

  function setStatus(message) {
    searchStatus.textContent = message;
  }

  function updateToggle() {
    const open = !panel.hidden;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open
      ? 'Cerrar reproductor de YouTube'
      : 'Abrir reproductor de YouTube');
  }

  function playerDimensions() {
    const availableWidth = Math.max(200, Math.floor(playerFrame.clientWidth || 480));
    const viewportHeightBudget = Math.max(200, Math.floor(window.innerHeight * 0.58));
    const widthForHeight = Math.floor(viewportHeightBudget * 16 / 9);
    const width = Math.max(200, Math.min(480, availableWidth, widthForHeight));
    return {
      width,
      height: Math.max(200, Math.round(width * 9 / 16)),
    };
  }

  function resizePlayer() {
    if (!playerReady || !player || typeof player.setSize !== 'function') return;
    const size = playerDimensions();
    player.setSize(size.width, size.height);
  }

  function loadIframeApi() {
    if (window.YT && typeof window.YT.Player === 'function') {
      return Promise.resolve(window.YT);
    }
    if (iframeApiPromise) return iframeApiPromise;

    iframeApiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.dataset.youtubeIframeApi = 'true';

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        if (window.YT && typeof window.YT.Player === 'function') resolve(window.YT);
        else reject(new Error('youtube-player-api-unavailable'));
      };

      script.onerror = () => {
        iframeApiPromise = null;
        reject(new Error('youtube-player-api-load-failed'));
      };
      document.head.appendChild(script);
    });

    return iframeApiPromise;
  }

  function handlePlayerState(event) {
    const states = window.YT?.PlayerState || {};
    if (event.data === states.PLAYING || event.data === 1) {
      setStatus(activeTrack
        ? `Reproduciendo: ${activeTrack.title}`
        : 'Reproduciendo vídeo.');
    } else if (event.data === states.PAUSED || event.data === 2) {
      setStatus('Reproducción en pausa.');
    } else if (event.data === states.BUFFERING || event.data === 3) {
      setStatus('Cargando vídeo…');
    } else if (event.data === states.ENDED || event.data === 0) {
      setStatus('El vídeo ha terminado.');
    }
  }

  async function initializePlayer(initialVideoId) {
    if (playerReady) return player;
    if (playerReadyPromise) return playerReadyPromise;
    if (!VIDEO_ID_PATTERN.test(initialVideoId || '')) {
      throw new Error('youtube-video-id-invalid');
    }

    playerReadyPromise = (async () => {
      const api = await loadIframeApi();
      const size = playerDimensions();

      return new Promise((resolve, reject) => {
        try {
          player = new api.Player('youtube-player', {
            width: size.width,
            height: size.height,
            videoId: initialVideoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              playsinline: 1,
              enablejsapi: 1,
              origin: window.location.origin,
            },
            events: {
              onReady(event) {
                playerReady = true;
                resizePlayer();
                searchInput.disabled = false;
                searchButton.disabled = false;
                renderResults();
                setStatus(results.length
                  ? `${results.length} vídeos disponibles. Selecciona uno para reproducirlo.`
                  : 'Busca una canción, artista o estilo musical.');
                resolve(event.target);
              },
              onStateChange: handlePlayerState,
              onAutoplayBlocked() {
                setStatus('El navegador ha bloqueado el inicio automático. Pulsa Play en el reproductor de YouTube.');
              },
              onError(event) {
                const code = Number(event.data);
                if (code === 101 || code === 150) {
                  setStatus('Este vídeo no permite la reproducción incrustada. Prueba otro resultado.');
                } else if (code === 153) {
                  setStatus('YouTube no ha podido verificar el origen del reproductor.');
                } else {
                  setStatus('No se ha podido reproducir este vídeo. Prueba otro resultado.');
                }
                if (!playerReady) reject(new Error(`youtube-player-error-${code}`));
              },
            },
          });
        } catch (error) {
          reject(error);
        }
      });
    })();

    try {
      return await playerReadyPromise;
    } catch (error) {
      playerReadyPromise = null;
      player = null;
      throw error;
    }
  }

  function safeThumbnail(value) {
    if (typeof value !== 'string') return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname === 'i.ytimg.com'
        ? url.href
        : '';
    } catch (_error) {
      return '';
    }
  }

  function renderResults() {
    resultsList.replaceChildren();

    results.forEach((video) => {
      const item = document.createElement('li');
      item.className = 'youtube-result';

      const thumbnailUrl = safeThumbnail(video.thumbnailUrl);
      if (thumbnailUrl) {
        const image = document.createElement('img');
        image.className = 'youtube-result__thumbnail';
        image.src = thumbnailUrl;
        image.alt = '';
        image.loading = 'lazy';
        image.width = 120;
        image.height = 68;
        item.appendChild(image);
      }

      const details = document.createElement('div');
      details.className = 'youtube-result__details';

      const title = document.createElement('p');
      title.className = 'youtube-result__title';
      title.textContent = video.title;

      const channel = document.createElement('p');
      channel.className = 'youtube-result__channel';
      channel.textContent = video.channelTitle;

      details.append(title, channel);

      const playButton = document.createElement('button');
      playButton.className = 'youtube-result__play';
      playButton.type = 'button';
      playButton.textContent = 'Reproducir';
      playButton.disabled = !playerReady;
      playButton.setAttribute('aria-label', `Reproducir ${video.title}`);
      playButton.addEventListener('click', () => selectVideo(video));

      item.append(details, playButton);
      resultsList.appendChild(item);
    });
  }

  async function selectVideo(video) {
    if (!playerReady || !player || !VIDEO_ID_PATTERN.test(video.id || '')) return;
    activeTrack = video;
    currentTrack.textContent = `${video.title} · ${video.channelTitle}`;
    setStatus('Solicitando reproducción a YouTube…');
    try {
      // This call is made directly from the user's result-button interaction.
      player.loadVideoById(video.id);
    } catch (_error) {
      setStatus('No se ha podido cargar el vídeo. Prueba otro resultado.');
    }
  }

  function errorMessage(payload, statusCode) {
    const code = payload?.error?.code;
    if (code === 'youtube_not_configured') {
      return 'La búsqueda de YouTube está pendiente de configuración del sitio.';
    }
    if (code === 'quota_exceeded' || statusCode === 429) {
      return 'Se ha alcanzado el límite diario de búsquedas. Inténtalo más tarde.';
    }
    if (code === 'youtube_timeout') return 'YouTube está tardando demasiado en responder.';
    return payload?.error?.message || 'No se ha podido completar la búsqueda. Inténtalo de nuevo.';
  }

  async function searchVideos(query) {
    if (requestController) requestController.abort();
    requestController = new AbortController();
    const controller = requestController;

    results = [];
    renderResults();
    setStatus('Buscando vídeos en YouTube…');
    searchButton.disabled = true;

    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(errorMessage(payload, response.status));
        return;
      }

      results = Array.isArray(payload.items) ? payload.items.filter((item) =>
        item && VIDEO_ID_PATTERN.test(item.id || '') &&
        typeof item.title === 'string' &&
        typeof item.channelTitle === 'string'
      ).slice(0, 6) : [];

      renderResults();
      if (!results.length) {
        setStatus('No se encontraron vídeos incrustables para esa búsqueda.');
      } else if (playerReady) {
        setStatus(`${results.length} vídeos disponibles. Selecciona uno para reproducirlo.`);
      } else {
        setStatus('Preparando el reproductor oficial de YouTube…');
        initializePlayer(results[0].id)
          .then(() => {
            renderResults();
            setStatus(`${results.length} vídeos disponibles. Selecciona uno para reproducirlo.`);
          })
          .catch(() => {
            renderResults();
            setStatus('No se ha podido cargar el reproductor. Vuelve a intentarlo con otra búsqueda.');
          });
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setStatus('No se ha podido conectar con el servicio de búsqueda. Inténtalo de nuevo.');
      }
    } finally {
      if (requestController === controller) {
        requestController = null;
        searchButton.disabled = false;
      }
    }
  }

  function openPanel(source = toggle) {
    returnFocus = source instanceof HTMLElement ? source : toggle;
    document.dispatchEvent(new CustomEvent('monjes:panel-open', { detail: 'youtube' }));
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar reproductor de YouTube');
    searchInput.disabled = false;
    searchButton.disabled = false;
    searchInput.focus();
    setStatus('Busca una canción, artista o estilo musical.');
  }

  function closePanel({ restoreFocus = true } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir reproductor de YouTube');
    if (requestController) {
      requestController.abort();
      requestController = null;
    }
    if (playerReady && player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }
    if (restoreFocus && returnFocus?.isConnected) returnFocus.focus();
  }

  toggle.addEventListener('click', () => {
    if (panel.hidden) openPanel(toggle);
    else closePanel();
  });
  closeButton.addEventListener('click', () => closePanel());
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!playerReady) {
      setStatus('El reproductor todavía se está preparando.');
      return;
    }
    const query = searchInput.value.trim();
    if (query.length < 2) {
      setStatus('Escribe al menos dos caracteres para buscar.');
      searchInput.focus();
      return;
    }
    if (query.length > 80) {
      setStatus('La búsqueda admite un máximo de 80 caracteres.');
      searchInput.focus();
      return;
    }
    searchVideos(query);
  });

  document.addEventListener('monjes:panel-open', (event) => {
    if (event.detail !== 'youtube') closePanel({ restoreFocus: false });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      event.preventDefault();
      closePanel();
    }
  });
  document.addEventListener('pointerdown', (event) => {
    if (panel.hidden) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    closePanel({ restoreFocus: false });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playerReady && player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }
  });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(resizePlayer);
    resizeObserver.observe(playerFrame);
  } else {
    window.addEventListener('resize', resizePlayer, { passive: true });
  }

  updateToggle();
})();
