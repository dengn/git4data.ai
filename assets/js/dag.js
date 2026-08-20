/* Animated git-DAG backdrop.
   Static branch topology + packets flowing along the edges. */
(function () {
  var canvas = document.getElementById('dag');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var paths = [], nodes = [], packets = [], raf = 0, t = 0;

  var LANE_GAP = 92, STEP = 165, NODE_R = 2.6;
  var CYAN = [34, 211, 238], VIOLET = [139, 92, 246];

  /* deterministic PRNG so the layout is stable across reloads */
  var seed = 20260820;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  function cubic(p0, p1, p2, p3, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, v = 1 - u;
      out.push([
        v*v*v*p0[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u*u*u*p3[0],
        v*v*v*p0[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u*u*u*p3[1]
      ]);
    }
    return out;
  }

  function polyLength(pts) {
    var L = 0, acc = [0];
    for (var i = 1; i < pts.length; i++) {
      L += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
      acc.push(L);
    }
    return { total: L, acc: acc };
  }

  function makePath(pts, kind) {
    var m = polyLength(pts);
    return { pts: pts, acc: m.acc, len: m.total, kind: kind };
  }

  function pointAt(p, d) {
    var a = p.acc, lo = 0, hi = a.length - 1;
    while (lo < hi - 1) { var mid = (lo + hi) >> 1; if (a[mid] <= d) lo = mid; else hi = mid; }
    var seg = a[hi] - a[lo] || 1, f = (d - a[lo]) / seg;
    var p0 = p.pts[lo], p1 = p.pts[hi];
    return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
  }

  function build() {
    seed = 20260820;
    paths = []; nodes = []; packets = [];

    var lanes = Math.max(3, Math.min(6, Math.round(H / LANE_GAP)));
    var top = (H - (lanes - 1) * LANE_GAP) / 2;
    var laneY = function (i) { return top + i * LANE_GAP; };
    var main = Math.floor(lanes / 2);
    var my = laneY(main);
    var x0 = -STEP, x1 = W + STEP;

    /* trunk */
    paths.push(makePath([[x0, my], [x1, my]], 'trunk'));
    for (var x = x0; x <= x1; x += STEP) nodes.push({ x: x, y: my, main: true, ph: rnd() * 6.28 });

    /* branches off the trunk */
    var cols = Math.ceil((x1 - x0) / STEP);
    var c = 1;
    while (c < cols - 2) {
      if (rnd() < 0.62) {
        var lane = main + (rnd() < 0.5 ? -1 : 1) * (1 + (rnd() < 0.3 ? 1 : 0));
        if (lane >= 0 && lane < lanes && lane !== main) {
          var span = 2 + Math.floor(rnd() * 3);
          if (c + span < cols - 1) {
            var bx = x0 + c * STEP, by = laneY(lane), ex = bx + span * STEP;
            var pts = []
              .concat(cubic([bx, my], [bx + STEP * .55, my], [bx + STEP * .45, by], [bx + STEP, by], 22))
              .concat([[ex, by]])
              .concat(cubic([ex, by], [ex + STEP * .55, by], [ex + STEP * .45, my], [ex + STEP, my], 22));
            paths.push(makePath(pts, 'branch'));
            for (var k = 1; k <= span; k++) nodes.push({ x: bx + k * STEP, y: by, main: false, ph: rnd() * 6.28 });
            c += span + 1;
            continue;
          }
        }
      }
      c++;
    }

    var n = Math.round(Math.min(26, Math.max(10, W / 90)));
    for (var i = 0; i < n; i++) {
      var p = paths[Math.floor(rnd() * paths.length)];
      packets.push({ p: p, d: rnd() * p.len, v: 22 + rnd() * 46, hue: rnd() });
    }
  }

  function viewport() {
    var de = document.documentElement;
    return [
      Math.max(window.innerWidth || 0, de ? de.clientWidth : 0, canvas.clientWidth || 0),
      Math.max(window.innerHeight || 0, de ? de.clientHeight : 0, canvas.clientHeight || 0)
    ];
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var v = viewport();
    W = v[0]; H = v[1];
    if (W < 2 || H < 2) { requestAnimationFrame(resize); return; }   /* layout not settled yet */
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function draw(now) {
    var dt = Math.min((now - t) / 1000, 0.05); t = now;
    ctx.clearRect(0, 0, W, H);

    /* edges */
    ctx.lineWidth = 1;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      ctx.strokeStyle = p.kind === 'trunk' ? 'rgba(255,255,255,.085)' : 'rgba(255,255,255,.05)';
      ctx.beginPath();
      ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (var j = 1; j < p.pts.length; j++) ctx.lineTo(p.pts[j][0], p.pts[j][1]);
      ctx.stroke();
    }

    /* commit nodes */
    for (var n = 0; n < nodes.length; n++) {
      var nd = nodes[n];
      var pulse = 0.5 + 0.5 * Math.sin(now / 1400 + nd.ph);
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, NODE_R, 0, 6.283);
      ctx.fillStyle = nd.main
        ? rgba(CYAN, 0.14 + 0.16 * pulse)
        : rgba(VIOLET, 0.11 + 0.14 * pulse);
      ctx.fill();
    }

    /* packets */
    for (var k = 0; k < packets.length; k++) {
      var q = packets[k];
      q.d += q.v * dt;
      if (q.d > q.len) { q.d = 0; q.p = paths[Math.floor(Math.random() * paths.length)]; }
      var a = pointAt(q.p, q.d);
      var b = pointAt(q.p, Math.max(0, q.d - 34));
      var col = q.hue < 0.55 ? CYAN : VIOLET;

      var g = ctx.createLinearGradient(b[0], b[1], a[0], a[1]);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(1, rgba(col, 0.5));
      ctx.strokeStyle = g; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();

      ctx.beginPath(); ctx.arc(a[0], a[1], 1.9, 0, 6.283);
      ctx.fillStyle = rgba(col, 0.9); ctx.fill();
      ctx.beginPath(); ctx.arc(a[0], a[1], 5.5, 0, 6.283);
      ctx.fillStyle = rgba(col, 0.1); ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  var ro;
  function start() { if (!raf) { t = performance.now(); raf = requestAnimationFrame(draw); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener('resize', function () {
    clearTimeout(ro); ro = setTimeout(resize, 160);
  });
  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  resize(); start();
})();
