// Convert exact approved embedded preview images into browser Blob URLs before app render.
// This preserves the exact artwork while avoiding oversized data-URL rendering failures.
(function(){
  "use strict";

  function dataUrlToBlobUrl(value){
    if(typeof value!=="string" || value.indexOf("data:image/")!==0) return value;
    var comma=value.indexOf(",");
    if(comma<0) return value;
    var header=value.slice(5,comma);
    var payload=value.slice(comma+1);
    var parts=header.split(";");
    var mime=parts[0]||"image/webp";
    var binary;
    try{
      binary=parts.indexOf("base64")>=0 ? atob(payload) : decodeURIComponent(payload);
    }catch(error){
      console.error("Approved preview cover decode failed",error);
      return value;
    }
    var bytes=new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes],{type:mime}));
  }

  var preview=window.RTFC_PREVIEW_COVERS||{};
  var converted={};
  Object.keys(preview).forEach(function(id){
    converted[id]=dataUrlToBlobUrl(preview[id]);
  });

  var sets=[
    window.RTFC_ARTICLES||[],
    window.RTFC_LIVE_ARTICLES||[],
    window.RTFC_NEWSROOM_ARTICLES||[],
    window.RTFC_RESEARCH||[]
  ];
  sets.forEach(function(list){
    list.forEach(function(article){
      if(converted[article.id]) article.image=converted[article.id];
    });
  });

  window.RTFC_PREVIEW_COVER_BLOB_URLS=converted;
  window.RTFC_PREVIEW_COVER_RENDER_MODE="blob-url";
})();
