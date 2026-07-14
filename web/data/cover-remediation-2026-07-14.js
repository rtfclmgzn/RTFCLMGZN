// Production cover remediation — exact owner-approved generated covers.
(function(){
  "use strict";

  var covers=window.RTFC_PREVIEW_COVERS||{};
  var explicit={
    "live-017":covers["live-017"],
    "live-018":covers["live-018"],
    "live-019":covers["live-019"]
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
    applied_at:"2026-07-14T22:05:00Z",
    ids:Object.keys(explicit),
    source:"exact owner-approved generated preview artwork",
    embedded_data_urls:true,
    placeholder_fallback:false,
    on_conflict:"preserve owner-approved cover; never silently substitute library art"
  };
})();