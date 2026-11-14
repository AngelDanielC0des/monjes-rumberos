const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SEARCH_LIMIT = 6;
const MAX_QUERY_LENGTH = 80;
const UPSTREAM_TIMEOUT_MS = 7500;

function json(data, status = 200, cache = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': cache
        ? 'public, max-age=0, s-maxage=120, stale-while-revalidate=300'
        : 'no-store',
    },
  });
}

async function getGoogleError(response) {
  try {
    const payload = await response.json();
    return payload?.error?.errors?.[0]?.reason ||
      payload?.error?.status ||
      payload?.error?.message ||
      'upstream_error';
  } catch (_error) {
    return 'upstream_error';
  }
}

function mapGoogleError(reason) {
  if (['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'].includes(reason)) {
    return {
      status: 429,
      code: 'quota_exceeded',
      message: 'La cuota diaria de búsqueda de YouTube se ha agotado. Inténtalo más tarde.',
    };
  }
  if (['keyInvalid', 'API_KEY_INVALID', 'accessNotConfigured', 'SERVICE_DISABLED', 'forbidden', 'API_KEY_SERVICE_BLOCKED', 'API_KEY_IP_ADDRESS_BLOCKED', 'API_KEY_HTTP_REFERRER_BLOCKED'].includes(reason)) {
    return {
      status: 503,
      code: 'youtube_api_unavailable',
      message: 'La búsqueda de YouTube no está configurada o no tiene permisos.',
    };
  }
  return {
    status: 502,
    code: 'youtube_upstream_error',
    message: 'YouTube no ha podido completar la búsqueda. Inténtalo de nuevo.',
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const requestOrigin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if ((requestOrigin && requestOrigin !== url.origin) || fetchSite === 'cross-site') {
    return json({
      error: {
        code: 'cross_origin_request',
        message: 'La búsqueda solo está disponible desde la web oficial.',
      },
    }, 403);
  }

  const rawQuery = url.searchParams.get('q') || '';
  const query = rawQuery.normalize('NFKC').replace(/[\s\u00a0]+/g, ' ').trim();

  if (query.length < 2) {
    return json({
      error: {
        code: 'query_too_short',
        message: 'Escribe al menos dos caracteres para buscar.',
      },
    }, 400);
  }
  if (query.length > MAX_QUERY_LENGTH || /[\u0000-\u001f\u007f]/.test(query)) {
    return json({
      error: {
        code: 'invalid_query',
        message: 'La búsqueda debe tener como máximo 80 caracteres.',
      },
    }, 400);
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return json({
      error: {
        code: 'youtube_not_configured',
        message: 'El reproductor todavía no está configurado. Falta la clave de YouTube en el entorno del servidor.',
      },
    }, 503);
  }

  const headers = {
    Accept: 'application/json',
    'x-goog-api-key': apiKey,
  };
  const signal = AbortSignal.timeout(UPSTREAM_TIMEOUT_MS);

  try {
    const searchUrl = new URL('/youtube/v3/search', 'https://www.googleapis.com');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('maxResults', String(SEARCH_LIMIT));
    searchUrl.searchParams.set('regionCode', 'ES');
    searchUrl.searchParams.set('relevanceLanguage', 'es');
    searchUrl.searchParams.set('safeSearch', 'moderate');
    searchUrl.searchParams.set('fields', 'items(id/videoId,snippet(title,channelTitle,thumbnails(default/url,medium/url)))');
    searchUrl.searchParams.set('q', query);

    const searchResponse = await fetch(searchUrl, { headers, signal });
    if (!searchResponse.ok) {
      const mapped = mapGoogleError(await getGoogleError(searchResponse));
      return json({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
    }

    const searchPayload = await searchResponse.json();
    const candidates = Array.isArray(searchPayload?.items) ? searchPayload.items : [];
    const videos = candidates
      .map((item) => ({
        id: item?.id?.videoId,
        title: typeof item?.snippet?.title === 'string' ? item.snippet.title : '',
        channelTitle: typeof item?.snippet?.channelTitle === 'string' ? item.snippet.channelTitle : '',
        thumbnailUrl: item?.snippet?.thumbnails?.medium?.url ||
          item?.snippet?.thumbnails?.default?.url || '',
      }))
      .filter((item) => VIDEO_ID_PATTERN.test(item.id || '') && item.title);

    const uniqueIds = [...new Set(videos.map((item) => item.id))].slice(0, SEARCH_LIMIT);
    if (uniqueIds.length === 0) {
      return json({ items: [] }, 200, true);
    }

    const statusUrl = new URL('/youtube/v3/videos', 'https://www.googleapis.com');
    statusUrl.searchParams.set('part', 'id,status');
    statusUrl.searchParams.set('id', uniqueIds.join(','));
    statusUrl.searchParams.set('fields', 'items(id,status(embeddable,madeForKids))');

    const statusResponse = await fetch(statusUrl, { headers, signal });
    if (!statusResponse.ok) {
      const mapped = mapGoogleError(await getGoogleError(statusResponse));
      return json({ error: { code: mapped.code, message: mapped.message } }, mapped.status);
    }

    const statusPayload = await statusResponse.json();
    const statuses = new Map(
      (Array.isArray(statusPayload?.items) ? statusPayload.items : [])
        .filter((item) => VIDEO_ID_PATTERN.test(item?.id || ''))
        .map((item) => [item.id, item.status || {}]),
    );

    const eligible = videos
      .filter((video) => {
        const status = statuses.get(video.id);
        return status?.embeddable === true && status?.madeForKids === false;
      })
      .slice(0, SEARCH_LIMIT)
      .map((video) => ({
        id: video.id,
        title: video.title.slice(0, 180),
        channelTitle: video.channelTitle.slice(0, 100),
        thumbnailUrl: typeof video.thumbnailUrl === 'string' &&
          video.thumbnailUrl.startsWith('https://i.ytimg.com/')
          ? video.thumbnailUrl
          : '',
        url: `https://www.youtube.com/watch?v=${video.id}`,
      }));

    return json({ items: eligible }, 200, true);
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return json({
        error: {
          code: 'youtube_timeout',
          message: 'YouTube está tardando demasiado en responder. Inténtalo de nuevo.',
        },
      }, 504);
    }
    return json({
      error: {
        code: 'youtube_network_error',
        message: 'No se ha podido conectar con YouTube. Comprueba tu conexión e inténtalo de nuevo.',
      },
    }, 502);
  }
}
