// Render the exact owner-approved preview covers as real <img> elements.
// CSS background images are intentionally bypassed for these large generated assets.
(function(){
  "use strict";

  var slugs={
    "live-017":"openai-gpt-5-6-sol-terra-luna-ai-work",
    "live-018":"ai-infrastructure-race-datacenters-power-gpus",
    "live-019":"meta-google-anthropic-openai-ai-arms-race"
  };

  function coverUrl(id){
    var blobs=window.RTFC_PREVIEW_COVER_BLOB_URLS||{};
    var raw=window.RTFC_PREVIEW_COVERS||{};
    return blobs[id]||raw[id]||"";
  }

  function mountCover(art,id){
    var src=coverUrl(id);
    if(!art||!src) return;

    art.style.position="relative";
    art.style.overflow="hidden";
    art.style.background="var(--surface2)";

    var img=art.querySelector("img.rtfc-approved-cover");
    if(!img){
      img=document.createElement("img");
      img.className="rtfc-approved-cover";
      img.alt="";
      img.decoding="async";
      img.loading="eager";
      img.style.position="absolute";
      img.style.inset="0";
      img.style.width="100%";
      img.style.height="100%";
      img.style.objectFit="cover";
      img.style.display="block";
      img.style.zIndex="0";
      art.insertBefore(img,art.firstChild);
    }
    if(img.getAttribute("src")!==src) img.setAttribute("src",src);

    var overlay=art.querySelector(".rtfc-cover-overlay");
    if(!overlay){
      overlay=document.createElement("span");
      overlay.className="rtfc-cover-overlay";
      overlay.setAttribute("aria-hidden","true");
      overlay.style.position="absolute";
      overlay.style.inset="0";
      overlay.style.background="linear-gradient(180deg,rgba(11,11,18,0) 45%,rgba(11,11,18,.62) 100%)";
      overlay.style.pointerEvents="none";
      overlay.style.zIndex="1";
      art.insertBefore(overlay,img.nextSibling);
    }

    Array.prototype.forEach.call(art.children,function(child){
      if(child!==img&&child!==overlay) child.style.zIndex="2";
    });
  }

  function apply(){
    Object.keys(slugs).forEach(function(id){
      var slug=slugs[id];
      var selector='a[href="#/article/'+slug+'"] .art';
      Array.prototype.forEach.call(document.querySelectorAll(selector),function(art){mountCover(art,id);});
    });
  }

  function start(){
    var app=document.getElementById("app");
    if(!app) return;
    apply();
    new MutationObserver(apply).observe(app,{childList:true,subtree:true});
    window.addEventListener("hashchange",function(){setTimeout(apply,0);});
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start);
  else start();
})();
