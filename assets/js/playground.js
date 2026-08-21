/* git4data.ai — playground console.
   Talks to the Worker in worker/index.js. Every visitor drives their own
   branch; the page degrades to instructions rather than an error when the
   backend is unconfigured or down. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var T = function (k, f) { return window.g4dT ? window.g4dT(k, f) : f; };

  var session = null;
  var expiresAt = 0;
  var live = false;

  /* ── the guided path: the same arc the paper's Figure 1 describes ── */
  var STEPS = [
    {
      t: 'See the mess',
      tZh: '先看见问题',
      d: 'Country codes were entered five different ways. This is the kind of thing an agent is asked to clean up.',
      dZh: '国家字段有五种写法。这正是别人会派 Agent 去清理的东西。',
      sql: "SELECT country, COUNT(*) AS rows_with_it\n  FROM customers\n GROUP BY country\n ORDER BY rows_with_it DESC;"
    },
    {
      t: 'Snapshot before touching anything',
      tZh: '动手之前先打快照',
      d: 'Names the state you can always come back to. Metadata only — nothing is copied.',
      dZh: '给「随时可以退回来」的那个状态命名。只是元数据，没有复制任何数据。',
      sql: "CREATE SNAPSHOT before_fix FOR TABLE customers;"
    },
    {
      t: 'Fork a working branch',
      tZh: 'Fork 一个工作分支',
      d: 'customers_fix starts identical, then diverges. Writes on one stop touching the other.',
      dZh: 'customers_fix 一开始完全相同，然后各自演进。任何一侧的写入都不再影响对方。',
      sql: "DATA BRANCH CREATE TABLE customers_fix\n  FROM customers{snapshot='before_fix'};"
    },
    {
      t: 'Do the risky repair — on the branch',
      tZh: '在分支上做那个有风险的修复',
      d: 'Normalise every spelling of France, Germany and the Netherlands. customers is untouched.',
      dZh: '把法国、德国、荷兰的各种写法统一掉。customers 原表毫发无损。',
      sql: "UPDATE customers_fix SET country = 'FR' WHERE country IN ('fr','France');\n"
    },
    {
      t: 'Name where the branch got to',
      tZh: '给分支的当前状态命名',
      d: 'A diff compares two named states, so give this one a name too.',
      dZh: 'diff 比较的是两个具名状态，所以给分支这一头也起个名字。',
      sql: "CREATE SNAPSHOT after_fix FOR TABLE customers_fix;"
    },
    {
      t: 'Review the blast radius',
      tZh: '看清楚改动的范围',
      d: 'The rows on which the two versions disagree — read only from the deltas, never the base table.',
      dZh: '两个版本存在分歧的行。只读增量，永远不碰基表。',
      sql: "DATA BRANCH DIFF customers{snapshot='before_fix'}\n  AGAINST customers_fix{snapshot='after_fix'};"
    },
    {
      t: 'Merge it back',
      tZh: '合并回去',
      d: 'Three-way, row by row, and it stops dead on a genuine conflict rather than guessing.',
      dZh: '逐行三方合并。遇到真冲突直接中止，而不是替你猜。',
      sql: "DATA BRANCH MERGE customers_fix{snapshot='after_fix'}\n  INTO customers WHEN CONFLICT FAIL;"
    },
    {
      t: 'Confirm',
      tZh: '验收',
      d: 'Same query as step one. Five spellings became one, and you can still see how it happened.',
      dZh: '和第一步同一条查询。五种写法收敛成一种，而且整个过程仍然可追溯。',
      sql: "SELECT country, COUNT(*) AS rows_with_it\n  FROM customers\n GROUP BY country\n ORDER BY rows_with_it DESC;"
    }
  ];

  function isZh() { return window.G4D_LANG === 'zh'; }

  function renderSteps() {
    var ol = $('stepList');
    if (!ol) return;
    ol.innerHTML = '';
    STEPS.forEach(function (s, i) {
      var li = document.createElement('li');
      li.className = 'pstep';
      li.innerHTML =
        '<button type="button">' +
          '<span class="ps-n mono">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="ps-b">' +
            '<span class="ps-t">' + (isZh() ? s.tZh : s.t) + '</span>' +
            '<span class="ps-d">' + (isZh() ? s.dZh : s.d) + '</span>' +
          '</span>' +
        '</button>';
      li.querySelector('button').addEventListener('click', function () {
        $('sqlBox').value = s.sql.trim();
        $('sqlBox').focus();
        ol.querySelectorAll('.pstep').forEach(function (x) { x.classList.remove('is-on'); });
        li.classList.add('is-on');
      });
      ol.appendChild(li);
    });
  }

  /* ── output ─────────────────────────────────────────────────── */
  function esc(v) {
    if (v === null || v === undefined) return '<i class="null">NULL</i>';
    return String(v).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function show(html) { $('output').innerHTML = html; }

  function showError(msg) {
    show('<div class="out-err"><span class="mono">✗</span><p>' + esc(msg) + '</p></div>');
  }

  function showResult(r) {
    if (r.kind === 'rows') {
      if (!r.rows.length) {
        show('<div class="out-meta mono">Empty set · ' + r.ms + ' ms</div>');
        return;
      }
      var h = '<div class="out-scroll"><table class="out-table"><thead><tr>';
      r.columns.forEach(function (c) { h += '<th>' + esc(c) + '</th>'; });
      h += '</tr></thead><tbody>';
      r.rows.forEach(function (row) {
        h += '<tr>' + row.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody></table></div><div class="out-meta mono">' +
        r.total + ' row' + (r.total === 1 ? '' : 's') +
        (r.truncated ? ' (showing first ' + r.rows.length + ')' : '') +
        ' · ' + r.ms + ' ms</div>';
      show(h);
    } else {
      show('<div class="out-ok"><span class="mono">✓</span><p class="mono">Query OK, ' +
        r.affected + ' row' + (r.affected === 1 ? '' : 's') + ' affected (' +
        (r.ms / 1000).toFixed(2) + ' sec)</p></div>');
    }
    if (r.queries) budget(r.queries);
  }

  function budget(n) {
    var el = $('budget');
    if (el) el.textContent = n + '/80';
  }

  /* ── status ─────────────────────────────────────────────────── */
  function setStatus(text, cls) {
    var s = $('status');
    $('statusText').textContent = text;
    s.className = 'play-status' + (cls ? ' ' + cls : '');
  }

  function tick() {
    if (!live || !expiresAt) return;
    var left = Math.max(0, expiresAt - Date.now());
    var mins = Math.floor(left / 60000), secs = Math.floor((left % 60000) / 1000);
    if (left <= 0) {
      live = false;
      setStatus(T('pg.gone', 'Your branch was reclaimed. Reload the page for a fresh one.'), 'is-cold');
      return;
    }
    setStatus(
      (isZh() ? '你的分支 ' : 'Your branch ') + session.database +
      (isZh() ? ' · 剩余 ' : ' · ') + mins + ':' + String(secs).padStart(2, '0') +
      (isZh() ? '' : ' left'),
      'is-live'
    );
  }

  /* ── degradation: never show a raw error where help would do ── */
  function offline(reason) {
    live = false;
    setStatus(T('pg.offline', 'The live sandbox is offline right now.'), 'is-cold');
    var n = $('notice');
    n.hidden = false;
    n.innerHTML =
      '<p><strong>' + T('pg.offh', 'You can still run every one of these — locally, with no limits.') + '</strong></p>' +
      '<pre class="mono">docker run -d -p 6001:6001 --name matrixone matrixorigin/matrixone:latest\n' +
      'mysql -h 127.0.0.1 -P 6001 -u root -p111</pre>' +
      '<p class="notice-why">' + esc(reason) + '</p>';
    $('runBtn').disabled = true;
    $('resetBtn').disabled = true;
  }

  /* ── api ────────────────────────────────────────────────────── */
  function api(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, body: j }; });
    });
  }

  function boot() {
    renderSteps();
    $('sqlBox').value = STEPS[0].sql.trim();

    api('/api/session').then(function (res) {
      if (res.status !== 200) {
        offline(res.body && res.body.missing
          ? 'The site owner has not pointed the playground at a MatrixOne instance yet.'
          : (res.body && (res.body.message || res.body.error)) || 'The API returned ' + res.status + '.');
        return;
      }
      session = res.body;
      expiresAt = Date.now() + session.expiresIn;
      live = true;
      budget(0);
      tick();
      setInterval(tick, 1000);
      show('<div class="out-ok"><span class="mono">✓</span><p class="mono">' +
        'DATA BRANCH CREATE TABLE — your branch was forked in ' +
        (session.branchMs / 1000).toFixed(2) + ' sec. Run step 1.</p></div>');
    }).catch(function (e) {
      offline('Could not reach the playground API: ' + e.message);
    });
  }

  function run() {
    if (!live) return;
    var sql = $('sqlBox').value.trim();
    if (!sql) return;
    $('runBtn').disabled = true;
    show('<div class="out-meta mono">Running…</div>');

    api('/api/query', { session: session.id, sql: sql }).then(function (res) {
      $('runBtn').disabled = false;
      var b = res.body;
      if (res.status === 200) { showResult(b); expiresAt = Date.now() + session.expiresIn; return; }
      if (b.error === 'expired') {
        live = false;
        setStatus(T('pg.gone', 'Your branch was reclaimed. Reload the page for a fresh one.'), 'is-cold');
        showError('This branch has expired. Reload the page to get a new one.');
        return;
      }
      showError(b.message || b.error || ('The API returned ' + res.status + '.'));
    }).catch(function (e) {
      $('runBtn').disabled = false;
      showError(e.message);
    });
  }

  function reset() {
    if (!live) return;
    $('resetBtn').disabled = true;
    api('/api/reset', { session: session.id }).then(function (res) {
      $('resetBtn').disabled = false;
      if (res.status !== 200) { showError((res.body && res.body.error) || 'Reset failed.'); return; }
      budget(0);
      expiresAt = Date.now() + (session.expiresIn || 0);
      $('sqlBox').value = STEPS[0].sql.trim();
      document.querySelectorAll('.pstep').forEach(function (x) { x.classList.remove('is-on'); });
      show('<div class="out-ok"><span class="mono">✓</span><p class="mono">' +
        'Branch re-forked in ' + (res.body.branchMs / 1000).toFixed(2) + ' sec. Back to the original mess.</p></div>');
    }).catch(function (e) {
      $('resetBtn').disabled = false;
      showError(e.message);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('runBtn').addEventListener('click', run);
    $('resetBtn').addEventListener('click', reset);
    $('sqlBox').addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });
    document.addEventListener('g4d:lang', function () { renderSteps(); tick(); });
    boot();
  });
})();
