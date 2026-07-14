// Immediate live cover remediation + runtime fail-safe.
(function(){
  "use strict";
  var explicit={
    "live-017":"assets/img/live-017-model-orchestration.svg",
    "live-018":"assets/img/live-018-grid-infrastructure.svg",
    "live-019":"assets/img/live-019-ecosystem-competition.svg"
  };
  var sets=[window.RTFC_ARTICLES||[],window.RTFC_LIVE_ARTICLES||[],window.RTFC_NEWSROOM_ARTICLES||[],window.RTFC_RESEARCH||[]];
  sets.forEach(function(list){list.forEach(function(a){if(explicit[a.id]) a.image=explicit[a.id];});});

  // Last-resort display guard: a duplicate cover inside 90 days is replaced with a
  // deterministic, article-specific inline SVG. This prevents a repeated cover from
  // reaching readers even if an upstream publisher violates the hard policy.
  var all=[].concat.apply([],sets).filter(function(a){return a&&a.id&&a.image&&a.publishedAt;})
    .sort(function(a,b){return new Date(a.publishedAt)-new Date(b.publishedAt);});
  var seen={};
  function fallback(a){
    var title=String(a.title||a.id).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[c];});
    var hue=Array.from(String(a.id)).reduce(function(n,c){return (n+c.charCodeAt(0)*17)%360;},250);
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl('+hue+',70%,9%)"/><stop offset="1" stop-color="hsl('+((hue+70)%360)+',75%,25%)"/></linearGradient><radialGradient id="r"><stop stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="800" cy="390" r="300" fill="url(#r)"/><g fill="none" stroke="#aeefff" stroke-width="5" opacity=".75"><circle cx="800" cy="390" r="190"/><circle cx="800" cy="390" r="115" stroke-dasharray="18 14"/><path d="M180 690C470 510 620 710 800 560C980 410 1120 650 1420 470"/></g><text x="90" y="805" fill="#fff" font-family="Arial,sans-serif" font-size="54" font-weight="700">'+title+'</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  all.forEach(function(a){
    var p=String(a.image).replace(/^\.\//,'');
    var t=new Date(a.publishedAt).getTime();
    var prior=seen[p];
    if(prior && Math.abs(t-prior.ts)<90*86400000 && prior.id!==a.id){a.image=fallback(a);}else{seen[p]={id:a.id,ts:t};}
  });
})();