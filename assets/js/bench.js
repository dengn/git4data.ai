/* BranchBench results — data-driven table.
   Everything rendered here comes from data/branchbench.json. */
(function () {
  'use strict';

  var D = null, suite = null, mode = null, disp = 'abs', hidden = {};

  var $ = function (id) { return document.getElementById(id); };
  var T = function (k, f) { return (window.g4dT ? window.g4dT(k, f) : f); };

  /* Pick the Chinese variant of a field when the page is in Chinese.
     Every translatable key in the dataset has an optional "<key>Zh" sibling;
     missing ones fall back to English rather than to an empty string. */
  function L(obj, key) {
    if (!obj) return '';
    if (window.G4D_LANG === 'zh' && obj[key + 'Zh'] != null) return obj[key + 'Zh'];
    return obj[key] == null ? '' : obj[key];
  }

  /* ── number formatting ── */
  function raw(v) { return (v && typeof v === 'object') ? v.v : v; }
  /* Reproduce the precision printed in the source table: each suite declares
     its decimals, and sub-1 values keep two so 0.20 does not become 0.2. */
  function fmt(v, unit, decimals) {
    if (v == null) return '—';
    if (typeof v === 'object') return v.label;
    var dp = decimals == null ? 2 : decimals;
    if (v !== 0 && Math.abs(v) < 1) dp = Math.max(dp, 2);
    if (unit === 'MB') {
      if (v === 0) return '0';
      if (v >= 1000) return (v / 1000).toFixed(1) + ' GB';
      if (v < 1) return Math.round(v * 1000) + ' KB';
      return v.toFixed(1) + ' MB';
    }
    return v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function ratio(x) {
    if (x == null) return '—';
    if (x < 10) return x.toFixed(2) + '×';
    if (x < 100) return x.toFixed(1) + '×';
    return Math.round(x).toLocaleString('en-US') + '×';
  }

  /* ── controls ── */
  function activeCols() {
    return suite.cols.filter(function (c) { return !hidden[suite.id + ':' + c.id]; });
  }

  function buildSuiteSelect() {
    var sel = $('selSuite');
    sel.innerHTML = '';
    D.suites.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s.id; o.textContent = L(s, 'short') || L(s, 'name');
      sel.appendChild(o);
    });
    sel.value = suite.id;
    sel.onchange = function () {
      suite = D.suites.filter(function (s) { return s.id === sel.value; })[0];
      mode = suite.modes ? suite.modes[0].id : '_';
      buildModes(); buildCols(); render();
    };
  }

  function buildModes() {
    var wrap = $('modeWrap'), seg = $('segMode');
    seg.innerHTML = '';
    if (!suite.modes) { wrap.hidden = true; return; }
    wrap.hidden = false;
    suite.modes.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-b' + (m.id === mode ? ' is-on' : '');
      b.textContent = L(m, 'name');
      b.onclick = function () { mode = m.id; buildModes(); render(); };
      seg.appendChild(b);
    });
  }

  function buildCols() {
    var box = $('sysBox');
    box.innerHTML = '';
    suite.cols.forEach(function (c) {
      var key = suite.id + ':' + c.id;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sys' + (hidden[key] ? ' is-off' : '') + (c.self ? ' is-self' : '');
      b.innerHTML = '<span class="sys-dot"></span>' + L(c, 'name');
      b.onclick = function () {
        if (!hidden[key] && activeCols().length <= 1) return;   /* keep at least one */
        hidden[key] = !hidden[key];
        buildCols(); render();
      };
      box.appendChild(b);
    });
  }

  /* ── table ── */
  function render() {
    var cols = activeCols();
    var head = $('benchHead'), body = $('benchBody');

    $('suiteDesc').textContent = L(suite, 'desc');
    $('srcNote').innerHTML = T('bb.src', 'Source') + ': ' + L(suite, 'source') + ' · ' +
      (suite.lowerIsBetter ? T('bb.lower', 'lower is better') : T('bb.higher', 'higher is better')) +
      ' · ' + T('bb.unit', 'unit') + ': ' + suite.unit;

    /* header */
    var hr = '<tr><th scope="col" class="c-row">' + (L(suite, 'rowsLabel') || 'Row') + '</th>';
    cols.forEach(function (c) {
      hr += '<th scope="col" class="c-val' + (c.self ? ' me' : '') + '">' + L(c, 'name') + '</th>';
    });
    hr += '<th scope="col" class="c-gap">' + (L(suite, 'relLabel') || T('bb.gap', 'Gap')) + '</th></tr>';
    head.innerHTML = hr;

    /* body */
    body.innerHTML = '';
    suite.rows.forEach(function (r) {
      var vals = (r.values && (r.values[mode] || r.values['_'])) || {};
      var nums = cols.map(function (c) { return raw(vals[c.id]); })
                     .filter(function (n) { return n != null; });
      var best = suite.lowerIsBetter ? Math.min.apply(null, nums) : Math.max.apply(null, nums);
      var worst = suite.lowerIsBetter ? Math.max.apply(null, nums) : Math.min.apply(null, nums);

      var tr = document.createElement('tr');
      var rdesc = L(r, 'desc');
      var html = '<th scope="row" class="c-row">' + L(r, 'name') +
        (rdesc ? '<span class="row-desc">' + rdesc + '</span>' : '') + '</th>';

      cols.forEach(function (c) {
        var v = vals[c.id], n = raw(v);
        if (n == null) { html += '<td class="c-val na">—</td>'; return; }

        var isBest = !suite.noBest && nums.length > 1 && n === best;
        /* bar length: worst in the row fills the track */
        var span = suite.lowerIsBetter ? (worst || 1) : (best || 1);
        var w = span ? Math.max(3, Math.min(100, (n / span) * 100)) : 100;
        if (!suite.lowerIsBetter) w = Math.max(3, Math.min(100, (n / (best || 1)) * 100));

        var shown = disp === 'rel'
          ? (best ? ratio(suite.lowerIsBetter ? n / best : best / n) : '—')
          : fmt(v, suite.unit, suite.decimals);

        html += '<td class="c-val' + (c.self ? ' me' : '') + (isBest ? ' best' : '') + '">' +
                  '<span class="cell">' +
                    '<span class="cell-v">' + shown + '</span>' +
                    '<span class="bar"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
                  '</span>' +
                '</td>';
      });

      /* gap column: worst / best */
      var gap = (nums.length > 1 && best) ? ratio(worst / best) : '—';
      html += '<td class="c-gap">' + gap + '</td>';

      tr.innerHTML = html;
      body.appendChild(tr);
    });
  }

  /* ── static blocks ── */
  function renderBigNums() {
    var ul = $('bigNums');
    ul.innerHTML = D.findings.slice(0, 4).map(function (f) {
      return '<li><b>' + f.headline + '</b><span>' + (L(f, 'short') || L(f, 'text')) + '</span></li>';
    }).join('');
  }

  function renderFindings() {
    $('findGrid').innerHTML = D.findings.map(function (f) {
      return '<article class="find">' +
        '<span class="find-n">' + f.headline + '</span>' +
        '<p>' + L(f, 'text') + '</p>' +
        '<span class="find-src">' + f.src + '</span>' +
      '</article>';
    }).join('');
  }

  function renderCapability() {
    var c = D.capability;
    var h = '<thead><tr><th scope="col">' + T('bb.workflow', 'Workflow') + '</th>';
    c.cols.forEach(function (col) {
      h += '<th scope="col"' + (col.self ? ' class="me"' : '') + '>' + L(col, 'name') + '</th>';
    });
    h += '</tr></thead><tbody>';
    c.rows.forEach(function (r) {
      h += '<tr><th scope="row">' + L(r, 'name') + '</th>';
      c.cols.forEach(function (col) {
        var s = r.v[col.id];
        var cls = s === 'yes' ? 'y' : s === 'no' ? 'n' : 'p';
        var mark = s === 'yes' ? '✓' : s === 'no' ? '✗' : '?';
        h += '<td class="' + cls + (col.self ? ' me' : '') + '">' + mark + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody>';
    $('capTable').innerHTML = h;
    $('capNote').textContent = L(c, 'note');
  }

  function renderMeta() {
    $('mHardware').textContent = L(D.meta, 'hardware');
    $('mSetup').textContent = L(D.meta, 'setup');
    $('mDisclaimer').textContent = L(D.meta, 'disclaimer');

    var srcs = [];
    if (D.meta.primarySource) srcs.push(D.meta.primarySource);
    if (D.meta.benchmarkSource) srcs.push(D.meta.benchmarkSource);
    $('srcList').innerHTML = '<h3>' + T('bb.source', 'Sources') + '</h3>' + srcs.map(function (s) {
      var label = s.url
        ? '<a href="' + s.url + '" target="_blank" rel="noopener">' + s.label + ' ↗</a>'
        : s.label;
      return '<p>' + label + (s.authors ? '<span class="src-auth">' + s.authors + '</span>' : '') + '</p>';
    }).join('');
  }

  /* ── boot ── */
  function boot(data) {
    D = data;
    suite = D.suites[0];
    mode = suite.modes ? suite.modes[0].id : '_';

    buildSuiteSelect(); buildModes(); buildCols();
    renderBigNums(); renderFindings(); renderCapability(); renderMeta();
    render();

    $('segDisp').querySelectorAll('.seg-b').forEach(function (b) {
      b.onclick = function () {
        disp = b.dataset.disp;
        $('segDisp').querySelectorAll('.seg-b').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        render();
      };
    });

    document.addEventListener('g4d:lang', function () {
      buildSuiteSelect(); buildModes(); buildCols();
      renderBigNums(); renderFindings(); renderCapability(); renderMeta(); render();
    });
  }

  fetch('data/branchbench.json?v=4', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(boot)
    .catch(function (e) {
      var b = $('benchBody');
      if (b) b.innerHTML = '<tr><td colspan="6" class="na">Could not load data/branchbench.json — ' + e.message + '</td></tr>';
    });
})();
