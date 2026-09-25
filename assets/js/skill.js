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
  fetch('/api/skill/stats', {credentials: 'omit'})
    .then(function (response) { if (!response.ok) throw new Error('unavailable'); return response.json(); })
    .then(function (data) {
      if (!data.available || !Number.isSafeInteger(data.downloads) || !Number.isFinite(Date.parse(data.observedAt))) throw new Error('unavailable');
      metrics = data; finished = true; render();
    })
    .catch(function () { finished = true; render(); });
})();
