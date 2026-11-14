import assert from 'node:assert/strict';
import { GET } from '../api/youtube-search.js';

const originalFetch = globalThis.fetch;
const originalKey = process.env.YOUTUBE_API_KEY;
const request = (query) => new Request(
  `https://monjes.example/api/youtube-search?q=${encodeURIComponent(query)}`,
);

try {
  delete process.env.YOUTUBE_API_KEY;
  let response = await GET(request('house'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'youtube_not_configured');

  response = await GET(request('x'));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'query_too_short');

  response = await GET(new Request(
    'https://monjes.example/api/youtube-search?q=house',
    { headers: { Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'cross-site' } },
  ));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'cross_origin_request');

  response = await GET(request('x'.repeat(81)));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'invalid_query');

  process.env.YOUTUBE_API_KEY = 'test-key-never-returned';
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ url, init });
    assert.equal(init.headers['x-goog-api-key'], 'test-key-never-returned');
    assert.equal(init.headers.Accept, 'application/json');

    if (url.pathname.endsWith('/search')) {
      assert.equal(url.searchParams.get('type'), 'video');
      assert.equal(url.searchParams.get('videoEmbeddable'), 'true');
      assert.equal(url.searchParams.get('maxResults'), '6');
      assert.equal(url.searchParams.get('regionCode'), 'ES');
      assert.equal(url.searchParams.get('safeSearch'), 'moderate');
      assert.equal(url.searchParams.get('q'), 'house music');
      return Response.json({
        items: [
          {
            id: { videoId: 'abcdefghijk' },
            snippet: {
              title: 'House Mix 2026',
              channelTitle: 'Club Channel',
              thumbnails: { medium: { url: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' } },
            },
          },
          {
            id: { videoId: 'lmnopqrstuv' },
            snippet: {
              title: 'Not embeddable',
              channelTitle: 'Channel B',
              thumbnails: { default: { url: 'https://i.ytimg.com/vi/lmnopqrstuv/default.jpg' } },
            },
          },
          {
            id: { videoId: 'wxyz1234567' },
            snippet: {
              title: 'Made for kids',
              channelTitle: 'Channel C',
              thumbnails: { medium: { url: 'https://i.ytimg.com/vi/wxyz1234567/mqdefault.jpg' } },
            },
          },
        ],
      });
    }

    assert.equal(url.pathname, '/youtube/v3/videos');
    assert.equal(url.searchParams.get('part'), 'id,status');
    assert.equal(url.searchParams.get('id'), 'abcdefghijk,lmnopqrstuv,wxyz1234567');
    return Response.json({
      items: [
        { id: 'abcdefghijk', status: { embeddable: true, madeForKids: false } },
        { id: 'lmnopqrstuv', status: { embeddable: false, madeForKids: false } },
        { id: 'wxyz1234567', status: { embeddable: true, madeForKids: true } },
      ],
    });
  };

  response = await GET(request('  house   music  '));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /s-maxage=120/);
  const payload = await response.json();
  assert.equal(payload.items.length, 1);
  assert.deepEqual(payload.items[0], {
    id: 'abcdefghijk',
    title: 'House Mix 2026',
    channelTitle: 'Club Channel',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=abcdefghijk',
  });
  assert.equal(calls.length, 2);
  assert.ok(!JSON.stringify(payload).includes('test-key-never-returned'));

  globalThis.fetch = async () => Response.json({
    error: { errors: [{ reason: 'quotaExceeded' }] },
  }, { status: 403 });
  response = await GET(request('techno'));
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, 'quota_exceeded');

  globalThis.fetch = async () => Response.json({
    error: { errors: [{ reason: 'API_KEY_INVALID' }] },
  }, { status: 403 });
  response = await GET(request('house'));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'youtube_api_unavailable');

  globalThis.fetch = async () => {
    throw new Error('simulated network failure');
  };
  response = await GET(request('electronic'));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'youtube_network_error');

  console.log('PASS — YouTube search API: missing key, query validation, official search filters, API key isolation, embeddable/MadeForKids eligibility, CDN cache, quota mapping and upstream network errors.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = originalKey;
}
