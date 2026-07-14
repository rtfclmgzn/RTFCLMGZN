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
          art.style.setProperty('background-image','linear-gradient(180deg,rgba(11,11,18,0) 45%,rgba(11,11,18,.62) 100%),url("'+src+'")','important');
          art.style.setProperty('background-position','center','important');
          art.style.setProperty('background-size','cover','important');
          art.style.setProperty('background-repeat','no-repeat','important');
        });
      });
    } finally { busy=false; }
  }
  apply();
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('hashchange',function(){setTimeout(apply,0);});
})();
