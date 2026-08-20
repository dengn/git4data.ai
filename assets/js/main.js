/* git4data.ai — interactions */
(function () {
  'use strict';

  /* ── sticky nav ── */
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('is-stuck', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── mobile menu ── */
  var burger = document.getElementById('burger');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ── reveal on scroll ── */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  /* ── copy buttons ── */
  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.dataset.copy);
      if (!target) return;
      navigator.clipboard.writeText(target.innerText).then(function () {
        var prev = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = prev; btn.classList.remove('done'); }, 1400);
      });
    });
  });

  /* ── pointer glow on cards ── */
  document.querySelectorAll('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ── "how it works" step switcher ── */
  var STEP_SQL = [
    { title: '01 · Snapshot', code:
      '<span class="c-cmt">-- a snapshot freezes T at an instant: the analogue of a commit</span>\n' +
      '<span class="c-kw">CREATE SNAPSHOT</span> sn1 <span class="c-kw">FOR TABLE</span> T;\n\n' +
      '<span class="c-cmt">-- you do not always have to declare one in advance — the engine</span>\n' +
      '<span class="c-cmt">-- already retains recent history, queryable by timestamp</span>\n' +
      '<span class="c-kw">SELECT</span> * <span class="c-kw">FROM</span> T{<span class="c-kw">timestamp</span>=<span class="c-str">\'2026-08-01 12:34:56\'</span>};'
    },
    { title: '02 · Branch', code:
      '<span class="c-cmt">-- TClone inherits the schema and data of sn1, then diverges</span>\n' +
      '<span class="c-kw">DATA BRANCH CREATE TABLE</span> TClone <span class="c-kw">FROM</span> T{<span class="c-kw">snapshot</span>=<span class="c-str">\'sn1\'</span>};\n' +
      '<span class="c-ok">Query OK (0.20 sec)   -- 100 GB lineitem, 314 KB of metadata</span>\n\n' +
      '<span class="c-cmt">-- from here inserts, updates and deletes on T and TClone</span>\n' +
      '<span class="c-cmt">-- no longer affect one another</span>\n' +
      '<span class="c-kw">UPDATE</span> TClone <span class="c-kw">SET</span> l_returnflag = <span class="c-str">\'R\'</span> <span class="c-kw">WHERE</span> l_orderkey &lt; 100000;'
    },
    { title: '03 · Diff', code:
      '<span class="c-cmt">-- both lines of work advance; name where each one got to</span>\n' +
      '<span class="c-kw">CREATE SNAPSHOT</span> sn2 <span class="c-kw">FOR TABLE</span> T;\n' +
      '<span class="c-kw">CREATE SNAPSHOT</span> sn3 <span class="c-kw">FOR TABLE</span> TClone;\n\n' +
      '<span class="c-cmt">-- diff reads only the two deltas, never the base table</span>\n' +
      '<span class="c-kw">DATA BRANCH DIFF</span> T{<span class="c-kw">snapshot</span>=<span class="c-str">\'sn2\'</span>} <span class="c-kw">AGAINST</span> TClone{<span class="c-kw">snapshot</span>=<span class="c-str">\'sn3\'</span>};\n' +
      '<span class="c-out">1000 rows in set (0.19 sec)</span>\n' +
      '<span class="c-cmt">-- the equivalent hand-written SQL over the same change: 316.16 sec</span>'
    },
    { title: '04 · Merge', code:
      '<span class="c-cmt">-- the source may be any snapshot; the target must be the live table</span>\n' +
      '<span class="c-kw">DATA BRANCH MERGE</span> TClone{<span class="c-kw">snapshot</span>=<span class="c-str">\'sn3\'</span>} <span class="c-kw">INTO</span> T\n' +
      '  <span class="c-kw">WHEN CONFLICT FAIL</span>;\n' +
      '<span class="c-ok">Query OK, 1000 rows affected (0.35 sec)</span>\n\n' +
      '<span class="c-cmt">-- Git4Data infers the common base and merges three ways, so</span>\n' +
      '<span class="c-cmt">-- non-overlapping work from other agents survives. on a real</span>\n' +
      '<span class="c-cmt">-- collision, pick who wins:</span>\n' +
      '<span class="c-cmt">--   FAIL   abort the merge</span>\n' +
      '<span class="c-cmt">--   SKIP   keep the target\'s row</span>\n' +
      '<span class="c-cmt">--   ACCEPT keep the source\'s row</span>'
    }
  ];

  var steps = document.querySelectorAll('.step');
  var stepCode = document.getElementById('stepCode');
  var stepTitle = document.getElementById('stepTitle');

  function showStep(i) {
    if (!stepCode) return;
    steps.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
    stepCode.innerHTML = STEP_SQL[i].code;
    if (stepTitle) stepTitle.textContent = STEP_SQL[i].title;
  }

  var auto = true, idx = 0;

  if (steps.length && stepCode) {
    steps.forEach(function (s, i) {
      s.addEventListener('click', function () { showStep(i); auto = false; });
      s.addEventListener('mouseenter', function () { auto = false; });
    });
    showStep(0);

    /* gentle auto-advance until the visitor takes over */
    setInterval(function () {
      if (!auto) return;
      var flow = document.querySelector('.flow');
      if (!flow) return;
      var r = flow.getBoundingClientRect();
      if (r.top > window.innerHeight || r.bottom < 0) return;
      idx = (idx + 1) % STEP_SQL.length;
      showStep(idx);
    }, 4200);
  }

  /* ── year ── */
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
