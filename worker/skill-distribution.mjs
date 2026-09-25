import skill from '../data/agent-skill.json';

const releaseUrl = `https://github.com/${skill.repository}/releases/tag/${skill.tag}`;
const downloadUrl = `https://github.com/${skill.repository}/releases/download/${skill.tag}/${skill.asset}`;
const statsPath = '/api/skill/stats';
const reply = (value, status = 200, ttl = 900) => new Response(JSON.stringify(value), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=${ttl}`,
    'x-content-type-options': 'nosniff',
  },
});

// Public release metadata only. No database, cookies, identities or install telemetry.
export async function skillDistribution(request, ctx) {
  const url = new URL(request.url);
  if (!['/api/skill/download', statsPath].includes(url.pathname)) {
    return reply({error: 'Not found'}, 404, 30);
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Use GET or HEAD.', {status: 405, headers: {allow: 'GET, HEAD'}});
  }
  if (url.pathname === '/api/skill/download') {
    // Fixed server-side URL. Query parameters cannot turn this into an open redirect.
    return new Response(null, {status: 302, headers: {
      location: downloadUrl, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer',
    }});
  }
  // One cache key per release and edge location; ignore arbitrary visitor query strings.
  const key = new Request(`${url.origin}${statsPath}?release=${skill.tag}`);
  const cached = await caches.default.match(key);
  if (cached) return request.method === 'HEAD' ? new Response(null, cached) : cached;
  let response;
  try {
    const upstream = await fetch(`https://api.github.com/repos/${skill.repository}/releases/tags/${skill.tag}`, {
      headers: {'accept': 'application/vnd.github+json', 'user-agent': 'git4data-skill-downloads', 'x-github-api-version': '2022-11-28'},
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) throw new Error('Release metadata unavailable');
    const release = await upstream.json();
    const asset = release.assets?.find(item => item.name === skill.asset && item.state === 'uploaded');
    if (!asset || !Number.isSafeInteger(asset.download_count) || asset.download_count < 0) {
      throw new Error('Download count unavailable');
    }
    response = reply({
      available: true, skill: skill.name, version: skill.version,
      downloads: asset.download_count, metric: 'github_release_asset_downloads',
      scope: 'this_version', source: releaseUrl, observedAt: new Date().toISOString(),
    });
  } catch {
    // Missing/rate-limited data is never presented as zero downloads.
    response = reply({available: false, version: skill.version, downloads: null, source: releaseUrl}, 200, 60);
  }
  ctx.waitUntil(caches.default.put(key, response.clone()).catch(() => {}));
  return request.method === 'HEAD' ? new Response(null, response) : response;
}
