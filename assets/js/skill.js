(function () {
  'use strict';
  var count = document.getElementById('skillDownloadCount');
  var status = document.getElementById('skillDownloadStatus');
  var metrics = null, finished = false;
  if (!count || !status) return;
  function render() {
    var zh = window.G4D_LANG === 'zh';
    if (metrics) {
      count.textContent = metrics.downloads.toLocaleString(zh ? 'zh-CN' : 'en-US');
      var time = new Date(metrics.observedAt).toISOString().slice(0, 16).replace('T', ' ');
      status.textContent = (zh ? 'GitHub 文件下载 · v' : 'GitHub asset downloads · v') + metrics.version + (metrics.stale ? (zh ? ' · 最近可用数据 ' : ' · last available ') : (zh ? ' · 更新于 ' : ' · updated ')) + time + ' UTC';
    } else {
      count.textContent = '—';
      status.textContent = finished
        ? (zh ? '计数暂不可用，仍可正常下载。' : 'Count temporarily unavailable. The download still works.')
        : (zh ? '正在读取 GitHub 计数…' : 'Loading GitHub count…');
    }
  }
  document.addEventListener('g4d:lang', render);
  render();
  function publicGitHubCount() {
    // A visitor's anonymous API allowance can still be available when shared
    // Worker egress is rate-limited. No cookies, token or referrer are sent.
    return fetch('/data/agent-skill.json', {credentials: 'omit'})
      .then(function (response) { if (!response.ok) throw new Error('unavailable'); return response.json(); })
      .then(function (manifest) {
        if (manifest.repository !== 'dengn/git4data.ai' || !/^skill-v\d+\.\d+\.\d+$/.test(manifest.tag)) throw new Error('invalid release');
        return fetch('https://api.github.com/repos/' + manifest.repository + '/releases/tags/' + manifest.tag, {
          credentials: 'omit', referrerPolicy: 'no-referrer', headers: {accept: 'application/vnd.github+json'}
        }).then(function (response) { if (!response.ok) throw new Error('unavailable'); return response.json(); })
          .then(function (release) {
            var asset = release.assets && release.assets.find(function (item) { return item.name === manifest.asset && item.state === 'uploaded'; });
            if (!asset) throw new Error('unavailable');
            return {available: true, downloads: asset.download_count, version: manifest.version, observedAt: new Date().toISOString(), stale: false};
          });
      });
  }
  fetch('/api/skill/stats', {credentials: 'omit'})
    .then(function (response) { if (!response.ok) throw new Error('unavailable'); return response.json(); })
    .then(function (data) { if (!data.available) throw new Error('unavailable'); return data; })
    .catch(publicGitHubCount)
    .then(function (data) {
      if (!data.available || !Number.isSafeInteger(data.downloads) || !Number.isFinite(Date.parse(data.observedAt))) throw new Error('unavailable');
      metrics = data; finished = true; render();
    })
    .catch(function () { finished = true; render(); });
})();
