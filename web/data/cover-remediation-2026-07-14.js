// Production cover remediation — stable repository image files only.
(function(){
  "use strict";

  var explicit={
    "live-017":"assets/img/primer-hardware.jpg",
    "live-018":"assets/img/issue-001-extra.jpg",
    "live-019":"assets/img/issue-001-centerfold.jpg"
  };

  var sets=[
    window.RTFC_ARTICLES||[],
    window.RTFC_LIVE_ARTICLES||[],
    window.RTFC_NEWSROOM_ARTICLES||[],
    window.RTFC_RESEARCH||[]
  ];

  sets.forEach(function(list){
    list.forEach(function(article){
      if(explicit[article.id]) article.image=explicit[article.id];
    });
  });

  window.RTFC_COVER_REMEDIATION={
    applied_at:"2026-07-14T21:18:00Z",
    ids:Object.keys(explicit),
    source:"stable repository image files",
    embedded_data_urls:false,
    blob_urls:false,
    placeholder_fallback:false,
    on_conflict:"block publication until a verified repository image or newly generated cover is committed"
  };
})();