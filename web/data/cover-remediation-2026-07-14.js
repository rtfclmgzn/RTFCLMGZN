// Production cover remediation — exact owner-approved preview artwork.
// The displayed covers must match the preview shown to the owner; no silent substitutions.
(function(){
  "use strict";

  var preview=window.RTFC_PREVIEW_COVERS||{};
  var required=["live-017","live-018","live-019"];
  var missing=required.filter(function(id){ return !preview[id]; });

  if(missing.length){
    throw new Error("COVER REMEDIATION BLOCKED — exact preview artwork missing for: "+missing.join(", "));
  }

  var sets=[
    window.RTFC_ARTICLES||[],
    window.RTFC_LIVE_ARTICLES||[],
    window.RTFC_NEWSROOM_ARTICLES||[],
    window.RTFC_RESEARCH||[]
  ];

  sets.forEach(function(list){
    list.forEach(function(article){
      if(preview[article.id]) article.image=preview[article.id];
    });
  });

  window.RTFC_COVER_REMEDIATION={
    applied_at:"2026-07-14T20:35:00Z",
    ids:required,
    source:"exact owner-approved generated preview artwork",
    silent_substitution_allowed:false,
    placeholder_fallback:false,
    on_conflict:"block publication until the approved preview asset or a newly owner-approved library/Gemini cover is available"
  };
})();