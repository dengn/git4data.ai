/* First-party aggregate counters. No visitor ID, cookies, form values or URLs. */
(function () {
  'use strict';
  var page=document.body.getAttribute('data-analytics-page');
  var queue=[],timer=null,views=0,events=0,acquisition=null;
  function blocked() {
    var opted=false;try {opted=localStorage.getItem('g4d-analytics-optout')==='1';}catch(e){}
    return opted || navigator.doNotTrack==='1' || navigator.globalPrivacyControl===true || navigator.webdriver || new URLSearchParams(location.search).get('analytics')==='off';
  }
  function categorizeReferrer(ref) {
    if(!ref || !ref.trim())return 'direct';
    try {
      var u=new URL(ref),h=u.hostname.toLowerCase();
      var map={'x.com':'x','twitter.com':'x','linkedin.com':'linkedin','reddit.com':'reddit','substack.com':'substack','hackernoon.com':'hackernoon','v2ex.com':'v2ex','news.ycombinator.com':'hn','github.com':'github','google.com':'search','google.co.uk':'search','google.co.jp':'search','google.de':'search','google.fr':'search','bing.com':'search','duckduckgo.com':'search','baidu.com':'search'};
      if(map[h])return map[h];
      for(var d in map){if(h===d||h.endsWith('.'+d))return map[d];}
      return 'other';
    }catch(e){return 'other';}
  }
  function normalizeUtm(key,value) {
    if(!value||typeof value!=='string')return 'other';
    var v=value.toLowerCase().trim();
    if(key==='source'){
      var sources=['x','twitter','linkedin','reddit','substack','hackernoon','v2ex','hn','slack','discord','newsletter','github','email'];
      return sources.indexOf(v)>=0?v:'other';
    }
    if(key==='medium'){
      var mediums=['social','community','article','comment','newsletter','referral','email'];
      return mediums.indexOf(v)>=0?v:'other';
    }
    if(key==='campaign'){
      if(v.length>50||!/^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/.test(v))return 'other';
      return v;
    }
    return 'other';
  }
  function extractAcquisition() {
    var params=new URLSearchParams(location.search);
    var data={source:normalizeUtm('source',params.get('utm_source')),medium:normalizeUtm('medium',params.get('utm_medium')),campaign:normalizeUtm('campaign',params.get('utm_campaign')),referrer:categorizeReferrer(document.referrer)};
    try {sessionStorage.setItem('g4d-acq',JSON.stringify(data));}catch(e){}
    return data;
  }
  function loadAcquisition() {
    try {var stored=sessionStorage.getItem('g4d-acq');return stored?JSON.parse(stored):null;}catch(e){return null;}
  }
  function flush() {
    clearTimeout(timer);timer=null;
    if(blocked()){queue=[];return;}
    if(!queue.length)return;
    var payload=JSON.stringify({events:queue.splice(0,20)});
    try {
      fetch('/api/analytics/events',{method:'POST',body:payload,headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,referrerPolicy:'no-referrer'}).catch(function(){});
    }catch(e){}
  }
  function record(event,target,immediate) {
    if(!page || blocked() || events>=200)return;
    events++;
    var item={page:page,event:event,target:target||''};
    if(acquisition){item.source=acquisition.source;item.medium=acquisition.medium;item.campaign=acquisition.campaign;item.referrer=acquisition.referrer;}
    queue.push(item);
    if(immediate || queue.length>=20)flush();
    else if(!timer)timer=setTimeout(flush,3000);
  }
  function view(){if(document.visibilityState==='visible' && !views){views=1;record('page_view','',true);}}
  acquisition=loadAcquisition();
  if(!acquisition || new URLSearchParams(location.search).has('utm_source') || new URLSearchParams(location.search).has('utm_medium') || new URLSearchParams(location.search).has('utm_campaign')){
    acquisition=extractAcquisition();
  }
  view();
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush();else view();});
  window.addEventListener('pagehide',flush);
  window.addEventListener('pageshow',function(event){if(event.persisted){views=0;events=0;view();}});
  document.addEventListener('click',function(event){
    if(!event.isTrusted || !(event.target instanceof Element))return;
    var element=event.target.closest('[data-analytics-id]');
    if(element && !element.disabled)record('click',element.getAttribute('data-analytics-id'),true);
  },true);
  document.querySelectorAll('video[data-analytics-video]').forEach(function(video){
    var started=false,completed=false;
    video.addEventListener('play',function(){if(!started){started=true;record('video_start',video.dataset.analyticsVideo,true);}});
    video.addEventListener('ended',function(){if(!completed){completed=true;record('video_complete',video.dataset.analyticsVideo,true);}});
  });
  var opt=document.getElementById('analyticsOptOut');
  if(opt){
    function label(){var off=false;try{off=localStorage.getItem('g4d-analytics-optout')==='1';}catch(e){}opt.textContent=off?'重新允许匿名统计 / Allow aggregate analytics':'停止本浏览器统计 / Opt out on this browser';}
    label();opt.addEventListener('click',function(){try{var off=localStorage.getItem('g4d-analytics-optout')==='1';localStorage.setItem('g4d-analytics-optout',off?'0':'1');queue=[];label();}catch(e){opt.textContent='浏览器无法保存偏好 / Cannot save preference';}});
  }
})();
