// Enforce the exact owner-approved generated covers after every route render.
(function(){
  "use strict";
  var bySlug={
    "meta-google-anthropic-openai-ai-arms-race":"live-019",
    "ai-infrastructure-race-datacenters-power-gpus":"live-018",
    "openai-gpt-5-6-sol-terra-luna-ai-work":"live-017"
  };
  var busy=false;
  function apply(){
    if(busy) return;
    busy=true;
    try{
      var covers=window.RTFC_PREVIEW_COVERS||{};
      Object.keys(bySlug).forEach(function(slug){
        var src=covers[bySlug[slug]];
        if(!src) return;
        document.querySelectorAll('a[href="#/article/'+slug+'"]').forEach(function(card){
          var art=card.querySelector('.art');
          if(!art) return;
          art.style.setProperty('background','linear-gradient(180deg,rgba(11,11,18,0) 45%,rgba(11,11,18,.62) 100%),url("'+src+'") center/cover no-repeat,var(--surface2)','important');
          art.setAttribute('data-exact-cover',bySlug[slug]);
        });
      });
    } finally { busy=false; }
  }
  function schedule(){ apply(); setTimeout(apply,50); setTimeout(apply,250); setTimeout(apply,1000); }
  schedule();
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('load',schedule);
  window.RTFC_EXACT_COVER_BUILD="2026-07-14-165";
})();
