/* First-party aggregate counters. No visitor ID, cookies, form values or URLs. */
(function () {
  'use strict';
  var page=document.body.getAttribute('data-analytics-page');
  var queue=[],timer=null,views=0,events=0;
  function blocked() {
    var opted=false;try {opted=localStorage.getItem('g4d-analytics-optout')==='1';}catch(e){}
    return opted || navigator.doNotTrack==='1' || navigator.globalPrivacyControl===true || navigator.webdriver || new URLSearchParams(location.search).get('analytics')==='off';
  }
  function flush() {
    clearTimeout(timer);timer=null;
    if(blocked()){queue=[];return;}
    if(!queue.length)return;
    var payload=JSON.stringify({events:queue.splice(0,20)});
    try {
      fetch('/api/analytics/events',{method:'POST',body:payload,headers:{'content-type':'application/json'},credentials:'omit',keepalive:true,referrerPolicy:'no-referrer'}).catch(function(){});
    }catch(e){} // Analytics never blocks navigation or the SQL playground.
  }
  function record(event,target,immediate) {
    if(!page || blocked() || events>=200)return;
    events++;queue.push({page:page,event:event,target:target||''});
    if(immediate || queue.length>=20)flush();
    else if(!timer)timer=setTimeout(flush,3000);
  }
  function view(){if(document.visibilityState==='visible' && !views){views=1;record('page_view','',true);}}
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
