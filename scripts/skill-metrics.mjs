// Aggregate public distribution signals. No user/database telemetry is collected.
// Optional GH_TOKEN increases GitHub API limits; it is never logged.
const repository = 'dengn/git4data.ai';
const headers = {accept:'application/vnd.github+json', 'user-agent':'git4data-skill-metrics', 'x-github-api-version':'2022-11-28'};
if (process.env.GH_TOKEN) headers.authorization = `Bearer ${process.env.GH_TOKEN}`;
async function get(path) {
  const res = await fetch(`https://api.github.com/repos/${repository}${path}`, {headers, signal:AbortSignal.timeout(15000)});
  if (!res.ok) throw new Error(`GitHub API returned ${res.status}; metrics unavailable, not zero.`);
  return res.json();
}
const repo = await get('');
const versions = [];
for (let page = 1; ; page++) {
  const releases = await get(`/releases?per_page=100&page=${page}`);
  for (const release of releases) {
    if (release.draft || !/^skill-v\d+\.\d+\.\d+$/.test(release.tag_name)) continue;
    for (const asset of release.assets) {
      if (asset.state === 'uploaded' && /^matrixone-safe-data-changes-v\d+\.\d+\.\d+\.zip$/.test(asset.name)) {
        versions.push({version:release.tag_name, downloads:asset.download_count, asset:asset.name, publishedAt:release.published_at});
      }
    }
  }
  if (releases.length < 100) break;
}
console.log(JSON.stringify({observedAt:new Date().toISOString(), repository,
  downloads:versions.reduce((sum, version) => sum + version.downloads, 0), versions,
  repositoryStars:repo.stargazers_count, repositoryForks:repo.forks_count,
  meaning:'Asset requests, including repeats/automation/verification; not unique people, installs or active users. Stars/forks cover the whole website repository.'
}, null, 2));
