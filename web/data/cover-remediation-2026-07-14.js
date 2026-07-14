// Production cover remediation — real photorealistic editorial artwork only.
// Library-first correction for the July 14 owner-approved batch.
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

  // Production must never invent a graphic placeholder when a cover conflicts.
  // The publish gate must select another eligible library asset or generate a
  // proper Gemini/Nano Banana cover before the article can ship.
  window.RTFC_COVER_REMEDIATION={
    applied_at:"2026-07-14T20:14:00Z",
    ids:Object.keys(explicit),
    source:"managed photorealistic art library",
    placeholder_fallback:false,
    on_conflict:"block publication until eligible library or Gemini cover exists"
  };
})();