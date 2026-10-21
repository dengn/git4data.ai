/* Google Analytics 4 — public measurement ID only. Respects site analytics opt-out. */
(function () {
  'use strict';
  var blocked = false;
  try {
    blocked = localStorage.getItem('g4d-analytics-optout') === '1';
  } catch (e) {}
  if (
    blocked ||
    navigator.doNotTrack === '1' ||
    navigator.globalPrivacyControl === true ||
    new URLSearchParams(location.search).get('analytics') === 'off'
  ) {
    return;
  }
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'G-SPH3ZK5VP1');
})();
